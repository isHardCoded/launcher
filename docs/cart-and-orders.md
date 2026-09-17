# Корзина и заказы в PLAYHUB — пошаговая реализация

Документ описывает, как добавить в проект полный цикл покупки: пользователь нажимает
«В корзину» на карточке игры → видит корзину → оформляет заказ → «оплачивает» его →
игра появляется в его библиотеке, а заказ — в истории.

Всё написано под текущий стек проекта:

| Слой | Что уже есть | Где лежит |
| --- | --- | --- |
| БД | EF Core + SQLite, миграции | `api/Data/AppDbContext.cs`, `api/Migrations/` |
| Авторизация | JWT access + refresh, `[Authorize]`, `ClaimTypes.NameIdentifier` | `api/Services/JwtTokenService.cs` |
| API | контроллеры `api/Controllers/*.cs`, DTO в `api/DTOs/` | `api/` |
| Фронт | React 19 + TS, Tailwind v4, hash-роутинг, `apiRequest` с авто-refresh | `src/` |

---

## Содержание

1. [Теория: чем корзина отличается от заказа](#1-теория-чем-корзина-отличается-от-заказа)
2. [Шаг 1. Модели данных](#шаг-1-модели-данных)
3. [Шаг 2. Регистрация в AppDbContext](#шаг-2-регистрация-в-appdbcontext)
4. [Шаг 3. Миграция](#шаг-3-миграция)
5. [Шаг 4. DTO — контракт с фронтом](#шаг-4-dto--контракт-с-фронтом)
6. [Шаг 5. Помощник: id текущего пользователя](#шаг-5-помощник-id-текущего-пользователя)
7. [Шаг 6. CartController](#шаг-6-cartcontroller)
8. [Шаг 7. OrdersController — оформление и оплата](#шаг-7-orderscontroller--оформление-и-оплата)
9. [Шаг 8. LibraryController](#шаг-8-librarycontroller)
10. [Шаг 9. Проверяем API руками](#шаг-9-проверяем-api-руками)
11. [Шаг 10. Типы на фронте](#шаг-10-типы-на-фронте)
12. [Шаг 11. Сервисы](#шаг-11-сервисы)
13. [Шаг 12. Контекст корзины](#шаг-12-контекст-корзины)
14. [Шаг 13. Кнопка «В корзину» на карточке](#шаг-13-кнопка-в-корзину-на-карточке)
15. [Шаг 14. Роуты и хедер со счётчиком](#шаг-14-роуты-и-хедер-со-счётчиком)
16. [Шаг 15. Страница корзины и оформление](#шаг-15-страница-корзины-и-оформление)
17. [Шаг 16. История заказов](#шаг-16-история-заказов)
18. [Шаг 17. Сборка: App.tsx и main.tsx](#шаг-17-сборка-apptsx-и-maintsx)
19. [Дополнительно: корзина для гостя](#дополнительно-корзина-для-гостя)
20. [Чеклист и типичные ошибки](#чеклист-и-типичные-ошибки)

---

## 1. Теория: чем корзина отличается от заказа

Это два разных объекта, и их нельзя смешивать — иначе через месяц вы не сможете
ответить на вопрос «сколько пользователь заплатил в марте».

**Корзина (Cart)** — черновик. Это просто список ссылок на игры: «пользователь #7
интересуется играми 3 и 12». В корзине **нет цен**. Цену всегда берём из
актуальной `Games.Price` — если ночью началась распродажа, пользователь утром
увидит новую цену, и это правильно.

**Заказ (Order)** — документ. Он неизменяем после создания и хранит **снимок**
(snapshot) данных: название игры и цену **на момент покупки**. Это ключевая идея
всей бухгалтерии:

> Если бы `OrderItem` хранил только `GameId`, то при изменении `Games.Price`
> «задним числом» поменялись бы все прошлые чеки. Клиент купил за $47.99, а в
> истории у него внезапно $59.99. Поэтому цена, название и картинка копируются
> в `OrderItem` при оформлении и больше никогда не трогаются.

**Библиотека (Library)** — результат. После оплаты запись `(UserId, GameId)`
означает «игра куплена и доступна». Хранить это отдельно от заказов удобно:
проверка «куплено ли?» — это один запрос по составному ключу, а не обход всех
заказов со статусами.

### Жизненный цикл

```text
                  POST /api/cart/items
  [витрина] ────────────────────────────►  CartItem   (черновик, цена живая)
                                                │
                                                │ POST /api/orders
                                                ▼
                                    Order status=Pending   (цены зафиксированы,
                                                │           корзина очищена)
                                                │ POST /api/orders/{id}/pay
                                                ▼
                                    Order status=Paid  ──►  LibraryItem
```

Статус `Pending` нужен не «для красоты». В реальном магазине между «оформил» и
«оплатил» стоит платёжный провайдер (ЮKassa, Stripe): вы создаёте заказ, отдаёте
пользователя на страницу оплаты, а провайдер потом присылает webhook. Наш
`POST /api/orders/{id}/pay` — это заглушка ровно в том месте, куда потом встанет
обработчик webhook. Архитектура не изменится, поменяется только тело метода.

### Почему без Quantity

В классическом интернет-магазине у позиции корзины есть `Quantity` — можно взять
три футболки. Цифровая игра покупается один раз: вторая копия того же ключа
бессмысленна. Поэтому:

* у `CartItem` нет количества;
* пара `(UserId, GameId)` уникальна — защищается индексом в БД, а не только
  проверкой в коде;
* повторное добавление той же игры не ошибка, а **идемпотентная** операция:
  корзина уже в нужном состоянии, просто возвращаем её.

Если вы позже добавите подарочные копии — вернёте `Quantity` в `CartItem` и
`OrderItem`, а `LibraryItem` останется без изменений.

### Кто считает деньги

Итог (`Total`) считает **только сервер**. Фронт показывает сумму, которую ему
прислали, и никогда не отправляет цену на сервер. Иначе достаточно открыть
DevTools и купить любую игру за $0.01. Правило простое: **с клиента приходят
только идентификаторы намерения** (`gameId`), всё остальное сервер достаёт сам.

---

## Шаг 1. Модели данных

Создаём четыре файла в `api/Models/`.

### `api/Models/CartItem.cs`

```csharp
namespace api.Models;

public class CartItem
{
  public int Id { get; set; }

  public int UserId { get; set; }
  public User User { get; set; } = null!;

  public int GameId { get; set; }
  public Game Game { get; set; } = null!;

  // Нужно, чтобы показывать корзину в порядке "последнее добавленное — сверху".
  public DateTime AddedAtUtc { get; set; }
}
```

Обратите внимание: ни цены, ни названия. Корзина — это только ссылки.

### `api/Models/Order.cs`

```csharp
namespace api.Models;

public enum OrderStatus
{
  Pending = 0,   // создан, ждёт оплаты
  Paid = 1,      // оплачен, игры выданы
  Cancelled = 2  // отменён
}

public class Order
{
  public int Id { get; set; }

  // Человекочитаемый номер вида PH-20260917-00042: его можно назвать в поддержке.
  public string Number { get; set; } = string.Empty;

  public int UserId { get; set; }
  public User User { get; set; } = null!;

  public OrderStatus Status { get; set; } = OrderStatus.Pending;

  // Сумма на момент оформления. Считается сервером как сумма UnitPrice позиций.
  public decimal Total { get; set; }

  public DateTime CreatedAtUtc { get; set; }
  public DateTime? PaidAtUtc { get; set; }

  public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}
```

### `api/Models/OrderItem.cs`

```csharp
namespace api.Models;

public class OrderItem
{
  public int Id { get; set; }

  public int OrderId { get; set; }
  public Order Order { get; set; } = null!;

  // Ссылку на игру оставляем — по ней выдаём игру в библиотеку.
  public int GameId { get; set; }
  public Game Game { get; set; } = null!;

  // --- Снимок данных на момент покупки. После создания не меняется никогда. ---
  public string Title { get; set; } = string.Empty;
  public string Image { get; set; } = string.Empty;
  public decimal UnitPrice { get; set; }
}
```

### `api/Models/LibraryItem.cs`

```csharp
namespace api.Models;

public class LibraryItem
{
  // Первичный ключ составной: (UserId, GameId). Отдельный Id не нужен —
  // одна и та же игра не может быть куплена пользователем дважды.
  public int UserId { get; set; }
  public User User { get; set; } = null!;

  public int GameId { get; set; }
  public Game Game { get; set; } = null!;

  // Из какого заказа приехала игра — пригодится для поддержки и возвратов.
  public int OrderId { get; set; }
  public Order Order { get; set; } = null!;

  public DateTime PurchasedAtUtc { get; set; }
}
```

> **Про `= null!`.** В проекте включены nullable reference types. Навигационные
> свойства заполняет EF Core, а не конструктор, поэтому `null!` — способ сказать
> компилятору «я знаю, что здесь будет объект». В существующих моделях проекта
> местами стоит `= null` — намерение то же, но компилятор выдаёт предупреждение
> CS8625; в новом коде лучше писать с `!`.

---

## Шаг 2. Регистрация в AppDbContext

Открываем `api/Data/AppDbContext.cs` и добавляем наборы и конфигурацию связей.

```csharp
public DbSet<Game> Games => Set<Game>();
public DbSet<Tag> Tags => Set<Tag>();
public DbSet<GameTag> GameTags => Set<GameTag>();
public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
public DbSet<User> Users => Set<User>();

// --- новое ---
public DbSet<CartItem> CartItems => Set<CartItem>();
public DbSet<Order> Orders => Set<Order>();
public DbSet<OrderItem> OrderItems => Set<OrderItem>();
public DbSet<LibraryItem> LibraryItems => Set<LibraryItem>();
```

Внутри `OnModelCreating`, после существующих настроек:

```csharp
modelBuilder.Entity<CartItem>(cart =>
{
  // Главная защита от дублей — на уровне БД, а не только в if-е контроллера.
  cart.HasIndex(item => new { item.UserId, item.GameId }).IsUnique();

  cart.HasOne(item => item.User)
    .WithMany()
    .HasForeignKey(item => item.UserId)
    .OnDelete(DeleteBehavior.Cascade);

  cart.HasOne(item => item.Game)
    .WithMany()
    .HasForeignKey(item => item.GameId)
    .OnDelete(DeleteBehavior.Cascade); // игру удалили — она пропадает из корзин
});

modelBuilder.Entity<Order>(order =>
{
  order.Property(o => o.Number).HasMaxLength(40);
  order.HasIndex(o => o.Number).IsUnique();

  // Часто спрашиваем "все заказы пользователя, свежие сверху".
  order.HasIndex(o => new { o.UserId, o.CreatedAtUtc });

  order.HasOne(o => o.User)
    .WithMany()
    .HasForeignKey(o => o.UserId)
    .OnDelete(DeleteBehavior.Cascade);
});

modelBuilder.Entity<OrderItem>(item =>
{
  item.Property(i => i.Title).HasMaxLength(200);

  item.HasOne(i => i.Order)
    .WithMany(order => order.Items)
    .HasForeignKey(i => i.OrderId)
    .OnDelete(DeleteBehavior.Cascade); // удалили заказ — удалились его позиции

  item.HasOne(i => i.Game)
    .WithMany()
    .HasForeignKey(i => i.GameId)
    .OnDelete(DeleteBehavior.Restrict); // а игру нельзя удалить, если она продана
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
    .OnDelete(DeleteBehavior.Restrict);

  library.HasOne(item => item.Order)
    .WithMany()
    .HasForeignKey(item => item.OrderId)
    .OnDelete(DeleteBehavior.Restrict);
});
```

### Теория: `WithMany()` без аргумента

`cart.HasOne(item => item.User).WithMany()` — навигация односторонняя. У
`CartItem` есть ссылка на `User`, а у `User` **нет** коллекции `CartItems`.
Так сделано специально: иначе появляется соблазн написать
`user.CartItems.Add(...)`, а это тянет за собой загрузку всей коллекции.
Работать с корзиной через `_db.CartItems` явно — быстрее и понятнее.

### Теория: почему `Restrict`, а не `Cascade`

`DeleteBehavior.Cascade` на `OrderItem → Game` означал бы: «удалили игру из
каталога — исчезли строки из чеков». Чек перестал бы сходиться по сумме.
`Restrict` запрещает удалять проданную игру — и это то поведение, которое вам
нужно. Если игру всё же нужно убрать с витрины, добавляйте флаг
`Game.IsHidden`, а не `DELETE`.

### Теория: decimal в SQLite

SQLite не имеет типа `decimal` — EF Core хранит его как `TEXT`, чтобы не терять
точность. Сложение и сравнение в C# при этом корректны, а вот `ORDER BY Price`
на стороне SQL сортировал бы строки лексикографически. Поэтому в проекте
сортировка уже сделана на клиенте (`sortGames` в `src/lib/games-filters.ts`), и
наши `Total`/`UnitPrice` мы тоже только складываем в памяти. Для боевого
магазина деньги обычно хранят целыми в центах (`long PriceCents`) — исчезает и
вопрос округления, и вопрос типа колонки.

---

## Шаг 3. Миграция

```powershell
# один раз, если инструмента ещё нет
dotnet tool install --global dotnet-ef

dotnet ef migrations add AddCartAndOrders --project api
dotnet ef database update --project api
```

Что произойдёт: EF сравнит текущие модели со снапшотом
`api/Migrations/AppDbContextModelSnapshot.cs` и сгенерирует файл миграции с
`CreateTable` для четырёх таблиц и `CreateIndex` для уникальных индексов.
**Откройте сгенерированный файл и прочитайте его** — там должно быть ровно то,
что вы задумали, без неожиданных `DropColumn`.

> `Program.cs` сейчас при старте вызывает только `DbSeeder.SeedAsync`, но не
> `Database.MigrateAsync()`. Значит, `dotnet ef database update` нужно запускать
> руками. Если хотите применять миграции автоматически при запуске, добавьте в
> `Program.cs` внутри существующего `using (var scope = ...)` строку
> `await context.Database.MigrateAsync();` **перед** сидером.

---

## Шаг 4. DTO — контракт с фронтом

Сущности БД наружу не отдаём. Причины: в `User` лежит `PasswordHash`, а
навигационные свойства (`Order.User.RefreshTokens`) при сериализации дают
циклические ссылки и утечку лишних данных. DTO — это явный, плоский контракт.

### `api/DTOs/CartDto.cs`

```csharp
namespace api.DTOs;

public class CartItemDto
{
  public int GameId { get; set; }
  public string Title { get; set; } = string.Empty;
  public string Image { get; set; } = string.Empty;
  public decimal Price { get; set; }
  public decimal? OldPrice { get; set; }
  public int? Discount { get; set; }
}

public class CartDto
{
  public List<CartItemDto> Items { get; set; } = new();
  public decimal Total { get; set; }
}
```

### `api/DTOs/AddToCartRequest.cs`

```csharp
using System.ComponentModel.DataAnnotations;

namespace api.DTOs;

public class AddToCartRequest
{
  [Range(1, int.MaxValue, ErrorMessage = "Некорректный идентификатор игры")]
  public int GameId { get; set; }
}
```

Благодаря атрибуту `[ApiController]` проверка `[Range]` выполняется
автоматически: при `gameId = 0` вернётся `400` с телом `ValidationProblemDetails`
— а его уже умеет разбирать `toApiError` в [src/lib/api.ts](../src/lib/api.ts),
раскладывая сообщения по `fieldErrors`.

### `api/DTOs/OrderDto.cs`

```csharp
namespace api.DTOs;

public class OrderItemDto
{
  public int GameId { get; set; }
  public string Title { get; set; } = string.Empty;
  public string Image { get; set; } = string.Empty;
  public decimal UnitPrice { get; set; }
}

public class OrderDto
{
  public int Id { get; set; }
  public string Number { get; set; } = string.Empty;

  // Строка, а не число: "Paid" читается в DevTools лучше, чем 1,
  // и фронт не сломается, если завтра в enum вставят значение в середину.
  public string Status { get; set; } = string.Empty;

  public decimal Total { get; set; }
  public DateTime CreatedAtUtc { get; set; }
  public DateTime? PaidAtUtc { get; set; }
  public List<OrderItemDto> Items { get; set; } = new();
}
```

---

## Шаг 5. Помощник: id текущего пользователя

В `ProfileController` этот код уже есть в виде приватного метода. Нам он нужен
в трёх контроллерах — выносим в расширение.

### `api/Extensions/ClaimsPrincipalExtensions.cs`

```csharp
using System.Security.Claims;

namespace api.Extensions;

public static class ClaimsPrincipalExtensions
{
  /// <summary>Id пользователя из access-токена или null, если токена нет.</summary>
  public static int? GetUserId(this ClaimsPrincipal principal)
  {
    var value = principal.FindFirstValue(ClaimTypes.NameIdentifier);

    return int.TryParse(value, out var userId) ? userId : null;
  }
}
```

**Теория.** `JwtTokenService.CreateAccessToken` кладёт id пользователя в клейм
`ClaimTypes.NameIdentifier` (и дополнительно в `sub`). После успешной проверки
подписи middleware `UseAuthentication()` собирает из токена `ClaimsPrincipal` и
кладёт его в `HttpContext.User` — то самое свойство `User`, которое доступно в
контроллере. Никаких запросов к БД для этого не нужно: id уже внутри подписанного
токена, подделать его нельзя, не зная ключ.

Важно: `[Authorize]` гарантирует, что токен валиден, но не гарантирует, что в
нём есть нужный клейм, — поэтому `GetUserId()` возвращает `int?`, и каждый метод
контроллера явно обрабатывает `null` через `Unauthorized()`.

---

## Шаг 6. CartController

### `api/Controllers/CartController.cs`

```csharp
using api.Data;
using api.DTOs;
using api.Extensions;
using api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Authorize]
[Route("api/cart")]
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
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        return Ok(await BuildCartAsync(userId.Value));
    }

    [HttpPost("items")]
    public async Task<ActionResult<CartDto>> AddItem(AddToCartRequest request)
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        var gameExists = await _db.Games.AnyAsync(game => game.Id == request.GameId);

        if (!gameExists)
        {
            return NotFound(new
            {
                message = "Игра не найдена"
            });
        }

        var isOwned = await _db.LibraryItems
            .AnyAsync(item => item.UserId == userId.Value && item.GameId == request.GameId);

        if (isOwned)
        {
            return Conflict(new
            {
                message = "Эта игра уже есть в вашей библиотеке"
            });
        }

        var alreadyInCart = await _db.CartItems
            .AnyAsync(item => item.UserId == userId.Value && item.GameId == request.GameId);

        if (!alreadyInCart)
        {
            _db.CartItems.Add(new CartItem
            {
                UserId = userId.Value,
                GameId = request.GameId,
                AddedAtUtc = DateTime.UtcNow
            });

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // Два параллельных клика по одной игре: уникальный индекс не дал
                // создать дубль. Для пользователя результат тот же — игра в корзине.
                _db.ChangeTracker.Clear();
            }
        }

        return Ok(await BuildCartAsync(userId.Value));
    }

    [HttpDelete("items/{gameId:int}")]
    public async Task<ActionResult<CartDto>> RemoveItem(int gameId)
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        var item = await _db.CartItems
            .SingleOrDefaultAsync(item => item.UserId == userId.Value && item.GameId == gameId);

        // Удаление того, чего нет, — не ошибка: состояние уже такое, как просили.
        if (item != null)
        {
            _db.CartItems.Remove(item);
            await _db.SaveChangesAsync();
        }

        return Ok(await BuildCartAsync(userId.Value));
    }

    [HttpDelete]
    public async Task<ActionResult<CartDto>> Clear()
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        var items = await _db.CartItems
            .Where(item => item.UserId == userId.Value)
            .ToListAsync();

        if (items.Count > 0)
        {
            _db.CartItems.RemoveRange(items);
            await _db.SaveChangesAsync();
        }

        return Ok(await BuildCartAsync(userId.Value));
    }

    /// <summary>Собирает корзину с АКТУАЛЬНЫМИ ценами из каталога.</summary>
    private async Task<CartDto> BuildCartAsync(int userId)
    {
        var items = await _db.CartItems
            .Where(item => item.UserId == userId)
            .OrderByDescending(item => item.AddedAtUtc)
            .Select(item => new CartItemDto
            {
                GameId = item.GameId,
                Title = item.Game.Title,
                Image = item.Game.Image,
                Price = item.Game.Price,
                OldPrice = item.Game.OldPrice,
                Discount = item.Game.Discount
            })
            .ToListAsync();

        return new CartDto
        {
            Items = items,
            Total = items.Sum(item => item.Price)
        };
    }
}
```

### Теория: каждый метод возвращает всю корзину

Метод `AddItem` мог бы вернуть `204 No Content`, а фронт — сам добавить игру в
свой массив. Так делать не надо: у вас появятся два независимых представления
корзины (в БД и в состоянии React), и они разъедутся при первой же ошибке сети
или при открытой второй вкладке.

Приём называется **server-driven state**: сервер после каждой мутации отдаёт
новое полное состояние ресурса, фронт просто присваивает его в `state`. Один
источник правды, никакой ручной синхронизации.

### Теория: проекция `Select` вместо `Include`

```csharp
.Select(item => new CartItemDto { Title = item.Game.Title, ... })
```

EF Core транслирует это в один SQL-запрос с `JOIN`, который вытащит **только
шесть колонок**, а не все поля `CartItems` и `Games`. Сравните с
`Include(item => item.Game)`: там загружаются полные сущности, они попадают в
ChangeTracker, и на большой корзине это лишняя работа. Правило: для чтения —
`Select` в DTO, для изменения — загрузка сущностей.

### Теория: почему «тихо» ловим `DbUpdateException`

Проверка `alreadyInCart` — это TOCTOU-паттерн (time-of-check to time-of-use):
между `AnyAsync` и `SaveChangesAsync` проходит время, и параллельный запрос
может успеть вставить ту же строку. Единственная настоящая гарантия — уникальный
индекс в БД. Он бросит `DbUpdateException`, и это не ошибка пользователя:
результат, которого он хотел, достигнут. `ChangeTracker.Clear()` нужен, чтобы
«застрявшая» неудачная вставка не попыталась сохраниться повторно.

---

## Шаг 7. OrdersController — оформление и оплата

### `api/Controllers/OrdersController.cs`

```csharp
using api.Data;
using api.DTOs;
using api.Extensions;
using api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Authorize]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _db;

    public OrdersController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>Оформление: корзина превращается в заказ со снимком цен.</summary>
    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create()
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        var cartItems = await _db.CartItems
            .Include(item => item.Game)
            .Where(item => item.UserId == userId.Value)
            .ToListAsync();

        if (cartItems.Count == 0)
        {
            return BadRequest(new
            {
                message = "Корзина пуста"
            });
        }

        var gameIds = cartItems.Select(item => item.GameId).ToList();

        var ownedTitles = await _db.LibraryItems
            .Where(item => item.UserId == userId.Value && gameIds.Contains(item.GameId))
            .Select(item => item.Game.Title)
            .ToListAsync();

        if (ownedTitles.Count > 0)
        {
            return Conflict(new
            {
                message = $"Уже в библиотеке: {string.Join(", ", ownedTitles)}"
            });
        }

        await using var transaction = await _db.Database.BeginTransactionAsync();

        var order = new Order
        {
            UserId = userId.Value,
            Status = OrderStatus.Pending,
            CreatedAtUtc = DateTime.UtcNow,
            // Временный уникальный номер: настоящий строится из Id, а Id мы
            // узнаем только после вставки. Пустая строка не подошла бы —
            // на Number висит уникальный индекс.
            Number = Guid.NewGuid().ToString("N")
        };

        foreach (var cartItem in cartItems)
        {
            order.Items.Add(new OrderItem
            {
                GameId = cartItem.GameId,
                Title = cartItem.Game.Title,
                Image = cartItem.Game.Image,
                UnitPrice = cartItem.Game.Price
            });
        }

        order.Total = order.Items.Sum(item => item.UnitPrice);

        _db.Orders.Add(order);
        _db.CartItems.RemoveRange(cartItems);

        await _db.SaveChangesAsync();

        order.Number = $"PH-{order.CreatedAtUtc:yyyyMMdd}-{order.Id:D5}";
        await _db.SaveChangesAsync();

        await transaction.CommitAsync();

        return Ok(ToDto(order));
    }

    /// <summary>Имитация оплаты. Здесь же выдаём игры в библиотеку.</summary>
    [HttpPost("{id:int}/pay")]
    public async Task<ActionResult<OrderDto>> Pay(int id)
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        var order = await _db.Orders
            .Include(o => o.Items)
            .SingleOrDefaultAsync(o => o.Id == id && o.UserId == userId.Value);

        if (order == null)
        {
            return NotFound(new
            {
                message = "Заказ не найден"
            });
        }

        // Идемпотентность: повторный вызов не должен выдавать игры дважды.
        if (order.Status == OrderStatus.Paid)
        {
            return Ok(ToDto(order));
        }

        if (order.Status == OrderStatus.Cancelled)
        {
            return Conflict(new
            {
                message = "Заказ отменён"
            });
        }

        await using var transaction = await _db.Database.BeginTransactionAsync();

        var ownedIds = await _db.LibraryItems
            .Where(item => item.UserId == order.UserId)
            .Select(item => item.GameId)
            .ToListAsync();

        foreach (var item in order.Items.Where(item => !ownedIds.Contains(item.GameId)))
        {
            _db.LibraryItems.Add(new LibraryItem
            {
                UserId = order.UserId,
                GameId = item.GameId,
                OrderId = order.Id,
                PurchasedAtUtc = DateTime.UtcNow
            });
        }

        order.Status = OrderStatus.Paid;
        order.PaidAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(ToDto(order));
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<OrderDto>> Cancel(int id)
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        var order = await _db.Orders
            .Include(o => o.Items)
            .SingleOrDefaultAsync(o => o.Id == id && o.UserId == userId.Value);

        if (order == null)
        {
            return NotFound(new
            {
                message = "Заказ не найден"
            });
        }

        if (order.Status != OrderStatus.Pending)
        {
            return Conflict(new
            {
                message = "Отменить можно только неоплаченный заказ"
            });
        }

        order.Status = OrderStatus.Cancelled;
        await _db.SaveChangesAsync();

        return Ok(ToDto(order));
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetOrders()
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        var orders = await _db.Orders
            .Include(order => order.Items)
            .Where(order => order.UserId == userId.Value)
            .OrderByDescending(order => order.CreatedAtUtc)
            .AsNoTracking()
            .ToListAsync();

        return Ok(orders.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderDto>> GetOrder(int id)
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        var order = await _db.Orders
            .Include(o => o.Items)
            .AsNoTracking()
            // Проверка владельца прямо в Where: чужой заказ даст 404, а не 403,
            // чтобы нельзя было перебором узнать, какие Id вообще существуют.
            .SingleOrDefaultAsync(o => o.Id == id && o.UserId == userId.Value);

        if (order == null)
        {
            return NotFound(new
            {
                message = "Заказ не найден"
            });
        }

        return Ok(ToDto(order));
    }

    private static OrderDto ToDto(Order order)
    {
        return new OrderDto
        {
            Id = order.Id,
            Number = order.Number,
            Status = order.Status.ToString(),
            Total = order.Total,
            CreatedAtUtc = DateTime.SpecifyKind(order.CreatedAtUtc, DateTimeKind.Utc),
            PaidAtUtc = order.PaidAtUtc is { } paidAt
                ? DateTime.SpecifyKind(paidAt, DateTimeKind.Utc)
                : null,
            Items = order.Items.Select(item => new OrderItemDto
            {
                GameId = item.GameId,
                Title = item.Title,
                Image = item.Image,
                UnitPrice = item.UnitPrice
            }).ToList()
        };
    }
}
```

### Теория: зачем транзакция

Оформление состоит из трёх операций: создать `Order`, создать `OrderItem`-ы,
удалить `CartItem`-ы. Если между ними упадёт процесс, возможны состояния
«заказ есть, корзина не очищена» или наоборот. Транзакция делает их **атомарными**:
либо применяется всё, либо ничего.

Формально при **одном** вызове `SaveChangesAsync` EF уже оборачивает изменения в
транзакцию сам. Но у нас два вызова (второй — чтобы записать номер, собранный из
сгенерированного `Id`), и в `Pay` тоже несколько шагов. Явная транзакция делает
границу атомарности видимой в коде и не сломается, когда вы добавите четвёртый шаг.

`await using` гарантирует `Rollback` при исключении: если `CommitAsync` не был
вызван, `DisposeAsync` откатывает транзакцию.

### Теория: `DateTime.SpecifyKind(..., Utc)`

SQLite не хранит информацию о часовом поясе. При чтении EF возвращает `DateTime`
с `Kind = Unspecified`, и `System.Text.Json` сериализует его **без суффикса `Z`**:
`"2026-09-17T10:15:00"`. Браузерный `new Date(...)` такую строку трактует как
местное время — и пользователь видит время со сдвигом на свой часовой пояс.
`SpecifyKind` возвращает суффикс `Z` в JSON. Тот же приём уже применён в
[api/Controllers/ProfileController.cs](../api/Controllers/ProfileController.cs)
для `CreatedAtUtc`.

### Теория: идемпотентность оплаты

Пользователь дважды кликнул «Оплатить», или платёжный провайдер прислал webhook
дважды (это нормальная практика — они повторяют доставку, пока не получат 200).
Если бы `Pay` просто добавлял записи в библиотеку, получили бы дубли или падение
по первичному ключу. Поэтому первое, что делает метод, — проверяет статус: уже
`Paid` → просто отдаём текущее состояние с кодом 200.

Для боевого варианта добавляют заголовок `Idempotency-Key`: клиент генерирует
GUID, сервер хранит его вместе с ответом и при повторе с тем же ключом возвращает
сохранённый ответ, не выполняя операцию заново.

### Куда встраивается реальная оплата

```text
POST /api/orders          → создаём Pending, возвращаем фронту id и сумму
POST /api/payments/create → просим у провайдера ссылку на оплату
                            (фронт делает redirect)
POST /api/payments/webhook → провайдер зовёт нас: "заказ N оплачен"
                             ├ проверяем подпись запроса
                             └ делаем ровно то, что сейчас делает Pay()
```

Тело метода `Pay` перенесётся в обработчик webhook почти без изменений — вот
ради чего мы разделили «создание» и «оплату» с самого начала.

---

## Шаг 8. LibraryController

Фронту нужно знать, какие игры уже куплены, чтобы вместо «В корзину» показать
«В библиотеке».

### `api/Controllers/LibraryController.cs`

```csharp
using api.Data;
using api.DTOs;
using api.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Authorize]
[Route("api/library")]
public class LibraryController : ControllerBase
{
    private readonly AppDbContext _db;

    public LibraryController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<GameDto>>> GetLibrary()
    {
        var userId = User.GetUserId();

        if (userId == null)
        {
            return Unauthorized();
        }

        // Возвращаем тот же GameDto, что и витрина, — фронт переиспользует
        // тип Game и компонент GameCard без единой правки.
        var games = await _db.LibraryItems
            .Where(item => item.UserId == userId.Value)
            .OrderByDescending(item => item.PurchasedAtUtc)
            .Select(item => new GameDto
            {
                Id = item.Game.Id,
                Title = item.Game.Title,
                Image = item.Game.Image,
                Price = item.Game.Price,
                OldPrice = item.Game.OldPrice,
                Discount = item.Game.Discount,
                Tags = item.Game.GameTags.Select(gameTag => gameTag.Tag.Name).ToList()
            })
            .ToListAsync();

        return Ok(games);
    }
}
```

---

## Шаг 9. Проверяем API руками

Прежде чем писать фронт, убедитесь, что бекенд работает. PowerShell:

```powershell
$api = "http://localhost:5120"

# 1. Логинимся и забираем access-токен
$auth = Invoke-RestMethod "$api/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"test@test.ru","password":"123456"}'
$headers = @{ Authorization = "Bearer $($auth.accessToken)" }

# 2. Кладём игру в корзину
Invoke-RestMethod "$api/api/cart/items" -Method Post -Headers $headers -ContentType "application/json" -Body '{"gameId":1}'

# 3. Смотрим корзину
Invoke-RestMethod "$api/api/cart" -Headers $headers | ConvertTo-Json -Depth 5

# 4. Оформляем заказ
$order = Invoke-RestMethod "$api/api/orders" -Method Post -Headers $headers
$order

# 5. Оплачиваем
Invoke-RestMethod "$api/api/orders/$($order.id)/pay" -Method Post -Headers $headers

# 6. Библиотека и история
Invoke-RestMethod "$api/api/library" -Headers $headers | ConvertTo-Json -Depth 5
Invoke-RestMethod "$api/api/orders"  -Headers $headers | ConvertTo-Json -Depth 5
```

Что обязательно проверить:

| Сценарий | Ожидаемый ответ |
| --- | --- |
| Добавить ту же игру дважды | `200`, в корзине одна позиция |
| Добавить `gameId: 999999` | `404` «Игра не найдена» |
| Оформить пустую корзину | `400` «Корзина пуста» |
| После оформления запросить `/api/cart` | пустая корзина, `total: 0` |
| Оплатить один заказ дважды | `200` оба раза, в библиотеке одна копия |
| Купить уже купленную игру | `409` «уже есть в вашей библиотеке» |
| Запрос без заголовка `Authorization` | `401` |

---

## Шаг 10. Типы на фронте

### `src/types/cart.ts`

```ts
export type CartItem = {
  gameId: number;
  title: string;
  image: string;
  price: number;
  oldPrice: number | null;
  discount: number | null;
};

export type Cart = {
  items: CartItem[];
  total: number;
};

// Состояние "корзина пуста": используем и до загрузки, и для гостя.
export const EMPTY_CART: Cart = { items: [], total: 0 };
```

### `src/types/order.ts`

```ts
export type OrderStatus = "Pending" | "Paid" | "Cancelled";

export type OrderItem = {
  gameId: number;
  title: string;
  image: string;
  unitPrice: number;
};

export type Order = {
  id: number;
  number: string;
  status: OrderStatus;
  total: number;
  createdAtUtc: string;
  paidAtUtc: string | null;
  items: OrderItem[];
};

// Подписи статусов в одном месте — чтобы не размазывать их по компонентам.
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  Pending: "Ожидает оплаты",
  Paid: "Оплачен",
  Cancelled: "Отменён",
};
```

> `decimal` на бекенде превращается в обычный `number` в JSON. Для цен до сотен
> долларов точности `double` хватает с огромным запасом, но складывать деньги
> на клиенте всё равно не нужно — `total` приходит с сервера.

### `src/lib/format.ts`

```ts
/** Цена в едином виде: $47.99. */
export function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}
```

---

## Шаг 11. Сервисы

Сервисы — тонкий слой поверх `apiRequest`. Он уже умеет подставлять
`Authorization`, обновлять протухший access-токен через refresh и превращать
ответы об ошибках в `ApiError` с `fieldErrors` — см.
[src/lib/api.ts](../src/lib/api.ts).

### `src/services/cart.ts`

```ts
import { apiRequest } from "@/lib/api";
import type { Cart } from "@/types/cart";

// Каждый метод возвращает АКТУАЛЬНУЮ корзину целиком — фронт её не пересобирает.
export const CART_SERVICE = {
  get: () => apiRequest<Cart>("/api/cart"),

  add: (gameId: number) =>
    apiRequest<Cart>("/api/cart/items", { method: "POST", body: { gameId } }),

  remove: (gameId: number) =>
    apiRequest<Cart>(`/api/cart/items/${gameId}`, { method: "DELETE" }),

  clear: () => apiRequest<Cart>("/api/cart", { method: "DELETE" }),
};
```

### `src/services/orders.ts`

```ts
import { apiRequest } from "@/lib/api";
import type { Game } from "@/types/game";
import type { Order } from "@/types/order";

export const ORDERS_SERVICE = {
  create: () => apiRequest<Order>("/api/orders", { method: "POST" }),

  pay: (orderId: number) =>
    apiRequest<Order>(`/api/orders/${orderId}/pay`, { method: "POST" }),

  cancel: (orderId: number) =>
    apiRequest<Order>(`/api/orders/${orderId}/cancel`, { method: "POST" }),

  list: () => apiRequest<Order[]>("/api/orders"),

  library: () => apiRequest<Game[]>("/api/library"),
};
```

Сравните с `src/services/games.ts`, где `fetch` вызывается напрямую с
захардкоженным URL: новый код весь ходит через `apiRequest`, поэтому получает
авторизацию и обработку ошибок бесплатно. Старый сервис игр имеет смысл
переписать так же:

```ts
import { apiRequest } from "@/lib/api";
import type { Game } from "@/types/game";

export const GAMES_SERVICE = {
  // Каталог публичный: auth: false, чтобы гость не ловил лишний 401.
  get: () => apiRequest<Game[]>("/api/games", { auth: false }),
};
```

---

## Шаг 12. Контекст корзины

Корзина нужна сразу в нескольких местах дерева: в счётчике хедера, на каждой
карточке игры, на странице корзины. Прокидывать её пропсами через все уровни —
это prop drilling. Поэтому — React Context.

**Почему не такой же store, как `auth-storage.ts`?** Токены живут в
`localStorage`, вне React, и их читает даже не-React код (`apiRequest`) — там
`useSyncExternalStore` оправдан. Корзина же живёт на сервере, её состояние
асинхронное (загрузка, ошибка, «этот товар сейчас добавляется») — обычный
`useState` внутри провайдера подходит лучше.

### `src/lib/cart-context.ts`

```ts
import { createContext, useContext } from "react";
import type { Cart } from "@/types/cart";

export type CartContextValue = {
  cart: Cart;
  count: number;
  isLoading: boolean;
  error: string | null;
  /** Id игр, уже купленных пользователем. */
  ownedIds: Set<number>;
  /** Id игр, по которым прямо сейчас летит запрос: блокируем их кнопки. */
  pendingIds: Set<number>;
  add: (gameId: number) => Promise<void>;
  remove: (gameId: number) => Promise<void>;
  clear: () => Promise<void>;
  /** Перечитать корзину и библиотеку с сервера (после оплаты). */
  refresh: () => Promise<void>;
};

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const value = useContext(CartContext);

  // null означает, что компонент отрисован вне <CartProvider>.
  // Явная ошибка лучше, чем "Cannot read properties of null" где-то в JSX.
  if (!value) {
    throw new Error("useCart нужно вызывать внутри <CartProvider>");
  }

  return value;
}
```

> Контекст и хук лежат в `.ts`-файле, а провайдер — отдельно в `.tsx`. Это не
> прихоть: в проекте включён `eslint-plugin-react-refresh`, который ругается,
> когда из файла с компонентом экспортируется что-то ещё — иначе ломается
> горячая перезагрузка.

### `src/components/blocks/cart/cart-provider.tsx`

```tsx
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { getErrorMessage } from "@/lib/api";
import { CartContext } from "@/lib/cart-context";
import { CART_SERVICE } from "@/services/cart";
import { ORDERS_SERVICE } from "@/services/orders";
import { EMPTY_CART, type Cart } from "@/types/cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();

  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [ownedIds, setOwnedIds] = useState<Set<number>>(() => new Set());
  const [pendingIds, setPendingIds] = useState<Set<number>>(() => new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Два независимых запроса — пускаем параллельно, а не по очереди.
      const [nextCart, library] = await Promise.all([
        CART_SERVICE.get(),
        ORDERS_SERVICE.library(),
      ]);

      setCart(nextCart);
      setOwnedIds(new Set(library.map((game) => game.id)));
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, "Не удалось загрузить корзину"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Вошли — грузим корзину, вышли — забываем её.
  useEffect(() => {
    if (!isAuthenticated) {
      setCart(EMPTY_CART);
      setOwnedIds(new Set());
      setError(null);
      return;
    }

    void refresh();
  }, [isAuthenticated, refresh]);

  /** Общая обёртка: помечаем игру как "в процессе", ловим ошибку, снимаем метку. */
  const run = useCallback(async (gameId: number, action: () => Promise<Cart>) => {
    setPendingIds((previous) => new Set(previous).add(gameId));
    setError(null);

    try {
      setCart(await action());
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, "Не удалось изменить корзину"));
    } finally {
      setPendingIds((previous) => {
        const next = new Set(previous);
        next.delete(gameId);
        return next;
      });
    }
  }, []);

  const add = useCallback(
    (gameId: number) => run(gameId, () => CART_SERVICE.add(gameId)),
    [run]
  );

  const remove = useCallback(
    (gameId: number) => run(gameId, () => CART_SERVICE.remove(gameId)),
    [run]
  );

  const clear = useCallback(async () => {
    setError(null);

    try {
      setCart(await CART_SERVICE.clear());
    } catch (clearError: unknown) {
      setError(getErrorMessage(clearError, "Не удалось очистить корзину"));
    }
  }, []);

  // Без useMemo объект value пересоздавался бы на каждый рендер провайдера
  // и заставлял перерисовываться всех потребителей контекста.
  const value = useMemo(
    () => ({
      cart,
      count: cart.items.length,
      isLoading,
      error,
      ownedIds,
      pendingIds,
      add,
      remove,
      clear,
      refresh,
    }),
    [cart, isLoading, error, ownedIds, pendingIds, add, remove, clear, refresh]
  );

  return <CartContext value={value}>{children}</CartContext>;
}
```

> `<CartContext value={...}>` — синтаксис React 19; в проекте стоит React 19.2,
> так что `.Provider` писать не нужно (он работает, но объявлен устаревшим).

### Теория: множества вместо массивов

`ownedIds` и `pendingIds` — это `Set<number>`. Проверка `ownedIds.has(id)` — O(1),
тогда как `ownedArray.includes(id)` — O(n), и вызывается она в каждой карточке
на каждый рендер. При 200 играх на витрине разница заметна.

Важная деталь: `Set` мутабельный, а React сравнивает состояние по ссылке.
Поэтому в `run` мы пишем `new Set(previous).add(gameId)`, а не
`previous.add(gameId)` — иначе ссылка не изменится и перерисовки не будет.

### Теория: почему не оптимистичное обновление

Можно было сразу добавить игру в локальный `cart.items`, не дожидаясь сервера
(оптимистично), а при ошибке откатить. Для покупки это лишний риск: пользователь
на секунду увидит товар в корзине, которого там нет. Мы выбрали честный путь —
кнопка показывает «Добавляем…», пока идёт запрос. Локальная сеть отвечает за
десятки миллисекунд, а состояние всегда совпадает с сервером.

---

## Шаг 13. Кнопка «В корзину» на карточке

Правим [src/components/blocks/game-card/index.tsx](../src/components/blocks/game-card/index.tsx).
Меняется три вещи: карточка начинает принимать `id`, использует `useCart()` и
рендерит кнопку.

```tsx
import { Check, ShoppingCart } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { ROUTE_HREF } from "@/hooks/use-hash-route";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Game } from "@/types/game";

const TAG_STYLES: Record<string, string> = {
  /* ...без изменений... */
};

type GameCardProps = Game & {
  variant?: "landscape" | "portrait";
};

export function GameCard({
  id,
  title,
  image,
  price,
  oldPrice,
  discount,
  tags,
  variant = "landscape",
}: GameCardProps) {
  const isAuthenticated = useIsAuthenticated();
  const { cart, ownedIds, pendingIds, add } = useCart();

  const isOwned = ownedIds.has(id);
  const isInCart = cart.items.some((item) => item.gameId === id);
  const isPending = pendingIds.has(id);

  return (
    <article className="flex h-full flex-col">
      {/* ...обложка и теги — как было... */}

      <div className="mt-auto flex items-center gap-1.5 pt-0.5">
        {discount ? (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
            style={{ backgroundColor: "#4a6741" }}
          >
            -{discount}%
          </span>
        ) : null}
        <span className="text-[13px] font-medium text-foreground">{formatPrice(price)}</span>
        {oldPrice ? (
          <span className="text-[11px] text-muted-foreground line-through">
            {formatPrice(oldPrice)}
          </span>
        ) : null}
      </div>

      <div className="pt-2">
        {isOwned ? (
          <Button variant="ghost" size="sm" className="w-full" disabled>
            <Check />В библиотеке
          </Button>
        ) : isInCart ? (
          // Ссылку нельзя завернуть в <Button> без render-пропа,
          // поэтому берём у кнопки только стили.
          <a
            href={ROUTE_HREF.cart}
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-full")}
          >
            <ShoppingCart />В корзине
          </a>
        ) : isAuthenticated ? (
          <Button
            size="sm"
            className="w-full"
            disabled={isPending}
            onClick={() => void add(id)}
          >
            {isPending ? "Добавляем…" : "В корзину"}
          </Button>
        ) : (
          <a
            href={ROUTE_HREF.profile}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
          >
            Войти, чтобы купить
          </a>
        )}
      </div>
    </article>
  );
}
```

В `games-list/index.tsx` ничего менять не нужно: там уже стоит
`<GameCard key={game.id} {...game} />`, то есть `id` приезжает вместе с
остальными полями.

### Теория: четыре состояния одной кнопки

Кнопка — это функция от состояния, а не место, где живёт состояние. Все четыре
ветки вычисляются из данных (`ownedIds`, `cart.items`, `pendingIds`,
`isAuthenticated`), и ни одна не хранится в `useState` карточки. Поэтому
корзина, открытая в соседней вкладке, или покупка, сделанная минуту назад,
отражаются автоматически — как только обновится контекст.

Гость видит «Войти, чтобы купить» вместо «В корзину». Технически можно было дать
ему нажать и показать ошибку 401, но предупредить заранее — вежливее. Как
сделать корзину доступной гостю по-настоящему — см.
[раздел про гостевую корзину](#дополнительно-корзина-для-гостя).

### `void add(id)`

`add` возвращает промис, а обработчик `onClick` должен возвращать `void`.
Оператор `void` явно говорит «я знаю, что здесь промис, и осознанно его не жду».
Ошибки внутри `add` уже перехвачены и попадают в `error` контекста, так что
`unhandled rejection` не возникнет.

---

## Шаг 14. Роуты и хедер со счётчиком

### `src/hooks/use-hash-route.ts`

```ts
import { useSyncExternalStore } from "react";

export type Route = "store" | "profile" | "cart" | "orders";

export const ROUTE_HREF: Record<Route, string> = {
  store: "#/",
  profile: "#/profile",
  cart: "#/cart",
  orders: "#/orders",
};

// Всё, что не совпало, считаем витриной.
const ROUTES: Route[] = ["profile", "cart", "orders"];

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function getRoute(): Route {
  const path = window.location.hash.replace(/^#\/?/, "").replace(/\/+$/, "");
  return ROUTES.find((route) => route === path) ?? "store";
}

export function useHashRoute() {
  return useSyncExternalStore(subscribe, getRoute);
}
```

### `src/components/blocks/header/index.tsx`

Добавляем иконку корзины со счётчиком справа от поиска:

```tsx
import { Search, ShoppingCart } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ROUTE_HREF, type Route } from "@/hooks/use-hash-route";
import { useCart } from "@/lib/cart-context";

const NAV: { label: string; href: string; route?: Route }[] = [
  { label: "STORE", href: ROUTE_HREF.store, route: "store" },
  { label: "LIBRARY", href: "#" },
  { label: "ORDERS", href: ROUTE_HREF.orders, route: "orders" },
  { label: "PROFILE", href: ROUTE_HREF.profile, route: "profile" },
];

type HeaderProps = {
  route: Route;
  search?: string;
  onSearchChange?: (search: string) => void;
};

export function Header({ route, search = "", onSearchChange }: HeaderProps) {
  const { count } = useCart();

  return (
    <header className="flex h-16 shrink-0 items-center gap-8 border-b border-border bg-background px-5">
      {/* ...логотип и NAV — как было... */}

      <div className="ml-auto flex items-center gap-3">
        {onSearchChange && (
          <InputGroup className="h-9 w-[280px] rounded-full border-transparent bg-muted">
            <InputGroupAddon>
              <Search className="size-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Поиск по названию..."
              className="text-[13px] placeholder:text-muted-foreground"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </InputGroup>
        )}

        <a
          href={ROUTE_HREF.cart}
          aria-current={route === "cart" ? "page" : undefined}
          aria-label={count > 0 ? `Корзина, товаров: ${count}` : "Корзина"}
          className="relative flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground"
        >
          <ShoppingCart className="size-4" />

          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {count}
            </span>
          )}
        </a>
      </div>
    </header>
  );
}
```

`aria-label` со счётчиком нужен потому, что цифра в бейдже визуально понятна, но
скринридер прочитает её как отдельное число без контекста.

---

## Шаг 15. Страница корзины и оформление

Страница живёт в трёх режимах: «гость», «есть корзина», «заказ оформлен».
Разбиваем на два файла, как это сделано у профиля.

### `src/components/blocks/cart/index.tsx`

```tsx
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { getErrorMessage } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";
import { ORDERS_SERVICE } from "@/services/orders";
import type { Order } from "@/types/order";
import { AuthForm } from "../auth-form";
import { OrderSummary } from "./order-summary";

const CARD_CLASS = "mt-4 rounded-xl border border-border bg-card p-6";

export function CartPage() {
  const isAuthenticated = useIsAuthenticated();
  const { cart, isLoading, error, remove, clear, pendingIds, refresh } = useCart();

  // Как только заказ создан, страница показывает его вместо корзины.
  const [order, setOrder] = useState<Order | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function checkout() {
    setIsSubmitting(true);
    setCheckoutError(null);

    try {
      const created = await ORDERS_SERVICE.create();
      setOrder(created);
      // Сервер очистил корзину — подтягиваем её новое состояние.
      await refresh();
    } catch (error: unknown) {
      setCheckoutError(getErrorMessage(error, "Не удалось оформить заказ"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      <h2 className="text-[13px] font-semibold tracking-[0.14em] text-muted-foreground">CART</h2>

      {!isAuthenticated ? (
        <AuthForm />
      ) : order ? (
        <OrderSummary
          order={order}
          onOrderChange={setOrder}
          onDone={() => setOrder(null)}
          onPaid={refresh}
        />
      ) : isLoading && cart.items.length === 0 ? (
        <div className={CARD_CLASS}>
          <p className="text-[14px] text-muted-foreground">Загружаем корзину…</p>
        </div>
      ) : cart.items.length === 0 ? (
        <div className={CARD_CLASS}>
          <p className="text-[14px] text-muted-foreground">
            Корзина пуста. Выберите игру на витрине.
          </p>
        </div>
      ) : (
        <>
          <ul className={`${CARD_CLASS} flex flex-col gap-4`}>
            {cart.items.map((item) => (
              <li key={item.gameId} className="flex items-center gap-4">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-14 w-24 shrink-0 rounded-md object-cover"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-foreground">{item.title}</p>
                  {item.discount ? (
                    <p className="text-[12px] text-muted-foreground">
                      Скидка -{item.discount}%
                    </p>
                  ) : null}
                </div>

                <span className="text-[14px] font-medium text-foreground">
                  {formatPrice(item.price)}
                </span>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Убрать ${item.title} из корзины`}
                  disabled={pendingIds.has(item.gameId)}
                  onClick={() => void remove(item.gameId)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>

          <div className={`${CARD_CLASS} flex flex-col gap-4`}>
            {(error || checkoutError) && (
              <p role="alert" className="text-[13px] text-destructive">
                {checkoutError ?? error}
              </p>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">
                Игр: {cart.items.length}
              </span>
              <span className="text-xl font-semibold text-foreground">
                {formatPrice(cart.total)}
              </span>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="lg" onClick={() => void clear()}>
                Очистить
              </Button>
              <Button size="lg" disabled={isSubmitting} onClick={() => void checkout()}>
                {isSubmitting ? "Оформляем…" : "Оформить заказ"}
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
```

### `src/components/blocks/cart/order-summary.tsx`

```tsx
import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTE_HREF } from "@/hooks/use-hash-route";
import { getErrorMessage } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { ORDERS_SERVICE } from "@/services/orders";
import { ORDER_STATUS_LABEL, type Order } from "@/types/order";

const CARD_CLASS = "mt-4 rounded-xl border border-border bg-card p-6";

type OrderSummaryProps = {
  order: Order;
  onOrderChange: (order: Order) => void;
  /** Вернуться к корзине (например, после отмены). */
  onDone: () => void;
  /** Сообщить контексту, что библиотека изменилась. */
  onPaid: () => Promise<void>;
};

export function OrderSummary({ order, onOrderChange, onDone, onPaid }: OrderSummaryProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const isPaid = order.status === "Paid";

  async function pay() {
    setIsPaying(true);
    setError(null);

    try {
      onOrderChange(await ORDERS_SERVICE.pay(order.id));
      // Игра появилась в библиотеке — обновляем ownedIds, иначе на витрине
      // всё ещё будет висеть кнопка "В корзину".
      await onPaid();
    } catch (payError: unknown) {
      setError(getErrorMessage(payError, "Не удалось оплатить заказ"));
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <div className={CARD_CLASS}>
      {isPaid ? (
        <p
          role="status"
          className="mb-5 flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-[13px] text-emerald-300"
        >
          <Check className="size-4" />
          Спасибо за покупку! Игры уже в вашей библиотеке.
        </p>
      ) : (
        <p className="mb-5 text-[13px] text-muted-foreground">
          Заказ создан и ждёт оплаты.
        </p>
      )}

      <div className="flex items-baseline justify-between">
        <p className="text-[15px] font-semibold text-foreground">Заказ {order.number}</p>
        <p className="text-[12px] text-muted-foreground">{ORDER_STATUS_LABEL[order.status]}</p>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {order.items.map((item) => (
          <li key={item.gameId} className="flex items-center justify-between gap-4">
            <span className="truncate text-[14px] text-foreground">{item.title}</span>
            <span className="text-[13px] text-muted-foreground">
              {formatPrice(item.unitPrice)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="text-[13px] text-muted-foreground">Итого</span>
        <span className="text-xl font-semibold text-foreground">{formatPrice(order.total)}</span>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-[13px] text-destructive">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        {isPaid ? (
          <>
            <Button variant="ghost" size="lg" onClick={onDone}>
              Вернуться в корзину
            </Button>
            <Button size="lg" onClick={() => (window.location.hash = ROUTE_HREF.orders)}>
              Мои заказы
            </Button>
          </>
        ) : (
          <Button size="lg" disabled={isPaying} onClick={() => void pay()}>
            {isPaying ? "Оплачиваем…" : `Оплатить ${formatPrice(order.total)}`}
          </Button>
        )}
      </div>
    </div>
  );
}
```

> Строка `window.location.hash = ROUTE_HREF.orders` — это навигация в нашем
> hash-роутинге: смена хеша порождает событие `hashchange`, на которое подписан
> `useHashRoute`, и приложение перерисовывается.

### Теория: где хранить созданный заказ

`order` лежит в состоянии `CartPage`, а не в контексте корзины. Причина: это
данные одного экрана, они не нужны ни хедеру, ни карточкам. Правило —
поднимать состояние ровно до того уровня, где оно реально нужно, и ни уровнем
выше. Контекст для всего подряд превращается в глобальную помойку и заставляет
перерисовываться половину приложения.

Минус у такого хранения один: при перезагрузке страницы экран «оплатите заказ»
исчезнет. Заказ при этом не потерян — он `Pending` и виден в истории заказов,
где его можно оплатить. Если хотите сохранять экран между перезагрузками —
кладите `id` заказа в хеш (`#/orders/12`) и грузите его через
`ORDERS_SERVICE`-метод `get`.

---

## Шаг 16. История заказов

### `src/components/blocks/orders/index.tsx`

```tsx
import { useEffect, useState } from "react";
import { useIsAuthenticated } from "@/hooks/use-auth";
import { getErrorMessage } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { formatUtcDate } from "@/lib/profile";
import { ORDERS_SERVICE } from "@/services/orders";
import { ORDER_STATUS_LABEL, type Order } from "@/types/order";
import { AuthForm } from "../auth-form";

const CARD_CLASS = "mt-4 rounded-xl border border-border bg-card p-6";

const STATUS_CLASS: Record<Order["status"], string> = {
  Pending: "bg-amber-400/15 text-amber-200",
  Paid: "bg-emerald-400/15 text-emerald-300",
  Cancelled: "bg-zinc-400/15 text-zinc-300",
};

export function OrdersPage() {
  const isAuthenticated = useIsAuthenticated();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Флаг против гонки: если компонент размонтировали, пока летел запрос,
    // setState на размонтированном компоненте нам не нужен.
    let ignore = false;

    ORDERS_SERVICE.list()
      .then((data) => {
        if (!ignore) setOrders(data);
      })
      .catch((loadError: unknown) => {
        if (!ignore) setError(getErrorMessage(loadError, "Не удалось загрузить заказы"));
      });

    return () => {
      ignore = true;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <section className="mx-auto w-full max-w-3xl">
        <AuthForm />
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      <h2 className="text-[13px] font-semibold tracking-[0.14em] text-muted-foreground">ORDERS</h2>

      {error ? (
        <div className={CARD_CLASS}>
          <p role="alert" className="text-[14px] text-destructive">
            {error}
          </p>
        </div>
      ) : orders === null ? (
        <div className={CARD_CLASS}>
          <p className="text-[14px] text-muted-foreground">Загружаем заказы…</p>
        </div>
      ) : orders.length === 0 ? (
        <div className={CARD_CLASS}>
          <p className="text-[14px] text-muted-foreground">Заказов пока нет.</p>
        </div>
      ) : (
        orders.map((order) => (
          <article key={order.id} className={CARD_CLASS}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[15px] font-semibold text-foreground">{order.number}</p>
                <p className="text-[12px] text-muted-foreground">
                  {formatUtcDate(order.createdAtUtc)}
                </p>
              </div>

              <span
                className={`rounded px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[order.status]}`}
              >
                {ORDER_STATUS_LABEL[order.status]}
              </span>
            </div>

            <ul className="mt-4 flex flex-col gap-2">
              {order.items.map((item) => (
                <li key={item.gameId} className="flex items-center gap-3">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-10 w-16 shrink-0 rounded object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                    {item.title}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    {formatPrice(item.unitPrice)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-[13px] text-muted-foreground">Итого</span>
              <span className="text-[15px] font-semibold text-foreground">
                {formatPrice(order.total)}
              </span>
            </div>
          </article>
        ))
      )}
    </section>
  );
}
```

`formatUtcDate` уже есть в `src/lib/profile.ts` — переиспользуем его, чтобы даты
во всём приложении выглядели одинаково. Если функция там завязана строго на
профиль, перенесите её в `src/lib/format.ts` рядом с `formatPrice`.

---

## Шаг 17. Сборка: App.tsx и main.tsx

### `src/main.tsx`

Провайдер оборачивает всё приложение — счётчик в хедере нужен на любой странице.

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App.tsx";
import { CartProvider } from "./components/blocks/cart/cart-provider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CartProvider>
      <App />
    </CartProvider>
  </StrictMode>
);
```

### `src/App.tsx`

Сейчас `App` содержит `if (route === "profile") return ...` с дублированием
разметки. С четырьмя роутами это разрастётся — переписываем на общий каркас.

```tsx
import { useState } from "react";
import { CartPage } from "./components/blocks/cart";
import { GamesList } from "./components/blocks/games-list";
import { Header } from "./components/blocks/header";
import { OrdersPage } from "./components/blocks/orders";
import { ProfilePage } from "./components/blocks/profile";
import { useHashRoute } from "./hooks/use-hash-route";
import { INITIAL_FILTERS, type GamesFilters } from "./types/filters";

export function App() {
  const route = useHashRoute();
  // Единственный источник правды о том, как настроена витрина.
  const [filters, setFilters] = useState<GamesFilters>(INITIAL_FILTERS);

  const isStore = route === "store";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Поиск отдаём только витрине: на остальных страницах ему нечего фильтровать. */}
      <Header
        route={route}
        search={isStore ? filters.search : undefined}
        onSearchChange={
          isStore ? (search) => setFilters({ ...filters, search }) : undefined
        }
      />

      <main className="p-6">
        {route === "profile" && <ProfilePage />}
        {route === "cart" && <CartPage />}
        {route === "orders" && <OrdersPage />}

        {isStore && (
          <>
            <h2 className="text-[13px] font-semibold tracking-[0.14em] text-muted-foreground">
              FEATURED &amp; RECOMMENDED
            </h2>

            <GamesList filters={filters} onFiltersChange={setFilters} />
          </>
        )}
      </main>
    </div>
  );
}
```

Запускаем и проверяем полный путь:

```powershell
# терминал 1
dotnet run --project api

# терминал 2
npm run dev
```

1. Открыть `http://127.0.0.1:5173`, войти в аккаунт (`#/profile`).
2. На витрине нажать «В корзину» — в хедере появляется бейдж `1`.
3. Перейти в корзину, нажать «Оформить заказ» — появляется номер `PH-...`.
4. Нажать «Оплатить» — сообщение об успехе.
5. Вернуться на витрину — у купленной игры кнопка «В библиотеке».
6. Зайти в `#/orders` — заказ в истории со статусом «Оплачен».

---

## Дополнительно: корзина для гостя

Классическая задача: человек набрал корзину, а потом решил войти. Терять её
нельзя. Схема такая:

1. Гость складывает `gameId` в `localStorage`.
2. После успешного входа фронт отправляет накопленные id одним запросом.
3. Сервер добавляет их в серверную корзину, пропуская дубли и купленное.
4. Локальный список очищается.

### Бекенд: `POST /api/cart/merge`

DTO:

```csharp
namespace api.DTOs;

public class MergeCartRequest
{
  public List<int> GameIds { get; set; } = new();
}
```

Метод в `CartController`:

```csharp
[HttpPost("merge")]
public async Task<ActionResult<CartDto>> Merge(MergeCartRequest request)
{
    var userId = User.GetUserId();

    if (userId == null)
    {
        return Unauthorized();
    }

    // Ограничение сверху: запрос приходит от клиента, ему нельзя доверять размер.
    var gameIds = request.GameIds.Distinct().Take(100).ToList();

    if (gameIds.Count == 0)
    {
        return Ok(await BuildCartAsync(userId.Value));
    }

    // Берём только те id, которые реально существуют,
    // ещё не в корзине и ещё не куплены.
    var existingIds = await _db.Games
        .Where(game => gameIds.Contains(game.Id))
        .Select(game => game.Id)
        .ToListAsync();

    var inCartIds = await _db.CartItems
        .Where(item => item.UserId == userId.Value)
        .Select(item => item.GameId)
        .ToListAsync();

    var ownedIds = await _db.LibraryItems
        .Where(item => item.UserId == userId.Value)
        .Select(item => item.GameId)
        .ToListAsync();

    var toAdd = existingIds
        .Except(inCartIds)
        .Except(ownedIds)
        .Select(gameId => new CartItem
        {
            UserId = userId.Value,
            GameId = gameId,
            AddedAtUtc = DateTime.UtcNow
        })
        .ToList();

    if (toAdd.Count > 0)
    {
        _db.CartItems.AddRange(toAdd);
        await _db.SaveChangesAsync();
    }

    return Ok(await BuildCartAsync(userId.Value));
}
```

### Фронт: `src/lib/guest-cart.ts`

```ts
const STORAGE_KEY = "playhub.cart.guest";

export const guestCart = {
  read(): number[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];

      // Данные из localStorage — это внешний ввод: их правит кто угодно.
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "number") : [];
    } catch {
      return [];
    }
  },

  add(gameId: number) {
    const ids = guestCart.read();
    if (ids.includes(gameId)) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids, gameId]));
    } catch {
      // приватный режим — переживём
    }
  },

  remove(gameId: number) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(guestCart.read().filter((id) => id !== gameId))
      );
    } catch {
      /* см. выше */
    }
  },

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* см. выше */
    }
  },
};
```

В `CartProvider` подключается так: пока `isAuthenticated === false`, `add`
пишет в `guestCart` и показывает корзину из локальных id (цены берём из уже
загруженного списка игр). В эффекте на вход добавляется слияние:

```tsx
useEffect(() => {
  if (!isAuthenticated) { /* ...сброс... */ return; }

  const guestIds = guestCart.read();

  const load = guestIds.length > 0
    ? CART_SERVICE.merge(guestIds).then(() => guestCart.clear())
    : Promise.resolve();

  void load.then(refresh);
}, [isAuthenticated, refresh]);
```

**Почему слияние делает сервер, а не фронт циклом из N запросов:** один запрос
вместо N — это одна транзакция, один round-trip и отсутствие полусостояния,
когда три игры перенеслись, а на четвёртой оборвалась сеть.

---

## Чеклист и типичные ошибки

### Чеклист готовности

- [ ] Модели `CartItem`, `Order`, `OrderItem`, `LibraryItem` созданы
- [ ] `AppDbContext`: `DbSet`-ы, уникальный индекс `(UserId, GameId)`, поведение удаления
- [ ] Миграция создана и применена (`dotnet ef database update --project api`)
- [ ] DTO не содержат навигационных свойств и `PasswordHash`
- [ ] Все три контроллера помечены `[Authorize]`
- [ ] Цены берутся **только** из БД, ни один endpoint не принимает цену от клиента
- [ ] `POST /api/orders` и `POST /api/orders/{id}/pay` обёрнуты в транзакцию
- [ ] Повторная оплата одного заказа не создаёт дублей в библиотеке
- [ ] На фронте `CartProvider` обёрнут вокруг `App`
- [ ] Кнопка карточки различает: куплено / в корзине / можно добавить / нужно войти
- [ ] Ошибки видны пользователю (`role="alert"`), а не только в консоли

### Частые ошибки

**«Cart is null» / `useCart нужно вызывать внутри CartProvider`.** Компонент
отрисован вне провайдера. Проверьте `main.tsx` — `CartProvider` должен
оборачивать `<App />`.

**Кнопка «В корзину» осталась после покупки.** Не вызван `refresh()` после
оплаты — `ownedIds` в контексте устарели.

**401 при добавлении в корзину сразу после входа.** Токен сохранён, но
`useIsAuthenticated` не перерисовал дерево. Убедитесь, что вход идёт через
`tokenStorage.set(...)` — именно он дёргает подписчиков
[src/lib/auth-storage.ts](../src/lib/auth-storage.ts).

**Дубли в корзине.** Работает только проверка в C#, а уникального индекса нет.
Проверьте, что миграция действительно создала `IX_CartItems_UserId_GameId` с
`unique: true`.

**В истории заказов время «уехало» на несколько часов.** Забыли
`DateTime.SpecifyKind(..., DateTimeKind.Utc)` в `ToDto` — JSON уехал без `Z`.

**`The instance of entity type CartItem cannot be tracked`.** Одна и та же
сущность загружена дважды в один `DbContext`. Для запросов только на чтение
добавляйте `AsNoTracking()`.

**CORS-ошибка в браузере.** Политика `ReactApp` в `Program.cs` разрешает
`localhost:5173` и `127.0.0.1:5173`. Открывайте фронт ровно по этим адресам.

### Что можно доделать дальше

1. **Промокоды.** Таблица `Promo(Code, Percent, ExpiresAtUtc)`, поле
   `Order.DiscountTotal`. Скидка считается на сервере при создании заказа.
2. **Возврат заказа.** `Status = Refunded` + удаление `LibraryItem` в
   транзакции. Проверять окно возврата (например, 14 дней).
3. **Страница LIBRARY.** Данные уже есть — `GET /api/library` возвращает
   готовый `GameDto[]`, остаётся отрисовать его тем же `GamesList`.
4. **Реальная оплата.** Подключить провайдера, перенести тело `Pay()` в
   обработчик webhook и проверять подпись запроса.
5. **Тесты.** `WebApplicationFactory` + SQLite in-memory: сценарий
   «добавил → оформил → оплатил → библиотека не пуста» проверяется одним тестом.
