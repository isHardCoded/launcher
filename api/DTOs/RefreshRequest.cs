using System.ComponentModel.DataAnnotations;

namespace api.DTOs;

public class RefreshRequest
{
  [Required]
  public string RefeshToken { get; set; } = null;
}