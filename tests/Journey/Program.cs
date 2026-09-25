using System.Text.Json;
using FrameIt.Api.Data;
using FrameIt.Api.Services;
using FrameIt.Contracts;

void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
var question = new SessionQuestion { Kind = QuestionKind.ShortText, Title = "Pregunta real", SettingsJson = "{\"responseVisibility\":\"FacilitatorOnly\"}" };
question.Responses.Add(new QuestionResponse { Value = "Respuesta privada", SessionParticipantId = Guid.NewGuid() });
var section = new SessionSection { Title = "Bloque", Questions = [question] };
var session = new WorkshopSession { Title = "Sesión", Sections = [section], ResultsVisible = true };
var privateJourney = JourneyBuilder.Build(session);
Check(privateJourney.Milestones[0].Details.All(detail => !detail.Text.Contains("Respuesta privada")), "Private response leaked");
Check(privateJourney.Milestones[0].Details.Single().Label == "Resultados ocultos", "Hidden state missing");
question.SettingsJson = "{\"responseVisibility\":\"AfterClose\"}";
session.ResultsVisible = false;
Check(JourneyBuilder.Build(session).Milestones[0].Details.Single().Label == "Resultados ocultos", "Unrevealed response leaked");
session.ResultsVisible = true;
Check(JourneyBuilder.Build(session).Milestones[0].Details.Single().Text == "Respuesta privada", "Revealed response absent");
question.SettingsJson = "{\"responseVisibility\":\"Live\"}";
session.ResultsVisible = false;
Check(JourneyBuilder.Build(session).Milestones[0].Details.Single().Text == "Respuesta privada", "Live response absent");

var longText = new string('a', 650);
question.Responses.Clear();
question.Responses.Add(new QuestionResponse { Value = longText, SessionParticipantId = Guid.NewGuid() });
var pages = JourneyBuilder.Build(session).Milestones[0].Details;
Check(pages.Count == 3 && pages.All(page => page.Text.Length <= 220), "Long response pagination failed");
Check(string.Concat(pages.Select(page => page.Text)) == longText, "Response text was truncated");
question.Consolidation = new ResponseConsolidation {
    Status = ConsolidationStatus.Published,
    PublishedJson = JsonSerializer.Serialize(new[] { new ConsolidationGroupDto("g", "Tema publicado", "Síntesis real", []) }, ResponseConsolidationLogic.Json)
};
Check(JourneyBuilder.Build(session).Milestones[0].Details.Any(detail => detail.Text == "Síntesis real"), "Published summary absent");
question.SettingsJson = "{\"responseVisibility\":\"FacilitatorOnly\"}";
var hidden = JourneyBuilder.Build(session).Milestones[0];
Check(hidden.Topics.Count == 0 && hidden.Details.All(detail => detail.Text != "Síntesis real"), "Private consolidation leaked");

var vote = new SessionQuestion {
    Kind = QuestionKind.Voting, Title = "Prioridad", SettingsJson = "{\"responseVisibility\":\"Live\"}",
    OptionsJson = "[{\"Label\":\"A\",\"Value\":\"A\"},{\"Label\":\"B\",\"Value\":\"B\"}]",
    Responses = [new QuestionResponse { Value = "A" }, new QuestionResponse { Value = "B" }]
};
section.Questions.Add(vote);
var voteResult = JourneyBuilder.Build(session).Milestones.Single(item => item.Id == vote.Id.ToString());
Check(voteResult.Details.Count == 2 && voteResult.Details.All(detail => detail.Label.StartsWith("Empate")), "Tie misreported as decision");
var time = DateTimeOffset.UtcNow;
foreach (var id in new[] { question.Id, vote.Id, question.Id }) {
    session.JourneyEvents.Add(new SessionJourneyEvent { SessionQuestionId = id, OccurredAtUtc = time }); time = time.AddSeconds(1);
}
var journey = JourneyBuilder.Build(session);
Check(journey.Route.Count == 3 && journey.Route[0].CapitalId == journey.Route[2].CapitalId, "Revisit lost");
Check(journey.Playback.DurationMs * .88 / journey.Route.Count >= 20_000, "Insufficient reading time");
Check(JourneyBuilder.Playback(session).DurationMs == journey.Playback.DurationMs, "Playback duration mismatch");
Console.WriteLine("PASS: visibility, published summaries, full-text pagination, vote ties, revisits and synchronized reading time.");
const int duration = 80_003;
const int stops = 6;
var firstNext = JourneyBuilder.Navigate(5_000, duration, stops, true);
Check(firstNext == (int)Math.Ceiling(duration * .88 / stops), "Next retained offset instead of landing at stop start");
var secondNext = JourneyBuilder.Navigate(firstNext, duration, stops, true);
Check(secondNext == (int)Math.Ceiling(2 * duration * .88 / stops), "Rounding skipped or repeated stop");
Check(JourneyBuilder.Navigate(secondNext + 500, duration, stops, false) == firstNext, "Previous missed stop start");
Check(JourneyBuilder.Navigate(0, duration, stops, false) == 0, "Previous moved before beginning");
var finale = JourneyBuilder.Navigate((int)Math.Ceiling(5 * duration * .88 / stops), duration, stops, true);
Check(finale == (int)Math.Ceiling(duration * .955), "Last stop did not reach agreements");
Check(JourneyBuilder.Navigate(finale, duration, stops, false) == (int)Math.Ceiling(5 * duration * .88 / stops), "Previous from finale missed last stop");
Console.WriteLine("PASS: exact stop navigation, fractional durations and finale boundaries.");
