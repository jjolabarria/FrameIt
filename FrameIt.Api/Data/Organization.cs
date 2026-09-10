namespace FrameIt.Api.Data;

public sealed class Organization
{
    public static readonly Guid DefaultId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
}
