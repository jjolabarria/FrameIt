using System.Security.Claims;
using System.Text.Json.Serialization;
using FrameIt.Api.Data;
using FrameIt.Api.Hubs;
using FrameIt.Api.Services;
using FrameIt.Contracts;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args.Where(x => !x.StartsWith("--reset-local-auth") && !x.StartsWith("--confirm-local-auth-reset")).ToArray());

var publicUrls = new PublicUrls(builder.Configuration["FRAMEIT_PUBLIC_URL"]);
builder.Services.AddSingleton(publicUrls);
builder.Services.AddOpenApi();
builder.Services.AddSignalR();
builder.Services.AddHostedService<RoundTimerService>();
builder.Services.AddHttpClient<ISessionDocumentationService, SessionDocumentationService>((services, client) =>
{
    var options = services.GetRequiredService<Microsoft.Extensions.Options.IOptions<OpenAiOptions>>().Value;
    client.BaseAddress = new Uri(options.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(90);
});
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.Configure<S3StorageOptions>(builder.Configuration.GetSection("S3"));
builder.Services.Configure<OpenAiOptions>(builder.Configuration.GetSection("OpenAI"));
builder.Services.AddSingleton<IStorageService, S3StorageService>();
builder.AddLocalAuth();
builder.AddTemplateAssistant();
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
    await DatabaseStartup.ApplyMigrationsAsync(db);
    await scope.ServiceProvider.GetRequiredService<LocalAuth>().InitializeAsync(args.Contains("--reset-local-auth") && args.Contains("--confirm-local-auth-reset"));
}

if (args.Contains("--reset-local-auth")) return;

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapWorkspaceEndpoints();

app.MapLocalAuth();
app.MapTemplateAssistant();
app.MapGet("/api/health", async (AppDbContext db) => await db.Database.CanConnectAsync() ? Results.Ok(new { status = "healthy" }) : Results.StatusCode(503));

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
}).RequireAuthorization();

app.MapPost("/api/clients", async (CreateClientRequest request, AppDbContext db) =>
{
    if (!WorkspaceEndpoints.ValidClient(request.Name, request.Industry)) return Results.BadRequest(new { message = "Indica un nombre (máximo 160 caracteres) y sector (máximo 100)." });
    if (db.CurrentOrganizationId is not Guid organizationId) return Results.BadRequest(new { message = "Selecciona una organización antes de crear un cliente." });
    var client = new Client { Name = request.Name.Trim(), Industry = request.Industry.Trim(), OrganizationId = organizationId };
    db.Clients.Add(client);
    await db.SaveChangesAsync();
    return Results.Created($"/api/clients/{client.Id}", client.Id);
}).RequireAuthorization();

app.MapPost("/api/projects", async (CreateProjectRequest request, AppDbContext db) =>
{
    if (!WorkspaceEndpoints.ValidProject(request.Name, request.Code)) return Results.BadRequest(new { message = "Indica un nombre (máximo 160 caracteres) y código (máximo 30)." });
    var client = await db.Clients.SingleOrDefaultAsync(x => x.Id == request.ClientId);
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
    try { await db.SaveChangesAsync(); }
    catch (DbUpdateException exception) when (exception.InnerException is Npgsql.PostgresException { SqlState: Npgsql.PostgresErrorCodes.UniqueViolation })
    {
        return Results.Conflict(new { message = "Este cliente ya tiene un proyecto con ese código. Utiliza otro código." });
    }
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
}).RequireAuthorization();

app.MapGet("/api/templates/{id:guid}", async (Guid id, AppDbContext db) =>
{
    var template = await db.DynamicTemplates
        .Include(x => x.Sections.OrderBy(section => section.Order))
        .ThenInclude(x => x.Questions.OrderBy(question => question.Order))
        .FirstOrDefaultAsync(x => x.Id == id);

    return template is null ? Results.NotFound() : Results.Ok(template.ToDefinition());
}).RequireAuthorization();

app.MapPost("/api/templates", async (CreateTemplateRequest request, AppDbContext db) =>
{
    if (db.CurrentOrganizationId is not Guid organizationId) return Results.BadRequest(new { message = "Selecciona una organización antes de crear una plantilla." });
    if (TemplateValidation.Validate(request) is { } error) return Results.BadRequest(new { message = error });
    if (await db.DynamicTemplates.AnyAsync(x => x.Key == request.Key)) return Results.Conflict(new { message = "Ya existe una plantilla con esa clave." });
    var template = request.ToEntity();
    template.OrganizationId = organizationId;
    db.DynamicTemplates.Add(template);
    await db.SaveChangesAsync();
    return Results.Created($"/api/templates/{template.Id}", template.Id);
}).RequireAuthorization();

