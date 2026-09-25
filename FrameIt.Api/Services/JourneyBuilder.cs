using FrameIt.Api.Data;
using FrameIt.Contracts;
using Microsoft.EntityFrameworkCore;

namespace FrameIt.Api.Services;

public static class JourneyBuilder
{
    public const int DurationMs = 50_000;
    private static readonly string[] GeographicNames =
        ["Norte", "del Alba", "del Horizonte", "Central", "del Estuario", "de la Vega", "del Mirador", "del Poniente"];

    public static SessionJourneyPlaybackDto Playback(WorkshopSession session)
        => new(session.JourneyPlaybackState, session.JourneyPositionMs, session.JourneyStartedAtUtc,
            session.JourneyRevision, DurationMs);

    public static SessionJourneyDto Build(WorkshopSession session)
    {
        var questions = session.Sections.OrderBy(x => x.Order)
            .SelectMany(section => section.Questions.OrderBy(x => x.Order).Select(question => (section, question)))
            .ToList();
        var questionIds = questions.Select(x => x.question.Id).ToHashSet();
        var recordedRoute = session.JourneyEvents.Where(x => x.SessionQuestionId != null)
            .OrderBy(x => x.OccurredAtUtc).Select(x => x.SessionQuestionId!.Value)
            .Where(questionIds.Contains).Aggregate(new List<Guid>(), (route, questionId) =>
            {
                if (route.Count == 0 || route[^1] != questionId) route.Add(questionId);
                return route;
            });
        var recordedOrder = recordedRoute.Distinct().ToList();
        var positions = recordedOrder.Select((id, index) => (id, index)).ToDictionary(x => x.id, x => x.index);
        if (positions.Count > 0)
            questions = questions.OrderBy(x => positions.TryGetValue(x.question.Id, out var index) ? index : int.MaxValue)
                .ThenBy(x => x.section.Order).ThenBy(x => x.question.Order).ToList();

        var regions = session.Sections.OrderBy(x => x.Order).Select(section => new SessionJourneyRegionDto(
            section.Id, section.Title, section.Order, section.Questions.Count,
            section.Questions.Sum(question => question.Responses.Count))).ToList();
        var milestones = questions.Take(60).Select(x =>
            {
                IReadOnlyList<string> topics = x.question.Consolidation is { Status: ConsolidationStatus.Published } consolidation
                    ? ResponseConsolidationLogic.ReadGroups(consolidation.PublishedJson).Select(g => g.Title).Take(4).ToList()
                    : [];
                var branches = x.question.Kind is QuestionKind.Voting or QuestionKind.Choice
                    ? TemplateMapper.DeserializeOptions(x.question.OptionsJson).Select(option => new SessionJourneyBranchDto(
                        option.Label, x.question.Responses.Count(response => string.Equals(response.Value, option.Label, StringComparison.OrdinalIgnoreCase)), false)).ToList()
                    : [];
                if (branches.Count > 0)
                {
                    var best = branches.Max(b => b.Votes);
                    branches = branches.Select(b => b with { IsWinner = best > 0 && b.Votes == best }).ToList();
                }
                var kind = x.question.Kind == QuestionKind.Presentation ? "presentation" : branches.Count > 0 ? "vote" : topics.Count > 0 ? "consolidation" : "question";
                return new SessionJourneyMilestoneDto(x.question.Id.ToString(), x.section.Id, x.section.Order,
                    CapitalAlias(kind, x.question.Id), kind, x.section.Title, x.question.Title,
                    x.question.Responses.Count, x.question.Responses.Select(response => response.SessionParticipantId).Distinct().Count(),
                    topics, branches);
            }).ToList();

        var availableCapitalIds = milestones.Select(x => x.Id).ToHashSet(StringComparer.Ordinal);
        var routeIds = recordedRoute.Count > 0
            ? recordedRoute.Select(id => id.ToString()).Where(availableCapitalIds.Contains).ToList()
            : milestones.Select(x => x.Id).ToList();
        var route = routeIds.Select((capitalId, sequence) => new SessionJourneyStopDto(capitalId, sequence + 1)).ToList();

        return new SessionJourneyDto(session.Id, session.Title, session.JourneyEvents.Count == 0,
            session.Participants.Count, questions.Sum(x => x.question.Responses.Count), regions, milestones, route,
            session.Outcomes.Select(x => new OutcomeItemDto(x.Bucket, x.Text)).ToList(), Playback(session));
    }

    private static string CapitalAlias(string kind, Guid questionId)
    {
        var prefix = kind switch
        {
            "presentation" => "Faro",
            "consolidation" => "Confluencia",
            "vote" => "Consejo",
            _ => "Plaza"
        };
        var index = (int)(BitConverter.ToUInt32(questionId.ToByteArray(), 0) % GeographicNames.Length);
        return $"{prefix} {GeographicNames[index]}";
    }

    public static void Record(WorkshopSession session, string type, Guid? sectionId = null, Guid? questionId = null)
        => session.JourneyEvents.Add(new SessionJourneyEvent
        {
            WorkshopSessionId = session.Id,
            SessionSectionId = sectionId,
            SessionQuestionId = questionId,
            EventType = type,
            OccurredAtUtc = DateTimeOffset.UtcNow
        });

    public static Task RecordDirectAsync(AppDbContext db, Guid sessionId, string type,
        Guid? sectionId = null, Guid? questionId = null, CancellationToken cancellationToken = default)
    {
        var eventId = Guid.NewGuid();
        var occurredAtUtc = DateTimeOffset.UtcNow;
        const string metadata = "{}";
        return db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "SessionJourneyEvents"
                ("Id", "WorkshopSessionId", "SessionSectionId", "SessionQuestionId", "EventType", "MetadataJson", "OccurredAtUtc")
            VALUES
                ({eventId}, {sessionId}, {sectionId}, {questionId}, {type}, CAST({metadata} AS jsonb), {occurredAtUtc})
            """, cancellationToken);
    }
}
