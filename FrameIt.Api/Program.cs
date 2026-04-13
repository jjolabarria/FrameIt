using System.Security.Claims;
using FrameIt.Api.Data;
using FrameIt.Api.Hubs;
using FrameIt.Api.Services;
using FrameIt.Contracts;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddSignalR();
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/api/auth/login";
        options.Cookie.Name = "frameit.auth";
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("Postgres");
    options.UseNpgsql(connectionString ?? "Host=localhost;Port=5432;Database=frameit;Username=postgres;Password=postgres");
});
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .WithOrigins("http://localhost:5173", "https://localhost:5173"));
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapPost("/api/auth/login", async (HttpContext httpContext) =>
{
    var claims = new[]
    {
        new Claim(ClaimTypes.NameIdentifier, "facilitator"),
        new Claim(ClaimTypes.Name, "Facilitator")
    };

    var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
    await httpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));
    return Results.Ok(new { message = "Login simulado correcto." });
});

app.MapPost("/api/auth/logout", async (HttpContext httpContext) =>
{
    await httpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.NoContent();
});

app.MapGet("/api/catalog/question-models", () =>
{
    var models = Enum.GetValues<QuestionKind>().Select(kind => new
    {
        kind,
        description = kind switch
        {
            QuestionKind.ShortText => "Respuesta breve individual.",
            QuestionKind.RichText => "Texto libre con más contexto.",
            QuestionKind.StickyNotes => "Captura múltiple estilo post-it.",
            QuestionKind.ColumnSort => "Clasificación en columnas.",
            QuestionKind.Choice => "Selección única o múltiple.",
            QuestionKind.Ranking => "Ordenación de opciones.",
            QuestionKind.Voting => "Priorización por votos.",
            QuestionKind.Matrix => "Evaluación en matriz simple.",
            _ => "Modelo base."
        }
    });

    return Results.Ok(models);
});

app.MapGet("/api/clients", async (AppDbContext db) =>
{
    var clients = await db.Clients
        .Include(x => x.Projects.OrderBy(project => project.Name))
        .ThenInclude(project => project.Sessions)
        .OrderBy(x => x.Name)
        .Select(client => new ClientSummaryDto(
            client.Id,
            client.Name,
            client.Industry,
            client.Projects.Select(project => new ProjectSummaryDto(
                project.Id,
                project.Name,
                project.Code,
                project.Sessions.Count)).ToList()))
        .ToListAsync();

    return Results.Ok(clients);
});

app.MapPost("/api/clients", async (CreateClientRequest request, AppDbContext db) =>
{
    var client = new Client { Name = request.Name.Trim(), Industry = request.Industry.Trim() };
    db.Clients.Add(client);
    await db.SaveChangesAsync();
    return Results.Created($"/api/clients/{client.Id}", client.Id);
}).RequireAuthorization();

app.MapPost("/api/projects", async (CreateProjectRequest request, AppDbContext db) =>
{
    var client = await db.Clients.FindAsync(request.ClientId);
    if (client is null)
    {
        return Results.NotFound(new { message = "Client not found." });
    }

    var project = new Project
    {
        ClientId = request.ClientId,
        Name = request.Name.Trim(),
        Code = request.Code.Trim().ToUpperInvariant()
    };

    db.Projects.Add(project);
    await db.SaveChangesAsync();
    return Results.Created($"/api/projects/{project.Id}", project.Id);
}).RequireAuthorization();

app.MapGet("/api/templates", async (AppDbContext db) =>
{
    var templates = await db.DynamicTemplates
        .Include(x => x.Sections)
        .ThenInclude(x => x.Questions)
        .OrderByDescending(x => x.UpdatedAtUtc)
        .ToListAsync();

    return Results.Ok(templates.Select(x => x.ToSummary()));
});

app.MapGet("/api/templates/{id:guid}", async (Guid id, AppDbContext db) =>
{
    var template = await db.DynamicTemplates
        .Include(x => x.Sections.OrderBy(section => section.Order))
        .ThenInclude(x => x.Questions.OrderBy(question => question.Order))
        .FirstOrDefaultAsync(x => x.Id == id);

    return template is null ? Results.NotFound() : Results.Ok(template.ToDefinition());
});