app.MapPost("/api/templates/import", async (ImportTemplateEnvelope envelope, AppDbContext db) =>
{
    if (db.CurrentOrganizationId is not Guid organizationId) return Results.BadRequest(new { message = "Selecciona una organización antes de importar una plantilla." });
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

    if (TemplateValidation.Validate(request) is { } error) return Results.BadRequest(new { message = error });
    var entity = request.ToEntity();
    entity.OrganizationId = organizationId;
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
}).RequireAuthorization();

app.MapGet("/api/sessions", async (HttpContext httpContext, AppDbContext db) =>
{
    var baseUrl = publicUrls.Origin(httpContext.Request);
    var sessions = await db.WorkshopSessions
        .Include(x => x.Template)
        .OrderByDescending(x => x.UpdatedAtUtc)
        .ToListAsync();

    return Results.Ok(sessions.Select(session => session.ToSummary(baseUrl)));
}).RequireAuthorization();

app.MapPost("/api/sessions", async (CreateSessionRequest request, HttpContext httpContext, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length > 160)
        return Results.BadRequest(new { message = "Indica un nombre de sesión de hasta 160 caracteres." });
    var template = await db.DynamicTemplates
        .Include(x => x.Sections.OrderBy(section => section.Order))
        .ThenInclude(x => x.Questions.OrderBy(question => question.Order))
        .FirstOrDefaultAsync(x => x.Id == request.TemplateId);

    if (template is null)
    {
        return Results.NotFound(new { message = "Template not found." });
    }

    var sessionClient = await db.Clients.SingleOrDefaultAsync(x => x.Id == request.ClientId);
    if (sessionClient is null)
    {
        return Results.NotFound(new { message = "Client not found." });
    }

    if (!template.IsBuiltIn && template.OrganizationId != sessionClient.OrganizationId)
        return Results.BadRequest(new { message = "La plantilla y el cliente deben pertenecer a la misma organización." });

    if (!await db.Projects.AnyAsync(x => x.Id == request.ProjectId && x.ClientId == request.ClientId))
    {
        return Results.BadRequest(new { message = "Project does not belong to client." });
    }

    var session = template.InstantiateSession(request, () => GenerateAccessCode(db));
    db.WorkshopSessions.Add(session);
    await db.SaveChangesAsync();

    var baseUrl = publicUrls.Origin(httpContext.Request);
    return Results.Created($"/api/sessions/{session.Id}", session.ToSummary(baseUrl));
}).RequireAuthorization();

app.MapGet("/api/sessions/{id:guid}", async (Guid id, HttpContext httpContext, AppDbContext db) =>
{
    var session = await LoadSession(db, id);
    if (session is null)
    {
        return Results.NotFound();
    }

    var baseUrl = publicUrls.Origin(httpContext.Request);
    return Results.Ok(session.ToSnapshot(baseUrl));
}).RequireAuthorization();

app.MapGet("/api/sessions/{id:guid}/facilitator", async (Guid id, HttpContext httpContext, AppDbContext db) =>
{
    var session = await LoadSession(db, id);
    return session is null ? Results.NotFound() : Results.Ok(session.ToSnapshot(publicUrls.Origin(httpContext.Request), facilitator: true));
}).RequireAuthorization();

app.MapGet("/api/sessions/{id:guid}/agenda", async (Guid id, AppDbContext db) =>
{
    var session = await LoadSession(db, id);
    return session is null ? Results.NotFound() : Results.Ok(session.Sections.OrderBy(x => x.Order)
        .Select(section => new SessionAgendaSectionDto(section.Id, section.Title, section.Order,
            section.Questions.OrderBy(x => x.Order).Select(q => new SessionAgendaQuestionDto(q.Id, q.Title, q.Order)).ToList())));
}).RequireAuthorization();

