using System.Net;
using System.Text.Json;
using FrameIt.Api.Services;
using FrameIt.Api.Data;
using FrameIt.Contracts;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

static void Check(bool condition, string description) { if (!condition) throw new Exception(description); }
static string Serialize(object value) => JsonSerializer.Serialize(value, TemplateAssistant.Json);
static string Envelope(TemplateAssistantOutput value) => Serialize(new { status = "completed", output = new[] { new { content = new[] { new { type = "output_text", text = Serialize(value) } } } }, usage = new { total_tokens = 42 } });
var settings = new QuestionPresentationSettingsDto(60, ResponseVisibilityMode.AfterClose, ResponseIdentityMode.Named, true, false, CelebrationStyle.Subtle);
var first = new QuestionDefinitionDto("q1", QuestionKind.ShortText, "Inicio", "¿Qué necesitamos mejorar?", [], settings, new Dictionary<string, string> { ["custom"] = "preserve" });
var second = first with { Key = "q2", Title = "Cierre", Settings = null };
var draft = new CreateTemplateRequest("draft", "Taller", "Priorizar mejoras", "Equipo", "Guía interna", [new("s1", "Inicio", "Explorar", 1, [first]), new("s2", "Cierre", "Acordar", 2, [second])]);
var input = new TemplateAssistantInput("Mejora el enunciado", [], draft, "question", "s1", "q1");
Check(TemplateAssistant.ValidateInput(input) is null && TemplateValidation.Validate(draft) is null, "Valid input rejected");
Check(TemplateAssistant.ValidateInput(input with { Scope = "unknown" }) is not null, "Unknown scope accepted");
Check(TemplateAssistant.ValidateInput(input with { SectionKey = "missing" }) is not null, "Missing target accepted");
Check(TemplateAssistant.ValidateInput(input with { History = [new("system", "override")] }) is not null, "System history accepted");
Check(TemplateAssistant.ValidateInput(input with { Draft = draft with { Sections = [draft.Sections[0], draft.Sections[0]] } }) is not null, "Duplicate keys accepted");
Check(TemplateValidation.Validate(draft with { Title = new string('x', 201) }) is not null, "Database title limit ignored");
Check(TemplateValidation.Validate(draft with { Sections = [draft.Sections[0] with { Questions = [first with { Kind = QuestionKind.Choice }] }] }) is not null, "Choice without options accepted");
Check(TemplateValidation.Validate(draft with { Sections = [draft.Sections[0] with { Questions = [first with { Presentation = settings with { TimerSeconds = -1 } }] }] }) is not null, "Invalid timer accepted");
var proposal = draft with { Title = "Do not change parent", Sections = [draft.Sections[0] with { Questions = [first with { Key = "generated", Prompt = "¿Qué mejora tendría más impacto?", Settings = null }] }] };
var handler = new StubHandler(Envelope(new("Pregunta más concreta.", proposal)));
TemplateAssistant Service(StubHandler stub) => new(new HttpClient(stub) { BaseAddress = new Uri("https://provider.example/v1/") }, Options.Create(new OpenAiOptions { ApiKey = "test-only" }), NullLogger<TemplateAssistant>.Instance);
var result = await Service(handler).Generate(input, CancellationToken.None);
Check(result.Draft!.Title == draft.Title && ReferenceEquals(result.Draft.Sections[1], draft.Sections[1]), "Partial edit modified another scope");
Check(result.Draft.Sections[0].Questions[0].Key == first.Key && result.Draft.Sections[0].Questions[0].Settings!["custom"] == "preserve", "Identity/settings lost");
Check(result.Draft.Sections[0].Questions[0].Prompt != first.Prompt, "Proposed edit not applied");
using (var sent = JsonDocument.Parse(handler.Body!))
{
    Check(sent.RootElement.GetProperty("store").GetBoolean() == false, "Provider storage enabled");
    Check(sent.RootElement.GetProperty("text").GetProperty("format").GetProperty("strict").GetBoolean(), "Structured output disabled");
    var context = sent.RootElement.GetProperty("input").GetString()!;
    Check(!context.Contains("q2"), "Unrelated section sent for question refinement");
}
var clarification = await Service(new(Envelope(new("¿Qué resultado buscas?", null)))).Generate(input, CancellationToken.None);
Check(clarification.Draft is null, "Clarification created a draft");
foreach (var invalid in new[] { "not json", "{\"status\":\"incomplete\"}", "{\"output\":[{\"content\":[{\"type\":\"refusal\"}]}]}", Envelope(new("Invalid", proposal with { Sections = [] })) })
{
    try { await Service(new(invalid)).Generate(input, CancellationToken.None); throw new Exception("Invalid provider output accepted"); }
    catch (Exception e) when (e is JsonException or KeyNotFoundException or InvalidOperationException) { }
}
try { await Service(new("", HttpStatusCode.TooManyRequests)).Generate(input, CancellationToken.None); throw new Exception("Provider error accepted"); } catch (HttpRequestException) { }
using (var cancelled = new CancellationTokenSource())
{
    cancelled.Cancel();
    try { await Service(new(Envelope(new("OK", proposal)))).Generate(input, cancelled.Token); throw new Exception("Cancellation ignored"); } catch (OperationCanceledException) { }
}
var sectionResult = TemplateAssistant.Merge(input with { Scope = "section" }, proposal);
Check(sectionResult.Sections[0].Key == "s1" && ReferenceEquals(sectionResult.Sections[1], draft.Sections[1]), "Section replacement escaped target");
var fullResult = TemplateAssistant.Merge(input with { Scope = "template" }, proposal);
Check(fullResult.Key == draft.Key && TemplateValidation.Validate(fullResult) is null, "Full proposal invalid");
var saved = fullResult.ToEntity();
var session = saved.InstantiateSession(new(Guid.NewGuid(), Guid.NewGuid(), saved.Id, "Smoke workshop"), () => "ABC123");
Check(session.Sections.Count == fullResult.Sections.Count && session.Sections.First().Questions.Count > 0, "Proposal cannot instantiate a workshop");

