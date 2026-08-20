export const GAMES_SERVICE = {
  get: async () => {
    const response = await fetch("http://localhost:3001/games")
    const data = await response.json()
    return data
  }
}