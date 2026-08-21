using api.Data;
using api.DTOs;
using api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GamesController : ControllerBase
{
  private readonly AppDbContext _context;

  public GamesController(AppDbContext context)
  {
    _context = context;
  }

  [HttpGet]
  public async Task<ActionResult<IEnumerable<GameDto>>> GetGames()
  {
    var games = await _context.Games
      .Include(game => game.GameTags)
      .ThenInclude(gameTag => gameTag.Tag)
      .ToListAsync();

    var result = games.Select(game => new GameDto
    {
      Id = game.Id,
      Title = game.Title,
      Image = game.Image,
      Price = game.Price,
      OldPrice = game.OldPrice,
      Discount = game.Discount,
      Tags = game.GameTags.Select(gameTag => gameTag.Tag.Name).ToList()
    });

    return Ok(result);
  }
}