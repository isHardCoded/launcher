import type { Game } from "@/types/game"
import { useEffect, useState } from "react"
import { GameCard } from "../game-card"
import { GAMES_SERVICE } from "@/services/games"

export function GamesList() {
  const [games, setGames] = useState<Game[]>([])
  const [error, setError] = useState<string | null | unknown>(null)
    
    useEffect(() => {
      async function GetGames() {
        try {
          setGames(await GAMES_SERVICE.get())
        } catch (e) {
          setError(e)
        }
      }
      GetGames()
    }, [])
    
  if (error) return <div className="text-center text-[14px] text-[#dadada] mt-5">Ошибка при получении игр</div>
    
  return <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {games.map((game) => (
            <GameCard key={game.id} {...game} />
          ))}
        </div>
}