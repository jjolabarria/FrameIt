using FrameIt.Api.Data;
using FrameIt.Api.Services;
using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace FrameIt.Api.Hubs;

public sealed class SessionHub(AppDbContext db) : Hub
{
    public Task JoinSession(string accessCode)
        => Groups.AddToGroupAsync(Context.ConnectionId, PublicGroup(accessCode));

    [Authorize]
    public async Task JoinFacilitatorSession(string accessCode)
    {
        if (!await LocalAuth.IsValidSession(db, Context.User!)) throw new HubException("Authentication required.");
        var userId = Guid.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.SingleAsync(x => x.Id == userId);
        var normalized = accessCode.ToUpperInvariant();
        if (!await db.WorkshopSessions.AnyAsync(x => x.AccessCode == normalized && (user.IsPlatformAdmin || (user.OrganizationId != null && x.Client!.OrganizationId == user.OrganizationId))))
            throw new HubException("Session not available.");
        await Groups.AddToGroupAsync(Context.ConnectionId, FacilitatorGroup(accessCode, Context.User!.FindFirstValue(LocalAuth.SessionClaim)!));
    }

    public Task LeaveSession(string accessCode)
        => Task.WhenAll(
            Groups.RemoveFromGroupAsync(Context.ConnectionId, PublicGroup(accessCode)),
            Groups.RemoveFromGroupAsync(Context.ConnectionId, FacilitatorGroup(accessCode, Context.User?.FindFirstValue(LocalAuth.SessionClaim) ?? "")));

    public static string PublicGroup(string code) => $"public:{code.ToUpperInvariant()}";
    public static string FacilitatorGroup(string code, string loginSessionId) => $"facilitator:{code.ToUpperInvariant()}:{loginSessionId}";
}
