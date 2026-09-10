import type { AuthResponse } from "@/types/auth";
import { tokenStorage } from "./auth-storage";

// Адрес бекенда. Переопределяется через VITE_API_URL в .env.local.
export const API_URL = String(import.meta.env.VITE_API_URL ?? "http://localhost:5120").replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;
  // Ошибки по полям: ключ — имя поля в нижнем регистре ("username", "birthdate").
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const DEFAULT_MESSAGES: Record<number, string> = {
  400: "Проверьте правильность заполнения полей",
  401: "Нужно войти в аккаунт",
  403: "Недостаточно прав",
  404: "Не найдено",
  409: "Такие данные уже заняты",
  413: "Файл слишком большой",
  415: "Неподдерживаемый формат файла",
};

export function getErrorMessage(error: unknown, fallback = "Что-то пошло не так") {
  return error instanceof ApiError ? error.message : fallback;
}

// Относительный путь от бекенда ("/uploads/avatars/1.png") превращаем в полный URL.
export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown; // обычный объект уходит как JSON, FormData — как multipart/form-data
  auth?: boolean; // подставлять ли Bearer-токен (по умолчанию да)
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const auth = options.auth ?? true;
  let response = await send(path, options, auth);

  // Access-токен истёк — один раз пробуем обновить пару токенов и повторить запрос.
  if (response.status === 401 && auth) {
    if (await refreshTokens()) {
      response = await send(path, options, auth);
    }

    if (response.status === 401) {
      tokenStorage.clear();
      throw new ApiError(401, "Сессия истекла. Войдите снова");
    }
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function send(path: string, { method = "GET", body }: RequestOptions, auth: boolean) {
  const headers = new Headers({ Accept: "application/json" });
  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    payload = body; // Content-Type с boundary браузер выставит сам
  } else if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    payload = JSON.stringify(body);
  }

  const accessToken = auth ? tokenStorage.get()?.accessToken : undefined;
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  try {
    return await fetch(`${API_URL}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, "Не удалось связаться с сервером. Проверьте, что бекенд запущен");
  }
}

// Несколько запросов могут одновременно получить 401 — обновляем токены только один раз.
let refreshPromise: Promise<boolean> | null = null;

function refreshTokens(): Promise<boolean> {
  const refreshToken = tokenStorage.get()?.refreshToken;
  if (!refreshToken) return Promise.resolve(false);

  refreshPromise ??= (async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      tokenStorage.set((await response.json()) as AuthResponse);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// "Username", "request.Username", "$.birthDate" → "username", "birthdate"
function normalizeField(key: string) {
  return (key.replace(/^\$\.?/, "").split(".").pop() ?? "").toLowerCase();
}

// Понимает два формата ошибок:
//  - ValidationProblemDetails от [ApiController]: { errors: { Username: ["..."] } }
//  - наш собственный: { message: "...", field?: "username" }
async function toApiError(response: Response) {
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // тело пустое или не JSON
  }

  let message =
    DEFAULT_MESSAGES[response.status] ??
    (response.status >= 500 ? "Ошибка на сервере. Попробуйте позже" : "Что-то пошло не так");
  const fieldErrors: Record<string, string> = {};

  if (isRecord(data)) {
    if (isRecord(data.errors)) {
      for (const [key, value] of Object.entries(data.errors)) {
        const text = Array.isArray(value) ? value.find((item) => typeof item === "string") : value;
        if (typeof text !== "string" || !text) continue;

        const field = normalizeField(key);
        if (field) fieldErrors[field] ??= text;
        else message = text;
      }
    }

    if (typeof data.message === "string" && data.message) {
      message = data.message;
      if (typeof data.field === "string" && data.field) {
        fieldErrors[normalizeField(data.field)] ??= data.message;
      }
    }
  }

  return new ApiError(response.status, message, fieldErrors);
}
