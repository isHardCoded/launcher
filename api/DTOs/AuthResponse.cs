namespace api.DTOs;

public class AuthResponse
{
  public string AccessToken { get; set; } = null;
  public string RefreshToken { get; set; } = null;
  public DateTime AccessTokenExpiresAtUtc { get; set; }
  public DateTime RefreshTokenExpiresAtUtc { get; set; }
}