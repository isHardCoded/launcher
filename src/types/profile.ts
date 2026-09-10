// Профиль, который возвращает GET /api/profile (и все остальные ручки профиля).
// Контракт описан в api/Docs/profile-backend.md.
export type Profile = {
  id: number;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  birthDate: string | null;    // "YYYY-MM-DD"
  avatarUrl: string | null;    // "/uploads/avatars/xxx.webp" или абсолютный URL
  createdAtUtc: string | null; // ISO-дата регистрации
};

// Тело PUT /api/profile. Пустые необязательные поля отправляем как null.
export type UpdateProfileRequest = {
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  birthDate: string | null;
};
