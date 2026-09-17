using Microsoft.AspNetCore.SignalR;

namespace api.Models;

public class LibraryItem
{
  public int UserId { get; set; }
  public User User { get; set; } = null;

  public int GameId { get; set; }
  public Game Game { get; set; } = null;

  public int OrderId { get; set; }
  public Order Order { get; set; } = null;

  public DateTime PurchasedAtUtc { get; set; }
}