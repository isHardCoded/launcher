import type { AuthTokens } from "@/types/auth";

const STORAGE_KEY = "playhub.auth";

type Listener = () => void;

const listeners = new Set<Listener>();

// Кэш нужен для useSyncExternalStore: пока токены не менялись,
// снапшот должен быть тем же самым объектом.
let cache: AuthTokens | null | undefined;

function read(): AuthTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AuthTokens> | null;
    if (typeof parsed?.accessToken !== "string") return null;

    return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken ?? "" };
  } catch {
    return null;
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

// Вход или выход в соседней вкладке тоже должен отражаться здесь.
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY || event.key === null) {
    cache = read();
    emit();
  }
});

export const tokenStorage = {
  get(): AuthTokens | null {
    if (cache === undefined) cache = read();
    return cache;
  },

  set(tokens: AuthTokens) {
    cache = { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {
      // localStorage недоступен (приватный режим) — живём с токенами в памяти.
    }
    emit();
  },

  clear() {
    cache = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // см. комментарий в set
    }
    emit();
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
