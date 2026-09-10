using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using FrameIt.Api.Data;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Microsoft.Extensions.Options;

namespace FrameIt.Api.Services;

public sealed record SessionDocumentationArtifact(string FileName, byte[] Content);

public interface ISessionDocumentationService
{
    Task<SessionDocumentationArtifact> GeneratePdfAsync(WorkshopSession session, CancellationToken cancellationToken);
}

internal sealed record SessionDocumentationModel(
    string ExecutiveSummary,
    IReadOnlyList<string> KeyInsights,
    IReadOnlyList<string> Agreements,
    IReadOnlyList<string> Risks,
    IReadOnlyList<string> RecommendedNextSteps,
    string ClosingNote);

public sealed class SessionDocumentationService : ISessionDocumentationService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _httpClient;
    private readonly OpenAiOptions _options;
    private readonly ILogger<SessionDocumentationService> _logger;

    public SessionDocumentationService(HttpClient httpClient, IOptions<OpenAiOptions> options, ILogger<SessionDocumentationService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<SessionDocumentationArtifact> GeneratePdfAsync(WorkshopSession session, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var document = BuildRecordedSummary(session);
        var aiAssisted = false;
        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            try
            {
                document = await GenerateNarrativeAsync(session, cancellationToken);
                aiAssisted = true;
            }
            catch (Exception exception) when (!cancellationToken.IsCancellationRequested &&
                exception is HttpRequestException or InvalidOperationException or JsonException or TaskCanceledException)
            {
                // Provider errors must not prevent access to the recorded workshop data.
                // Do not log provider payloads, which may contain session content.
                _logger.LogWarning("AI summary unavailable ({ErrorType}); exporting recorded session data.", exception.GetType().Name);
            }
        }

        var safeTitle = string.Concat(session.Title.Select(ch => char.IsLetterOrDigit(ch) ? ch : '-')).Trim('-');
        if (string.IsNullOrWhiteSpace(safeTitle))
        {
            safeTitle = session.Id.ToString("N");
        }

        cancellationToken.ThrowIfCancellationRequested();
        var content = BuildPdf(session, document, aiAssisted);
        return new SessionDocumentationArtifact($"{safeTitle}-documentacion.pdf", content);
    }

    private static SessionDocumentationModel BuildRecordedSummary(WorkshopSession session)
    {
        var questions = session.Sections.SelectMany(section => section.Questions).ToList();
        return new(
            $"Registro de la sesión «{session.Title}»: {session.Participants.Count} participantes, " +
            $"{questions.Count} preguntas y {questions.Sum(question => question.Responses.Count)} respuestas guardadas. " +
            "Este documento recoge los datos registrados, sin análisis generado por IA.",
            [],
            session.Outcomes.Where(outcome => outcome.Bucket == "decidido").Select(outcome => outcome.Text).ToList(),
            session.Outcomes.Where(outcome => outcome.Bucket == "pendiente").Select(outcome => outcome.Text).ToList(),
            [],
            "Las aportaciones y valoraciones registradas se incluyen como evidencia. No se infieren acuerdos ni recomendaciones a partir de las respuestas.");
    }

    private async Task<SessionDocumentationModel> GenerateNarrativeAsync(WorkshopSession session, CancellationToken cancellationToken)
    {
        var prompt = BuildPrompt(session);
        using var request = new HttpRequestMessage(HttpMethod.Post, "responses");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        request.Content = new StringContent(BuildOpenAiRequestBody(prompt), Encoding.UTF8, "application/json");

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"OpenAI request failed: {(int)response.StatusCode} {payload}");
        }

        using var document = JsonDocument.Parse(payload);
        var outputText = TryReadOutputText(document.RootElement);
        if (string.IsNullOrWhiteSpace(outputText))
        {
            throw new InvalidOperationException("OpenAI response did not contain output_text.");
        }

        var parsed = JsonSerializer.Deserialize<SessionDocumentationModel>(outputText, JsonOptions);
        if (parsed is null || parsed.ExecutiveSummary is null || parsed.KeyInsights is null ||
            parsed.Agreements is null || parsed.Risks is null || parsed.RecommendedNextSteps is null || parsed.ClosingNote is null)
        {
            throw new InvalidOperationException("Unable to parse OpenAI documentation payload.");
        }

        return parsed;
    }

    private string BuildOpenAiRequestBody(string prompt)
    {
        var body = new
        {
            model = _options.Model,
            input = prompt,
            text = new
            {
                format = new
                {
                    type = "json_schema",
                    name = "session_documentation",
                    strict = true,
                    schema = new
                    {
                        type = "object",
                        additionalProperties = false,
                        properties = new
                        {
                            executiveSummary = new { type = "string" },
                            keyInsights = new { type = "array", items = new { type = "string" } },
                            agreements = new { type = "array", items = new { type = "string" } },
                            risks = new { type = "array", items = new { type = "string" } },
                            recommendedNextSteps = new { type = "array", items = new { type = "string" } },
                            closingNote = new { type = "string" }
                        },
                        required = new[]
                        {
                            "executiveSummary",
                            "keyInsights",
                            "agreements",
                            "risks",
                            "recommendedNextSteps",
                            "closingNote"
                        }
                    }
                }
            }
        };

        return JsonSerializer.Serialize(body);
    }

    private static string BuildPrompt(WorkshopSession session)
    {
        var sections = session.Sections
            .OrderBy(section => section.Order)
            .Select(section => new
            {
                section.Title,
                section.Objective,
                Questions = section.Questions
                    .OrderBy(question => question.Order)
                    .Select(question => new
                    {
                        question.Title,
                        question.Prompt,
                        Responses = question.Responses
                            .OrderBy(response => response.CreatedAtUtc)
                            .Select(response => new
                            {
                                Participant = TemplateMapper.DeserializePresentation(question.SettingsJson).ResponseIdentityMode == FrameIt.Contracts.ResponseIdentityMode.Anonymous
                                    ? "Anónimo" : response.SessionParticipant?.DisplayName ?? "Anónimo",
                                response.Value
                            })
                            .ToList()
                    })
                    .ToList()
            })
            .ToList();

        var payload = new
        {
            Session = new
            {
                session.Title,
                Client = session.Client?.Name ?? string.Empty,
                Project = session.Project?.Name ?? string.Empty,
                ProjectCode = session.Project?.Code ?? string.Empty,
                Template = session.Template?.Title ?? string.Empty,
                session.Status,
                session.Phase,
                session.AccessCode,
                UpdatedAtUtc = session.UpdatedAtUtc
            },
            Participants = session.Participants
                .OrderBy(participant => participant.DisplayName)
                .Select(participant => new { participant.DisplayName, participant.JoinedAtUtc, participant.IsConnected })
                .ToList(),
            Sections = sections,
            Outcomes = session.Outcomes
                .Select(outcome => new { outcome.Bucket, outcome.Text })
                .ToList(),
            FacilitatorQuestions = session.ParticipantQuestions
                .OrderBy(question => question.CreatedAtUtc)
                .Select(question => new
                {
                    Participant = question.SessionParticipant?.DisplayName ?? "Anon",
                    question.Question,
                    question.CreatedAtUtc
                })
                .ToList(),
            Satisfaction = session.SatisfactionResponses
                .OrderBy(response => response.SubmittedAtUtc)
                .Select(response => new
                {
                    response.Rating,
                    response.Comment,
                    response.SubmittedAtUtc
                })
                .ToList(),
            Attachments = session.Attachments
                .OrderBy(attachment => attachment.UploadedAtUtc)
                .Select(attachment => new
                {
                    attachment.FileName,
                    attachment.ContentType,
                    attachment.SizeBytes,
                    UploadedBy = attachment.SessionParticipant?.DisplayName ?? "Anon",
                    attachment.UploadedAtUtc,
                    attachment.Url
                })
                .ToList()
        };

        return $$"""
        Eres consultor senior. Redacta documentación ejecutiva de una sesión de facilitación en español.
        Reglas:
        - No inventes hechos.
        - Distingue acuerdos, hallazgos, riesgos y siguientes pasos.
        - Si faltan datos, dilo de forma explícita y breve.
        - Mantén tono profesional tipo entregable SaaS/consultoría.
        - Devuelve solo JSON según esquema.

        Datos de sesión:
        {{JsonSerializer.Serialize(payload)}}
        """;
    }

    private static string? TryReadOutputText(JsonElement root)
    {
        if (root.TryGetProperty("output_text", out var outputText) && outputText.ValueKind == JsonValueKind.String)
        {
            return outputText.GetString();
        }

        if (!root.TryGetProperty("output", out var outputArray) || outputArray.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var outputItem in outputArray.EnumerateArray())
        {
            if (!outputItem.TryGetProperty("content", out var contentArray) || contentArray.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            foreach (var content in contentArray.EnumerateArray())
            {
                if (content.TryGetProperty("text", out var textNode) && textNode.ValueKind == JsonValueKind.String)
                {
                    return textNode.GetString();
                }
            }
        }

        return null;
    }

    private static readonly string BrandSvg = LoadBrandSvg();

    private static string LoadBrandSvg()
    {
        using var stream = typeof(SessionDocumentationService).Assembly.GetManifestResourceStream("FrameIt.Brand.svg")
            ?? throw new InvalidOperationException("Missing FrameIt brand resource.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    private static byte[] BuildPdf(WorkshopSession session, SessionDocumentationModel document, bool aiAssisted)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(32);
                page.Size(PageSizes.A4);
                page.DefaultTextStyle(style => style.FontSize(10).FontColor(Colors.Grey.Darken3));

                page.Header().Column(column =>
                {
                    column.Spacing(4);
                    column.Item().Row(row =>
                    {
                        row.Spacing(10);
                        row.ConstantItem(28).Height(28).Svg(BrandSvg);
                        row.RelativeItem().AlignMiddle().Text("FrameIt").FontSize(20).SemiBold().FontColor("#193e43");
                    });
                    column.Item().Text("Documentación de sesión").FontSize(14).SemiBold().FontColor("#286a57");
                    column.Item().Text(session.Title).FontSize(14).SemiBold();
                    column.Item().Text($"{session.Client?.Name ?? "Cliente"} · {session.Project?.Name ?? "Proyecto"} · {session.UpdatedAtUtc:dd/MM/yyyy HH:mm} UTC");
                });

                page.Content().Column(column =>
                {
                    column.Spacing(16);

                    column.Item().Element(block => RenderSection(block, aiAssisted ? "Resumen ejecutivo" : "Resumen de sesión", document.ExecutiveSummary));
                    if (aiAssisted) column.Item().Element(block => RenderBulletSection(block, "Hallazgos clave", document.KeyInsights));
                    column.Item().Element(block => RenderBulletSection(block, "Acuerdos y decisiones", document.Agreements));
                    column.Item().Element(block => RenderBulletSection(block, "Riesgos y puntos abiertos", document.Risks));
                    if (aiAssisted) column.Item().Element(block => RenderBulletSection(block, "Siguientes pasos recomendados", document.RecommendedNextSteps));
                    column.Item().Element(block => RenderSessionData(block, session));
                    column.Item().Element(block => RenderSection(block, "Cierre", document.ClosingNote));
                });

                page.Footer().AlignRight().Text(text =>
                {
                    text.Span(aiAssisted ? "FrameIt · Resumen asistido por IA · " : "FrameIt · Registro de sesión · ");
                    text.CurrentPageNumber();
                });
            });
        }).GeneratePdf();
    }

    private static void RenderSection(IContainer container, string title, string body)
    {
        container.Column(column =>
        {
            column.Spacing(6);
            column.Item().Text(title).FontSize(13).SemiBold().FontColor("#193e43");
            column.Item().Text(body);
        });
    }

    private static void RenderBulletSection(IContainer container, string title, IReadOnlyList<string> items)
    {
        container.Column(column =>
        {
            column.Spacing(6);
            column.Item().Text(title).FontSize(13).SemiBold().FontColor("#193e43");

            if (items.Count == 0)
            {
                column.Item().Text("Sin información suficiente.");
                return;
            }

            foreach (var item in items)
            {
                column.Item().Row(row =>
                {
                    row.ConstantItem(10).Text("•");
                    row.RelativeItem().Text(item);
                });
            }
        });
    }

    private static void RenderSessionData(IContainer container, WorkshopSession session)
    {
        container.Column(column =>
        {
            column.Spacing(8);
            column.Item().Text("Evidencias de sesión").FontSize(13).SemiBold().FontColor("#193e43");

            var participants = string.Join(", ", session.Participants.OrderBy(x => x.DisplayName).Select(x => x.DisplayName));
            var outcomes = session.Outcomes.Select(x => $"{x.Bucket}: {x.Text}").ToList();
            var questions = session.ParticipantQuestions.OrderBy(x => x.CreatedAtUtc).Select(x => $"{x.SessionParticipant?.DisplayName ?? "Anon"}: {x.Question}").ToList();
            var attachments = session.Attachments.OrderBy(x => x.UploadedAtUtc).Select(x => $"{x.FileName} ({x.SessionParticipant?.DisplayName ?? "Anon"})").ToList();
            var survey = session.SatisfactionResponses.Count == 0
                ? "Sin respuestas de satisfacción."
                : $"Media {session.SatisfactionResponses.Average(x => x.Rating):0.0}/5 sobre {session.SatisfactionResponses.Count} respuestas.";

            column.Item().Text($"Participantes: {(string.IsNullOrWhiteSpace(participants) ? "Sin registros." : participants)}");
            column.Item().Text($"Encuesta de satisfacción: {survey}");
            foreach (var section in session.Sections.OrderBy(x => x.Order))
            {
                column.Item().Text(section.Title).FontSize(12).SemiBold();
                foreach (var question in section.Questions.OrderBy(x => x.Order))
                {
                    column.Item().Element(block => RenderSection(block, question.Title, question.Prompt));
                    var anonymous = TemplateMapper.DeserializePresentation(question.SettingsJson).ResponseIdentityMode == FrameIt.Contracts.ResponseIdentityMode.Anonymous;
                    var responses = question.Responses.OrderBy(x => x.CreatedAtUtc)
                        .Select(x => $"{(anonymous ? "Anónimo" : x.SessionParticipant?.DisplayName ?? "Anónimo")}: {x.Value}").ToList();
                    column.Item().Element(block => RenderBulletSection(block, "Respuestas registradas", responses));
                }
            }
            column.Item().Element(block => RenderBulletSection(block, "Resultados registrados", outcomes));
            column.Item().Element(block => RenderBulletSection(block, "Preguntas al facilitador", questions));
            column.Item().Element(block => RenderBulletSection(block, "Adjuntos recibidos", attachments));
            column.Item().Element(block => RenderBulletSection(block, "Valoraciones", session.SatisfactionResponses.OrderBy(x => x.SubmittedAtUtc)
                .Select(x => $"{x.Rating}/5{(string.IsNullOrWhiteSpace(x.Comment) ? "" : $": {x.Comment}")}").ToList()));
        });
    }
}
