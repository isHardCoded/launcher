namespace api.Services;

public class AvatarStorage
{
  public const string RequestPath = "/uploads/avatars";
  public const long MaxFileSize = 2 * 1024 * 1024;

  public static readonly Dictionary<string, string> AllowedTypes = new()
  {
    ["image/jpeg"] = ".jpg",
    ["image/png"] = ".png",
    ["image/gif"] = ".gif"
  };

  public string RootPath { get; }

  public AvatarStorage(IWebHostEnvironment environment)
  {
    RootPath = Path.Combine(environment.ContentRootPath, "uploads", "avatars");
    if (!Directory.Exists(RootPath))
    {
      Directory.CreateDirectory(RootPath);
    }
  }

  public string? Validate (IFormFile file)
  {
    if (file == null || file.Length == 0)
    {
      return "No file uploaded";
    }

    if (file.Length > MaxFileSize)
    {
      return $"File size exceeds the maximum limit of {MaxFileSize / (1024 * 1024)} MB";
    }

    if (!AllowedTypes.ContainsKey(file.ContentType))
    {
      return "Invalid file type. Only JPEG, PNG, and GIF are allowed";
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

    var fullPath = Path.Combine(RootPath, fileName);

    if (File.Exists(fullPath))
    {
      File.Delete(fullPath);
    }
  }

  public string? GetUrl(string? fileName)
  {
    return string.IsNullOrEmpty(fileName) ? null : $"{RequestPath}/{fileName}";
  }

}