app.MapPost("/api/templates", async (CreateTemplateRequest request, AppDbContext db) =>
{
    var template = request.ToEntity();
    db.DynamicTemplates.Add(template);
    await db.SaveChangesAsync();
    return Results.Created($"/api/templates/{template.Id}", template.Id);
}).RequireAuthorization();

app.MapPost("/api/templates/import", async (ImportTemplateEnvelope envelope, AppDbContext db) =>
{
    if (envelope.Template.SchemaVersion is not ("frameit.dynamic-template/v1" or "frameit.dynamic-template/v2"))
    {
        return Results.BadRequest(new { message = "Unsupported template schema version." });
    }

    if (await db.DynamicTemplates.AnyAsync(x => x.Key == envelope.Template.Key))
    {
        return Results.Conflict(new { message = "A template with the same key already exists." });
    }

    var request = new CreateTemplateRequest(
        envelope.Template.Key,
        envelope.Template.Title,
        envelope.Template.Objective,
        envelope.Template.Audience,
        envelope.Template.FacilitatorGuidance,
        envelope.Template.Sections);

    var entity = request.ToEntity();
    db.DynamicTemplates.Add(entity);
    await db.SaveChangesAsync();
    return Results.Created($"/api/templates/{entity.Id}", entity.Id);
}).RequireAuthorization();

app.MapGet("/api/templates/{id:guid}/export", async (Guid id, AppDbContext db) =>
{
    var template = await db.DynamicTemplates
        .Include(x => x.Sections.OrderBy(section => section.Order))
        .ThenInclude(x => x.Questions.OrderBy(question => question.Order))
        .FirstOrDefaultAsync(x => x.Id == id);

    return template is null
        ? Results.NotFound()
        : Results.Text(template.ToJsonEnvelope(), "application/json");
});

app.MapGet("/api/sessions", async (HttpContext httpContext, AppDbContext db) =>
{
    var baseUrl = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}";
    var sessions = await db.WorkshopSessions
        .Include(x => x.Template)
        .OrderByDescending(x => x.UpdatedAtUtc)
        .ToListAsync();

    return Results.Ok(sessions.Select(session => session.ToSummary(baseUrl)));
});

app.MapPost("/api/sessions", async (CreateSessionRequest request, HttpContext httpContext, AppDbContext db) =>
{
    var template = await db.DynamicTemplates
        .Include(x => x.Sections.OrderBy(section => section.Order))
        .ThenInclude(x => x.Questions.OrderBy(question => question.Order))
        .FirstOrDefaultAsync(x => x.Id == request.TemplateId);

    if (template is null)
    {
        return Results.NotFound(new { message = "Template not found." });
    }

    if (!await db.Clients.AnyAsync(x => x.Id == request.ClientId))
    {
        return Results.NotFound(new { message = "Client not found." });
    }

    if (!await db.Projects.AnyAsync(x => x.Id == request.ProjectId && x.ClientId == request.ClientId))
    {
        return Results.BadRequest(new { message = "Project does not belong to client." });
    }

    var session = template.InstantiateSession(request, () => GenerateAccessCode(db));
    db.WorkshopSessions.Add(session);
    await db.SaveChangesAsync();

    var baseUrl = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}";
    return Results.Created($"/api/sessions/{session.Id}", session.ToSummary(baseUrl));
}).RequireAuthorization();

app.MapGet("/api/sessions/{id:guid}", async (Guid id, HttpContext httpContext, AppDbContext db) =>
{
    var session = await LoadSession(db, id);
    if (session is null)
    {
        return Results.NotFound();
    }

    var baseUrl = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}";
    return Results.Ok(session.ToSnapshot(baseUrl));
});

app.MapGet("/api/sessions/by-code/{accessCode}", async (string accessCode, HttpContext httpContext, AppDbContext db) =>
{
    var session = await LoadSessionByCode(db, accessCode.ToUpperInvariant());
    if (session is null)
    {
        return Results.NotFound();
    }

    var baseUrl = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}";
    return Results.Ok(session.ToSnapshot(baseUrl));
});

