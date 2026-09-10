using System.Text;
using System.Text.Json;
using FrameIt.Api.Data;
using FrameIt.Contracts;
using QRCoder;

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
            "frameit.dynamic-template/v3",
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
            template.UpdatedAtUtc, template.IsArchived);
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
            SatisfactionSurveyOpen = false,
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

    public static SessionSnapshotDto ToSnapshot(this WorkshopSession session, string baseUrl, bool facilitator = false)
    {
        var activeSection = session.Sections.First(x => x.Id == session.ActiveSectionId);
        var activeQuestion = activeSection.Questions.First(x => x.Id == session.ActiveQuestionId);
        var sectionIndex = session.Sections.OrderBy(x => x.Order).ToList().FindIndex(x => x.Id == activeSection.Id) + 1;
        var questionIndex = activeSection.Questions.OrderBy(x => x.Order).ToList().FindIndex(x => x.Id == activeQuestion.Id) + 1;
        var presentation = DeserializePresentation(activeQuestion.SettingsJson);
        var showResponses = facilitator || (presentation.ResponseVisibility != ResponseVisibilityMode.FacilitatorOnly &&
            (presentation.ResponseVisibility == ResponseVisibilityMode.Live || session.ResultsVisible));
        var satisfactionResponseCount = session.SatisfactionResponses.Count;
        var satisfactionAverageRating = satisfactionResponseCount == 0
            ? 0
            : Math.Round(session.SatisfactionResponses.Average(x => x.Rating), 1);

        return new SessionSnapshotDto(
            session.Id,
            session.Title,
            session.AccessCode,
            session.Status,
            session.Phase,
            session.RoundOpen,
            session.ResultsVisible,
            session.SatisfactionSurveyOpen,
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
            DeserializeSettings(activeQuestion.SettingsJson),
            session.Participants
                .OrderBy(x => x.JoinedAtUtc)
                .Select(x => new ParticipantSummaryDto(x.Id, x.DisplayName, x.IsConnected, x.JoinedAtUtc))
                .ToList(),
            showResponses
                ? activeQuestion.Responses
                    .OrderByDescending(x => x.CreatedAtUtc)
                    .Select(x => new ResponseSummaryDto(
                        x.Id,
                        presentation.ResponseIdentityMode == ResponseIdentityMode.Anonymous ? null : x.SessionParticipantId,
                        presentation.ResponseIdentityMode == ResponseIdentityMode.Anonymous
                            ? "Participante"
                            : x.SessionParticipant?.DisplayName ?? "Participant",
                        x.Value,
                        x.CreatedAtUtc))
                    .ToList()
                : [],
            session.Outcomes.Select(x => new OutcomeItemDto(x.Bucket, x.Text)).ToList(),
            new SessionSatisfactionSummaryDto(satisfactionResponseCount, satisfactionAverageRating,
                facilitator ? session.SatisfactionResponses.OrderByDescending(x => x.SubmittedAtUtc)
                    .Select(x => new SessionSatisfactionResponseDto(x.Id, x.Rating, x.Comment, x.SubmittedAtUtc)).ToList() : []),
            session.ParticipantQuestions
                .OrderByDescending(x => x.CreatedAtUtc)
                .Select(x => new SessionQuestionItemDto(
                    x.Id,
                    x.SessionParticipant?.DisplayName ?? "Participante",
                    x.Question,
                    x.CreatedAtUtc,
                    x.RoundContextJson == null ? null : JsonSerializer.Deserialize<QuestionRoundContextDto>(x.RoundContextJson)))
                .ToList(),
            session.Attachments
                .OrderByDescending(x => x.UploadedAtUtc)
                .Select(x => new SessionAttachmentDto(
                    x.Id,
                    x.FileName,
                    x.ContentType,
                    x.SizeBytes,
                    x.SessionParticipant?.DisplayName ?? "Participante",
                    x.Url,
                    x.UploadedAtUtc))
                .ToList(),
            session.UpdatedAtUtc,
            facilitator ? activeQuestion.Responses.Count : null, session.IsArchived);
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
        IReadOnlyDictionary<string, string>? settings)
    {
        var merged = settings?.ToDictionary() ?? new Dictionary<string, string>();
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
        using var qrGenerator = new QRCodeGenerator();
        using var qrData = qrGenerator.CreateQrCode(joinUrl, QRCodeGenerator.ECCLevel.Q);
        var qrCode = new SvgQRCode(qrData);
        return qrCode.GetGraphic(
            pixelsPerModule: 8,
            darkColorHex: "#10213f",
            lightColorHex: "#ffffff",
            drawQuietZones: true,
            sizingMode: SvgQRCode.SizingMode.ViewBoxAttribute);
    }
}
