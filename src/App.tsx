import { GameCard } from "./components/blocks/game-card";
import { Header } from "./components/blocks/header";
import { GAMES } from "./data/mock-games";

export function App() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="p-6">
        <h2 className="text-[13px] font-semibold tracking-[0.14em] text-muted-foreground">
          FEATURED & RECOMMENDED
        </h2>
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {GAMES.map((game) => (
            <GameCard key={game.id} {...game} />
          ))}
        </div>
      </main>
    </div>
  );
}
