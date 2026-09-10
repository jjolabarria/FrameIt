using System.Security.Claims;
using System.Security.Cryptography;
using System.Threading.RateLimiting;
using FrameIt.Api.Data;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OtpNet;
using QRCoder;

namespace FrameIt.Api.Services;

public sealed record AuthInput(string? Username, string? Password, string? Code, string? InstallationCode, string? NewPassword);

public sealed partial class LocalAuth(AppDbContext db, UserManager<FacilitatorUser> users, IDataProtectionProvider protection, IConfiguration config, IWebHostEnvironment environment)
{
    public const string SessionClaim = "frameit-session";
    private const string PendingCookie = "frameit.pending.v1";
    private readonly IDataProtector protector = protection.CreateProtector("FrameIt.LocalAuth.Totp.v1");
    private string BootstrapFile => Path.Combine(config["LocalAuth:BootstrapDirectory"] ?? Path.Combine(environment.ContentRootPath, ".local-auth"), "bootstrap-token");
    private BootstrapTokenStore Bootstrap => new(BootstrapFile, config["LocalAuth:BootstrapToken"]);
    private static string RandomToken() => Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(value)));
    private static string NormalizeCode(string? value) => (value ?? "").Replace(" ", "").Replace("-", "").Trim().ToUpperInvariant();
    private static IResult Invalid() => Results.Json(new { message = "No se ha podido verificar el acceso. Revisa los datos o espera 15 minutos si has realizado varios intentos." }, statusCode: 401);
    private CookieOptions PendingOptions => new() { HttpOnly = true, Secure = !environment.IsDevelopment(), SameSite = SameSiteMode.Strict, Path = "/api/auth", MaxAge = TimeSpan.FromMinutes(15) };

    public async Task InitializeAsync(bool reset = false)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(741926301)");
        if (reset)
        {
            await db.FacilitatorInvitations.ExecuteDeleteAsync();
            await db.FacilitatorLoginSessions.ExecuteDeleteAsync();
            await db.AuthChallenges.ExecuteDeleteAsync();
            await db.FacilitatorRecoveryCodes.ExecuteDeleteAsync();
            await db.Users.ExecuteDeleteAsync();
        }
        if (await db.Users.AnyAsync(x => x.TwoFactorEnabled)) return;
        await Bootstrap.EnsureAsync(reset);
        await transaction.CommitAsync();
    }

    public static async Task<bool> IsValidSession(AppDbContext db, ClaimsPrincipal principal)
    {
        if (!Guid.TryParse(principal.FindFirstValue(SessionClaim), out var sessionId) || !Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return false;
        var stamp = principal.FindFirstValue("security-stamp");
        return await db.FacilitatorLoginSessions.AnyAsync(x => x.Id == sessionId && x.UserId == userId && x.ExpiresAtUtc > DateTime.UtcNow)
            && await db.Users.AnyAsync(x => x.Id == userId && x.TwoFactorEnabled && x.SecurityStamp == stamp);
    }

    private async Task<AuthChallenge?> Pending(HttpContext http, params string[] purposes)
    {
        var token = http.Request.Cookies[PendingCookie];
        if (string.IsNullOrEmpty(token) || token.Length > 128) return null;
        var id = Hash(token);
        return await db.AuthChallenges.SingleOrDefaultAsync(x => x.Id == id && x.ExpiresAtUtc > DateTime.UtcNow && purposes.Contains(x.Purpose));
    }

    private async Task Challenge(HttpContext http, FacilitatorUser user, string purpose, string? secret = null)
    {
        await db.AuthChallenges.Where(x => x.UserId == user.Id || x.ExpiresAtUtc <= DateTime.UtcNow).ExecuteDeleteAsync();
        var token = RandomToken();
        db.AuthChallenges.Add(new AuthChallenge { Id = Hash(token), UserId = user.Id, Purpose = purpose, ProtectedSecret = secret, ExpiresAtUtc = DateTime.UtcNow.AddMinutes(purpose == "login" ? 5 : 15) });
        await db.SaveChangesAsync();
        http.Response.Cookies.Append(PendingCookie, token, PendingOptions);
    }

    public async Task<IResult> Status(HttpContext http)
    {
        var pending = await Pending(http, "setup", "login", "rotate");
        return Results.Ok(new { setupRequired = !await db.Users.AnyAsync(x => x.TwoFactorEnabled), pending = pending?.Purpose, isAuthenticated = http.User.Identity?.IsAuthenticated == true });
    }

    public async Task<IResult> Setup(HttpContext http, AuthInput input)
    {
        if (await db.Users.AnyAsync(x => x.TwoFactorEnabled)) return Results.Conflict(new { message = "La cuenta de facilitador ya está configurada." });
        var bootstrap = await Bootstrap.ReadAsync();
        if (bootstrap.Length == 0 || !CryptographicOperations.FixedTimeEquals(System.Text.Encoding.UTF8.GetBytes(Hash(input.InstallationCode?.Trim() ?? "")), System.Text.Encoding.UTF8.GetBytes(Hash(bootstrap)))) return Invalid();
        if (string.IsNullOrWhiteSpace(input.Username) || input.Username.Length is < 3 or > 64 || input.Password?.Length is not (>= 12 and <= 128)) return Results.BadRequest(new { message = "Usa un usuario de 3–64 caracteres y una contraseña de 12–128 caracteres." });
        // Only the installation code can replace an incomplete first enrollment.
        await db.AuthChallenges.ExecuteDeleteAsync();
        await db.Users.Where(x => !x.TwoFactorEnabled).ExecuteDeleteAsync();
        var user = new FacilitatorUser { Id = Guid.NewGuid(), UserName = input.Username.Trim(), LockoutEnabled = true, IsPlatformAdmin = true };
        var created = await users.CreateAsync(user, input.Password);
        if (!created.Succeeded) return Results.BadRequest(new { message = "El usuario debe contener letras, números o los símbolos . _ - @ +. Revisa también la contraseña." });
        var secret = protector.Protect(Base32Encoding.ToString(RandomNumberGenerator.GetBytes(20)));
        await Challenge(http, user, "setup", secret);
        return Results.Ok(new { step = "setup" });
    }

    private async Task<FacilitatorUser?> Password(string? username, string? password)
    {
        var user = username?.Length <= 64 ? await users.FindByNameAsync(username.Trim()) : null;
        if (user is null)
        {
            // Perform the same expensive password hash operation for an unknown username.
            _ = new PasswordHasher<FacilitatorUser>().HashPassword(new FacilitatorUser(), (password ?? "")[..Math.Min(password?.Length ?? 0, 128)]);
            return null;
        }
        if (await users.IsLockedOutAsync(user)) return null;
        if (password?.Length is not (>= 1 and <= 128) || !await users.CheckPasswordAsync(user, password))
        {
            await users.AccessFailedAsync(user);
            return null;
        }
        return user;
    }

    public async Task<IResult> Login(HttpContext http, AuthInput input)
    {
        var user = await Password(input.Username, input.Password);
        if (user is null || !user.TwoFactorEnabled) return Invalid();
        await Challenge(http, user, "login");
        return Results.Ok(new { step = "login" });
    }

    private bool VerifyTotp(string protectedSecret, string? input, long lastStep, out long step)
    {
        step = -1;
        var code = NormalizeCode(input);
        return code.Length == 6 && code.All(char.IsAsciiDigit) && new Totp(Base32Encoding.ToBytes(protector.Unprotect(protectedSecret))).VerifyTotp(code, out step, new VerificationWindow(previous: 1, future: 1)) && step > lastStep;
    }

    private async Task<bool> Factor(FacilitatorUser user, string? code)
    {
        if (await users.IsLockedOutAsync(user)) return false;
        if (user.ProtectedTotpSecret is not null && VerifyTotp(user.ProtectedTotpSecret, code, user.LastTotpTimeStep, out var step))
        {
            user.LastTotpTimeStep = step;
            await users.UpdateAsync(user);
            await users.ResetAccessFailedCountAsync(user);
            return true;
        }
        var hash = Hash(NormalizeCode(code));
        if (await db.FacilitatorRecoveryCodes.Where(x => x.UserId == user.Id && x.Id == hash).ExecuteDeleteAsync() == 1)
        {
            await users.ResetAccessFailedCountAsync(user);
            return true;
        }
        await users.AccessFailedAsync(user);
        return false;
    }

    private async Task<string[]> RecoveryCodes(FacilitatorUser user)
    {
        await db.FacilitatorRecoveryCodes.Where(x => x.UserId == user.Id).ExecuteDeleteAsync();
        var codes = Enumerable.Range(0, 10).Select(_ => Convert.ToHexString(RandomNumberGenerator.GetBytes(16))).ToArray();
        db.FacilitatorRecoveryCodes.AddRange(codes.Select(code => new FacilitatorRecoveryCode { Id = Hash(code), UserId = user.Id }));
        await db.SaveChangesAsync();
        return codes;
    }

    private async Task SignIn(HttpContext http, FacilitatorUser user, bool revoke = false)
    {
        if (revoke) await db.FacilitatorLoginSessions.Where(x => x.UserId == user.Id).ExecuteDeleteAsync();
        await db.FacilitatorLoginSessions.Where(x => x.ExpiresAtUtc <= DateTime.UtcNow).ExecuteDeleteAsync();
        var session = new FacilitatorLoginSession { UserId = user.Id, ExpiresAtUtc = DateTime.UtcNow.AddHours(8) };
        db.FacilitatorLoginSessions.Add(session);
        await db.AuthChallenges.Where(x => x.UserId == user.Id).ExecuteDeleteAsync();
        await db.SaveChangesAsync();
        http.Response.Cookies.Delete(PendingCookie, PendingOptions);
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), new Claim(ClaimTypes.Name, user.UserName!), new Claim("amr", "mfa"), new Claim("security-stamp", user.SecurityStamp!), new Claim(SessionClaim, session.Id.ToString()) };
        await http.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme)), new AuthenticationProperties { ExpiresUtc = session.ExpiresAtUtc, IsPersistent = false, AllowRefresh = false });
    }

    public async Task<IResult> Enrollment(HttpContext http)
    {
        var pending = await Pending(http, "setup", "rotate");
        if (pending?.ProtectedSecret is null) return Invalid();
        var user = await users.FindByIdAsync(pending.UserId.ToString());
        if (user is null || await users.IsLockedOutAsync(user)) return Invalid();
        if (pending.Purpose == "setup" && !await CanCompleteEnrollment(user)) return Invalid();
        var secret = protector.Unprotect(pending.ProtectedSecret);
        var uri = $"otpauth://totp/{Uri.EscapeDataString("FrameIt:" + user.UserName)}?secret={secret}&issuer=FrameIt&algorithm=SHA1&digits=6&period=30";
        using var qrData = QRCodeGenerator.GenerateQrCode(uri, QRCodeGenerator.ECCLevel.Q);
        using var qr = new SvgQRCode(qrData);
        return Results.Ok(new { secret, qrSvg = qr.GetGraphic(4) });
    }

    public async Task<IResult> Verify(HttpContext http, AuthInput input)
    {
        var pending = await Pending(http, "setup", "rotate", "login");
        if (pending is null) return Invalid();
        var user = await users.FindByIdAsync(pending.UserId.ToString());
        if (user is null || await users.IsLockedOutAsync(user)) return Invalid();
        if (pending.Purpose == "setup" && !await CanCompleteEnrollment(user)) return Invalid();
        if (pending.Purpose == "login")
        {
            if (!user.TwoFactorEnabled || !await Factor(user, input.Code)) return Invalid();
            await SignIn(http, user);
            return Results.Ok(new { complete = true });
        }
        if (pending.ProtectedSecret is null || !VerifyTotp(pending.ProtectedSecret, input.Code, -1, out var step))
        {
            await users.AccessFailedAsync(user);
            return Invalid();
        }
        user.ProtectedTotpSecret = pending.ProtectedSecret;
        user.LastTotpTimeStep = step;
        user.TwoFactorEnabled = true;
        if (pending.Purpose == "setup" && !user.IsPlatformAdmin)
        {
            var invitation = await db.FacilitatorInvitations.SingleAsync(x => x.UserId == user.Id);
            invitation.AcceptedAtUtc = DateTime.UtcNow;
        }
        await users.UpdateAsync(user);
        await users.ResetAccessFailedCountAsync(user);
        await users.UpdateSecurityStampAsync(user);
        var recoveryCodes = await RecoveryCodes(user);
        await SignIn(http, user, revoke: true);
        return Results.Ok(new { complete = true, recoveryCodes });
    }

    public async Task<IResult> Security(HttpContext http, AuthInput input, string action)
    {
        var user = await users.GetUserAsync(http.User);
        if (user is null || await Password(user.UserName, input.Password) is null) return Invalid();
        if (action == "password" && input.NewPassword?.Length is not (>= 12 and <= 128)) return Results.BadRequest(new { message = "La nueva contraseña debe tener entre 12 y 128 caracteres." });
        if (!await Factor(user, input.Code)) return Invalid();
        if (action == "rotate")
        {
            await Challenge(http, user, "rotate", protector.Protect(Base32Encoding.ToString(RandomNumberGenerator.GetBytes(20))));
            return Results.Ok(new { step = "rotate" });
        }
        if (action == "password")
        {
            var changed = await users.ChangePasswordAsync(user, input.Password!, input.NewPassword!);
            if (!changed.Succeeded) return Results.BadRequest(new { message = "No se pudo cambiar la contraseña." });
            await SignIn(http, user, revoke: true);
            return Results.Ok(new { complete = true });
        }
        var recoveryCodes = await RecoveryCodes(user);
        await SignIn(http, user, revoke: true);
        return Results.Ok(new { complete = true, recoveryCodes });
    }

    public async Task<IResult> Logout(HttpContext http)
    {
        if (Guid.TryParse(http.User.FindFirstValue(SessionClaim), out var id)) await db.FacilitatorLoginSessions.Where(x => x.Id == id).ExecuteDeleteAsync();
        await Cancel(http);
        await http.SignOutAsync();
        return Results.NoContent();
    }

    public async Task<IResult> Cancel(HttpContext http)
    {
        var pending = await Pending(http, "setup", "rotate", "login");
        if (pending is not null) { db.AuthChallenges.Remove(pending); await db.SaveChangesAsync(); }
        http.Response.Cookies.Delete(PendingCookie, PendingOptions);
        return Results.NoContent();
    }
}

