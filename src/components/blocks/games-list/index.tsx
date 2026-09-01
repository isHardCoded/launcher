import { useEffect, useMemo, useState } from "react";
import type { Game } from "@/types/game";
import type { GamesFilters } from "@/types/filters";
import { GAMES_SERVICE } from "@/services/games";
import { applyFilters, getAllTags } from "@/lib/games-filters";
import { GameCard } from "../game-card";
import { GamesFiltersPanel } from "../games-filters";

type GamesListProps = {
  filters: GamesFilters;
  onFiltersChange: (filters: GamesFilters) => void;
};

export function GamesList({ filters, onFiltersChange }: GamesListProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Загружаем игры один раз при монтировании.
  useEffect(() => {
    async function getGames() {
      try {
        setGames(await GAMES_SERVICE.get());
      } catch {
        setError("Ошибка при получении игр");
      }
    }

    getGames();
  }, []);

  // Список тегов пересчитываем только когда изменились сами игры.
  const tags = useMemo(() => getAllTags(games), [games]);

  // То, что видит пользователь, — вычисляется, а не хранится.
  const visibleGames = useMemo(() => applyFilters(games, filters), [games, filters]);

  return (
    <>
      {/* Панель показываем всегда — даже если игры не загрузились. */}
      <GamesFiltersPanel
        filters={filters}
        tags={tags}
        total={visibleGames.length}
        onChange={onFiltersChange}
      />

      {error ? (
        <p className="mt-10 text-center text-[14px] text-destructive">{error}</p>
      ) : visibleGames.length === 0 ? (
        <p className="mt-10 text-center text-[14px] text-muted-foreground">
          Ничего не найдено. Попробуйте изменить фильтры.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {visibleGames.map((game) => (
            <GameCard key={game.id} {...game} />
          ))}
        </div>
      )}
    </>
  );
}
