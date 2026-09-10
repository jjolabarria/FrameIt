using FrameIt.Api.Data;
using FrameIt.Api.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace FrameIt.Api.Services;

public static class SessionBroadcast
{
    public static async Task<string[]> PrivateGroups(AppDbContext db, string code, CancellationToken cancellationToken = default)
        => (await db.FacilitatorLoginSessions.Where(x => x.ExpiresAtUtc > DateTime.UtcNow).Select(x => x.Id).ToArrayAsync(cancellationToken))
            .Select(id => SessionHub.FacilitatorGroup(code, id.ToString())).ToArray();

    public static async Task PublishSession(this IHubContext<SessionHub> hub, WorkshopSession session, string baseUrl, AppDbContext db,
        CancellationToken cancellationToken = default)
    {
        await hub.Clients.Group(SessionHub.PublicGroup(session.AccessCode)).SendAsync("session-updated", session.ToSnapshot(baseUrl), cancellationToken);
        var groups = await PrivateGroups(db, session.AccessCode, cancellationToken);
        if (groups.Length > 0) await hub.Clients.Groups(groups).SendAsync("session-updated", session.ToSnapshot(baseUrl, facilitator: true), cancellationToken);
    }
}