public static class LocalAuthEndpoints
{
    public static void AddLocalAuth(this WebApplicationBuilder builder)
    {
        builder.Services.AddScoped<LocalAuth>();
        builder.Services.AddIdentityCore<FacilitatorUser>(options =>
        {
            options.Password.RequiredLength = 12;
            options.Password.RequireDigit = options.Password.RequireLowercase = options.Password.RequireUppercase = options.Password.RequireNonAlphanumeric = false;
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        }).AddRoles<IdentityRole<Guid>>().AddEntityFrameworkStores<AppDbContext>();
        builder.Services.AddAntiforgery(options => { options.HeaderName = "X-CSRF-TOKEN"; options.Cookie.Name = "frameit.csrf.v1"; options.Cookie.SameSite = SameSiteMode.Strict; options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always; });
        builder.Services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = 429;
            options.AddPolicy("local-auth", http => RateLimitPartition.GetFixedWindowLimiter(http.Connection.RemoteIpAddress?.ToString() ?? "local", _ => new FixedWindowRateLimiterOptions { PermitLimit = 30, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
        });
        builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(options =>
        {
            options.Cookie.Name = "frameit.facilitator.v1";
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Strict;
            options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
            options.ExpireTimeSpan = TimeSpan.FromHours(8);
            options.SlidingExpiration = false;
            options.Events.OnRedirectToLogin = context => { context.Response.StatusCode = 401; return Task.CompletedTask; };
            options.Events.OnRedirectToAccessDenied = context => { context.Response.StatusCode = 403; return Task.CompletedTask; };
            options.Events.OnValidatePrincipal = async context =>
            {
                if (!await LocalAuth.IsValidSession(context.HttpContext.RequestServices.GetRequiredService<AppDbContext>(), context.Principal!)) { context.RejectPrincipal(); await context.HttpContext.SignOutAsync(); }
            };
        });
        builder.Services.AddAuthorization(options => options.DefaultPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().RequireClaim("amr", "mfa").Build());
    }

    public static void MapLocalAuth(this WebApplication app)
    {
        app.UseRateLimiter();
        app.Use(async (http, next) =>
        {
            var authPath = http.Request.Path.StartsWithSegments("/api/auth");
            if (http.User.Identity?.IsAuthenticated == true && http.GetEndpoint()?.Metadata.GetMetadata<IAuthorizeData>() is not null)
            {
                var db = http.RequestServices.GetRequiredService<AppDbContext>();
                var userId = Guid.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var user = await db.Users.SingleAsync(x => x.Id == userId);
                if (!user.IsPlatformAdmin)
                {
                    db.OrganizationScopeEnabled = true;
                    db.CurrentOrganizationId = user.OrganizationId;
                }
                else if (!authPath && http.Request.Headers.TryGetValue("X-FrameIt-Organization", out var organization))
                {
                    if (!Guid.TryParse(organization, out var organizationId) || !await db.Organizations.AnyAsync(x => x.Id == organizationId))
                    { http.Response.StatusCode = 400; await http.Response.WriteAsJsonAsync(new { message = "La organización seleccionada no existe." }); return; }
                    db.OrganizationScopeEnabled = true;
                    db.CurrentOrganizationId = organizationId;
                }
            }
            if (authPath || http.User.Identity?.IsAuthenticated == true) http.Response.Headers.CacheControl = "no-store";
            if (http.Request.Path.StartsWithSegments("/hubs/session") && http.Request.Headers.Origin.Count > 0)
            {
                var origin = http.Request.Headers.Origin.ToString();
                var sameOrigin = Uri.TryCreate(origin, UriKind.Absolute, out var uri) && uri.Authority.Equals(http.Request.Host.Value, StringComparison.OrdinalIgnoreCase);
                var localDev = app.Environment.IsDevelopment() && (origin == "http://localhost:5173" || origin == "https://localhost:5173");
                if (!sameOrigin && !localDev) { http.Response.StatusCode = 403; return; }
            }
            if (!HttpMethods.IsGet(http.Request.Method) && !HttpMethods.IsHead(http.Request.Method) && !HttpMethods.IsOptions(http.Request.Method)
                && (authPath || http.GetEndpoint()?.Metadata.GetMetadata<IAuthorizeData>() is not null))
            {
                try { await http.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(http); }
                catch (AntiforgeryValidationException) { http.Response.StatusCode = 400; await http.Response.WriteAsJsonAsync(new { message = "La verificación del formulario ha caducado. Vuelve a intentarlo." }); return; }
            }
            await next(http);
        });
        var auth = app.MapGroup("/api/auth");
        auth.MapGet("/csrf", (HttpContext http, IAntiforgery antiforgery) => Results.Ok(new { token = antiforgery.GetAndStoreTokens(http).RequestToken }));
        auth.MapGet("/me", (HttpContext http, LocalAuth service) => service.Me(http));
        auth.MapGet("/team", (HttpContext http, LocalAuth service) => service.Team(http)).RequireAuthorization();
        auth.MapGet("/status", (HttpContext http, LocalAuth service) => service.Status(http));
        auth.MapGet("/enrollment", (HttpContext http, LocalAuth service) => service.Enrollment(http)).RequireRateLimiting("local-auth");
        // Serialize mutations across API instances, including failed-attempt counters and single-use factors.
        var mutations = auth.MapGroup("").RequireRateLimiting("local-auth").AddEndpointFilter(async (context, next) =>
        {
            var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            await using var transaction = await db.Database.BeginTransactionAsync();
            await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(741926301)");
            var result = await next(context);
            await transaction.CommitAsync();
            return result;
        });
        mutations.MapPost("/setup", (HttpContext http, AuthInput input, LocalAuth service) => service.Setup(http, input));
        mutations.MapPost("/invitations", (HttpContext http, CreateInvitationInput input, LocalAuth service) => service.CreateInvitation(http, input)).RequireAuthorization();
        mutations.MapPost("/organizations", (HttpContext http, CreateOrganizationInput input, LocalAuth service) => service.CreateOrganization(http, input)).RequireAuthorization();
        mutations.MapPost("/invitations/{id:guid}/revoke", (HttpContext http, Guid id, LocalAuth service) => service.RevokeInvitation(http, id)).RequireAuthorization();
        mutations.MapPost("/invitation", (HttpContext http, AcceptInvitationInput input, LocalAuth service) => service.AcceptInvitation(http, input));
        mutations.MapPost("/login", (HttpContext http, AuthInput input, LocalAuth service) => service.Login(http, input));
        mutations.MapPost("/verify", (HttpContext http, AuthInput input, LocalAuth service) => service.Verify(http, input));
        mutations.MapPost("/cancel", (HttpContext http, LocalAuth service) => service.Cancel(http));
        mutations.MapPost("/logout", (HttpContext http, LocalAuth service) => service.Logout(http));
        foreach (var action in new[] { "password", "recovery", "rotate" })
        {
            var operation = action;
            mutations.MapPost("/" + operation, (HttpContext http, AuthInput input, LocalAuth service) => service.Security(http, input, operation)).RequireAuthorization();
        }
    }
}
