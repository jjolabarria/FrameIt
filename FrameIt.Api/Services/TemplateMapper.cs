using System.Text;
using System.Text.Json;
using FrameIt.Api.Data;
using FrameIt.Contracts;

namespace FrameIt.Api.Services;

public static class TemplateMapper
{
    private static readonly QuestionPresentationSettingsDto DefaultPresentation = new(
        60,
        ResponseVisibilityMode.AfterClose,
        ResponseIdentityMode.Mixed,
        true,
        false,
        CelebrationStyle.Subtle);

    public static DynamicTemplateDefinitionDto ToDefinition(this DynamicTemplate template)
    {
        return new DynamicTemplateDefinitionDto(
            "frameit.dynamic-template/v2",
            template.Key,
            template.Title,
            template.Objective,
            template.Audience,
            template.FacilitatorGuidance,
            template.Sections
                .OrderBy(x => x.Order)
                .Select(section => new SectionDefinitionDto(
                    section.Key,
                    section.Title,
                    section.Objective,
                    section.Order,
                    section.Questions
                        .OrderBy(x => x.Order)
                        .Select(question => new QuestionDefinitionDto(
                            question.Key,
                            question.Kind,
                            question.Title,
                            question.Prompt,
                            DeserializeOptions(question.OptionsJson),
                            DeserializePresentation(question.SettingsJson),
                            DeserializeSettings(question.SettingsJson)))
                        .ToList()))
                .ToList(),
            ["decidido", "pendiente", "fuera-de-alcance"]);
    }

    public static DynamicTemplateSummaryDto ToSummary(this DynamicTemplate template)
    {
        return new DynamicTemplateSummaryDto(
            template.Id,
            template.Key,
            template.Title,
            template.Objective,
            template.Audience,
            template.Sections.Count,
            template.Sections.Sum(x => x.Questions.Count),
            template.IsBuiltIn,
            template.UpdatedAtUtc);
    }

