using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Data;

public class AppDbContext : DbContext
{
  public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}

  public DbSet<Game> Games => Set<Game>();
  public DbSet<Tag> Tags => Set<Tag>();
  public DbSet<GameTag> GameTags => Set<GameTag>();
  public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
  public DbSet<User> Users => Set<User>();

  public DbSet<CartItem> CartItems => Set<CartItem>();
  public DbSet<Order> Orders => Set<Order>();
  public DbSet<OrderItem> OrderItems => Set<OrderItem>();
  public DbSet<LibraryItem> LibraryItems => Set<LibraryItem>();

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    base.OnModelCreating(modelBuilder);

    modelBuilder.Entity<GameTag>().HasKey(x => new
    {
      x.GameId,
      x.TagId
    });

    modelBuilder.Entity<GameTag>().HasOne(x => x.Game).WithMany(x => x.GameTags).HasForeignKey(x => x.GameId);

    modelBuilder.Entity<GameTag>().HasOne(x => x.Tag).WithMany(x => x.GameTags).HasForeignKey(x => x.TagId);

    modelBuilder.Entity<RefreshToken>()
      .HasOne(token => token.User)
      .WithMany(token => token.RefreshTokens)
      .HasForeignKey(user => user.UserId)
      .OnDelete(DeleteBehavior.Cascade);

    modelBuilder.Entity<User>(user =>
    {
      user.Property(u => u.Username).HasMaxLength(32).UseCollation("NOCASE");
      user.Property(u => u.FirstName).HasMaxLength(50);
      user.Property(u => u.LastName).HasMaxLength(50);
      user.Property(u => u.Bio).HasMaxLength(500);
      user.Property(u => u.AvatarFileName).HasMaxLength(64);
      user.HasIndex(u => u.Username).IsUnique();
      user.HasIndex(u => u.Email).IsUnique();
    });

    modelBuilder.Entity<CartItem>(cart =>
    {
      cart.HasOne(item => item.User)
        .WithMany()
        .HasForeignKey(item => item.UserId)
        .OnDelete(DeleteBehavior.Cascade);

      cart.HasOne(item => item.Game)
        .WithMany()
        .HasForeignKey(item => item.GameId)
        .OnDelete(DeleteBehavior.Cascade);
    });

    modelBuilder.Entity<Order>(order =>
    {
      order.Property(o => o.Number).HasMaxLength(40);
    });

    modelBuilder.Entity<OrderItem>(item =>
    {
      item.Property(i => i.Title).HasMaxLength(200);

      item.HasOne(i => i.Order)
        .WithMany(order => order.Items)
        .HasForeignKey(i => i.OrderId)
        .OnDelete(DeleteBehavior.Cascade);

      item.HasOne(i => i.Game)
        .WithMany()
        .HasForeignKey(i => i.GameId)
        .OnDelete(DeleteBehavior.Cascade);
    });

    modelBuilder.Entity<LibraryItem>(library =>
    {
      library.HasKey(item => new { item.UserId, item.GameId });

      library.HasOne(item => item.User)
        .WithMany()
        .HasForeignKey(item => item.UserId)
        .OnDelete(DeleteBehavior.Cascade);

      library.HasOne(item => item.Game)
        .WithMany()
        .HasForeignKey(item => item.GameId)
        .OnDelete(DeleteBehavior.Cascade);

      library.HasOne(item => item.Order)
        .WithMany()
        .HasForeignKey(item => item.OrderId)
        .OnDelete(DeleteBehavior.Cascade);
    });

  }
}