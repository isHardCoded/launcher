using System.ComponentModel.DataAnnotations;

namespace api.DTOs;

public class RefreshRequest
{
  [Required(ErrorMessage = "Нет refresh-токена")]
  public string RefreshToken { get; set; } = string.Empty;
}
