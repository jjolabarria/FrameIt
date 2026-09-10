namespace FrameIt.Api.Services;

/// <summary>Canonical public origin, independent of internal reverse-proxy addresses.</summary>
public sealed class PublicUrls
{
    private readonly string? origin;

    public PublicUrls(string? configuredUrl)
    {
        if (string.IsNullOrWhiteSpace(configuredUrl)) return;
        var value = configuredUrl.Trim();
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp)
            || string.IsNullOrEmpty(uri.Host) || uri.UserInfo.Length > 0
            || uri.AbsolutePath != "/" || uri.Query.Length > 0 || uri.Fragment.Length > 0
            || value.Contains('?') || value.Contains('#') || value.Contains('\\'))
            throw new InvalidOperationException("FRAMEIT_PUBLIC_URL must be an absolute HTTP(S) origin without credentials, a path, query or fragment.");
        origin = uri.GetLeftPart(UriPartial.Authority);
    }

    public string Origin(HttpRequest request) => origin ?? $"{request.Scheme}://{request.Host}";

    public string Invitation(HttpRequest request, string token)
        => $"{Origin(request)}/invitacion#token={Uri.EscapeDataString(token)}";
}
