using FrameIt.Api.Data;
using FrameIt.Contracts;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using FrameIt.Api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace FrameIt.Api.Services;

public sealed record ArchiveRequest(bool Archived);

public static class LifecycleEndpoints
{
    public sealed class SessionTransaction(Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction, bool ownsTransaction) : IAsyncDisposable
    {
        public Task CommitAsync() => ownsTransaction ? transaction.CommitAsync() : Task.CompletedTask;
        public ValueTask DisposeAsync() => ownsTransaction ? transaction.DisposeAsync() : ValueTask.CompletedTask;
    }

    public static async Task<SessionTransaction> ReuseSessionTransaction(AppDbContext db)
        => db.Database.CurrentTransaction is { } current ? new(current, false) : new(await db.Database.BeginTransactionAsync(), true);

    // Shared with creation and session mutations. Locks are scoped to one entity and one transaction.
    public static Task Lock(AppDbContext db, string kind, Guid id, CancellationToken ct = default)
        => db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtextextended({kind + ":" + id}, 0))", ct);

    public static async Task<IResult> Change(string kind, Guid id, bool? archived, AppDbContext db, CancellationToken ct)
    {
        object? entity = kind switch
        {
            "clients" => await db.Clients.SingleOrDefaultAsync(x => x.Id == id, ct),
            "projects" => await db.Projects.SingleOrDefaultAsync(x => x.Id == id, ct),
            "templates" => await db.DynamicTemplates.SingleOrDefaultAsync(x => x.Id == id, ct),
            "sessions" => await db.WorkshopSessions.SingleOrDefaultAsync(x => x.Id == id, ct),
            _ => null
        };
        if (entity is null) return Results.NotFound();
        if (entity is DynamicTemplate { IsBuiltIn: true }) return Results.Conflict(new { message = "Las plantillas incorporadas están protegidas. Puedes crear una variante propia." });
        if (archived is bool value)
        {
            if (entity is WorkshopSession { Status: SessionStatus.Live } && value)
                return Results.Conflict(new { message = "Finaliza la sesión antes de archivarla." });
            db.Entry(entity).Property("IsArchived").CurrentValue = value;
        }
        else
        {
            var hasDependencies = kind switch
            {
                "clients" => await db.Projects.AnyAsync(x => x.ClientId == id, ct) || await db.WorkshopSessions.AnyAsync(x => x.ClientId == id, ct),
                "projects" => await db.WorkshopSessions.AnyAsync(x => x.ProjectId == id, ct),
                "templates" => await db.WorkshopSessions.AnyAsync(x => x.TemplateId == id, ct),
                "sessions" => ((WorkshopSession)entity).Status != SessionStatus.Draft
                    || await db.SessionParticipants.AnyAsync(x => x.WorkshopSessionId == id, ct)
                    || await db.Set<SessionOutcome>().AnyAsync(x => x.WorkshopSessionId == id, ct)
                    || await db.SessionAttachments.AnyAsync(x => x.WorkshopSessionId == id, ct)
                    || await db.ParticipantQuestions.AnyAsync(x => x.WorkshopSessionId == id, ct)
                    || await db.SessionSatisfactionResponses.AnyAsync(x => x.WorkshopSessionId == id, ct)
                    || await db.QuestionResponses.AnyAsync(x => x.SessionQuestion!.SessionSection!.WorkshopSessionId == id, ct),
                _ => true
            };
            if (hasDependencies) return Results.Conflict(new { message = kind == "sessions"
                ? "Solo puedes eliminar sesiones preparadas sin participantes, aportaciones ni archivos. Puedes archivar esta sesión cuando esté finalizada."
                : "Este elemento tiene datos asociados, incluidos los archivados. Archívalo para conservar su historial." });
            db.Remove(entity);
        }
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    public static void MapLifecycle(this WebApplication app)
    {
        // Every session write shares the lock with archival/deletion, including anonymous participant requests.
        app.Use(async (http, next) =>
        {
            var parts = http.Request.Path.Value?.Split('/', StringSplitOptions.RemoveEmptyEntries) ?? [];
            if (HttpMethods.IsGet(http.Request.Method) || HttpMethods.IsHead(http.Request.Method) || HttpMethods.IsOptions(http.Request.Method)
                || parts.Length < 3 || parts[0] != "api" || parts[1] != "sessions" || !Guid.TryParse(parts[2], out var id))
            { await next(http); return; }
            var db = http.RequestServices.GetRequiredService<AppDbContext>();
            await using var transaction = await db.Database.BeginTransactionAsync(http.RequestAborted);
            await Lock(db, "sessions", id, http.RequestAborted);
            if (await db.WorkshopSessions.AnyAsync(x => x.Id == id && x.IsArchived, http.RequestAborted))
            { http.Response.StatusCode = 409; await http.Response.WriteAsJsonAsync(new { message = "La sesión está archivada. Restáurala para volver a modificarla o participar." }); return; }
            await next(http);
            if (http.Response.StatusCode < 400) await transaction.CommitAsync(http.RequestAborted);
            else await transaction.RollbackAsync(CancellationToken.None);
        });
        var group = app.MapGroup("/api/lifecycle").RequireAuthorization();
        group.AddEndpointFilter(async (context, next) =>
        {
            var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            var kind = context.GetArgument<string>(0);
            var id = context.GetArgument<Guid>(1);
            if (kind is not ("clients" or "projects" or "templates" or "sessions")) return Results.NotFound();
            await using var transaction = await db.Database.BeginTransactionAsync(context.HttpContext.RequestAborted);
            await Lock(db, kind, id, context.HttpContext.RequestAborted);
            try
            {
                var result = await next(context);
                await transaction.CommitAsync(context.HttpContext.RequestAborted);
                if (kind == "sessions" && result is IStatusCodeHttpResult { StatusCode: 204 })
                {
                    var code = await db.WorkshopSessions.Where(x => x.Id == id).Select(x => x.AccessCode).SingleOrDefaultAsync();
                    if (code is not null)
                    {
                        var hub = context.HttpContext.RequestServices.GetRequiredService<IHubContext<SessionHub>>();
                        var groups = await SessionBroadcast.PrivateGroups(db, code, CancellationToken.None);
                        await hub.Clients.Groups(groups.Append(SessionHub.PublicGroup(code)).ToArray()).SendAsync("session-invalidated");
                    }
                }
                return result;
            }
            catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation })
            { return Results.Conflict(new { message = "Se han encontrado datos asociados. Actualiza la vista y archiva el elemento." }); }
        });
        group.MapPut("/{kind}/{id:guid}", (string kind, Guid id, ArchiveRequest request, AppDbContext db, CancellationToken ct) => Change(kind, id, request.Archived, db, ct));
        group.MapDelete("/{kind}/{id:guid}", (string kind, Guid id, AppDbContext db, CancellationToken ct) => Change(kind, id, null, db, ct));
    }
}
