using System.ComponentModel.DataAnnotations;

namespace api.DTOs;

public class UpdateProfileRequest
{
  [Required(ErrorMessage = "Укажите никнейм")]
  [StringLength(32, MinimumLength = 3, ErrorMessage = "От 3 до 32 символов")]
  [RegularExpression("^[a-zA-Z0-9_]+$", ErrorMessage = "Только латинские буквы, цифры и _")]
  public string Username { get; set; } = string.Empty;

  [Required(ErrorMessage = "Укажите email")]
  [EmailAddress(ErrorMessage = "Некорректный email")]
  [StringLength(254, ErrorMessage = "Некорректный email")]
  public string Email { get; set; } = string.Empty;

  [StringLength(50, ErrorMessage = "Не больше 50 символов")]
  public string? FirstName { get; set; }

  [StringLength(50, ErrorMessage = "Не больше 50 символов")]
  public string? LastName { get; set; }

  [StringLength(500, ErrorMessage = "Не больше 500 символов")]
  public string? Bio { get; set; }

  public DateOnly? BirthDate { get; set; }
}
