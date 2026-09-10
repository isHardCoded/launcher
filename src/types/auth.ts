// Ответ бекенда на /api/auth/login, /api/auth/register и /api/auth/refresh.
export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc: string;
  refreshTokenExpiresAtUtc: string;
};

// То, что храним в браузере.
export type AuthTokens = Pick<AuthResponse, "accessToken" | "refreshToken">;

export type AuthCredentials = {
  email: string;
  password: string;
};