app.MapGet("/api/sessions/by-code/{accessCode}", async (string accessCode, HttpContext httpContext, AppDbContext db) =>
{
    var session = await LoadSessionByCode(db, accessCode.ToUpperInvariant());
    if (session is null)
    {
        return Results.NotFound();
    }

    var baseUrl = publicUrls.Origin(httpContext.Request);
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

    db.SessionParticipants.Add(participant);
    var updatedAtUtc = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync();
    await db.WorkshopSessions
        .Where(x => x.Id == session.Id)
        .ExecuteUpdateAsync(setters => setters
            .SetProperty(x => x.UpdatedAtUtc, updatedAtUtc));

    // EF relationship fix-up normally adds the tracked participant to this collection.
    if (!session.Participants.Any(x => x.Id == participant.Id)) session.Participants.Add(participant);
    session.UpdatedAtUtc = updatedAtUtc;

    var baseUrl = publicUrls.Origin(httpContext.Request);
    await hubContext.PublishSession(session, baseUrl, db);
    return Results.Ok(new { participant.Id });
});

app.MapDelete("/api/sessions/{id:guid}/participants/{participantId:guid}", async (
    Guid id,
    Guid participantId,
    HttpContext httpContext,
    IHubContext<SessionHub> hubContext,
    AppDbContext db) =>
{
    var session = await LoadSession(db, id);
    if (session is null)
    {
        return Results.NotFound();
    }

    var participant = session.Participants.FirstOrDefault(x => x.Id == participantId);
    if (participant is null)
    {
        return Results.NotFound();
    }

    await db.QuestionResponses
        .Where(x => x.SessionParticipantId == participantId)
        .ExecuteDeleteAsync();

    await db.SessionSatisfactionResponses
        .Where(x => x.SessionParticipantId == participantId)
        .ExecuteDeleteAsync();

    await db.ParticipantQuestions
        .Where(x => x.SessionParticipantId == participantId)
        .ExecuteDeleteAsync();

    await db.SessionAttachments
        .Where(x => x.SessionParticipantId == participantId)
        .ExecuteDeleteAsync();

    await db.SessionParticipants
        .Where(x => x.Id == participantId && x.WorkshopSessionId == id)
        .ExecuteDeleteAsync();

    var updatedAtUtc = DateTimeOffset.UtcNow;
    await db.WorkshopSessions
        .Where(x => x.Id == id)
        .ExecuteUpdateAsync(setters => setters
            .SetProperty(x => x.UpdatedAtUtc, updatedAtUtc));

    db.ChangeTracker.Clear();
    var refreshedSession = await LoadSession(db, id);
    if (refreshedSession is null)
    {
        return Results.NotFound();
    }

    var baseUrl = publicUrls.Origin(httpContext.Request);
    var snapshot = refreshedSession.ToSnapshot(baseUrl, facilitator: true);
    await hubContext.PublishSession(refreshedSession, baseUrl, db);
    return Results.Ok(snapshot);
}).RequireAuthorization();