app.MapPost("/api/sessions/{id:guid}/join", async (
    Guid id,
    JoinSessionRequest request,
    HttpContext httpContext,
    IHubContext<SessionHub> hubContext,
    AppDbContext db) =>
{
    var session = await LoadSession(db, id);
    if (session is null)
    {
        return Results.NotFound();
    }

    var normalizedName = request.DisplayName.Trim();
    if (string.IsNullOrWhiteSpace(normalizedName))
    {
        return Results.BadRequest(new { message = "Display name is required." });
    }

    if (session.Participants.Any(x => x.DisplayName.ToLower() == normalizedName.ToLower()))
    {
        return Results.Conflict(new { message = "Display name already used in this session." });
    }

    var participant = new SessionParticipant
    {
        WorkshopSessionId = session.Id,
        DisplayName = normalizedName,
        IsConnected = true,
        JoinedAtUtc = DateTimeOffset.UtcNow
    };

    session.Participants.Add(participant);
    session.UpdatedAtUtc = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync();

    var baseUrl = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}";
    await hubContext.Clients.Group(session.AccessCode).SendAsync("session-updated", session.ToSnapshot(baseUrl));
    return Results.Ok(new { participant.Id });
});

app.MapPost("/api/sessions/{id:guid}/advance", async (
    Guid id,
    AdvanceSessionRequest request,
    HttpContext httpContext,
    IHubContext<SessionHub> hubContext,
    AppDbContext db) =>
{
    var session = await LoadSession(db, id);
    if (session is null)
    {
        return Results.NotFound();
    }

    session.Phase = request.Phase;
    session.ActiveSectionId = request.ActiveSectionId ?? session.ActiveSectionId;
    session.ActiveQuestionId = request.ActiveQuestionId ?? session.ActiveQuestionId;
    session.Status = request.Phase == SessionPhase.WrapUp ? SessionStatus.Closed : SessionStatus.Live;
    session.RoundOpen = request.Phase == SessionPhase.RoundOpen;
    session.ResultsVisible = request.Phase == SessionPhase.Results;
    session.RoundOpenedAtUtc = session.RoundOpen ? DateTimeOffset.UtcNow : session.RoundOpenedAtUtc;
    session.UpdatedAtUtc = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync();

    var baseUrl = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}";
    var snapshot = session.ToSnapshot(baseUrl);
    await hubContext.Clients.Group(session.AccessCode).SendAsync("session-updated", snapshot);
    return Results.Ok(snapshot);
}).RequireAuthorization();

app.MapPost("/api/sessions/{id:guid}/round-state", async (
    Guid id,
    UpdateRoundStateRequest request,
    HttpContext httpContext,
    IHubContext<SessionHub> hubContext,
    AppDbContext db) =>
{
    var session = await LoadSession(db, id);
    if (session is null)
    {
        return Results.NotFound();
    }

    session.Phase = request.Phase;
    session.RoundOpen = request.RoundOpen;
    session.ResultsVisible = request.ResultsVisible;
    session.ActiveSectionId = request.ActiveSectionId ?? session.ActiveSectionId;
    session.ActiveQuestionId = request.ActiveQuestionId ?? session.ActiveQuestionId;
    session.Status = request.Phase == SessionPhase.WrapUp ? SessionStatus.Closed : SessionStatus.Live;
    session.RoundOpenedAtUtc = request.RoundOpen ? DateTimeOffset.UtcNow : session.RoundOpenedAtUtc;
    session.UpdatedAtUtc = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync();

    var baseUrl = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}";
    var snapshot = session.ToSnapshot(baseUrl);
    await hubContext.Clients.Group(session.AccessCode).SendAsync("session-updated", snapshot);
    return Results.Ok(snapshot);
}).RequireAuthorization();

