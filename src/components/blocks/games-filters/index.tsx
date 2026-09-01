import { Button } from "@/components/ui/button";
import { INITIAL_FILTERS, type GamesFilters, type SortOption } from "@/types/filters";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "default", label: "По умолчанию" },
  { value: "price-asc", label: "Цена: сначала дешёвые" },
  { value: "price-desc", label: "Цена: сначала дорогие" },
  { value: "title-asc", label: "Название: А-Я" },
];

const SELECT_CLASS =
  "h-8 rounded-lg border border-border bg-muted px-2 text-[13px] text-foreground outline-none focus-visible:border-ring";

type GamesFiltersPanelProps = {
  filters: GamesFilters;
  tags: string[];
  total: number;
  onChange: (filters: GamesFilters) => void;
};

export function GamesFiltersPanel({ filters, tags, total, onChange }: GamesFiltersPanelProps) {
  function update(patch: Partial<GamesFilters>) {
    onChange({ ...filters, ...patch });
  }

  const isDirty =
    filters.search !== "" ||
    filters.tag !== "" ||
    filters.onlyDiscount ||
    filters.sort !== "default";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <select
        value={filters.tag}
        onChange={(event) => update({ tag: event.target.value })}
        className={SELECT_CLASS}
        aria-label="Фильтр по тегу"
      >
        <option value="">Все теги</option>
        {tags.map((tag) => (
          <option key={tag} value={tag}>
            {tag}
          </option>
        ))}
      </select>

      <select
        value={filters.sort}
        onChange={(event) => update({ sort: event.target.value as SortOption })}
        className={SELECT_CLASS}
        aria-label="Сортировка"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground">
        <input
          type="checkbox"
          checked={filters.onlyDiscount}
          onChange={(event) => update({ onlyDiscount: event.target.checked })}
          className="size-4 accent-primary"
        />
        Только со скидкой
      </label>

      <span className="ml-auto text-[13px] text-muted-foreground">Найдено: {total}</span>

      {isDirty && (
        <Button variant="ghost" size="sm" onClick={() => onChange(INITIAL_FILTERS)}>
          Сбросить
        </Button>
      )}
    </div>
  );
}
