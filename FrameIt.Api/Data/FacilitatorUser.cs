using Microsoft.AspNetCore.Identity;

namespace FrameIt.Api.Data;

public sealed class FacilitatorUser : IdentityUser<Guid>
{
    public bool IsPlatformAdmin { get; set; }
    public Guid? OrganizationId { get; set; }
    public Organization? Organization { get; set; }
    public string? ProtectedTotpSecret { get; set; }
    public long LastTotpTimeStep { get; set; } = -1;
}

public sealed class FacilitatorInvitation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = "";
    public string TokenHash { get; set; } = "";
    public Guid CreatedByUserId { get; set; }
    public Guid OrganizationId { get; set; }
    public Organization? Organization { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public DateTime? AcceptedAtUtc { get; set; }
    public Guid? UserId { get; set; }
}

public sealed class FacilitatorLoginSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
}

public sealed class AuthChallenge
{
    public string Id { get; set; } = "";
    public Guid UserId { get; set; }
    public string Purpose { get; set; } = "";
    public string? ProtectedSecret { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
}

public sealed class FacilitatorRecoveryCode
{
    public string Id { get; set; } = "";
    public Guid UserId { get; set; }
}
