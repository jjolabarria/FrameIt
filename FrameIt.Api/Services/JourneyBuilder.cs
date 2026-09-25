using FrameIt.Api.Data;
using FrameIt.Contracts;

namespace FrameIt.Api.Services;

public static class JourneyBuilder
{
    public const int DurationMs = 50_000;

    public static SessionJourneyPlaybackDto Playback(WorkshopSession session)
        => new(session.JourneyPlaybackState, session.JourneyPositionMs, session.JourneyStartedAtUtc,
            session.JourneyRevision, DurationMs);

    public static SessionJourneyDto Build(WorkshopSession session)
    {
        var questions = session.Sections.OrderBy(x => x.Order)
            .SelectMany(section => section.Questions.OrderBy(x => x.Order).Select(question => (section, question)))
            .ToList();
        var recordedOrder = session.JourneyEvents.Where(x => x.SessionQuestionId != null)
            .OrderBy(x => x.OccurredAtUtc).Select(x => x.SessionQuestionId!.Value).Distinct().ToList();
        var positions = recordedOrder.Select((id, index) => (id, index)).ToDictionary(x => x.id, x => x.index);
        if (positions.Count > 0)
            questions = questions.OrderBy(x => positions.TryGetValue(x.question.Id, out var index) ? index : int.MaxValue)
                .ThenBy(x => x.section.Order).ThenBy(x => x.question.Order).ToList();

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
                return new SessionJourneyMilestoneDto(x.question.Id.ToString(), x.question.Kind == QuestionKind.Presentation ? "presentation" : branches.Count > 0 ? "vote" : topics.Count > 0 ? "consolidation" : "question",
                    x.section.Title, x.question.Title, x.question.Responses.Count, topics, branches);
            }).ToList();

        return new SessionJourneyDto(session.Id, session.Title, session.JourneyEvents.Count == 0,
            session.Participants.Count, questions.Sum(x => x.question.Responses.Count), milestones,
            session.Outcomes.Select(x => new OutcomeItemDto(x.Bucket, x.Text)).ToList(), Playback(session));
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
}