app.MapPost("/api/sessions/{id:guid}/advance", async (
    Guid id,
    AdvanceSessionRequest request,
    HttpContext httpContext,
    IHubContext<SessionHub> hubContext,
    AppDbContext db) =>
{
    await using var transaction = await db.Database.BeginTransactionAsync();
    await db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM \"WorkshopSessions\" WHERE \"Id\" = {id} FOR UPDATE");
    var session = await LoadSession(db, id);
    if (session is null)
    {
        return Results.NotFound();
    }

    var nextActiveSectionId = request.ActiveSectionId ?? session.ActiveSectionId;
    var nextActiveQuestionId = request.ActiveQuestionId ?? session.ActiveQuestionId;
    if (!session.Sections.Any(section => section.Id == nextActiveSectionId && section.Questions.Any(q => q.Id == nextActiveQuestionId)))
        return Results.BadRequest(new { message = "La pregunta no pertenece al bloque de esta sesión." });
    var nextStatus = request.Phase == SessionPhase.WrapUp ? SessionStatus.Closed : SessionStatus.Live;
    var nextRoundOpen = request.Phase == SessionPhase.RoundOpen;
    var nextResultsVisible = request.Phase == SessionPhase.Results;
    // Changing phase closes the survey. Finalized sessions never accept feedback.
    var nextSatisfactionSurveyOpen = false;
    // PostgreSQL stores microseconds; return the same precision used for round identity.
    var roundClockNow = DateTimeOffset.UtcNow;
    roundClockNow = roundClockNow.AddTicks(-(roundClockNow.Ticks % 10));
    var nextRoundOpenedAtUtc = nextRoundOpen ? roundClockNow : nextActiveQuestionId != session.ActiveQuestionId ? null : session.RoundOpenedAtUtc;
    var nextUpdatedAtUtc = DateTimeOffset.UtcNow;
    var nextSessionStartedAtUtc = session.SessionStartedAtUtc ?? (session.TracksSessionTime && nextRoundOpen ? nextRoundOpenedAtUtc : null);

    await db.WorkshopSessions
        .Where(x => x.Id == id)
        .ExecuteUpdateAsync(setters => setters
            .SetProperty(x => x.Phase, request.Phase)
            .SetProperty(x => x.ActiveSectionId, nextActiveSectionId)
            .SetProperty(x => x.ActiveQuestionId, nextActiveQuestionId)
            .SetProperty(x => x.Status, nextStatus)
            .SetProperty(x => x.RoundOpen, nextRoundOpen)
            .SetProperty(x => x.ResultsVisible, nextResultsVisible)
            .SetProperty(x => x.SatisfactionSurveyOpen, nextSatisfactionSurveyOpen)
            .SetProperty(x => x.RoundOpenedAtUtc, nextRoundOpenedAtUtc)
            .SetProperty(x => x.SessionStartedAtUtc, x => x.SessionStartedAtUtc ?? nextSessionStartedAtUtc)
            .SetProperty(x => x.UpdatedAtUtc, nextUpdatedAtUtc));

    session.Phase = request.Phase;
    session.ActiveSectionId = nextActiveSectionId;
    session.ActiveQuestionId = nextActiveQuestionId;
    session.Status = nextStatus;
    session.RoundOpen = nextRoundOpen;
    session.ResultsVisible = nextResultsVisible;
    session.SatisfactionSurveyOpen = nextSatisfactionSurveyOpen;
    session.RoundOpenedAtUtc = nextRoundOpenedAtUtc;
    session.SessionStartedAtUtc = nextSessionStartedAtUtc;
    session.UpdatedAtUtc = nextUpdatedAtUtc;

    await transaction.CommitAsync();

    var baseUrl = publicUrls.Origin(httpContext.Request);
    var snapshot = session.ToSnapshot(baseUrl, facilitator: true);
    await hubContext.PublishSession(session, baseUrl, db);
    return Results.Ok(snapshot);
}).RequireAuthorization();

