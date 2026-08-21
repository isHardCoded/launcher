export const GAMES_SERVICE = {
  get: async () => {
    try {
      const response = await fetch("http://localhost:5120/api/games")

      if (!response.ok) {
        throw new Error("Ошибка при получении игр")
      }
      
      return await response.json()
    } catch (e) {
      console.error(e)
      throw e
    }
  }
}