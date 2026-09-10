using FrameIt.Api.Services;

var directory = Path.Combine(Path.GetTempPath(), "frameit-bootstrap-test-" + Guid.NewGuid().ToString("N"));
var path = Path.Combine(directory, "bootstrap-token");
void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
try
{
    var supplied = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));
    var configured = new BootstrapTokenStore(path, supplied);
    await configured.EnsureAsync();
    Check(await configured.ReadAsync() == supplied, "Configured token must be used");
    Check(!Directory.Exists(directory), "Configured secret must not be persisted");

    var automatic = new BootstrapTokenStore(path, null);
    await automatic.EnsureAsync();
    var original = await automatic.ReadAsync();
    Check(original.Length == 64, "Fallback must generate a random token");
    await automatic.EnsureAsync();
    Check(await automatic.ReadAsync() == original, "Restart must preserve generated token");
    await configured.EnsureAsync();
    Check(await configured.ReadAsync() == supplied, "Configured token must override existing file");
    Check(await File.ReadAllTextAsync(path) == original, "Existing fallback must remain intact");
    await automatic.EnsureAsync(reset: true);
    Check(await automatic.ReadAsync() != original, "Explicit reset must rotate generated token");
    await configured.EnsureAsync(reset: true);
    Check(await configured.ReadAsync() == supplied, "Explicit configured token must remain authoritative");

    foreach (var invalid in new[] { "too-short", new string('x', 129), new string('x', 32) + "\nembedded" })
    {
        try { await new BootstrapTokenStore(path, invalid).EnsureAsync(); throw new Exception("Invalid token accepted"); }
        catch (InvalidOperationException error) { Check(!error.Message.Contains(invalid), "Error must not expose the secret"); }
    }
    Check(await new BootstrapTokenStore(path, " ").ReadAsync() == await automatic.ReadAsync(), "Blank configuration must use fallback");
    Console.WriteLine("PASS configured token, no persistence, fallback, restart, precedence, reset and validation");
}
finally
{
    if (File.Exists(path)) File.Delete(path);
    if (Directory.Exists(directory)) Directory.Delete(directory);
}
