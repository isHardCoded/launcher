namespace api.DTOs;

public class GameDto
{
  public int Id { get; set; }
  public string Title { get; set; } = string.Empty;
  public string Image { get; set; } = string.Empty;
  public decimal Price { get; set; }
  public decimal? OldPrice { get; set; }
  public int? Discount { get; set; }
  public List<string> Tags { get; set; } = new();
}