    public static string ToJsonEnvelope(this DynamicTemplate template)
    {
        return JsonSerializer.Serialize(
            new ImportTemplateEnvelope(template.ToDefinition()),
            new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true });
    }

    public static DynamicTemplate ToEntity(this CreateTemplateRequest request)
    {
        return new DynamicTemplate
        {
            Key = request.Key,
            Title = request.Title,
            Objective = request.Objective,
            Audience = request.Audience,
            FacilitatorGuidance = request.FacilitatorGuidance,
            UpdatedAtUtc = DateTimeOffset.UtcNow,
            Sections = request.Sections
                .OrderBy(x => x.Order)
                .Select(section => new TemplateSection
                {
                    Key = section.Key,
                    Title = section.Title,
                    Objective = section.Objective,
                    Order = section.Order,
                    Questions = section.Questions.Select((question, index) => new TemplateQuestion
                    {
                        Key = question.Key,
                        Kind = question.Kind,
                        Title = question.Title,
                        Prompt = question.Prompt,
                        Order = index + 1,
                        OptionsJson = JsonSerializer.Serialize(question.Options),
                        SettingsJson = JsonSerializer.Serialize(MergeSettings(question.Presentation, question.Settings))
                    }).ToList()
                }).ToList()
        };
    }

    public static WorkshopSession InstantiateSession(
        this DynamicTemplate template,
        CreateSessionRequest request,
        Func<string> accessCodeFactory)
    {
        var sections = template.Sections
            .OrderBy(section => section.Order)
            .Select(section => new SessionSection
            {
                Key = section.Key,
                Title = section.Title,
                Objective = section.Objective,
                Order = section.Order,
                Questions = section.Questions
                    .OrderBy(question => question.Order)
                    .Select(question => new SessionQuestion
                    {
                        Key = question.Key,
                        Kind = question.Kind,
                        Title = question.Title,
                        Prompt = question.Prompt,
                        Order = question.Order,
                        OptionsJson = question.OptionsJson,
                        SettingsJson = question.SettingsJson
                    }).ToList()
            }).ToList();

        var firstSection = sections.OrderBy(x => x.Order).First();
        var firstQuestion = firstSection.Questions.OrderBy(x => x.Order).First();

        return new WorkshopSession
        {
            ClientId = request.ClientId,
            ProjectId = request.ProjectId,
            TemplateId = template.Id,
            Title = request.Title,
            AccessCode = accessCodeFactory(),
            Status = SessionStatus.Draft,
            Phase = SessionPhase.Lobby,
            RoundOpen = false,
            ResultsVisible = false,
            ActiveSectionId = firstSection.Id,
            ActiveQuestionId = firstQuestion.Id,
            UpdatedAtUtc = DateTimeOffset.UtcNow,
            Sections = sections
        };
    }

    public static SessionSummaryDto ToSummary(this WorkshopSession session, string baseUrl)
    {
        return new SessionSummaryDto(
            session.Id,
            session.Title,
            session.AccessCode,
            session.Status,
            session.Phase,
            session.RoundOpen,
            session.ResultsVisible,
            BuildQrSvg($"{baseUrl}/join/{session.AccessCode}"),
            session.ClientId,
            session.ProjectId,
            session.TemplateId,
            session.Template?.Title ?? "Template",
            session.UpdatedAtUtc);
    }

    public static SessionSnapshotDto ToSnapshot(this WorkshopSession session, string baseUrl)
    {
        var activeSection = session.Sections.First(x => x.Id == session.ActiveSectionId);
        var activeQuestion = activeSection.Questions.First(x => x.Id == session.ActiveQuestionId);
        var sectionIndex = session.Sections.OrderBy(x => x.Order).ToList().FindIndex(x => x.Id == activeSection.Id) + 1;
        var questionIndex = activeSection.Questions.OrderBy(x => x.Order).ToList().FindIndex(x => x.Id == activeQuestion.Id) + 1;
        var presentation = DeserializePresentation(activeQuestion.SettingsJson);
        var showResponses = presentation.ResponseVisibility == ResponseVisibilityMode.Live || session.ResultsVisible;

        return new SessionSnapshotDto(
            session.Id,
            session.Title,
            session.AccessCode,
            session.Status,
            session.Phase,
            session.RoundOpen,
            session.ResultsVisible,
            presentation.TimerSeconds,
            session.RoundOpenedAtUtc,
            activeQuestion.Id,
            sectionIndex,
            session.Sections.Count,
            questionIndex,
            activeSection.Questions.Count,
            presentation.ResponseVisibility,
            presentation.ResponseIdentityMode,
            presentation.CelebrationStyle,
            $"{baseUrl}/join/{session.AccessCode}",
            BuildQrSvg($"{baseUrl}/join/{session.AccessCode}"),
            session.Template?.Title ?? "Template",
            activeSection.Title,
            activeQuestion.Title,
            activeQuestion.Prompt,
            activeQuestion.Kind,
            DeserializeOptions(activeQuestion.OptionsJson),
            session.Participants
                .OrderBy(x => x.JoinedAtUtc)
                .Select(x => new ParticipantSummaryDto(x.Id, x.DisplayName, x.IsConnected, x.JoinedAtUtc))
                .ToList(),
            showResponses
                ? activeQuestion.Responses
                    .OrderByDescending(x => x.CreatedAtUtc)
                    .Select(x => new ResponseSummaryDto(
                        x.Id,
                        x.SessionParticipantId,
                        presentation.ResponseIdentityMode == ResponseIdentityMode.Anonymous
                            ? "Participante"
                            : x.SessionParticipant?.DisplayName ?? "Participant",
                        x.Value,
                        x.CreatedAtUtc))
                    .ToList()
                : [],
            session.Outcomes.Select(x => new OutcomeItemDto(x.Bucket, x.Text)).ToList());
    }

    public static IReadOnlyList<QuestionOptionDto> DeserializeOptions(string json)
        => JsonSerializer.Deserialize<List<QuestionOptionDto>>(json) ?? [];

    public static IReadOnlyDictionary<string, string> DeserializeSettings(string json)
        => JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? new Dictionary<string, string>();

    public static QuestionPresentationSettingsDto DeserializePresentation(string json)
    {
        var settings = DeserializeSettings(json);

        return new QuestionPresentationSettingsDto(
            TryGetInt(settings, "timerSeconds", DefaultPresentation.TimerSeconds),
            TryGetEnum(settings, "responseVisibility", DefaultPresentation.ResponseVisibility),
            TryGetEnum(settings, "responseIdentityMode", DefaultPresentation.ResponseIdentityMode),
            TryGetBool(settings, "showProgress", DefaultPresentation.ShowProgress),
            TryGetBool(settings, "allowLateResponses", DefaultPresentation.AllowLateResponses),
            TryGetEnum(settings, "celebrationStyle", DefaultPresentation.CelebrationStyle));
    }

    private static Dictionary<string, string> MergeSettings(
        QuestionPresentationSettingsDto presentation,
        IReadOnlyDictionary<string, string> settings)
    {
        var merged = settings.ToDictionary();
        merged["timerSeconds"] = presentation.TimerSeconds.ToString();
        merged["responseVisibility"] = presentation.ResponseVisibility.ToString();
        merged["responseIdentityMode"] = presentation.ResponseIdentityMode.ToString();
        merged["showProgress"] = presentation.ShowProgress.ToString();
        merged["allowLateResponses"] = presentation.AllowLateResponses.ToString();
        merged["celebrationStyle"] = presentation.CelebrationStyle.ToString();
        return merged;
    }

    private static int TryGetInt(IReadOnlyDictionary<string, string> settings, string key, int fallback)
        => settings.TryGetValue(key, out var value) && int.TryParse(value, out var parsed) ? parsed : fallback;

    private static bool TryGetBool(IReadOnlyDictionary<string, string> settings, string key, bool fallback)
        => settings.TryGetValue(key, out var value) && bool.TryParse(value, out var parsed) ? parsed : fallback;

    private static TEnum TryGetEnum<TEnum>(IReadOnlyDictionary<string, string> settings, string key, TEnum fallback)
        where TEnum : struct, Enum
        => settings.TryGetValue(key, out var value) && Enum.TryParse<TEnum>(value, true, out var parsed) ? parsed : fallback;

    private static string BuildQrSvg(string joinUrl)
    {
        var safeUrl = System.Security.SecurityElement.Escape(joinUrl) ?? joinUrl;
        return $$"""
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="QR placeholder">
  <rect width="160" height="160" rx="18" fill="#0f172a"/>
  <rect x="14" y="14" width="42" height="42" rx="8" fill="#f8fafc"/>
  <rect x="21" y="21" width="28" height="28" rx="4" fill="#0f172a"/>
  <rect x="104" y="14" width="42" height="42" rx="8" fill="#f8fafc"/>
  <rect x="111" y="21" width="28" height="28" rx="4" fill="#0f172a"/>
  <rect x="14" y="104" width="42" height="42" rx="8" fill="#f8fafc"/>
  <rect x="21" y="111" width="28" height="28" rx="4" fill="#0f172a"/>
  <path d="M76 18h12v12H76zm18 0h12v12H94zM76 36h12v12H76zM94 36h12v12H94zM70 70h12v12H70zm18 0h12v12H88zm18 0h12v12h-12zM70 88h12v12H70zm36 0h12v12h-12zM70 106h12v12H70zm18 18h12v12H88zm18-18h12v12h-12zm18 18h12v12h-12z" fill="#f8fafc"/>
  <text x="80" y="152" text-anchor="middle" font-family="monospace" font-size="8" fill="#cbd5e1">{{safeUrl}}</text>
</svg>
""";
    }
}