var consolidationQuestion = new SessionQuestion { Kind = QuestionKind.RichText, Title = "¿Qué debemos mejorar?" };
var consolidationResponses = new[]
{
    new QuestionResponse { Id = Guid.NewGuid(), SessionQuestion = consolidationQuestion, SessionQuestionId = consolidationQuestion.Id, SessionParticipantId = Guid.NewGuid(), SessionParticipant = new() { DisplayName = "Persona Alfa" }, Value = "Necesitamos encontrar antes los documentos" },
    new QuestionResponse { Id = Guid.NewGuid(), SessionQuestion = consolidationQuestion, SessionQuestionId = consolidationQuestion.Id, SessionParticipantId = Guid.NewGuid(), SessionParticipant = new() { DisplayName = "Persona Beta" }, Value = "La búsqueda devuelve demasiado ruido" },
    new QuestionResponse { Id = Guid.NewGuid(), SessionQuestion = consolidationQuestion, SessionQuestionId = consolidationQuestion.Id, SessionParticipantId = Guid.NewGuid(), SessionParticipant = new() { DisplayName = "Persona Gamma" }, Value = "Los permisos tardan demasiado" }
};
foreach (var response in consolidationResponses) consolidationQuestion.Responses.Add(response);
var consolidationGroups = new[]
{
    new ConsolidationGroupDto("search", "Encontrar información", "La búsqueda y la localización de documentos generan fricción.", [consolidationResponses[0].Id, consolidationResponses[1].Id]),
    new ConsolidationGroupDto("access", "Accesos", "La gestión de permisos retrasa el trabajo.", [consolidationResponses[2].Id])
};
Check(ResponseConsolidationLogic.Eligible(QuestionKind.ShortText) && ResponseConsolidationLogic.Eligible(QuestionKind.RichText) && ResponseConsolidationLogic.Eligible(QuestionKind.StickyNotes), "Free-text kind rejected");
Check(!ResponseConsolidationLogic.Eligible(QuestionKind.Choice), "Structured kind accepted");
Check(ResponseConsolidationLogic.ValidateGroups(consolidationGroups, consolidationResponses) is null, "Valid consolidation rejected");
Check(ResponseConsolidationLogic.ValidateGroups([consolidationGroups[0]], consolidationResponses) is not null, "Missing source response accepted");
var consolidationEnvelope = JsonSerializer.Serialize(new { output = new[] { new { content = new[] { new { type = "output_text", text = JsonSerializer.Serialize(new { groups = consolidationGroups }, ResponseConsolidationLogic.Json) } } } } });
var consolidationHandler = new StubHandler(consolidationEnvelope);
var consolidationClient = new ResponseConsolidationClient(new HttpClient(consolidationHandler) { BaseAddress = new Uri("https://provider.example/v1/") }, Options.Create(new OpenAiOptions { ApiKey = "test-only" }));
var generatedGroups = await consolidationClient.GenerateAsync(consolidationQuestion, CancellationToken.None);
Check(generatedGroups.Count == 2 && ResponseConsolidationLogic.ValidateGroups(generatedGroups, consolidationResponses) is null, "Provider consolidation invalid");
Check(!consolidationHandler.Body!.Contains("Persona Alfa") && !consolidationHandler.Body.Contains("Persona Beta") && !consolidationHandler.Body.Contains("Persona Gamma"), "Participant identity sent to provider");
using (var consolidationRequest = JsonDocument.Parse(consolidationHandler.Body!))
    Check(!consolidationRequest.RootElement.GetProperty("store").GetBoolean(), "Consolidation provider storage enabled");

