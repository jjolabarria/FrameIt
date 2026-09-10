using System.ComponentModel.DataAnnotations;
using FrameIt.Api.Data;
using Microsoft.EntityFrameworkCore;
using OtpNet;
using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;

namespace FrameIt.Api.Services;

public sealed record CreateInvitationInput(string? Email, Guid OrganizationId);
public sealed record CreateOrganizationInput(string? Name);
public sealed record AcceptInvitationInput(string? Token, string? Username, string? Password);

public sealed partial class LocalAuth
{
    public async Task<IResult> Me(HttpContext http)
    {
        var user = http.User.Identity?.IsAuthenticated == true ? await users.GetUserAsync(http.User) : null;
        return Results.Ok(new { isAuthenticated = user is not null, name = user?.UserName, isAdmin = user?.IsPlatformAdmin == true,
            organizationId = user?.OrganizationId, organizationName = user?.OrganizationId is Guid id ? await db.Organizations.Where(x => x.Id == id).Select(x => x.Name).SingleOrDefaultAsync() : null });
    }

    public async Task<IResult> CreateOrganization(HttpContext http, CreateOrganizationInput input)
    {
        if (!await IsAdministrator(http)) return Results.Forbid();
        if (string.IsNullOrWhiteSpace(input.Name) || input.Name.Trim().Length > 160) return Results.BadRequest(new { message = "Indica un nombre de organización de hasta 160 caracteres." });
        var organization = new Organization { Name = input.Name.Trim() };
        db.Organizations.Add(organization);
        await db.SaveChangesAsync();
        return Results.Ok(new { organization.Id, organization.Name });
    }
    public async Task<bool> IsAdministrator(HttpContext http)
    {
        if (http.User.Identity?.IsAuthenticated != true) return false;
        var user = await users.GetUserAsync(http.User);
        return user?.IsPlatformAdmin == true && user.TwoFactorEnabled;
    }

    private Task<bool> CanCompleteEnrollment(FacilitatorUser user) => user.IsPlatformAdmin
        ? Task.FromResult(true)
        : db.FacilitatorInvitations.AnyAsync(x => x.UserId == user.Id && x.AcceptedAtUtc == null && x.RevokedAtUtc == null && x.ExpiresAtUtc > DateTime.UtcNow);

    public async Task<IResult> Team(HttpContext http)
    {
        if (!await IsAdministrator(http)) return Results.Forbid();
        return Results.Ok(new
        {
            organizations = await db.Organizations.OrderBy(x => x.Name).Select(x => new { x.Id, x.Name }).ToListAsync(),
            users = await db.Users.Where(x => x.TwoFactorEnabled).OrderBy(x => x.UserName)
                .Select(x => new { x.Id, name = x.UserName, x.Email, isAdmin = x.IsPlatformAdmin, x.OrganizationId, organizationName = x.Organization != null ? x.Organization.Name : null }).ToListAsync(),
            invitations = await db.FacilitatorInvitations.OrderByDescending(x => x.CreatedAtUtc)
                .Take(100).Select(x => new { x.Id, x.Email, x.CreatedAtUtc, x.ExpiresAtUtc, x.RevokedAtUtc, x.AcceptedAtUtc, x.OrganizationId, organizationName = x.Organization!.Name }).ToListAsync()
        });
    }

