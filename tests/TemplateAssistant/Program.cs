using System.Net;
using System.Text.Json;
using FrameIt.Api.Services;
using FrameIt.Contracts;
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
Console.WriteLine("PASS: validation, structured output, partial isolation, settings preservation, clarification, refusal, malformed output, provider error, cancellation and workshop creation.");
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