app.MapPost("/api/sessions/{id:guid}/round-state", async (
    Guid id,
    UpdateRoundStateRequest request,
    HttpContext httpContext,
    IHubContext<SessionHub> hubContext,
    AppDbContext db) =>
{
    await using var transaction = await db.Database.BeginTransactionAsync();
    await db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM \"WorkshopSessions\" WHERE \"Id\" = {id} FOR UPDATE");
    var session = await LoadSession(db, id);
    if (session is null)
    {
        return Results.NotFound();
    }

    var nextActiveSectionId = request.ActiveSectionId ?? session.ActiveSectionId;
    var nextActiveQuestionId = request.ActiveQuestionId ?? session.ActiveQuestionId;
    if (!session.Sections.Any(section => section.Id == nextActiveSectionId && section.Questions.Any(q => q.Id == nextActiveQuestionId)))
        return Results.BadRequest(new { message = "La pregunta no pertenece al bloque de esta sesión." });
    var nextStatus = request.Phase == SessionPhase.WrapUp ? SessionStatus.Closed : SessionStatus.Live;
    var nextRoundOpen = request.Phase == SessionPhase.RoundOpen && request.RoundOpen;
    // Changing phase closes the survey. Finalized sessions never accept feedback.
    var nextSatisfactionSurveyOpen = false;
    // PostgreSQL stores microseconds; return the same precision used for round identity.
    var roundClockNow = DateTimeOffset.UtcNow;
    roundClockNow = roundClockNow.AddTicks(-(roundClockNow.Ticks % 10));
    var nextRoundOpenedAtUtc = nextRoundOpen ? roundClockNow : nextActiveQuestionId != session.ActiveQuestionId ? null : session.RoundOpenedAtUtc;
    var nextUpdatedAtUtc = DateTimeOffset.UtcNow;
    var nextSessionStartedAtUtc = session.SessionStartedAtUtc ?? (session.TracksSessionTime && nextRoundOpen ? nextRoundOpenedAtUtc : null);

    await db.WorkshopSessions
        .Where(x => x.Id == id)
        .ExecuteUpdateAsync(setters => setters
            .SetProperty(x => x.Phase, request.Phase)
            .SetProperty(x => x.RoundOpen, nextRoundOpen)
            .SetProperty(x => x.ResultsVisible, request.ResultsVisible)
            .SetProperty(x => x.ActiveSectionId, nextActiveSectionId)
            .SetProperty(x => x.ActiveQuestionId, nextActiveQuestionId)
            .SetProperty(x => x.Status, nextStatus)
            .SetProperty(x => x.SatisfactionSurveyOpen, nextSatisfactionSurveyOpen)
            .SetProperty(x => x.RoundOpenedAtUtc, nextRoundOpenedAtUtc)
            .SetProperty(x => x.SessionStartedAtUtc, x => x.SessionStartedAtUtc ?? nextSessionStartedAtUtc)
            .SetProperty(x => x.UpdatedAtUtc, nextUpdatedAtUtc));

    session.Phase = request.Phase;
    session.RoundOpen = nextRoundOpen;
    session.ResultsVisible = request.ResultsVisible;
    session.ActiveSectionId = nextActiveSectionId;
    session.ActiveQuestionId = nextActiveQuestionId;
    session.Status = nextStatus;
    session.SatisfactionSurveyOpen = nextSatisfactionSurveyOpen;
    session.RoundOpenedAtUtc = nextRoundOpenedAtUtc;
    session.SessionStartedAtUtc = nextSessionStartedAtUtc;
    session.UpdatedAtUtc = nextUpdatedAtUtc;

    await transaction.CommitAsync();

    var baseUrl = publicUrls.Origin(httpContext.Request);
    var snapshot = session.ToSnapshot(baseUrl, facilitator: true);
    await hubContext.PublishSession(session, baseUrl, db);
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

    if (request.QuestionId != session.ActiveQuestionId)
        return Results.Conflict(new { message = "La pregunta ha cambiado. Tu borrador se conserva; revisa la pregunta actual." });
    if (string.IsNullOrWhiteSpace(request.Value))
        return Results.BadRequest(new { message = "Escribe una respuesta antes de enviarla." });
    var presentation = TemplateMapper.DeserializePresentation(question.SettingsJson);
    if ((!session.RoundOpen || RoundTimerService.HasExpired(session, presentation.TimerSeconds, DateTimeOffset.UtcNow)) && !presentation.AllowLateResponses)
    {
        return Results.BadRequest(new { message = "La ronda está cerrada. Tu borrador se conserva." });
    }

    var response = new QuestionResponse
    {
        SessionQuestionId = question.Id,
        SessionParticipantId = participant.Id,
        Value = request.Value.Trim(),
        CreatedAtUtc = DateTimeOffset.UtcNow
    };

    var existing = await db.QuestionResponses
        .FirstOrDefaultAsync(x => x.SessionQuestionId == question.Id && x.SessionParticipantId == participant.Id);
    if (existing is not null)
    {
        existing.Value = response.Value;
        existing.CreatedAtUtc = response.CreatedAtUtc;
    }
    else
    {
        db.QuestionResponses.Add(response);
    }

    await db.SaveChangesAsync();
    var updatedAtUtc = DateTimeOffset.UtcNow;
    await db.WorkshopSessions
        .Where(x => x.Id == session.Id)
        .ExecuteUpdateAsync(setters => setters
            .SetProperty(x => x.UpdatedAtUtc, updatedAtUtc));

    var baseUrl = publicUrls.Origin(httpContext.Request);
    db.ChangeTracker.Clear();
    var refreshedSession = await LoadSession(db, id);
    if (refreshedSession is null)
    {
        return Results.NotFound();
    }

    var snapshot = refreshedSession.ToSnapshot(baseUrl);
    await hubContext.PublishSession(refreshedSession, baseUrl, db);
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

    var baseUrl = publicUrls.Origin(httpContext.Request);
    var snapshot = session.ToSnapshot(baseUrl, facilitator: true);
    await hubContext.PublishSession(session, baseUrl, db);
    return Results.Ok(snapshot);
}).RequireAuthorization();

