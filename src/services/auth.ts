import { apiRequest } from "@/lib/api";
import { tokenStorage } from "@/lib/auth-storage";
import type { AuthCredentials, AuthResponse } from "@/types/auth";

async function authenticate(path: string, credentials: AuthCredentials) {
  const response = await apiRequest<AuthResponse>(path, {
    method: "POST",
    body: credentials,
    auth: false,
  });

  tokenStorage.set(response);
}

export const AUTH_SERVICE = {
  login: (credentials: AuthCredentials) => authenticate("/api/auth/login", credentials),
  register: (credentials: AuthCredentials) => authenticate("/api/auth/register", credentials),
  logout: () => tokenStorage.clear(),
};
