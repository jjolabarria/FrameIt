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
        => Build(session).Playback;

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
        var detailPages = questions.Take(60).ToDictionary(x => x.question.Id, x => Details(x.question));
        var milestones = questions.Take(60).Select(x =>
            {
                var presentation = TemplateMapper.DeserializePresentation(x.question.SettingsJson);
                var showResponses = (presentation.ResponseVisibility != ResponseVisibilityMode.FacilitatorOnly &&
                    (presentation.ResponseVisibility == ResponseVisibilityMode.Live || session.ResultsVisible));
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
                    showResponses ? topics : [], showResponses ? branches : [],
                    showResponses ? detailPages[x.question.Id] : [new SessionJourneyDetailDto("Resultados ocultos", "Las respuestas de esta parada no están disponibles en la vista compartida.")]);
            }).ToList();

        var availableCapitalIds = milestones.Select(x => x.Id).ToHashSet(StringComparer.Ordinal);
        var routeIds = recordedRoute.Count > 0
            ? recordedRoute.Select(id => id.ToString()).Where(availableCapitalIds.Contains).ToList()
            : milestones.Select(x => x.Id).ToList();
        var route = routeIds.Select((capitalId, sequence) => new SessionJourneyStopDto(capitalId, sequence + 1)).ToList();
        var pages = detailPages.Values.Select(x => x.Count).DefaultIfEmpty(0).Max();
        var duration = Math.Max(DurationMs, (int)Math.Ceiling(Math.Max(1, route.Count) * Math.Max(8_000d, pages * 5_000d) / .88));

        return new SessionJourneyDto(session.Id, session.Title, session.JourneyEvents.Count == 0,
            session.Participants.Count, questions.Sum(x => x.question.Responses.Count), regions, milestones, route,
            session.Outcomes.Select(x => new OutcomeItemDto(x.Bucket, x.Text)).ToList(),
            new SessionJourneyPlaybackDto(session.JourneyPlaybackState, session.JourneyPositionMs,
                session.JourneyStartedAtUtc, session.JourneyRevision, duration));
    }

    private static IReadOnlyList<SessionJourneyDetailDto> Details(SessionQuestion question)
    {
        var details = new List<SessionJourneyDetailDto>();
        if (question.Consolidation is { Status: ConsolidationStatus.Published } consolidation)
            details.AddRange(ResponseConsolidationLogic.ReadGroups(consolidation.PublishedJson)
                .Select(group => new SessionJourneyDetailDto($"Tema consolidado · {group.Title}", group.Summary)));
        if (question.Kind is QuestionKind.Voting or QuestionKind.Choice)
        {
            var options = TemplateMapper.DeserializeOptions(question.OptionsJson).Select(option => new
            {
                option.Label,
                Votes = question.Responses.Count(response => string.Equals(response.Value, option.Label, StringComparison.OrdinalIgnoreCase))
            }).OrderByDescending(option => option.Votes).ToList();
            var best = options.Select(option => option.Votes).DefaultIfEmpty(0).Max();
            var tied = options.Count(option => option.Votes == best) > 1;
            details.AddRange(options.Select(option => new SessionJourneyDetailDto(
                $"{(best > 0 && option.Votes == best ? tied ? "Empate" : "Opción más votada" : "Opción")} · {option.Votes} votos", option.Label)));
        }
        else
            details.AddRange(question.Responses.OrderBy(response => response.CreatedAtUtc).ThenBy(response => response.Id)
                .Where(response => !string.IsNullOrWhiteSpace(response.Value)).GroupBy(response => response.Value)
                .Select(group => new SessionJourneyDetailDto(group.Count() > 1 ? $"Respuesta · {group.Count()} aportaciones iguales" : "Respuesta", group.Key)));
        return details.SelectMany(detail => ChunkText(detail.Text).Select((text, index) =>
            new SessionJourneyDetailDto(index == 0 ? detail.Label : $"{detail.Label} · continuación", text))).ToList();
    }

    private static IEnumerable<string> ChunkText(string text)
    {
        while (text.Length > 220)
        {
            var end = text.LastIndexOf(' ', 220, 100);
            if (end < 1) end = char.IsHighSurrogate(text[219]) ? 219 : 220;
            yield return text[..end];
            text = text[end..].TrimStart();
        }
        if (!string.IsNullOrWhiteSpace(text)) yield return text;
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
