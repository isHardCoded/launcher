namespace api.DTOs;

public class OrderItemDto
{
  public int GameId { get; set; }
  public string Title { get; set; } = string.Empty;
  public string Image { get; set; } = string.Empty;
  public decimal UnitPrice { get; set; }
}

public class OrderDto {
    public int Id { get; set; }
    public string Number { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;

    public decimal Total { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? PaidAtUtc { get; set; }
    public List<OrderItemDto> Items { get; set; } = new();
}