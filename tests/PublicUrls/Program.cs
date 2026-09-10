using FrameIt.Api.Services;
using Microsoft.AspNetCore.Http;

var request = new DefaultHttpContext().Request;
request.Scheme = "http";
request.Host = new HostString("api", 8080);
void Equal(string actual, string expected)
{
    if (actual != expected) throw new Exception($"Expected {expected}, got {actual}");
}
var canonical = new PublicUrls(" https://frame-it.es/ ");
Equal(canonical.Origin(request), "https://frame-it.es");
Equal(canonical.Invitation(request, "a+b/c"), "https://frame-it.es/invitacion#token=a%2Bb%2Fc");
request.Host = new HostString("untrusted.example");
Equal(canonical.Origin(request), "https://frame-it.es");
Equal(new PublicUrls("http://localhost:8080/").Origin(request), "http://localhost:8080");
request.Host = new HostString("localhost", 5173);
Equal(new PublicUrls(null).Origin(request), "http://localhost:5173");
Equal(new PublicUrls(" ").Origin(request), "http://localhost:5173");
foreach (var value in new[] { "frame-it.es", "//frame-it.es", "ftp://frame-it.es", "https://user:password@frame-it.es", "https://frame-it.es/path", "https://frame-it.es/?a=b", "https://frame-it.es/#token", "https://frame-it.es?", "https://frame-it.es#" })
{
    try { _ = new PublicUrls(value); }
    catch (InvalidOperationException) { continue; }
    throw new Exception("Invalid public URL accepted");
}
Console.WriteLine("Public URL checks passed: canonical origin, proxy isolation, invitations, local fallback and invalid configuration.");
