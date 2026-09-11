using api.Data;
using api.Models;
using api.DTOs;
using api.Services;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Authorize]
[Route("api/profile")]
public class ProfileController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AvatarStorage _avatars;

    public ProfileController(AppDbContext dbContext, AvatarStorage avatarStorage)
    {
        _db = dbContext;
        _avatars = avatarStorage;
    }

    [HttpGet]
    public async Task<ActionResult<ProfileDto>> GetProfile()
    {
        var user = await GetCurrentUserAsync();

        if (user == null)
        {
            return Unauthorized();
        }

        return Ok(ToDto(user));
    }

    [HttpPut]
    public async Task<ActionResult<ProfileDto>> UpdateProfile(UpdateProfileRequest request)
    {
        var user = await GetCurrentUserAsync();

        if (user == null)
        {
            return Unauthorized();
        }

        if (request.BirthDate is { } birthDate)
        {
            var maxBirthDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1);

            if (birthDate > maxBirthDate)
            {
                ModelState.AddModelError(nameof(request.BirthDate), "Дата не может быть в будущем");
            }
            else if (birthDate < new DateOnly(1900, 1, 1))
            {
                ModelState.AddModelError(nameof(request.BirthDate), "Слишком ранняя дата");
            }
        }

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var username = request.Username.Trim();
        var email = request.Email.Trim().ToLowerInvariant();

        var usernameTaken = await _db.Users.AnyAsync(x => x.Id != user.Id && x.Username == username);

        if (usernameTaken)
        {
            return Conflict(new
            {
                message = "Этот никнейм уже занят",
                field = "username"
            });
        }

        var emailTaken = await _db.Users.AnyAsync(x => x.Id != user.Id && x.Email == email);

        if (emailTaken)
        {
            return Conflict(new
            {
                message = "Этот email уже используется",
                field = "email"
            });
        }

        user.Username = username;
        user.Email = email;
        user.FirstName = NullIfEmpty(request.FirstName);
        user.LastName = NullIfEmpty(request.LastName);
        user.Bio = NullIfEmpty(request.Bio);
        user.BirthDate = request.BirthDate;
        user.UpdatedAtUtc = DateTime.UtcNow;

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new
            {
                message = "Никнейм или email уже заняты"
            });
        }

        return Ok(ToDto(user));
    }

    [HttpPost("avatar")]
    public async Task<ActionResult<ProfileDto>> UploadAvatar(IFormFile? avatar, CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync();

        if (user == null)
        {
            return Unauthorized();
        }

        var error = _avatars.Validate(avatar);

        if (error != null)
        {
            return BadRequest(new
            {
                message = error,
                field = "avatar"
            });
        }

        var oldFileName = user.AvatarFileName;
        var newFileName = await _avatars.SaveAsync(avatar!, cancellationToken);

        user.AvatarFileName = newFileName;
        user.UpdatedAtUtc = DateTime.UtcNow;

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            _avatars.Delete(newFileName);
            throw;
        }

        _avatars.Delete(oldFileName);

        return Ok(ToDto(user));
    }

    [HttpDelete("avatar")]
    public async Task<ActionResult<ProfileDto>> DeleteAvatar()
    {
        var user = await GetCurrentUserAsync();

        if (user == null)
        {
            return Unauthorized();
        }

        var oldFileName = user.AvatarFileName;

        if (oldFileName != null)
        {
            user.AvatarFileName = null;
            user.UpdatedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            _avatars.Delete(oldFileName);
        }

        return Ok(ToDto(user));
    }

    private async Task<User?> GetCurrentUserAsync()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(userIdClaim, out var userId))
        {
            return null;
        }

        return await _db.Users.SingleOrDefaultAsync(u => u.Id == userId);
    }

    private ProfileDto ToDto(User user)
    {
        return new ProfileDto
        {
            Id = user.Id,
            Email = user.Email,
            Username = user.Username,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Bio = user.Bio,
            BirthDate = user.BirthDate,
            AvatarUrl = _avatars.GetUrl(user.AvatarFileName),
            CreatedAtUtc = DateTime.SpecifyKind(user.CreatedAtUtc, DateTimeKind.Utc)
        };
    }

    private static string? NullIfEmpty(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
