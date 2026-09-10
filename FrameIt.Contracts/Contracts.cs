using System.Text.Json.Serialization;

namespace FrameIt.Contracts;

public enum QuestionKind
{
    ShortText,
    RichText,
    StickyNotes,
    ColumnSort,
    Choice,
    Ranking,
    Voting,
    Matrix
}

public enum SessionStatus
{
    Draft,
    Live,
    Closed
}

public enum SessionPhase
{
    Lobby,
    RoundOpen,
    Waiting,
    Results,
    WrapUp
}

public enum ResponseVisibilityMode
{
    AfterClose,
    Live,
    FacilitatorOnly
}

public enum ResponseIdentityMode
{
    Anonymous,
    Named,
    Mixed
}

public enum CelebrationStyle
{
    None,
    Subtle,
    Energetic
}

public sealed record QuestionOptionDto(string Id, string Label, string? Description = null);

public sealed record QuestionPresentationSettingsDto(
    int TimerSeconds,
    ResponseVisibilityMode ResponseVisibility,
    ResponseIdentityMode ResponseIdentityMode,
    bool ShowProgress,
    bool AllowLateResponses,
    CelebrationStyle CelebrationStyle);

public sealed record QuestionDefinitionDto(
    string Key,
    QuestionKind Kind,
    string Title,
    string Prompt,
    IReadOnlyList<QuestionOptionDto> Options,
    QuestionPresentationSettingsDto Presentation,
    IReadOnlyDictionary<string, string>? Settings = null);

public sealed record SectionDefinitionDto(
    string Key,
    string Title,
    string Objective,
    int Order,
    IReadOnlyList<QuestionDefinitionDto> Questions);

public sealed record DynamicTemplateDefinitionDto(
    string SchemaVersion,
    string Key,
    string Title,
    string Objective,
    string Audience,
    string? FacilitatorGuidance,
    IReadOnlyList<SectionDefinitionDto> Sections,
    IReadOnlyList<string> OutcomeBuckets);

public sealed record DynamicTemplateSummaryDto(
    Guid Id,
    string Key,
    string Title,
    string Objective,
    string Audience,
    int SectionCount,
    int QuestionCount,
    bool IsBuiltIn,
    DateTimeOffset UpdatedAtUtc);

public sealed record ProjectSummaryDto(Guid Id, string Name, string Code, int SessionCount);

public sealed record ClientSummaryDto(Guid Id, string Name, string Industry, IReadOnlyList<ProjectSummaryDto> Projects);

public sealed record SessionSummaryDto(
    Guid Id,
    string Title,
    string AccessCode,
    SessionStatus Status,
    SessionPhase Phase,
    bool RoundOpen,
    bool ResultsVisible,
    string QrSvg,
    Guid ClientId,
    Guid ProjectId,
    Guid TemplateId,
    string TemplateTitle,
    DateTimeOffset UpdatedAtUtc);

public sealed record SessionSnapshotDto(
    Guid Id,
    string Title,
    string AccessCode,
    SessionStatus Status,
    SessionPhase Phase,
    bool RoundOpen,
    bool ResultsVisible,
    bool SatisfactionSurveyOpen,
    int TimerSeconds,
    DateTimeOffset? RoundOpenedAtUtc,
    Guid ActiveQuestionId,
    int SectionIndex,
    int SectionCount,
    int QuestionIndex,
    int QuestionCount,
    ResponseVisibilityMode ResponseVisibility,
    ResponseIdentityMode ResponseIdentityMode,
    CelebrationStyle CelebrationStyle,
    string JoinUrl,
    string QrSvg,
    string TemplateTitle,
    string SectionTitle,
    string QuestionTitle,
    string QuestionPrompt,
    QuestionKind QuestionKind,
    IReadOnlyList<QuestionOptionDto> Options,
    IReadOnlyList<ParticipantSummaryDto> Participants,
    IReadOnlyList<ResponseSummaryDto> Responses,
    IReadOnlyList<OutcomeItemDto> Outcomes,
    SessionSatisfactionSummaryDto SatisfactionSurvey,
    IReadOnlyList<SessionQuestionItemDto> QuestionsToFacilitator,
    IReadOnlyList<SessionAttachmentDto> Attachments,
    DateTimeOffset UpdatedAtUtc,
    int? ResponseCount = null);

public sealed record SessionAgendaQuestionDto(Guid Id, string Title, int Order);
public sealed record SessionAgendaSectionDto(Guid Id, string Title, int Order, IReadOnlyList<SessionAgendaQuestionDto> Questions);

public sealed record ParticipantSummaryDto(Guid Id, string DisplayName, bool IsConnected, DateTimeOffset JoinedAtUtc);

public sealed record ResponseSummaryDto(Guid Id, Guid? ParticipantId, string ParticipantName, string Value, DateTimeOffset CreatedAtUtc);

public sealed record OutcomeItemDto(string Bucket, string Text);

public sealed record SessionSatisfactionSummaryDto(int ResponseCount, double AverageRating,
    IReadOnlyList<SessionSatisfactionResponseDto>? Responses = null);

public sealed record SessionSatisfactionResponseDto(Guid Id, int Rating, string Comment, DateTimeOffset SubmittedAtUtc);

public sealed record SessionQuestionItemDto(
    Guid Id,
    string ParticipantName,
    string Question,
    DateTimeOffset CreatedAtUtc,
    QuestionRoundContextDto? RoundContext = null);

public sealed record QuestionRoundContextDto(Guid? RoundQuestionId, int? RoundNumber, string? SectionTitle,
    string? RoundTitle, SessionPhase Phase, DateTimeOffset? RoundOpenedAtUtc,
    int? SessionElapsedSeconds, int? RoundElapsedSeconds, bool SessionClockTracked);

public sealed record SessionAttachmentDto(
    Guid Id,
    string FileName,
    string ContentType,
    long SizeBytes,
    string UploadedBy,
    string Url,
    DateTimeOffset UploadedAtUtc);

public sealed record CreateClientRequest(string Name, string Industry);

public sealed record CreateProjectRequest(Guid ClientId, string Name, string Code);

public sealed record CreateTemplateRequest(
    string Key,
    string Title,
    string Objective,
    string Audience,
    string? FacilitatorGuidance,
    IReadOnlyList<SectionDefinitionDto> Sections);

public sealed record CreateSessionRequest(Guid ClientId, Guid ProjectId, Guid TemplateId, string Title);

public sealed record JoinSessionRequest(string DisplayName);

public sealed record SubmitResponseRequest(Guid ParticipantId, Guid QuestionId, string Value);

public sealed record AdvanceSessionRequest(SessionPhase Phase, Guid? ActiveSectionId = null, Guid? ActiveQuestionId = null);

public sealed record AddOutcomeRequest(string Bucket, string Text);

public sealed record AskFacilitatorQuestionRequest(Guid ParticipantId, string Question,
    Guid? ExpectedQuestionId = null, DateTimeOffset? ExpectedRoundOpenedAtUtc = null);

public sealed record SubmitSatisfactionSurveyRequest(Guid ParticipantId, int Rating, string? Comment);

public sealed record UpdateSatisfactionSurveyStateRequest(bool IsOpen);

public sealed record UpdateRoundStateRequest(
    SessionPhase Phase,
    bool RoundOpen,
    bool ResultsVisible,
    Guid? ActiveSectionId = null,
    Guid? ActiveQuestionId = null);

public sealed record ImportTemplateEnvelope(
    [property: JsonPropertyName("template")] DynamicTemplateDefinitionDto Template);
