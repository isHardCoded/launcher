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
[Route("api/[controller]")]
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

        user.Username = request.Username;
        user.Email = request.Email;
        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.Bio = request.Bio;
        user.UpdatedAtUtc = DateTime.UtcNow;

        _db.Users.Update(user);
        await _db.SaveChangesAsync();

        return Ok(ToDto(user));
    }

    [HttpPost("avatar")]
    public async Task<ActionResult<ProfileDto>> UploadAvatar(IFormFile avatar, CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync();

        if (user == null)
        {
            return Unauthorized();
        }

        if (avatar == null) 
        {
          return BadRequest(new
          {
            message = "No file uploaded",
            field = "avatar"
          });
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
        var newFileName = await _avatars.SaveAsync(avatar, cancellationToken);

        user.AvatarFileName = newFileName;
        user.UpdatedAtUtc = DateTime.UtcNow;

        try 
        {
          await _db.SaveChangesAsync(cancellationToken);
        } catch
        {
          _avatars.Delete(newFileName);
          throw;
        }

        _avatars.Delete(oldFileName);

        return Ok(ToDto(user));
    }

    public async Task<User?> GetCurrentUserAsync()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userIdClaim == null)
        {
            return null;
        }

        return await _db.Users.SingleOrDefaultAsync(u => u.Id.ToString() == userIdClaim);
    }

    private ProfileDto ToDto(User user)
    {
      return new ProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Bio = user.Bio,
            AvatarFileName = _avatars.GetUrl(user.AvatarFileName)
        };
    }
}