using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;

namespace FrameIt.Api.Services;

public sealed record StoredObjectResult(string StorageKey, string Url, string ContentType, long SizeBytes, string FileName);

public interface IStorageService
{
    Task<StoredObjectResult> UploadAsync(Stream stream, string fileName, string contentType, CancellationToken cancellationToken, string prefix = "session-uploads");
}

public sealed class S3StorageService : IStorageService
{
    private readonly S3StorageOptions _options;
    private readonly IAmazonS3 _client;

    public S3StorageService(IOptions<S3StorageOptions> options)
    {
        _options = options.Value;
        var config = new AmazonS3Config
        {
            RegionEndpoint = RegionEndpoint.GetBySystemName(string.IsNullOrWhiteSpace(_options.Region) ? "eu-west-1" : _options.Region)
        };
        _client = new AmazonS3Client(_options.AccessKey, _options.SecretKey, config);
    }

    public async Task<StoredObjectResult> UploadAsync(Stream stream, string fileName, string contentType, CancellationToken cancellationToken, string prefix = "session-uploads")
    {
        var safeName = Path.GetFileName(fileName);
        var key = $"{prefix.Trim('/')}/{DateTimeOffset.UtcNow:yyyy/MM}/{Guid.NewGuid():N}-{safeName}";

        var request = new PutObjectRequest
        {
            BucketName = _options.BucketName,
            Key = key,
            InputStream = stream,
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
            AutoCloseStream = false
        };

        await _client.PutObjectAsync(request, cancellationToken);

        var publicBaseUrl = string.IsNullOrWhiteSpace(_options.PublicBaseUrl)
            ? $"https://{_options.BucketName}.s3.{(string.IsNullOrWhiteSpace(_options.Region) ? "eu-west-1" : _options.Region)}.amazonaws.com"
            : _options.PublicBaseUrl.TrimEnd('/');

        return new StoredObjectResult(key, $"{publicBaseUrl}/{key}", request.ContentType, stream.Length, safeName);
    }
}
