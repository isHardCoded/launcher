namespace api.Models;

public enum OrderStatus
{
  Pending = 0,
  Paid = 1,
  Cancelled = 2
}

public class Order
{
  public int Id { get; set; }
  public string Number { get; set; }
  public int UserId { get; set; }
  public User User { get; set; } = null;
  public OrderStatus Status { get; set; }
  public decimal Total { get; set; }
  public DateTime CreatedAtUtc { get; set; }
  public DateTime? PaidAtUtc { get; set; }
  public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}