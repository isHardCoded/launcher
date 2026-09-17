using api.Data;
using api.DTOs;
using api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Authorize]
[Route("/api/[controller]")]
public class CartController : ControllerBase
{
  private readonly AppDbContext _db;

  public CartController(AppDbContext db)
  {
    _db = db;
  }

  [HttpGet]
  public async Task<ActionResult<CartDto>> GetCart()
  {
    return Ok(await BuildCartAsync(1));
  }

  private async Task<CartDto> BuildCartAsync(int userId)
  {
    var items = await _db.CartItems.Where(item => item.UserId == userId).OrderByDescending(item => item.AddedAtUtc)
    .Select(item => new CartItemDto
    {
      GameId = item.GameId,
      Title = item.Game.Title,
      Image = item.Game.Image,
      Price = item.Game.Price,
      OldPrice = item.Game.OldPrice,
      Discount = item.Game.Discount
    }).ToListAsync();

    return new CartDto
    {
      Items = items,
      Total = items.Sum(item => item.Price)
    };
  }
}