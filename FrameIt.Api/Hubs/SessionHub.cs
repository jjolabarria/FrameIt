using Microsoft.AspNetCore.SignalR;

namespace FrameIt.Api.Hubs;

public sealed class SessionHub : Hub
{
    public Task JoinSession(string accessCode)
        => Groups.AddToGroupAsync(Context.ConnectionId, accessCode.ToUpperInvariant());

    public Task LeaveSession(string accessCode)
        => Groups.RemoveFromGroupAsync(Context.ConnectionId, accessCode.ToUpperInvariant());
}
