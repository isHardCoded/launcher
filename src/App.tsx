import { GamesList } from "./components/blocks/games-list";
import { Header } from "./components/blocks/header";

export function App() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="p-6">
        <h2 className="text-[13px] font-semibold tracking-[0.14em] text-muted-foreground">
          FEATURED & RECOMMENDED
        </h2>
        <GamesList />
      </main>
    </div>
  );
}
