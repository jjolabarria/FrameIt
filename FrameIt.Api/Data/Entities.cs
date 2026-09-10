using FrameIt.Contracts;

namespace FrameIt.Api.Data;

public sealed class Client
{
    public bool IsArchived { get; set; }
    public Guid OrganizationId { get; set; } = Organization.DefaultId;
    public Organization? Organization { get; set; }
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Industry { get; set; } = string.Empty;
    public ICollection<Project> Projects { get; set; } = [];
}

public sealed class Project
{
    public bool IsArchived { get; set; }
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClientId { get; set; }
    public Client? Client { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public ICollection<WorkshopSession> Sessions { get; set; } = [];
}

public sealed class DynamicTemplate
{
    public bool IsArchived { get; set; }
    public Guid? OrganizationId { get; set; }
    public Organization? Organization { get; set; }
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Key { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Objective { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public string? FacilitatorGuidance { get; set; }
    public bool IsBuiltIn { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<TemplateSection> Sections { get; set; } = [];
    public ICollection<WorkshopSession> Sessions { get; set; } = [];
}

public sealed class TemplateSection
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DynamicTemplateId { get; set; }
    public DynamicTemplate? DynamicTemplate { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Objective { get; set; } = string.Empty;
    public int Order { get; set; }
    public ICollection<TemplateQuestion> Questions { get; set; } = [];
}

public sealed class TemplateQuestion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TemplateSectionId { get; set; }
    public TemplateSection? TemplateSection { get; set; }
    public string Key { get; set; } = string.Empty;
    public QuestionKind Kind { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public int Order { get; set; }
    public string OptionsJson { get; set; } = "[]";
    public string SettingsJson { get; set; } = "{}";
}

public sealed class WorkshopSession
{
    public bool IsArchived { get; set; }
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClientId { get; set; }
    public Client? Client { get; set; }
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }
    public Guid TemplateId { get; set; }
    public DynamicTemplate? Template { get; set; }
    public string Title { get; set; } = string.Empty;
    public string AccessCode { get; set; } = string.Empty;
    public SessionStatus Status { get; set; } = SessionStatus.Draft;
    public SessionPhase Phase { get; set; } = SessionPhase.Lobby;
    public bool RoundOpen { get; set; }
    public bool ResultsVisible { get; set; }
    public bool SatisfactionSurveyOpen { get; set; }
    public DateTimeOffset? RoundOpenedAtUtc { get; set; }
    public DateTimeOffset? SessionStartedAtUtc { get; set; }
    public bool TracksSessionTime { get; set; } = true;
    public Guid? ActiveSectionId { get; set; }
    public Guid? ActiveQuestionId { get; set; }
    public DateTimeOffset UpdatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<SessionSection> Sections { get; set; } = [];
    public ICollection<SessionParticipant> Participants { get; set; } = [];
    public ICollection<SessionOutcome> Outcomes { get; set; } = [];
    public ICollection<SessionSatisfactionResponse> SatisfactionResponses { get; set; } = [];
    public ICollection<ParticipantQuestion> ParticipantQuestions { get; set; } = [];
    public ICollection<SessionAttachment> Attachments { get; set; } = [];
}

public sealed class SessionSection
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkshopSessionId { get; set; }
    public WorkshopSession? WorkshopSession { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Objective { get; set; } = string.Empty;
    public int Order { get; set; }
    public ICollection<SessionQuestion> Questions { get; set; } = [];
}

public sealed class SessionQuestion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionSectionId { get; set; }
    public SessionSection? SessionSection { get; set; }
    public string Key { get; set; } = string.Empty;
    public QuestionKind Kind { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public int Order { get; set; }
    public string OptionsJson { get; set; } = "[]";
    public string SettingsJson { get; set; } = "{}";
    public ICollection<QuestionResponse> Responses { get; set; } = [];
}

public sealed class SessionParticipant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkshopSessionId { get; set; }
    public WorkshopSession? WorkshopSession { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public bool IsConnected { get; set; }
    public DateTimeOffset JoinedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<QuestionResponse> Responses { get; set; } = [];
}

public sealed class QuestionResponse
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SessionQuestionId { get; set; }
    public SessionQuestion? SessionQuestion { get; set; }
    public Guid SessionParticipantId { get; set; }
    public SessionParticipant? SessionParticipant { get; set; }
    public string Value { get; set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class SessionOutcome
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkshopSessionId { get; set; }
    public WorkshopSession? WorkshopSession { get; set; }
    public string Bucket { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}

public sealed class SessionSatisfactionResponse
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkshopSessionId { get; set; }
    public WorkshopSession? WorkshopSession { get; set; }
    public Guid SessionParticipantId { get; set; }
    public SessionParticipant? SessionParticipant { get; set; }
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public DateTimeOffset SubmittedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class ParticipantQuestion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkshopSessionId { get; set; }
    public WorkshopSession? WorkshopSession { get; set; }
    public Guid SessionParticipantId { get; set; }
    public SessionParticipant? SessionParticipant { get; set; }
    public string Question { get; set; } = string.Empty;
    public string? RoundContextJson { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class SessionAttachment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkshopSessionId { get; set; }
    public WorkshopSession? WorkshopSession { get; set; }
    public Guid SessionParticipantId { get; set; }
    public SessionParticipant? SessionParticipant { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string StorageKey { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public DateTimeOffset UploadedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