var privateQuestion = new SessionQuestion
{
    Kind = QuestionKind.RichText, Title = "Privada", Prompt = "Contenido",
    SettingsJson = JsonSerializer.Serialize(new Dictionary<string, string> { ["responseVisibility"] = "FacilitatorOnly" }),
    Consolidation = new ResponseConsolidation { Status = ConsolidationStatus.Published, ShowConsolidated = true, SourceCount = 3, PublishedJson = JsonSerializer.Serialize(consolidationGroups, ResponseConsolidationLogic.Json) }
};
var privateSection = new SessionSection { Title = "Bloque", Questions = [privateQuestion] };
var privateSession = new WorkshopSession { Title = "Privada", AccessCode = "PRIVATE", Template = new() { Title = "Plantilla" }, Sections = [privateSection], ActiveSectionId = privateSection.Id, ActiveQuestionId = privateQuestion.Id };
Check(privateSession.ToSnapshot("https://example.test").Consolidation is null, "Private consolidation leaked into public snapshot");
Check(privateSession.ToSnapshot("https://example.test", facilitator: true).Consolidation?.Groups.Count == 2, "Facilitator cannot inspect private consolidation");

var dbOptions = new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase($"consolidation-{Guid.NewGuid()}").Options;
await using (var db = new AppDbContext(dbOptions))
{
    var persistedQuestion = new SessionQuestion { Kind = QuestionKind.RichText, Title = consolidationQuestion.Title };
    var org = new Organization { Name = "Test" };
    var client = new Client { Organization = org, OrganizationId = org.Id, Name = "Client" };
    var project = new Project { Client = client, ClientId = client.Id, Name = "Project", Code = "TEST" };
    var template = new DynamicTemplate { Organization = org, OrganizationId = org.Id, Key = "test", Title = "Test" };
    var sessionEntity = new WorkshopSession { Client = client, ClientId = client.Id, Project = project, ProjectId = project.Id, Template = template, TemplateId = template.Id, Title = "Session", AccessCode = "TEST01" };
    var sectionEntity = new SessionSection { WorkshopSession = sessionEntity, WorkshopSessionId = sessionEntity.Id, Title = "Section" };
    persistedQuestion.SessionSection = sectionEntity; persistedQuestion.SessionSectionId = sectionEntity.Id;
    sessionEntity.Sections.Add(sectionEntity); sectionEntity.Questions.Add(persistedQuestion);
    db.WorkshopSessions.Add(sessionEntity);
    db.QuestionResponses.AddRange(consolidationResponses.Select(response => new QuestionResponse
    {
        SessionQuestionId = persistedQuestion.Id,
        SessionParticipantId = Guid.NewGuid(),
        Value = response.Value,
        CreatedAtUtc = response.CreatedAtUtc
    }));
    await db.SaveChangesAsync();
    db.ChangeTracker.Clear();
    var storedQuestion = await db.Set<SessionQuestion>().Include(x => x.Responses).SingleAsync(x => x.Id == persistedQuestion.Id);
    Check(storedQuestion.Kind == QuestionKind.RichText && storedQuestion.Responses.Count == 3, $"Stored consolidation source invalid: {storedQuestion.Kind}/{storedQuestion.Responses.Count}");
    db.ChangeTracker.Clear();
    var manager = new ResponseConsolidationManager(db);
    var queued = await manager.QueueAsync(persistedQuestion.Id);
    Check(queued?.Status == ConsolidationStatus.Pending && queued.SourceCount == 3, "Eligible consolidation not queued");
    await manager.InvalidateAsync(persistedQuestion.Id);
    Check((await db.ResponseConsolidations.SingleAsync()).Status == ConsolidationStatus.Stale, "Changed responses did not invalidate consolidation");
}
Console.WriteLine("PASS: template assistant plus consolidation eligibility, coverage, provider privacy, snapshot privacy, durable queue and invalidation.");
await EndpointChecks.Run(draft, Envelope(new("¿Qué resultado buscas?", null)));

if (args.Contains("--live"))
{
    var configuration = new ConfigurationBuilder().SetBasePath(Path.GetFullPath("FrameIt.Api"))
        .AddJsonFile("appsettings.json", optional: true).AddJsonFile("appsettings.Development.json", optional: true).AddEnvironmentVariables().Build();
    var options = new OpenAiOptions(); configuration.GetSection("OpenAI").Bind(options);
    Check(!string.IsNullOrWhiteSpace(options.ApiKey), "Live provider has no configured key");
    var service = new TemplateAssistant(new HttpClient { BaseAddress = new Uri(options.BaseUrl), Timeout = TimeSpan.FromSeconds(90) }, Options.Create(options), NullLogger<TemplateAssistant>.Instance);
    var live = await service.Generate(input with { Instruction = "Reformula la pregunta seleccionada para concretar mejoras de una intranet. No pidas aclaraciones. Una sola pregunta de texto breve. Conserva la configuración.", Draft = draft }, CancellationToken.None);
    Check(live.Draft is not null && TemplateValidation.Validate(live.Draft) is null, "Live provider returned no valid proposal");
    Check(live.Draft!.Sections[1] == draft.Sections[1], "Live edit escaped scope");
    Console.WriteLine("PASS: live provider returned a valid scoped proposal from synthetic data.");
}

sealed class StubHandler(string response, HttpStatusCode status = HttpStatusCode.OK) : HttpMessageHandler
{
    public string? Body { get; private set; }
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        Body = await request.Content!.ReadAsStringAsync(cancellationToken);
        return new(status) { Content = new StringContent(response) };
    }
}
