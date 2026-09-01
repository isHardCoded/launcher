import { useState } from "react";
import { GamesList } from "./components/blocks/games-list";
import { Header } from "./components/blocks/header";
import { INITIAL_FILTERS, type GamesFilters } from "./types/filters";

export function App() {
  // Единственный источник правды о том, как настроена витрина.
  const [filters, setFilters] = useState<GamesFilters>(INITIAL_FILTERS);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header
        search={filters.search}
        onSearchChange={(search) => setFilters({ ...filters, search })}
      />

      <main className="p-6">
        <h2 className="text-[13px] font-semibold tracking-[0.14em] text-muted-foreground">
          FEATURED & RECOMMENDED
        </h2>

        <GamesList filters={filters} onFiltersChange={setFilters} />
      </main>
    </div>
  );
}