app.MapPost("/api/sessions/{id:guid}/responses", async (
    Guid id,
    SubmitResponseRequest request,
    HttpContext httpContext,
    IHubContext<SessionHub> hubContext,
    AppDbContext db) =>
{
    var session = await LoadSession(db, id);
    if (session is null)
    {
        return Results.NotFound();
    }

    var participant = session.Participants.FirstOrDefault(x => x.Id == request.ParticipantId);
    var question = session.Sections.SelectMany(x => x.Questions).FirstOrDefault(x => x.Id == request.QuestionId);
    if (participant is null || question is null)
    {
        return Results.BadRequest(new { message = "Participant or question not found for this session." });
    }

    var presentation = TemplateMapper.DeserializePresentation(question.SettingsJson);
    if (!session.RoundOpen && !presentation.AllowLateResponses)
    {
        return Results.BadRequest(new { message = "Round is closed." });
    }

    var response = new QuestionResponse
    {
        SessionQuestionId = question.Id,
        SessionParticipantId = participant.Id,
        Value = request.Value.Trim(),
        CreatedAtUtc = DateTimeOffset.UtcNow
    };

    var existing = question.Responses.FirstOrDefault(x => x.SessionParticipantId == participant.Id);
    if (existing is not null)
    {
        existing.Value = response.Value;
        existing.CreatedAtUtc = response.CreatedAtUtc;
    }
    else
    {
        question.Responses.Add(response);
    }

    session.UpdatedAtUtc = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync();

    var baseUrl = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}";
    var snapshot = session.ToSnapshot(baseUrl);
    await hubContext.Clients.Group(session.AccessCode).SendAsync("session-updated", snapshot);
    return Results.Ok(snapshot);
});

app.MapPost("/api/sessions/{id:guid}/outcomes", async (
    Guid id,
    AddOutcomeRequest request,
    HttpContext httpContext,
    IHubContext<SessionHub> hubContext,
    AppDbContext db) =>
{
    var session = await LoadSession(db, id);
    if (session is null)
    {
        return Results.NotFound();
    }

    session.Outcomes.Add(new SessionOutcome
    {
        WorkshopSessionId = session.Id,
        Bucket = request.Bucket.Trim(),
        Text = request.Text.Trim()
    });
    session.UpdatedAtUtc = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync();

    var baseUrl = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}";
    var snapshot = session.ToSnapshot(baseUrl);
    await hubContext.Clients.Group(session.AccessCode).SendAsync("session-updated", snapshot);
    return Results.Ok(snapshot);
}).RequireAuthorization();

app.MapHub<SessionHub>("/hubs/session");

app.Run();

static async Task<WorkshopSession?> LoadSession(AppDbContext db, Guid id)
{
    return await db.WorkshopSessions
        .Include(x => x.Template)
        .Include(x => x.Participants)
        .Include(x => x.Outcomes)
        .Include(x => x.Sections.OrderBy(section => section.Order))
        .ThenInclude(x => x.Questions.OrderBy(question => question.Order))
        .ThenInclude(x => x.Responses)
        .ThenInclude(x => x.SessionParticipant)
        .FirstOrDefaultAsync(x => x.Id == id);
}

static Task<WorkshopSession?> LoadSessionByCode(AppDbContext db, string accessCode)
{
    return db.WorkshopSessions
        .Include(x => x.Template)
        .Include(x => x.Participants)
        .Include(x => x.Outcomes)
        .Include(x => x.Sections.OrderBy(section => section.Order))
        .ThenInclude(x => x.Questions.OrderBy(question => question.Order))
        .ThenInclude(x => x.Responses)
        .ThenInclude(x => x.SessionParticipant)
        .FirstOrDefaultAsync(x => x.AccessCode == accessCode);
}

static string GenerateAccessCode(AppDbContext db)
{
    const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    string code;
    do
    {
        code = string.Create(6, alphabet, static (span, chars) =>
        {
            for (var index = 0; index < span.Length; index++)
            {
                span[index] = chars[Random.Shared.Next(chars.Length)];
            }
        });
    } while (db.WorkshopSessions.Any(x => x.AccessCode == code));

    return code;
}