app.MapPost("/api/sessions/{id:guid}/questions", async (
    Guid id,
    AskFacilitatorQuestionRequest request,
    HttpContext httpContext,
    IHubContext<SessionHub> hubContext,
    AppDbContext db) =>
{
    await using var transaction = await db.Database.BeginTransactionAsync();
    await db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM \"WorkshopSessions\" WHERE \"Id\" = {id} FOR UPDATE");
    var session = await LoadSession(db, id);
    if (session is null)
    {
        return Results.NotFound();
    }

    var participant = session.Participants.FirstOrDefault(x => x.Id == request.ParticipantId);
    if (participant is null || string.IsNullOrWhiteSpace(request.Question))
    {
        return Results.BadRequest(new { message = "Participante o pregunta no válidos." });
    }

    if (request.Question.Trim().Length > 2000) return Results.BadRequest(new { message = "La pregunta no puede superar 2000 caracteres." });
    if (request.ExpectedQuestionId.HasValue && (request.ExpectedQuestionId != session.ActiveQuestionId || request.ExpectedRoundOpenedAtUtc?.UtcTicks / 10 != session.RoundOpenedAtUtc?.UtcTicks / 10))
        return Results.Conflict(new { message = "La ronda ha cambiado. Revisa el contexto y asocia tu borrador a la ronda actual antes de enviarlo." });
    var sentAt = DateTimeOffset.UtcNow;
    var section = session.Sections.FirstOrDefault(s => s.Id == session.ActiveSectionId);
    var round = section?.Questions.FirstOrDefault(q => q.Id == session.ActiveQuestionId);
    var orderedQuestions = session.Sections.OrderBy(s => s.Order).SelectMany(s => s.Questions.OrderBy(q => q.Order)).ToList();
    int? Elapsed(DateTimeOffset? began) => began.HasValue ? (int)Math.Max(0, (sentAt - began.Value).TotalSeconds) : null;
    var context = new QuestionRoundContextDto(round?.Id, round == null ? null : orderedQuestions.FindIndex(q => q.Id == round.Id) + 1,
        section?.Title, round?.Title, session.Phase, session.RoundOpenedAtUtc,
        Elapsed(session.SessionStartedAtUtc), Elapsed(session.RoundOpenedAtUtc), session.TracksSessionTime);
    db.ParticipantQuestions.Add(new ParticipantQuestion
    {
        WorkshopSessionId = session.Id,
        SessionParticipantId = participant.Id,
        Question = request.Question.Trim(),
        CreatedAtUtc = sentAt,
        RoundContextJson = System.Text.Json.JsonSerializer.Serialize(context)
    });
    await db.SaveChangesAsync();
    var updatedAtUtc = DateTimeOffset.UtcNow;
    await db.WorkshopSessions
        .Where(x => x.Id == session.Id)
        .ExecuteUpdateAsync(setters => setters
            .SetProperty(x => x.UpdatedAtUtc, updatedAtUtc));

    await transaction.CommitAsync();
    var baseUrl = publicUrls.Origin(httpContext.Request);
    db.ChangeTracker.Clear();
    var refreshedSession = await LoadSession(db, id);
    if (refreshedSession is null)
    {
        return Results.NotFound();
    }

    var snapshot = refreshedSession.ToSnapshot(baseUrl);
    await hubContext.PublishSession(refreshedSession, baseUrl, db);
    return Results.Ok(snapshot);
});

app.MapGet("/api/sessions/{id:guid}/feedback-status", async (Guid id, Guid participantId, HttpContext httpContext, AppDbContext db) =>
{
    httpContext.Response.Headers.CacheControl = "no-store";
    var receipt = await db.WorkshopSessions.AsNoTracking()
        .Where(x => x.Id == id && x.Participants.Any(p => p.Id == participantId))
        .Select(x => new
        {
            submitted = x.SatisfactionResponses.Any(r => r.SessionParticipantId == participantId),
            canSubmit = x.Status != SessionStatus.Closed && x.Phase != SessionPhase.WrapUp && x.SatisfactionSurveyOpen
                && !x.SatisfactionResponses.Any(r => r.SessionParticipantId == participantId)
        }).SingleOrDefaultAsync();
    return receipt is null ? Results.NotFound() : Results.Ok(receipt);
});

