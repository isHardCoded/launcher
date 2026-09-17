namespace api.Models;

public class CartItem
{
  public int Id { get; set; }
  public int UserId { get; set; }
  public User User { get; set; } = null;
  public int GameId { get; set; }
  public Game Game { get; set; } = null;
  public DateTime AddedAtUtc { get; set; }
}