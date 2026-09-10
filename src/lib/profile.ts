import type { Profile, UpdateProfileRequest } from "@/types/profile";

// Ограничения совпадают с валидацией на бекенде (api/Docs/profile-backend.md).
export const PROFILE_LIMITS = {
  usernameMin: 3,
  usernameMax: 32,
  nameMax: 50,
  emailMax: 254,
  bioMax: 500,
  minBirthDate: "1900-01-01",
} as const;

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp"];

// В форме все значения — строки, в null они превращаются только при отправке.
export type ProfileFormValues = {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  bio: string;
};

export type ProfileField = keyof ProfileFormValues;
export type ProfileFormErrors = Partial<Record<ProfileField, string>>;

export const PROFILE_FIELDS: ProfileField[] = [
  "username",
  "email",
  "firstName",
  "lastName",
  "birthDate",
  "bio",
];

export function toFormValues(profile: Profile): ProfileFormValues {
  return {
    username: profile.username ?? "",
    email: profile.email ?? "",
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    birthDate: profile.birthDate?.slice(0, 10) ?? "",
    bio: profile.bio ?? "",
  };
}

export function toUpdateRequest(values: ProfileFormValues): UpdateProfileRequest {
  const optional = (value: string) => value.trim() || null;

  return {
    username: values.username.trim(),
    email: values.email.trim(),
    firstName: optional(values.firstName),
    lastName: optional(values.lastName),
    birthDate: values.birthDate || null,
    bio: optional(values.bio),
  };
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function validateProfile(values: ProfileFormValues): ProfileFormErrors {
  const { usernameMin, usernameMax, nameMax, emailMax, bioMax, minBirthDate } = PROFILE_LIMITS;
  const errors: ProfileFormErrors = {};

  const username = values.username.trim();
  if (!username) {
    errors.username = "Укажите никнейм";
  } else if (username.length < usernameMin || username.length > usernameMax) {
    errors.username = `От ${usernameMin} до ${usernameMax} символов`;
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username = "Только латинские буквы, цифры и _";
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = "Укажите email";
  } else if (email.length > emailMax || !EMAIL_PATTERN.test(email)) {
    errors.email = "Некорректный email";
  }

  if (values.firstName.trim().length > nameMax) {
    errors.firstName = `Не больше ${nameMax} символов`;
  }

  if (values.lastName.trim().length > nameMax) {
    errors.lastName = `Не больше ${nameMax} символов`;
  }

  if (values.bio.trim().length > bioMax) {
    errors.bio = `Не больше ${bioMax} символов`;
  }

  if (values.birthDate) {
    // Строки YYYY-MM-DD можно сравнивать как обычные строки.
    if (!DATE_PATTERN.test(values.birthDate)) {
      errors.birthDate = "Некорректная дата";
    } else if (values.birthDate > todayIso()) {
      errors.birthDate = "Дата не может быть в будущем";
    } else if (values.birthDate < minBirthDate) {
      errors.birthDate = "Слишком ранняя дата";
    }
  }

  return errors;
}

// Раскладываем ошибки сервера (ключи в нижнем регистре) по полям формы.
export function mapServerErrors(fieldErrors: Record<string, string>): ProfileFormErrors {
  const errors: ProfileFormErrors = {};

  for (const field of PROFILE_FIELDS) {
    const message = fieldErrors[field.toLowerCase()];
    if (message) errors[field] = message;
  }

  return errors;
}

export function validateAvatar(file: File) {
  if (!AVATAR_TYPES.includes(file.type)) return "Поддерживаются только JPG, PNG и WEBP";
  if (file.size > AVATAR_MAX_BYTES) return "Файл должен быть не больше 2 МБ";
  return null;
}

export function getDisplayName(profile: Profile) {
  const fullName = [profile.firstName, profile.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return fullName || profile.username || profile.email || "Игрок";
}

export function getInitials(profile: Profile) {
  const first = profile.firstName?.trim()?.[0] ?? "";
  const last = profile.lastName?.trim()?.[0] ?? "";
  const initials = first + last || (profile.username || profile.email || "?")[0];

  return initials.toUpperCase();
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// "2000-01-31" → "31 января 2000 г." (без сдвига часового пояса)
export function formatDateOnly(value: string | null | undefined) {
  const [year, month, day] = (value ?? "").slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return dateFormatter.format(new Date(year, month - 1, day));
}

// Дата из бекенда может прийти без "Z" — считаем её UTC.
export function formatUtcDate(value: string | null | undefined) {
  if (!value) return null;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}
