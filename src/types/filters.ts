// Варианты сортировки. Union-тип вместо string —
// TypeScript не даст написать "prise-asc" с опечаткой.
export type SortOption = "default" | "price-asc" | "price-desc" | "title-asc";

// Всё состояние панели фильтров одним объектом.
export type GamesFilters = {
  search: string;        // текст поиска, "" = не ищем
  tag: string;           // выбранный тег, "" = все теги
  onlyDiscount: boolean; // true = показывать только игры со скидкой
  sort: SortOption;      // порядок сортировки
};

// Значения по умолчанию. Пригодятся при инициализации и для кнопки "Сбросить".
export const INITIAL_FILTERS: GamesFilters = {
  search: "",
  tag: "",
  onlyDiscount: false,
  sort: "default",
};
