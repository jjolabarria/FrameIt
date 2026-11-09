using FrameIt.Api.Data;
using FrameIt.Api.Services;
using FrameIt.Contracts;
using Microsoft.EntityFrameworkCore;

static class TemplateEditingChecks
{
    public static async Task Run(CreateTemplateRequest draft)
    {
        static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
        var options = new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase($"template-edit-{Guid.NewGuid()}").Options;
        Guid id, sessionId;
        string sessionBefore;
        await using (var db = new AppDbContext(options))
        {
            var template = draft.ToEntity();
            db.DynamicTemplates.Add(template);
            var client = new Client { Name = "Cliente" };
            var project = new Project { Name = "Proyecto", Code = "EDIT01", Client = client };
            db.Projects.Add(project);
            var session = template.InstantiateSession(new(client.Id, project.Id, template.Id, "Sesión ya creada"), () => "EDIT01");
            db.WorkshopSessions.Add(session);
            await db.SaveChangesAsync();
            id = template.Id; sessionId = session.Id;
            sessionBefore = System.Text.Json.JsonSerializer.Serialize(session.Sections.SelectMany(s => s.Questions).Select(q => new { q.Id, q.Prompt, q.SettingsJson }));
        }
        // Reproduce the reported failure using the former navigation-only replacement.
        await using (var db = new AppDbContext(options))
        {
            var template = await db.DynamicTemplates.Include(t => t.Sections).ThenInclude(s => s.Questions).SingleAsync(t => t.Id == id);
            db.Set<TemplateSection>().RemoveRange(template.Sections);
            template.Sections = draft.ToEntity().Sections;
            db.ChangeTracker.DetectChanges();
            Check(template.Sections.All(s => db.Entry(s).State == EntityState.Modified), "Former replacement no longer reproduces incorrect tracking state");
            try { await db.SaveChangesAsync(); throw new Exception("Former replacement unexpectedly succeeded"); }
            catch (DbUpdateConcurrencyException) { }
        }
        // Use a fresh database after the reproduction, since InMemory has no rollback.
        options = new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase($"template-edit-fixed-{Guid.NewGuid()}").Options;
        await using (var db = new AppDbContext(options))
        {
            var template = draft.ToEntity(); id = template.Id;
            db.DynamicTemplates.Add(template);
            var client = new Client { Name = "Cliente" };
            var project = new Project { Name = "Proyecto", Code = "EDIT02", Client = client };
            db.Projects.Add(project);
            var session = template.InstantiateSession(new(client.Id, project.Id, id, "Sesión ya creada"), () => "EDIT02");
            sessionId = session.Id;
            db.WorkshopSessions.Add(session);
            await db.SaveChangesAsync();
            sessionBefore = System.Text.Json.JsonSerializer.Serialize(session.Sections.SelectMany(s => s.Questions).Select(q => new { q.Id, q.Prompt, q.SettingsJson }));
        }
        for (var iteration = 0; iteration < 3; iteration++)
        {
            await using var db = new AppDbContext(options);
            var template = await db.DynamicTemplates.Include(t => t.Sections).ThenInclude(s => s.Questions).SingleAsync(t => t.Id == id);
            var question = draft.Sections[0].Questions[0] with { Prompt = $"Revisión {iteration}", Settings = new Dictionary<string, string> { ["maxLength"] = "80", ["answerPlaceholder"] = "Una frase" } };
            var request = draft with { Title = $"Plantilla revisada {iteration}", Sections = iteration == 1
                ? [draft.Sections[0] with { Questions = [question, question with { Key = "extra" }] }, draft.Sections[1]]
                : [draft.Sections[0] with { Questions = [question] }] };
            TemplateEditing.Apply(db, template, request);
            db.ChangeTracker.DetectChanges();
            Check(template.Sections.All(s => db.Entry(s).State == EntityState.Added), "New sections must be inserted");
            Check(template.Sections.SelectMany(s => s.Questions).All(q => db.Entry(q).State == EntityState.Added), "New questions must be inserted");
            await db.SaveChangesAsync();
            db.ChangeTracker.Clear();
            var saved = await db.DynamicTemplates.Include(t => t.Sections).ThenInclude(s => s.Questions).SingleAsync(t => t.Id == id);
            Check(saved.Title == request.Title && saved.Sections.Count == request.Sections.Count, "Template structure not saved");
            Check(saved.Sections.SelectMany(s => s.Questions).Count() == request.Sections.Sum(s => s.Questions.Count), "Stale/missing questions after replacement");
            Check(await db.Set<TemplateSection>().CountAsync() == request.Sections.Count && await db.Set<TemplateQuestion>().CountAsync() == request.Sections.Sum(s => s.Questions.Count), "Removed children remain in the database");
            var savedQuestion = saved.Sections.Single(s => s.Key == draft.Sections[0].Key).Questions.Single(q => q.Key == question.Key);
            Check(savedQuestion.Prompt == question.Prompt && TemplateMapper.DeserializeSettings(savedQuestion.SettingsJson)["maxLength"] == "80", "Content/settings lost");
            var session = await db.WorkshopSessions.Include(s => s.Sections).ThenInclude(s => s.Questions).SingleAsync(s => s.Id == sessionId);
            Check(System.Text.Json.JsonSerializer.Serialize(session.Sections.SelectMany(s => s.Questions).Select(q => new { q.Id, q.Prompt, q.SettingsJson })) == sessionBefore, "Existing session changed with template");
        }
        Console.WriteLine("PASS: reproduced template concurrency failure; fixed repeated edits, insertion/removal of children, settings and existing session preservation (EF InMemory).");
    }
}
