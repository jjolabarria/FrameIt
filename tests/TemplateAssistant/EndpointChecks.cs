using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using FrameIt.Api.Data;
using FrameIt.Api.Services;
using FrameIt.Contracts;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

static class EndpointChecks
{
    public static async Task Run(CreateTemplateRequest draft, string response)
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Development", Args = [] });
        builder.Logging.ClearProviders();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?> { ["OpenAI:ApiKey"] = "test-only", ["OpenAI:BaseUrl"] = "https://provider.example/v1/" });
        builder.Services.Configure<OpenAiOptions>(builder.Configuration.GetSection("OpenAI"));
        builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
        builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
        builder.AddLocalAuth();
        builder.AddTemplateAssistant();
        builder.Services.AddHttpClient<TemplateAssistant>().ConfigurePrimaryHttpMessageHandler(() => new StubHandler(response));
        builder.Services.AddAuthentication(options => { options.DefaultAuthenticateScheme = "test"; options.DefaultChallengeScheme = "test"; options.DefaultForbidScheme = "test"; })
            .AddScheme<AuthenticationSchemeOptions, TestAuthentication>("test", _ => { });
        var database = "assistant-tests-" + Guid.NewGuid();
        builder.Services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase(database));
        await using var app = builder.Build();
        var orgA = Guid.NewGuid(); var orgB = Guid.NewGuid(); var member = Guid.NewGuid(); var admin = Guid.NewGuid();
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Organizations.AddRange(new Organization { Id = orgA, Name = "A" }, new Organization { Id = orgB, Name = "B" });
            db.Users.AddRange(new FacilitatorUser { Id = member, UserName = "member", OrganizationId = orgA, TwoFactorEnabled = true }, new FacilitatorUser { Id = admin, UserName = "admin", IsPlatformAdmin = true, TwoFactorEnabled = true });
            var own = draft.ToEntity(); own.OrganizationId = orgA;
            var foreign = draft.ToEntity(); foreign.OrganizationId = orgB;
            db.DynamicTemplates.AddRange(own, foreign);
            await db.SaveChangesAsync();
        }
        app.UseAuthentication(); app.UseAuthorization(); app.MapLocalAuth(); app.MapTemplateAssistant();
        // Observe the real scope middleware and EF filters without production database access.
        app.MapGet("/test/scope", async (AppDbContext db) => Results.Ok(new { organization = db.CurrentOrganizationId, count = await db.DynamicTemplates.CountAsync() })).RequireAuthorization();
        await app.StartAsync();
        try
        {
            using var client = new HttpClient(new HttpClientHandler { CookieContainer = new CookieContainer() }) { BaseAddress = new Uri(app.Urls.Single()) };
            static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
            Check((await client.GetAsync("/api/templates/assistant/capabilities")).StatusCode == HttpStatusCode.Unauthorized, "Anonymous capabilities accepted");
            var input = new TemplateAssistantInput("Diseña un taller", [], draft, "template", null, null);
            client.DefaultRequestHeaders.Add("X-Test-User", member.ToString());
            client.DefaultRequestHeaders.Add("X-Test-No-Mfa", "1");
            Check((await client.GetAsync("/api/templates/assistant/capabilities")).StatusCode == HttpStatusCode.Forbidden, "Missing MFA accepted");
            client.DefaultRequestHeaders.Remove("X-Test-No-Mfa");
            Check((await client.PostAsJsonAsync("/api/templates/assistant", input, TemplateAssistant.Json)).StatusCode == HttpStatusCode.BadRequest, "Missing antiforgery accepted");
            async Task Csrf()
            {
                var json = await client.GetFromJsonAsync<JsonElement>("/api/auth/csrf");
                client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN"); client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", json.GetProperty("token").GetString());
            }
            await Csrf();
            Check((await client.PostAsJsonAsync("/api/templates/assistant", input, TemplateAssistant.Json)).IsSuccessStatusCode, "Member assistance rejected");
            client.DefaultRequestHeaders.Add("X-FrameIt-Organization", orgB.ToString());
            var observed = await client.GetFromJsonAsync<JsonElement>("/test/scope");
            Check(observed.GetProperty("organization").GetGuid() == orgA && observed.GetProperty("count").GetInt32() == 1, "Member escaped organization isolation");
            client.DefaultRequestHeaders.Remove("X-Test-User"); client.DefaultRequestHeaders.Add("X-Test-User", admin.ToString());
            client.DefaultRequestHeaders.Remove("X-FrameIt-Organization"); await Csrf();
            Check((await client.PostAsJsonAsync("/api/templates/assistant", input, TemplateAssistant.Json)).StatusCode == HttpStatusCode.BadRequest, "Admin without organization accepted");
            observed = await client.GetFromJsonAsync<JsonElement>("/test/scope");
            Check(observed.GetProperty("count").GetInt32() == 2, "Admin cannot see all organizations");
            client.DefaultRequestHeaders.Add("X-FrameIt-Organization", orgB.ToString());
            Check((await client.PostAsJsonAsync("/api/templates/assistant", input, TemplateAssistant.Json)).IsSuccessStatusCode, "Admin with organization rejected");
            var statuses = new List<HttpStatusCode>();
            for (var i = 0; i < 10; i++) statuses.Add((await client.PostAsJsonAsync("/api/templates/assistant", input, TemplateAssistant.Json)).StatusCode);
            Check(statuses.Contains(HttpStatusCode.TooManyRequests), "Rate limit missing");
            client.DefaultRequestHeaders.Remove("X-Test-User"); client.DefaultRequestHeaders.Add("X-Test-User", member.ToString());
            await Csrf();
            Check((await client.PostAsJsonAsync("/api/templates/assistant", input, TemplateAssistant.Json)).IsSuccessStatusCode, "Rate limit not partitioned by user");
            Console.WriteLine("PASS: HTTP authentication, antiforgery, member organization isolation, admin scope requirement and per-user rate limit (isolated EF InMemory provider).");
        }
        finally { await app.StopAsync(); }
    }
}

sealed class TestAuthentication(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Guid.TryParse(Request.Headers["X-Test-User"], out var user)) return Task.FromResult(AuthenticateResult.NoResult());
        var identity = new ClaimsIdentity([new(ClaimTypes.NameIdentifier, user.ToString())], "test");
        if (!Request.Headers.ContainsKey("X-Test-No-Mfa")) identity.AddClaim(new("amr", "mfa"));
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), "test")));
    }
}
