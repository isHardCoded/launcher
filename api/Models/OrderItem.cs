namespace api.Models;

public class OrderItem
{
  public int Id { get; set; }
  public int OrderId { get; set; }
  public Order Order { get; set; }

  public int GameId { get; set; }
  public Game Game { get; set; } = null;

  public string Title { get; set; } = string.Empty;
  public string Image { get; set; } = string.Empty;
  public decimal UnitPrice { get; set; }
}