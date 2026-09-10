import { useSyncExternalStore } from "react";
import { tokenStorage } from "@/lib/auth-storage";

// Перерисовывает компонент при входе/выходе (в том числе в другой вкладке).
export function useIsAuthenticated() {
  return useSyncExternalStore(tokenStorage.subscribe, () => tokenStorage.get() !== null);
}
