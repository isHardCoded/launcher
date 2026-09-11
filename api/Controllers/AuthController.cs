using api.Data;
using api.DTOs;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
  private readonly AppDbContext _db;
  private readonly JwtTokenService _jwt;
  private readonly IPasswordHasher<User> _passwordHasher;

  public AuthController(
    AppDbContext db,
    JwtTokenService jwt,
    IPasswordHasher<User> passwordHasher
  )
  {
    _db = db;
    _jwt = jwt;
    _passwordHasher = passwordHasher;
  }

  [HttpPost("register")]
  public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
  {
    var email = request.Email.Trim().ToLowerInvariant();

    var exists = await _db.Users.AnyAsync(user => user.Email == email);
    
    if (exists)
    {
      return Conflict(new
      {
        message = "Пользователь с таким email уже существует"
      });
    }

    var user = new User
    {
      Email = email,
      CreatedAtUtc = DateTime.UtcNow
    };

    user.PasswordHash = _passwordHasher.HashPassword(
      user,
      request.Password
    );

    _db.Users.Add(user);
    await _db.SaveChangesAsync();

    var response = await CreateTokenPair(user);
    return Ok(response);
  }

  [HttpPost("login")]
  public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
  {
    var email = request.Email.Trim().ToLowerInvariant();

    var user = await _db.Users.SingleOrDefaultAsync(user => user.Email == email);

    if (user == null)
    {
      return Unauthorized(new
      {
        message = "Неверный email"
      });
    }

    var verificaion = _passwordHasher.VerifyHashedPassword(
      user,
      user.PasswordHash,
      request.Password
    );

    if (verificaion == PasswordVerificationResult.Failed)
    {
      return Unauthorized(new
      {
        message = "Неверный пароль"
      });
    }

    if (verificaion == PasswordVerificationResult.SuccessRehashNeeded)
    {
      user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
      await _db.SaveChangesAsync();
    }

    var response = await CreateTokenPair(user);
    return Ok(response);
  }

  [HttpPost("refresh")]
  public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request)
  {
    var hash = _jwt.HashRefreshToken(request.RefreshToken);

    var storedToken = await _db.RefreshTokens
      .Include(token => token.User)
      .SingleOrDefaultAsync(token => token.TokenHash == hash);

    if (storedToken == null || storedToken.RevokedAtUtc != null || storedToken.ExpiresAtUtc <= DateTime.UtcNow)
    {
      return Unauthorized(new
      {
        message = "Сессия истекла. Войдите снова"
      });
    }

    var response = await CreateTokenPair(storedToken.User);

    storedToken.RevokedAtUtc = DateTime.UtcNow;
    storedToken.ReplacedByTokenHash = _jwt.HashRefreshToken(response.RefreshToken);
    await _db.SaveChangesAsync();

    return Ok(response);
  }

  private async Task<AuthResponse> CreateTokenPair(User user)
  {
    var accessToken = _jwt.CreateAccessToken(user);
    var refreshToken = _jwt.CreateRefreshToken();
    var refreshHash = _jwt.HashRefreshToken(refreshToken);
    var refreshExpires = _jwt.GetRefreshTokenExpiration();

    _db.RefreshTokens.Add(new RefreshToken
    {
      UserId = user.Id,
      TokenHash = refreshHash,
      CreatedAtUtc = DateTime.UtcNow,
      ExpiresAtUtc = refreshExpires
    });

    await _db.SaveChangesAsync();

    return new AuthResponse
    {
      AccessToken = accessToken,
      RefreshToken = refreshToken,
      AccessTokenExpiresAtUtc = _jwt.GetAccessTokenExpiration(),
      RefreshTokenExpiresAtUtc = _jwt.GetRefreshTokenExpiration()
    };
  }
}