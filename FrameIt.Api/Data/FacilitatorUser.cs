using Microsoft.AspNetCore.Identity;

namespace FrameIt.Api.Data;

public sealed class FacilitatorUser : IdentityUser<Guid>
{
    public string? ProtectedTotpSecret { get; set; }
    public long LastTotpTimeStep { get; set; } = -1;
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
