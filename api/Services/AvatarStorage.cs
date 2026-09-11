namespace api.Services;

public class AvatarStorage
{
  public const string RequestPath = "/uploads/avatars";
  public const long MaxFileSize = 2 * 1024 * 1024;

  public static readonly Dictionary<string, string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
  {
    ["image/jpeg"] = ".jpg",
    ["image/png"] = ".png",
    ["image/webp"] = ".webp"
  };

  private static readonly byte[] PngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

  public string RootPath { get; }

  public AvatarStorage(IWebHostEnvironment environment)
  {
    RootPath = Path.Combine(environment.ContentRootPath, "uploads", "avatars");
    Directory.CreateDirectory(RootPath);
  }

  public string? Validate(IFormFile? file)
  {
    if (file == null || file.Length == 0)
    {
      return "Выберите файл";
    }

    if (file.Length > MaxFileSize)
    {
      return $"Файл должен быть не больше {MaxFileSize / (1024 * 1024)} МБ";
    }

    if (!AllowedTypes.ContainsKey(file.ContentType))
    {
      return "Поддерживаются только JPG, PNG и WEBP";
    }

    using var stream = file.OpenReadStream();

    if (!HasImageSignature(stream, file.ContentType))
    {
      return "Файл повреждён или не является изображением";
    }

    return null;
  }

  public async Task<string> SaveAsync(IFormFile file, CancellationToken cancellationToken)
  {
    var fileName = $"{Guid.NewGuid()}{AllowedTypes[file.ContentType]}";
    var fullPath = Path.Combine(RootPath, fileName);

    await using var stream = File.Create(fullPath);
    await file.CopyToAsync(stream, cancellationToken);

    return fileName;
  }

  public void Delete(string? fileName)
  {
    if (string.IsNullOrEmpty(fileName))
    {
      return;
    }

    var fullPath = Path.Combine(RootPath, Path.GetFileName(fileName));

    if (File.Exists(fullPath))
    {
      File.Delete(fullPath);
    }
  }

  public string? GetUrl(string? fileName)
  {
    return string.IsNullOrEmpty(fileName) ? null : $"{RequestPath}/{fileName}";
  }

  private static bool HasImageSignature(Stream stream, string contentType)
  {
    Span<byte> header = stackalloc byte[12];
    var read = stream.ReadAtLeast(header, header.Length, throwOnEndOfStream: false);

    if (read < header.Length)
    {
      return false;
    }

    return contentType.ToLowerInvariant() switch
    {
      "image/jpeg" => header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
      "image/png" => header[..8].SequenceEqual(PngSignature),
      "image/webp" => header[..4].SequenceEqual("RIFF"u8) && header[8..12].SequenceEqual("WEBP"u8),
      _ => false
    };
  }
}
