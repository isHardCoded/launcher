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
  }
}