using FrameIt.Api.Data;
using FrameIt.Api.Services;
using FrameIt.Contracts;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

var options = new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase("lifecycle-" + Guid.NewGuid()).Options;
await using var db = new AppDbContext(options);
var orgA = Guid.NewGuid(); var orgB = Guid.NewGuid();
db.Organizations.AddRange(new Organization { Id = orgA, Name = "A" }, new Organization { Id = orgB, Name = "B" });
var client = new Client { OrganizationId = orgA, Name = "With history" };
var emptyClient = new Client { OrganizationId = orgA, Name = "Empty" };
var foreign = new Client { OrganizationId = orgB, Name = "Foreign" };
var project = new Project { Client = client, Name = "Project", Code = "P" };
var emptyProject = new Project { Client = client, Name = "Empty project", Code = "E" };
var template = new DynamicTemplate { OrganizationId = orgA, Key = "used", Title = "Used" };
var emptyTemplate = new DynamicTemplate { OrganizationId = orgA, Key = "empty", Title = "Empty" };
var builtIn = new DynamicTemplate { Key = "built-in", Title = "Built in", IsBuiltIn = true };
WorkshopSession Session(string code, SessionStatus status = SessionStatus.Draft) => new() { Client = client, Project = project, Template = template, Title = code, AccessCode = code, Status = status };
var empty = Session("EMPTY"); var populated = Session("PEOPLE"); var live = Session("LIVE", SessionStatus.Live); var closed = Session("CLOSED", SessionStatus.Closed); var withOutcome = Session("OUTCOME");
db.AddRange(client, emptyClient, foreign, project, emptyProject, template, emptyTemplate, builtIn, empty, populated, live, closed, withOutcome);
db.SessionParticipants.Add(new SessionParticipant { WorkshopSession = populated, DisplayName = "Participant" });
db.Set<SessionOutcome>().Add(new SessionOutcome { WorkshopSession = withOutcome, Text = "Preserve", Bucket = "decidido" });
await db.SaveChangesAsync();
db.OrganizationScopeEnabled = true; db.CurrentOrganizationId = orgA;
void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
async Task Expect(string kind, Guid id, bool? archived, int status)
{
    var result = await LifecycleEndpoints.Change(kind, id, archived, db, CancellationToken.None);
    Check(result is IStatusCodeHttpResult response && response.StatusCode == status, $"Unexpected status for {kind}/{archived}: expected {status}");
}
await Expect("clients", foreign.Id, true, 404);
await Expect("clients", foreign.Id, null, 404);
await Expect("templates", builtIn.Id, true, 409);
await Expect("templates", builtIn.Id, null, 409);
await Expect("sessions", live.Id, true, 409);
await Expect("clients", client.Id, true, 204);
Check(client.IsArchived && !project.IsArchived && !populated.IsArchived, "Archive cascaded");
Check(await db.SessionParticipants.CountAsync() == 1, "History lost during archive");
await Expect("clients", client.Id, false, 204);
Check(!client.IsArchived, "Restore failed");
await Expect("sessions", closed.Id, true, 204);
Check(closed.IsArchived && closed.Status == SessionStatus.Closed, "Archiving changed session state");
await Expect("sessions", closed.Id, false, 204);
await Expect("projects", project.Id, true, 204);
await Expect("clients", client.Id, null, 409); // Includes archived dependencies.
await Expect("projects", project.Id, null, 409);
await Expect("templates", template.Id, null, 409);
await Expect("sessions", populated.Id, null, 409);
await Expect("sessions", withOutcome.Id, null, 409);
await Expect("sessions", live.Id, null, 409);
await Expect("sessions", closed.Id, null, 409);
await Expect("clients", emptyClient.Id, null, 204);
await Expect("projects", emptyProject.Id, null, 204);
await Expect("templates", emptyTemplate.Id, null, 204);
await Expect("sessions", empty.Id, true, 204);
await Expect("sessions", empty.Id, null, 204);
await Expect("sessions", empty.Id, null, 404);
Check(await db.SessionParticipants.CountAsync() == 1 && await db.Set<SessionOutcome>().CountAsync() == 1, "Contributions deleted");
foreach (var type in new[] { typeof(Project), typeof(WorkshopSession) })
    foreach (var fk in db.Model.FindEntityType(type)!.GetForeignKeys().Where(f => f.PrincipalEntityType.ClrType == typeof(Client) || f.PrincipalEntityType.ClrType == typeof(Project) || f.PrincipalEntityType.ClrType == typeof(DynamicTemplate)))
        Check(fk.DeleteBehavior == DeleteBehavior.Restrict, "Parent cascade delete still enabled");
db.CurrentOrganizationId = null; db.OrganizationScopeEnabled = false;
await Expect("clients", foreign.Id, true, 204);
Check(foreign.IsArchived, "Admin cross-organization operation failed");
Console.WriteLine("PASS: archive/restore, history preservation, archived dependencies, protected templates, empty deletion, populated/live/closed session protection, organization isolation and restrictive parent relationships (EF InMemory).");
var borrowed = new RecordingTransaction();
await using (var lease = new LifecycleEndpoints.SessionTransaction(borrowed, false)) await lease.CommitAsync();
Check(borrowed.Commits == 0 && borrowed.Disposals == 0, "An inner handler committed or disposed the outer transaction");
var owned = new RecordingTransaction();
await using (var lease = new LifecycleEndpoints.SessionTransaction(owned, true)) await lease.CommitAsync();
Check(owned.Commits == 1 && owned.Disposals == 1, "An owned transaction was not committed/disposed");
Console.WriteLine("PASS: session handlers preserve ownership of the outer transaction.");

sealed class RecordingTransaction : Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction
{
    public Guid TransactionId { get; } = Guid.NewGuid();
    public int Commits { get; private set; }
    public int Disposals { get; private set; }
    public void Commit() => Commits++;
    public Task CommitAsync(CancellationToken cancellationToken = default) { Commit(); return Task.CompletedTask; }
    public void Rollback() { }
    public Task RollbackAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    public void Dispose() => Disposals++;
    public ValueTask DisposeAsync() { Dispose(); return ValueTask.CompletedTask; }
}
