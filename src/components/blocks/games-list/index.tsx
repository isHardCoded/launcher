import type { Game } from "@/types/game"
import { useEffect, useState } from "react"
import { GameCard } from "../game-card"
import { GAMES_SERVICE } from "@/services/games"

export function GamesList() {
  const [games, setGames] = useState<Game[]>([])
    
    useEffect(() => {
      async function GetGames() {
        setGames(await GAMES_SERVICE.get())
      }
      GetGames()
    }, [])
    
  return <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {games.map((game) => (
            <GameCard key={game.id} {...game} />
          ))}
        </div>
}