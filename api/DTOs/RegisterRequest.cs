using System.ComponentModel.DataAnnotations;

namespace api.DTOs;

public class RegisterRequest
{
  [Required]
  [EmailAddress]
  public string Email { get; set; } = null;

  [Required]
  [MinLength(8)]
  public string Password { get; set; } = null;
}