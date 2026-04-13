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
    IReadOnlyDictionary<string, string> Settings);

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
    IReadOnlyList<OutcomeItemDto> Outcomes);

public sealed record ParticipantSummaryDto(Guid Id, string DisplayName, bool IsConnected, DateTimeOffset JoinedAtUtc);

public sealed record ResponseSummaryDto(Guid Id, Guid ParticipantId, string ParticipantName, string Value, DateTimeOffset CreatedAtUtc);

public sealed record OutcomeItemDto(string Bucket, string Text);

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

public sealed record UpdateRoundStateRequest(
    SessionPhase Phase,
    bool RoundOpen,
    bool ResultsVisible,
    Guid? ActiveSectionId = null,
    Guid? ActiveQuestionId = null);

public sealed record ImportTemplateEnvelope(
    [property: JsonPropertyName("template")] DynamicTemplateDefinitionDto Template);