app.MapPost("/api/sessions/{id:guid}/feedback", async (
    Guid id,
    SubmitSatisfactionSurveyRequest request,
    HttpContext httpContext,
    IHubContext<SessionHub> hubContext,
    AppDbContext db) =>
{
    await using var transaction = await db.Database.BeginTransactionAsync();
    await db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM \"WorkshopSessions\" WHERE \"Id\" = {id} FOR UPDATE");
    var session = await LoadSession(db, id);
    if (session is null)
    {
        return Results.NotFound();
    }

    if (session.Status == SessionStatus.Closed || session.Phase == SessionPhase.WrapUp || !session.SatisfactionSurveyOpen)
    {
        return Results.Conflict(new { message = "La valoración está cerrada. Ya no se admiten envíos." });
    }

    if (request.Rating is < 1 or > 5)
    {
        return Results.BadRequest(new { message = "La valoración debe estar entre 1 y 5." });
    }

    var participant = session.Participants.FirstOrDefault(x => x.Id == request.ParticipantId);
    if (participant is null)
    {
        return Results.BadRequest(new { message = "Participante no válido." });
    }

    var comment = request.Comment?.Trim() ?? string.Empty;
    if (comment.Length > 2000)
    {
        return Results.BadRequest(new { message = "El comentario no puede superar los 2000 caracteres." });
    }

    var submittedAtUtc = DateTimeOffset.UtcNow;
    var existingResponse = await db.SessionSatisfactionResponses
        .FirstOrDefaultAsync(x => x.WorkshopSessionId == session.Id && x.SessionParticipantId == participant.Id);
    if (existingResponse is not null)
        return Results.Conflict(new { message = "Tu valoración ya está registrada y no se puede modificar." });

    db.SessionSatisfactionResponses.Add(new SessionSatisfactionResponse
    {
        WorkshopSessionId = session.Id,
        SessionParticipantId = participant.Id,
        Rating = request.Rating,
        Comment = comment,
        SubmittedAtUtc = submittedAtUtc
    });

    await db.SaveChangesAsync();
    await db.WorkshopSessions
        .Where(x => x.Id == session.Id)
        .ExecuteUpdateAsync(setters => setters
            .SetProperty(x => x.UpdatedAtUtc, submittedAtUtc));

    await transaction.CommitAsync();

    var baseUrl = publicUrls.Origin(httpContext.Request);
    db.ChangeTracker.Clear();
    var refreshedSession = await LoadSession(db, id);
    if (refreshedSession is null)
    {
        return Results.NotFound();
    }

    var snapshot = refreshedSession.ToSnapshot(baseUrl);
    await hubContext.PublishSession(refreshedSession, baseUrl, db);
    return Results.Ok(snapshot);
});

app.MapPost("/api/sessions/{id:guid}/survey-state", async (
    Guid id,
    UpdateSatisfactionSurveyStateRequest request,
    HttpContext httpContext,
    IHubContext<SessionHub> hubContext,
    AppDbContext db) =>
{
    await using var transaction = await db.Database.BeginTransactionAsync();
    await db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM \"WorkshopSessions\" WHERE \"Id\" = {id} FOR UPDATE");
    var session = await LoadSession(db, id);
    if (session is null)
    {
        return Results.NotFound();
    }

    if (request.IsOpen && (session.Status == SessionStatus.Closed || session.Phase == SessionPhase.WrapUp))
        return Results.Conflict(new { message = "La sesión está finalizada. Reábrela antes de lanzar una encuesta." });

    var updatedAtUtc = DateTimeOffset.UtcNow;
    await db.WorkshopSessions
        .Where(x => x.Id == id)
        .ExecuteUpdateAsync(setters => setters
            .SetProperty(x => x.SatisfactionSurveyOpen, request.IsOpen)
            .SetProperty(x => x.UpdatedAtUtc, updatedAtUtc));

    session.SatisfactionSurveyOpen = request.IsOpen;
    session.UpdatedAtUtc = updatedAtUtc;

    await transaction.CommitAsync();

    var baseUrl = publicUrls.Origin(httpContext.Request);
    var snapshot = session.ToSnapshot(baseUrl, facilitator: true);
    await hubContext.PublishSession(session, baseUrl, db);
    return Results.Ok(snapshot);
}).RequireAuthorization();

