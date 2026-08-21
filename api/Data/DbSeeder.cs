using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Data;

public static class DbSeeder
{
  public static async Task SeedAsync(AppDbContext context)
    {
        if (await context.Games.AnyAsync())
        {
            return;
        }
        var tagsMap = new Dictionary<string, Tag>
        {
            { "HIT", new Tag { Name = "HIT" } },
            { "RPG", new Tag { Name = "RPG" } },
            { "ATMOSPHERIC", new Tag { Name = "ATMOSPHERIC" } },
            { "OPEN WORLD", new Tag { Name = "OPEN WORLD" } },
            { "NEW", new Tag { Name = "NEW" } },
            { "ROGUE-LIKE", new Tag { Name = "ROGUE-LIKE" } },
            { "SALE", new Tag { Name = "SALE" } },
            { "ACTION", new Tag { Name = "ACTION" } },
            { "HARDCORE", new Tag { Name = "HARDCORE" } }
        };

        await context.Tags.AddRangeAsync(tagsMap.Values);
        await context.SaveChangesAsync();

        var games = new List<Game>
        {
            new()
            {
                Title = "Baldur's Gate 3",
                Image = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/header.jpg",
                Price = 47.99m,
                OldPrice = 59.99m,
                Discount = 20
            },
            new()
            {
                Title = "Red Dead Redemption 2",
                Image = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1174180/header.jpg",
                Price = 29.99m,
                OldPrice = null,
                Discount = null
            },
            new()
            {
                Title = "Hades II",
                Image = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1145350/header.jpg",
                Price = 24.99m,
                OldPrice = null,
                Discount = null
            },
            new()
            {
                Title = "Horizon Forbidden West",
                Image = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2420110/header.jpg",
                Price = 41.99m,
                OldPrice = 59.99m,
                Discount = 30
            },
            new()
            {
                Title = "The Witcher 3",
                Image = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/292030/header.jpg",
                Price = 9.99m,
                OldPrice = 39.99m,
                Discount = 75
            },
            new()
            {
                Title = "Lies of P",
                Image = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1627720/header.jpg",
                Price = 29.99m,
                OldPrice = 59.99m,
                Discount = 50
            },
            new()
            {
                Title = "Sekiro",
                Image = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/814380/header.jpg",
                Price = 23.99m,
                OldPrice = 59.99m,
                Discount = 60
            }
        };

        await context.Games.AddRangeAsync(games);
        await context.SaveChangesAsync();

        var gameTags = new List<GameTag>
        {
            new() { GameId = games[0].Id, TagId = tagsMap["HIT"].Id },
            new() { GameId = games[0].Id, TagId = tagsMap["RPG"].Id },

            new() { GameId = games[1].Id, TagId = tagsMap["ATMOSPHERIC"].Id },
            new() { GameId = games[1].Id, TagId = tagsMap["OPEN WORLD"].Id },

            new() { GameId = games[2].Id, TagId = tagsMap["NEW"].Id },
            new() { GameId = games[2].Id, TagId = tagsMap["ROGUE-LIKE"].Id },

            new() { GameId = games[3].Id, TagId = tagsMap["SALE"].Id },
            new() { GameId = games[3].Id, TagId = tagsMap["ACTION"].Id },

            new() { GameId = games[4].Id, TagId = tagsMap["RPG"].Id },
            new() { GameId = games[4].Id, TagId = tagsMap["OPEN WORLD"].Id },

            new() { GameId = games[5].Id, TagId = tagsMap["HARDCORE"].Id },
            new() { GameId = games[5].Id, TagId = tagsMap["ACTION"].Id },

            new() { GameId = games[6].Id, TagId = tagsMap["HARDCORE"].Id },
            new() { GameId = games[6].Id, TagId = tagsMap["ACTION"].Id }
        };

        await context.GameTags.AddRangeAsync(gameTags);
        await context.SaveChangesAsync();
    }
}