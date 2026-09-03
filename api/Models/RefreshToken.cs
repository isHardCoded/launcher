using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class RefreshToken
{
  public long Id { get; set; }
  public int UserId { get; set; }
  public User User { get; set; } = null;

  // SHA-256
  [MaxLength(64)]
  public string TokenHash { get; set; } = null;
  public DateTime CreatedAtUtc { get; set; }
  public DateTime ExpiresAtUtc { get; set; }
  public DateTime? RevokedAtUtc { get; set; }

  [MaxLength(64)]
  public string? ReplacedByTokenHash { get; set; }
}