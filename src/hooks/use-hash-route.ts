import { useSyncExternalStore } from "react";

export type Route = "store" | "profile";

export const ROUTE_HREF: Record<Route, string> = {
  store: "#/",
  profile: "#/profile",
};

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function getRoute(): Route {
  const path = window.location.hash.replace(/^#\/?/, "").replace(/\/+$/, "");
  return path === "profile" ? "profile" : "store";
}

// Простейший роутинг на hash: #/profile переживает перезагрузку страницы
// и не требует настроек dev-сервера.
export function useHashRoute() {
  return useSyncExternalStore(subscribe, getRoute);
}
