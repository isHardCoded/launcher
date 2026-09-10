using System.ComponentModel.DataAnnotations;

namespace api.DTOs;

public class UpdateProfileRequest
{
  [Required(ErrorMessage = "Username is required")]
  [StringLength(32, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 32 characters")]
  [RegularExpression("^[a-zA-Z0-9_]+$", ErrorMessage = "Username can only contain letters, numbers, and underscores")]
  public string? Username { get; set; } = string.Empty;
  [Required(ErrorMessage = "Email is required")]
  [EmailAddress(ErrorMessage = "Invalid email address")]
  [StringLength(100, ErrorMessage = "Email must be less than 100 characters")]
  public string Email { get; set; } = string.Empty;
  [StringLength(50, ErrorMessage = "First name must be less than 50 characters")]
  public string? FirstName { get; set; } = string.Empty;
  [StringLength(50, ErrorMessage = "Last name must be less than 50 characters")]
  public string? LastName { get; set; } = string.Empty;
  [StringLength(500, ErrorMessage = "Bio must be less than 500 characters")]
  public string? Bio { get; set; } = string.Empty;
  public DateOnly? BirthDate { get; set; }
}