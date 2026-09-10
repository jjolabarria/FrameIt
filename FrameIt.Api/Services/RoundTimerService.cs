using FrameIt.Api.Data;
using FrameIt.Api.Hubs;
using FrameIt.Contracts;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace FrameIt.Api.Services;

public sealed class RoundTimerService(
    IServiceScopeFactory scopeFactory,
    IHubContext<SessionHub> hub,
    ILogger<RoundTimerService> logger) : BackgroundService
{
    public static bool HasExpired(WorkshopSession session, int seconds, DateTimeOffset now)
        => session.RoundOpenedAtUtc is { } opened && (now - opened).TotalSeconds >= Math.Max(0, seconds);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMilliseconds(250));
        do
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var rounds = await db.WorkshopSessions.AsNoTracking()
                    .Where(s => s.RoundOpen && s.RoundOpenedAtUtc != null)
                    .Include(s => s.Sections).ThenInclude(s => s.Questions)
                    .ToListAsync(stoppingToken);
                foreach (var round in rounds)
                {
                    var question = round.Sections.SelectMany(s => s.Questions)
                        .FirstOrDefault(q => q.Id == round.ActiveQuestionId);
                    if (question is null || !HasExpired(round,
                        TemplateMapper.DeserializePresentation(question.SettingsJson).TimerSeconds, DateTimeOffset.UtcNow)) continue;

                    // Compare the round identity so a concurrent reopen or question change wins.
                    var changed = await db.WorkshopSessions
                        .Where(s => s.Id == round.Id && s.RoundOpen &&
                            s.RoundOpenedAtUtc == round.RoundOpenedAtUtc && s.ActiveQuestionId == round.ActiveQuestionId)
                        .ExecuteUpdateAsync(setters => setters
                            .SetProperty(s => s.RoundOpen, false)
                            .SetProperty(s => s.Phase, SessionPhase.Waiting)
                            .SetProperty(s => s.UpdatedAtUtc, DateTimeOffset.UtcNow), stoppingToken);
                    if (changed == 0) continue;

                    // Each audience reloads its own authorized snapshot, retaining the external host/port.
                    var privateGroups = await SessionBroadcast.PrivateGroups(db, round.AccessCode, stoppingToken);
                    await hub.Clients.Groups(privateGroups.Append(SessionHub.PublicGroup(round.AccessCode)).ToArray())
                        .SendAsync("session-invalidated", stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception exception)
            {
                logger.LogError(exception, "Could not expire session rounds; retrying.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
