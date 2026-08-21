namespace api.Models;

public class Tag
{
  public int Id { get; set; }
  public string Name { get; set; } = string.Empty;
  public ICollection<GameTag> GameTags { get; set; } = new List<GameTag>();
}