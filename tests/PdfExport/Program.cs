using System.Net;
using System.Text;
using System.Text.Json;
using FrameIt.Api.Data;
using FrameIt.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

var session = new WorkshopSession { Title = "Prueba de exportación PDF" };
foreach (var scenario in new[] { "missing-key", "http-error", "invalid-json", "incomplete-json", "timeout", "success" })
{
    var handler = new FakeProvider(scenario);
    using var client = new HttpClient(handler) { BaseAddress = new Uri("https://provider.invalid/v1/") };
    var service = new SessionDocumentationService(client,
        Options.Create(new OpenAiOptions { ApiKey = scenario == "missing-key" ? "" : "test-only" }),
        NullLogger<SessionDocumentationService>.Instance);
    var pdf = await service.GeneratePdfAsync(session, CancellationToken.None);
    if (args.Length > 0)
    {
        Directory.CreateDirectory(args[0]);
        await File.WriteAllBytesAsync(Path.Combine(args[0], $"{scenario}.pdf"), pdf.Content);
    }
    if (!Encoding.ASCII.GetString(pdf.Content.AsSpan(0, 5)).Equals("%PDF-")) throw new Exception(scenario);
    if (handler.Calls != (scenario == "missing-key" ? 0 : 1)) throw new Exception("Unexpected external call");
    using var cancellation = new CancellationTokenSource();
    cancellation.Cancel();
    try { await service.GeneratePdfAsync(session, cancellation.Token); throw new Exception("Cancellation ignored"); }
    catch (OperationCanceledException) { }
    Console.WriteLine($"PASS {scenario}: PDF generated; cancellation respected");
}

sealed class FakeProvider(string scenario) : HttpMessageHandler
{
    public int Calls { get; private set; }
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Calls++;
        using var body = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
        if (body.RootElement.GetProperty("model").GetString() != "gpt-5.6-luna") throw new Exception("Expected Luna model in API request");
        if (body.RootElement.GetProperty("text").GetProperty("format").GetProperty("type").GetString() != "json_schema") throw new Exception("Expected structured output contract");
        if (scenario == "missing-key") throw new Exception("Must not call provider without key");
        if (scenario == "timeout") throw new TaskCanceledException("Simulated provider timeout");
        var payload = scenario switch
        {
            "invalid-json" => "not json",
            "incomplete-json" => "{\"output_text\":\"{}\"}",
            "success" => "{\"output_text\":\"{\\\"executiveSummary\\\":\\\"Resumen de prueba\\\",\\\"keyInsights\\\":[],\\\"agreements\\\":[],\\\"risks\\\":[],\\\"recommendedNextSteps\\\":[],\\\"closingNote\\\":\\\"Fin\\\"}\"}",
            _ => "{}"
        };
        return new HttpResponseMessage(scenario == "http-error" ? HttpStatusCode.ServiceUnavailable : HttpStatusCode.OK)
        { Content = new StringContent(payload) };
    }
}