    public async Task<IResult> CreateInvitation(HttpContext http, CreateInvitationInput input)
    {
        if (!await IsAdministrator(http)) return Results.Forbid();
        var email = input.Email?.Trim().ToLowerInvariant();
        if (!await db.Organizations.AnyAsync(x => x.Id == input.OrganizationId)) return Results.BadRequest(new { message = "Selecciona una organización válida." });
        if (string.IsNullOrEmpty(email) || email.Length > 254 || !new EmailAddressAttribute().IsValid(email))
            return Results.BadRequest(new { message = "Introduce un correo válido para identificar a la persona invitada." });
        if (await db.Users.AnyAsync(x => x.Email == email && x.TwoFactorEnabled))
            return Results.Conflict(new { message = "Ya hay un facilitador con ese correo." });
        if (await db.FacilitatorInvitations.AnyAsync(x => x.Email == email && x.AcceptedAtUtc == null && x.RevokedAtUtc == null && x.ExpiresAtUtc > DateTime.UtcNow))
            return Results.Conflict(new { message = "Ya existe una invitación pendiente. Revócala antes de generar otra." });
        var token = RandomToken();
        var admin = (await users.GetUserAsync(http.User))!;
        var invitation = new FacilitatorInvitation { Email = email, OrganizationId = input.OrganizationId, TokenHash = Hash(token), CreatedByUserId = admin.Id, ExpiresAtUtc = DateTime.UtcNow.AddDays(7) };
        db.FacilitatorInvitations.Add(invitation);
        await db.SaveChangesAsync();
        var invitationUrl = http.RequestServices.GetRequiredService<PublicUrls>().Invitation(http.Request, token);
        return Results.Ok(new { invitation.Id, invitation.Email, invitation.ExpiresAtUtc, token, invitationUrl });
    }

    public async Task<IResult> RevokeInvitation(HttpContext http, Guid id)
    {
        if (!await IsAdministrator(http)) return Results.Forbid();
        var invitation = await db.FacilitatorInvitations.FindAsync(id);
        if (invitation is null) return Results.NotFound();
        if (invitation.AcceptedAtUtc is not null) return Results.Conflict(new { message = "La invitación ya se ha utilizado." });
        invitation.RevokedAtUtc = DateTime.UtcNow;
        if (invitation.UserId is Guid userId) await db.AuthChallenges.Where(x => x.UserId == userId).ExecuteDeleteAsync();
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    public async Task<IResult> AcceptInvitation(HttpContext http, AcceptInvitationInput input)
    {
        if (http.User.Identity?.IsAuthenticated == true)
            return Results.Conflict(new { message = "Cierra tu sesión actual antes de aceptar una invitación." });
        if (input.Token?.Length != 64) return Invalid();
        var hash = Hash(input.Token);
        var invitation = await db.FacilitatorInvitations.SingleOrDefaultAsync(x => x.TokenHash == hash);
        if (invitation is null || invitation.AcceptedAtUtc is not null || invitation.RevokedAtUtc is not null || invitation.ExpiresAtUtc <= DateTime.UtcNow)
            return Results.BadRequest(new { message = "La invitación no es válida, ha caducado o ya se ha utilizado. Solicita otra al administrador." });
        if (string.IsNullOrWhiteSpace(input.Username) || input.Username.Length is < 3 or > 64 || input.Password?.Length is not (>= 12 and <= 128))
            return Results.BadRequest(new { message = "Usa un usuario de 3–64 caracteres y una contraseña de 12–128 caracteres." });
        var existing = await users.FindByNameAsync(input.Username.Trim());
        if (existing is not null && existing.Id != invitation.UserId)
            return Results.Conflict(new { message = "Ese usuario ya está en uso. Elige otro." });
        if (invitation.UserId is Guid previousId)
        {
            if (await db.Users.AnyAsync(x => x.Id == previousId && x.TwoFactorEnabled)) return Invalid();
            await db.AuthChallenges.Where(x => x.UserId == previousId).ExecuteDeleteAsync();
            await db.Users.Where(x => x.Id == previousId).ExecuteDeleteAsync();
            invitation.UserId = null;
        }
        var user = new FacilitatorUser { Id = Guid.NewGuid(), UserName = input.Username.Trim(), Email = invitation.Email, LockoutEnabled = true, IsPlatformAdmin = false, OrganizationId = invitation.OrganizationId };
        var created = await users.CreateAsync(user, input.Password);
        if (!created.Succeeded) return Results.BadRequest(new { message = "Revisa el nombre de usuario y la contraseña." });
        invitation.UserId = user.Id;
        await Challenge(http, user, "setup", protector.Protect(Base32Encoding.ToString(RandomNumberGenerator.GetBytes(20))));
        return Results.Ok(new { step = "setup" });
    }
}
