import type { Game } from "@/types/game";
import type { GamesFilters, SortOption } from "@/types/filters";

/** Поиск по названию: без учёта регистра и лишних пробелов. */
export function searchGames(games: Game[], search: string): Game[] {
  const query = search.trim().toLowerCase();

  // Пустой запрос — фильтр не применяем, отдаём массив как есть.
  if (!query) return games;

  return games.filter((game) => game.title.toLowerCase().includes(query));
}

/** Фильтр по тегу: "" означает "все теги". */
export function filterByTag(games: Game[], tag: string): Game[] {
  if (!tag) return games;

  return games.filter((game) => game.tags.includes(tag));
}

/** Фильтр "только со скидкой". */
export function filterByDiscount(games: Game[], onlyDiscount: boolean): Game[] {
  if (!onlyDiscount) return games;

  return games.filter((game) => game.discount !== null && game.discount > 0);
}

/** Сортировка. Возвращает НОВЫЙ массив, исходный не трогает. */
export function sortGames(games: Game[], sort: SortOption): Game[] {
  const sorted = [...games];

  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "title-asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title, "ru"));
    default:
      return sorted;
  }
}

/** Собираем все фильтры в один конвейер. */
export function applyFilters(games: Game[], filters: GamesFilters): Game[] {
  let result = games;

  result = searchGames(result, filters.search);
  result = filterByTag(result, filters.tag);
  result = filterByDiscount(result, filters.onlyDiscount);
  result = sortGames(result, filters.sort);

  return result;
}

/** Список всех тегов, которые встречаются в загруженных играх. */
export function getAllTags(games: Game[]): string[] {
  const uniqueTags = new Set<string>();

  for (const game of games) {
    for (const tag of game.tags) {
      uniqueTags.add(tag);
    }
  }

  return [...uniqueTags].sort();
}
