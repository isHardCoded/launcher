import { apiRequest } from "@/lib/api";
import type { Profile, UpdateProfileRequest } from "@/types/profile";

// Если бекенд ответил 204 без тела — сами дочитываем актуальный профиль.
async function withProfile(request: Promise<Profile | undefined>) {
  return (await request) ?? PROFILE_SERVICE.get();
}

export const PROFILE_SERVICE = {
  get: () => apiRequest<Profile>("/api/profile"),

  update: (data: UpdateProfileRequest) =>
    withProfile(apiRequest<Profile | undefined>("/api/profile", { method: "PUT", body: data })),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);

    return withProfile(
      apiRequest<Profile | undefined>("/api/profile/avatar", { method: "POST", body: formData })
    );
  },

  deleteAvatar: () =>
    withProfile(apiRequest<Profile | undefined>("/api/profile/avatar", { method: "DELETE" })),
};
