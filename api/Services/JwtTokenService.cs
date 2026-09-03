using Microsoft.Extensions.Options;
using api.Models;
using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Cryptography;
using Microsoft.AspNetCore.WebUtilities;

public class JwtTokenService
{
  private readonly JwtOptions _options;

  public JwtTokenService(IOptions<JwtOptions> options)
  {
    _options = options.Value;
  }

  public string CreateAccessToken(User user)
  {
    var claims = new List<Claim>
    {
      new (
        JwtRegisteredClaimNames.Sub,
        user.Id.ToString()
      ),
      new (
        JwtRegisteredClaimNames.Email,
        user.Email
      ),
      new (
        JwtRegisteredClaimNames.Jti,
        Guid.NewGuid().ToString()
      ),
      new (
        ClaimTypes.NameIdentifier,
        user.Id.ToString()
      ),
      new (
        ClaimTypes.Name,
        user.Email
      ),
      new (
        ClaimTypes.NameIdentifier,
        user.Id.ToString()
      )
    };

    var key = new SymmetricSecurityKey(
      Encoding.UTF8.GetBytes(_options.Key)
    );

    var credentials = new SigningCredentials(
      key,
      SecurityAlgorithms.HmacSha256
    );

    var token = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(_options.AccessTokenMinutes),
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            SigningCredentials = credentials
        };

    return new JsonWebTokenHandler().CreateToken(token);
  }

  public string CreateRefreshToken()
  {
    var bytes = RandomNumberGenerator.GetBytes(64);
    return WebEncoders.Base64UrlEncode(bytes);
  }

  public string HashRefreshToken(string token)
  {
    var bytes = Encoding.UTF8.GetBytes(token);
    var hash = SHA256.HashData(bytes);
    return Convert.ToHexString(hash);
  }

  public DateTime GetAccessTokenExpiration()
  {
    return DateTime.UtcNow.AddMinutes(_options.AccessTokenMinutes);
  }

  public DateTime GetRefreshTokenExpiration()
  {
    return DateTime.UtcNow.AddDays(_options.RefreshTokenDays);
  }
}