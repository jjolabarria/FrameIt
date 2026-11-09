using System.Reflection;
using System.Text.Json;
using FrameIt.Api.Data;
using FrameIt.Api.Services;
using FrameIt.Contracts;
using Microsoft.EntityFrameworkCore;

static class ChoiceResponseChecks
{
    public static async Task Run()
    {
        static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
        var options = new[] { new QuestionOptionDto("a", "Acceso"), new QuestionOptionDto("b", "Busqueda"), new QuestionOptionDto("c", "Soporte: \"equipo\"\nremoto") };
        var question = new SessionQuestion { Kind = QuestionKind.Choice, Title = "Preferencias", Prompt = "Elige", OptionsJson = JsonSerializer.Serialize(options), SettingsJson = "{\"selectionMode\":\"multiple\",\"maxSelections\":\"2\",\"responseVisibility\":\"Live\"}" };
        var value = "{\"selectedOptionIds\":[\"a\",\"b\"]}";
        Check(ChoiceResponses.Validate(question, value) is null && ChoiceResponses.Validate(question, "Acceso") is null, "Valid multiple/legacy choice rejected");
        foreach (var invalid in new[] { "free text", "{", "[]", "{\"selectedOptionIds\":[]}", "{\"selectedOptionIds\":[\"a\",\"a\"]}", "{\"selectedOptionIds\":[\"foreign\"]}", "{\"selectedOptionIds\":[1]}", "{\"selectedOptionIds\":[\"a\",\"b\",\"c\"]}" })
            Check(ChoiceResponses.Validate(question, invalid) is not null, "Invalid/excess multiple choice accepted: " + invalid);
        Check(ChoiceResponses.Format(question, value) == "Acceso\nBusqueda", "Multiple answer not readable");
        Check(ChoiceResponses.Format(question, "{\"selectedOptionIds\":[\"c\"]}") == options[2].Label, "Punctuation/newline labels damaged");
        Check(ChoiceResponses.SettingsError(new Dictionary<string, string> { ["selectionMode"] = "other" }) is not null, "Unknown selection mode accepted");
        Check(ChoiceResponses.SettingsError(new Dictionary<string, string> { ["selectionMode"] = "multiple", ["maxSelections"] = "0" }) is not null, "Invalid selection maximum accepted");
        Check(ChoiceResponses.SettingsError(new Dictionary<string, string> { ["selectionMode"] = "multiple", ["maxSelections"] = "" }) is null, "Unlimited selection rejected");
        var limitedSettings = question.SettingsJson;
        question.SettingsJson = "{\"selectionMode\":\"multiple\",\"maxSelections\":\"\"}";
        Check(ChoiceResponses.Validate(question, "{\"selectedOptionIds\":[\"a\",\"b\",\"c\"]}") is null, "Unlimited choice must allow every option");
        question.SettingsJson = limitedSettings;
        question.Responses.Add(new QuestionResponse { Value = value, SessionParticipantId = Guid.NewGuid() });
        question.Responses.Add(new QuestionResponse { Value = "Busqueda", SessionParticipantId = Guid.NewGuid() });
        var section = new SessionSection { Title = "Explorar", Questions = [question] };
        var session = new WorkshopSession { Title = "Taller", Template = new() { Title = "Plantilla" }, Sections = [section], ActiveSectionId = section.Id, ActiveQuestionId = question.Id };
        var milestone = JourneyBuilder.Build(session).Milestones.Single();
        Check(milestone.Branches.Single(b => b.Label == "Acceso").Votes == 1 && milestone.Branches.Single(b => b.Label == "Busqueda").Votes == 2, "Multiple answers not counted per option/person");
        Check(milestone.Branches.Single(b => b.IsWinner).Label == "Busqueda", "Multiple choice winner incorrect");
        Check(milestone.Details.Any(d => d.Label.Contains("2 votos") && d.Text == "Busqueda"), "Journey details exclude multiple choices");
        var prompt = (string)typeof(SessionDocumentationService).GetMethod("BuildPrompt", BindingFlags.NonPublic | BindingFlags.Static)!.Invoke(null, [session])!;
        Check(prompt.Contains("Acceso") && prompt.Contains("Busqueda") && !prompt.Contains("selectedOptionIds"), "Export narrative exposes encoded selection");
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase($"multiple-choice-{Guid.NewGuid()}").Options;
        await using (var db = new AppDbContext(dbOptions))
        {
            db.SessionParticipants.AddRange(question.Responses.Select(r => new SessionParticipant { Id = r.SessionParticipantId, DisplayName = r.SessionParticipantId.ToString() }));
            db.Set<SessionQuestion>().Add(question);
            await db.SaveChangesAsync(); db.ChangeTracker.Clear();
            var stored = await db.Set<SessionQuestion>().IgnoreQueryFilters().Include(q => q.Responses).SingleAsync(q => q.Id == question.Id);
            Check(stored.Responses.Any(r => r.Value == value) && ChoiceResponses.Validate(stored, value) is null, "Multiple selection lost on persistence/reload");
        }
        question.SettingsJson = "{}";
        Check(ChoiceResponses.Validate(question, "Acceso") is null && ChoiceResponses.Validate(question, value) is not null, "Single-choice behavior changed");
        Console.WriteLine("PASS: multiple/single choice validation, maximum, invalid IDs/duplicates, readable exports, per-option journey counts and EF persistence.");
    }
}
