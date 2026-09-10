using System.Security.Cryptography;

namespace FrameIt.Api.Services;

internal sealed class BootstrapTokenStore(string path, string? configuredToken)
{
    private string? ConfiguredToken()
    {
        if (string.IsNullOrWhiteSpace(configuredToken)) return null;
        var token = configuredToken.Trim();
        if (token.Length is < 32 or > 128 || token.Any(char.IsWhiteSpace))
            throw new InvalidOperationException("LocalAuth:BootstrapToken must contain 32 to 128 characters without whitespace.");
        return token;
    }

    public async Task EnsureAsync(bool reset = false)
    {
        // Environment-provided secrets are never copied to the persistent volume.
        if (ConfiguredToken() is not null) return;
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        if (!reset && File.Exists(path)) return;
        await File.WriteAllTextAsync(path, Convert.ToHexString(RandomNumberGenerator.GetBytes(32)));
        if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite);
    }

    public async Task<string> ReadAsync() => ConfiguredToken()
        ?? (File.Exists(path) ? (await File.ReadAllTextAsync(path)).Trim() : "");
}