app.MapPost("/api/sessions/{id:guid}/attachments", async (
    Guid id,
    HttpRequest request,
    HttpContext httpContext,
    IHubContext<SessionHub> hubContext,
    AppDbContext db,
    IStorageService storage,
    CancellationToken cancellationToken) =>
{
    var session = await LoadSession(db, id);
    if (session is null)
    {
        return Results.NotFound();
    }

    var form = await request.ReadFormAsync(cancellationToken);
    var participantIdRaw = form["participantId"].ToString();
    if (!Guid.TryParse(participantIdRaw, out var participantId))
    {
        return Results.BadRequest(new { message = "participantId es obligatorio." });
    }

    var participant = session.Participants.FirstOrDefault(x => x.Id == participantId);
    var file = form.Files.FirstOrDefault();
    if (participant is null || file is null || file.Length == 0)
    {
        return Results.BadRequest(new { message = "Adjunto no válido." });
    }

    await using var stream = file.OpenReadStream();
    var stored = await storage.UploadAsync(stream, file.FileName, file.ContentType, cancellationToken);

    db.SessionAttachments.Add(new SessionAttachment
    {
        WorkshopSessionId = session.Id,
        SessionParticipantId = participant.Id,
        FileName = stored.FileName,
        ContentType = stored.ContentType,
        SizeBytes = stored.SizeBytes,
        StorageKey = stored.StorageKey,
        Url = stored.Url,
        UploadedAtUtc = DateTimeOffset.UtcNow
    });
    await db.SaveChangesAsync(cancellationToken);
    var updatedAtUtc = DateTimeOffset.UtcNow;
    await db.WorkshopSessions
        .Where(x => x.Id == session.Id)
        .ExecuteUpdateAsync(setters => setters
            .SetProperty(x => x.UpdatedAtUtc, updatedAtUtc), cancellationToken);

    var baseUrl = publicUrls.Origin(httpContext.Request);
    db.ChangeTracker.Clear();
    var refreshedSession = await LoadSession(db, id);
    if (refreshedSession is null)
    {
        return Results.NotFound();
    }

    var snapshot = refreshedSession.ToSnapshot(baseUrl);
    await hubContext.PublishSession(refreshedSession, baseUrl, db, cancellationToken);
    return Results.Ok(snapshot);
});

app.MapGet("/api/sessions/{id:guid}/documentation.pdf", async (
    Guid id,
    AppDbContext db,
    ISessionDocumentationService documentationService,
    CancellationToken cancellationToken) =>
{
    var session = await LoadSession(db, id);
    if (session is null)
    {
        return Results.NotFound();
    }

    try
    {
        var artifact = await documentationService.GeneratePdfAsync(session, cancellationToken);
        return Results.File(artifact.Content, "application/pdf", artifact.FileName);
    }
    catch (InvalidOperationException exception)
    {
        return Results.Problem(exception.Message, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
}).RequireAuthorization();

app.MapHub<SessionHub>("/hubs/session", options => options.CloseOnAuthenticationExpiration = true);

app.Run();

static async Task<WorkshopSession?> LoadSession(AppDbContext db, Guid id)
{
    return await db.WorkshopSessions
        .Include(x => x.Client)
        .Include(x => x.Project)
        .Include(x => x.Template)
        .Include(x => x.Participants)
        .Include(x => x.Outcomes)
        .Include(x => x.SatisfactionResponses)
        .Include(x => x.ParticipantQuestions)
        .ThenInclude(x => x.SessionParticipant)
        .Include(x => x.Attachments)
        .ThenInclude(x => x.SessionParticipant)
        .Include(x => x.Sections.OrderBy(section => section.Order))
        .ThenInclude(x => x.Questions.OrderBy(question => question.Order))
        .ThenInclude(x => x.Responses)
        .ThenInclude(x => x.SessionParticipant)
        .FirstOrDefaultAsync(x => x.Id == id);
}

static Task<WorkshopSession?> LoadSessionByCode(AppDbContext db, string accessCode)
{
    return db.WorkshopSessions
        .Include(x => x.Client)
        .Include(x => x.Project)
        .Include(x => x.Template)
        .Include(x => x.Participants)
        .Include(x => x.Outcomes)
        .Include(x => x.SatisfactionResponses)
        .Include(x => x.ParticipantQuestions)
        .ThenInclude(x => x.SessionParticipant)
        .Include(x => x.Attachments)
        .ThenInclude(x => x.SessionParticipant)
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
    } while (db.WorkshopSessions.IgnoreQueryFilters().Any(x => x.AccessCode == code));

    return code;
}
