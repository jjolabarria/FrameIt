using System.Linq.Expressions;
using FrameIt.Api.Data;
using FrameIt.Contracts;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FrameIt.Api.Services;

public sealed record WorkspacePage<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize, int TotalPages);
public sealed record WorkspaceClient(Guid Id, string Name, string Industry, int ProjectCount, int SessionCount);
public sealed record WorkspaceProject(Guid Id, Guid ClientId, string ClientName, string Name, string Code, int SessionCount);
public sealed record WorkspaceSession(Guid Id, string Title, string AccessCode, Guid ClientId, string ClientName,
    Guid ProjectId, string ProjectName, string ProjectCode, string TemplateTitle, SessionStatus Status,
    SessionPhase Phase, DateTimeOffset UpdatedAtUtc, int RatingCount);
public sealed record UpdateClientRequest(string Name, string Industry);
public sealed record UpdateProjectRequest(string Name, string Code);

public static class WorkspaceEndpoints
{
    private static readonly Expression<Func<Client, WorkspaceClient>> ClientRow = c =>
        new(c.Id, c.Name, c.Industry, c.Projects.Count, c.Projects.Sum(p => p.Sessions.Count));
    private static readonly Expression<Func<Project, WorkspaceProject>> ProjectRow = p =>
        new(p.Id, p.ClientId, p.Client!.Name, p.Name, p.Code, p.Sessions.Count);
    private static readonly Expression<Func<WorkshopSession, WorkspaceSession>> SessionRow = s =>
        new(s.Id, s.Title, s.AccessCode, s.ClientId, s.Client!.Name, s.ProjectId, s.Project!.Name,
            s.Project.Code, s.Template!.Title, s.Status, s.Phase, s.UpdatedAtUtc, s.SatisfactionResponses.Count);

