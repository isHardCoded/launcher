namespace api.DTOs;

public class ProfileDto
{
  public int Id { get; set; }
  public string Email { get; set; } = string.Empty;
  public string? Username { get; set; }
  public string? FirstName { get; set; }
  public string? LastName { get; set; }
  public string? Bio { get; set; }
  public DateOnly? BirthDate { get; set; }
  public string? AvatarUrl { get; set; }
  public DateTime CreatedAtUtc { get; set; }
}
