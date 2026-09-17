namespace api.DTOs;

public class CartItemDto
{
  public int GameId { get; set; }
  public string Title { get; set; } = string.Empty;
  public string Image { get; set; } = string.Empty;
  public decimal Price { get; set; }
  public decimal?  OldPrice { get; set; }
  public int? Discount { get; set; }
}

public class CartDto
{
  public List<CartItemDto> Items { get; set; } = new();
  public decimal Total { get; set; }
}