    public static void MapWorkspaceEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/workspace").RequireAuthorization();
        group.MapGet("/clients", async (string? q, int? page, int? pageSize, AppDbContext db, CancellationToken ct) =>
        {
            var query = db.Clients.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(q))
            {
                var search = q.Trim().ToLowerInvariant();
                query = query.Where(c => c.Name.ToLower().Contains(search) || c.Industry.ToLower().Contains(search));
            }
            return Results.Ok(await PageAsync(query.OrderBy(c => c.Name).ThenBy(c => c.Id).Select(ClientRow), page, pageSize, ct));
        });
        group.MapGet("/clients/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
        {
            var client = await db.Clients.AsNoTracking().Where(c => c.Id == id).Select(ClientRow).FirstOrDefaultAsync(ct);
            return client is null ? Results.NotFound() : Results.Ok(client);
        });
        group.MapGet("/projects", async (Guid? clientId, string? q, int? page, int? pageSize, AppDbContext db, CancellationToken ct) =>
        {
            var query = db.Projects.AsNoTracking();
            if (clientId.HasValue) query = query.Where(p => p.ClientId == clientId);
            if (!string.IsNullOrWhiteSpace(q))
            {
                var search = q.Trim().ToLowerInvariant();
                query = query.Where(p => p.Name.ToLower().Contains(search) || p.Code.ToLower().Contains(search));
            }
            return Results.Ok(await PageAsync(query.OrderBy(p => p.Name).ThenBy(p => p.Id).Select(ProjectRow), page, pageSize, ct));
        });
        group.MapGet("/projects/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
        {
            var project = await db.Projects.AsNoTracking().Where(p => p.Id == id).Select(ProjectRow).FirstOrDefaultAsync(ct);
            return project is null ? Results.NotFound() : Results.Ok(project);
        });
        group.MapGet("/sessions", async (Guid? clientId, Guid? projectId, string? q, string? status, string? sort,
            int? page, int? pageSize, AppDbContext db, CancellationToken ct) =>
        {
            var query = db.WorkshopSessions.AsNoTracking();
            if (clientId.HasValue) query = query.Where(s => s.ClientId == clientId);
            if (projectId.HasValue) query = query.Where(s => s.ProjectId == projectId);
            if (!string.IsNullOrWhiteSpace(status))
            {
                if (!Enum.TryParse<SessionStatus>(status, out var parsed) || !Enum.IsDefined(parsed))
                    return Results.BadRequest(new { message = "Estado de sesión no válido." });
                query = query.Where(s => s.Status == parsed);
            }
            if (!string.IsNullOrWhiteSpace(q))
            {
                var search = q.Trim().ToLowerInvariant();
                query = query.Where(s => s.Title.ToLower().Contains(search) || s.AccessCode.ToLower().Contains(search) ||
                    s.Client!.Name.ToLower().Contains(search) || s.Project!.Name.ToLower().Contains(search) ||
                    s.Project.Code.ToLower().Contains(search) || s.Template!.Title.ToLower().Contains(search));
            }
            var ordered = sort switch
            {
                "oldest" => query.OrderBy(s => s.UpdatedAtUtc).ThenBy(s => s.Id),
                "title" => query.OrderBy(s => s.Title).ThenBy(s => s.Id),
                _ => query.OrderByDescending(s => s.UpdatedAtUtc).ThenBy(s => s.Id)
            };
            return Results.Ok(await PageAsync(ordered.Select(SessionRow), page, pageSize, ct));
        });
        group.MapGet("/sessions/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
        {
            var session = await db.WorkshopSessions.AsNoTracking().Where(s => s.Id == id).Select(SessionRow).FirstOrDefaultAsync(ct);
            return session is null ? Results.NotFound() : Results.Ok(session);
        });
        group.MapGet("/overview", async (AppDbContext db, CancellationToken ct) =>
        {
            var clients = await db.Clients.CountAsync(ct);
            var projects = await db.Projects.CountAsync(ct);
            var templates = await db.DynamicTemplates.CountAsync(ct);
            var liveSessions = await db.WorkshopSessions.CountAsync(s => s.Status == SessionStatus.Live, ct);
            var recent = await db.WorkshopSessions.AsNoTracking().OrderByDescending(s => s.UpdatedAtUtc).ThenBy(s => s.Id).Take(6).Select(SessionRow).ToListAsync(ct);
            var active = await db.WorkshopSessions.AsNoTracking().Where(s => s.Status == SessionStatus.Live)
                .OrderByDescending(s => s.UpdatedAtUtc).ThenBy(s => s.Id).Take(6).Select(SessionRow).ToListAsync(ct);
            return Results.Ok(new { clients, projects, templates, liveSessions, recent, active });
        });
        app.MapPut("/api/clients/{id:guid}", async (Guid id, UpdateClientRequest request, AppDbContext db, CancellationToken ct) =>
        {
            if (!ValidClient(request.Name, request.Industry)) return Results.BadRequest(new { message = "Indica un nombre (máximo 160 caracteres) y sector (máximo 100)." });
            var changed = await db.Clients.Where(c => c.Id == id).ExecuteUpdateAsync(setters => setters
                .SetProperty(c => c.Name, request.Name.Trim()).SetProperty(c => c.Industry, request.Industry.Trim()), ct);
            return changed == 0 ? Results.NotFound() : Results.NoContent();
        }).RequireAuthorization();
        app.MapPut("/api/projects/{id:guid}", async (Guid id, UpdateProjectRequest request, AppDbContext db, CancellationToken ct) =>
        {
            if (!ValidProject(request.Name, request.Code)) return Results.BadRequest(new { message = "Indica un nombre (máximo 160 caracteres) y código (máximo 30)." });
            try
            {
                var changed = await db.Projects.Where(p => p.Id == id).ExecuteUpdateAsync(setters => setters
                    .SetProperty(p => p.Name, request.Name.Trim()).SetProperty(p => p.Code, request.Code.Trim().ToUpperInvariant()), ct);
                return changed == 0 ? Results.NotFound() : Results.NoContent();
            }
            catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.UniqueViolation)
            {
                return Results.Conflict(new { message = "Este cliente ya tiene un proyecto con ese código. Utiliza otro código." });
            }
        }).RequireAuthorization();
    }
    public static bool ValidClient(string? name, string? industry) => !string.IsNullOrWhiteSpace(name) && name.Trim().Length <= 160 &&
        !string.IsNullOrWhiteSpace(industry) && industry.Trim().Length <= 100;
    public static bool ValidProject(string? name, string? code) => !string.IsNullOrWhiteSpace(name) && name.Trim().Length <= 160 &&
        !string.IsNullOrWhiteSpace(code) && code.Trim().Length <= 30;
    private static async Task<WorkspacePage<T>> PageAsync<T>(IQueryable<T> query, int? requestedPage, int? requestedSize, CancellationToken ct)
    {
        var size = Math.Clamp(requestedSize ?? 25, 1, 100);
        var count = await query.CountAsync(ct);
        var pages = Math.Max(1, (int)Math.Ceiling(count / (double)size));
        var page = Math.Clamp(requestedPage ?? 1, 1, pages);
        return new(await query.Skip((page - 1) * size).Take(size).ToListAsync(ct), count, page, size, pages);
    }
}
