import { useRef, useState, type ChangeEvent } from "react";
import { Camera, LoaderCircle, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, resolveAssetUrl } from "@/lib/api";
import { AVATAR_TYPES, getInitials, validateAvatar } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { PROFILE_SERVICE } from "@/services/profile";
import type { Profile } from "@/types/profile";

// Сервер может вернуть ошибку и как { message }, и как ValidationProblem с полем "avatar".
function getAvatarError(error: unknown, fallback: string) {
  return error instanceof ApiError ? (error.fieldErrors.avatar ?? error.message) : fallback;
}

type ProfileAvatarProps = {
  profile: Profile;
  onProfileChange: (profile: Profile) => void;
};

export function ProfileAvatar({ profile, onProfileChange }: ProfileAvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Если картинка не загрузилась (битый URL) — показываем инициалы.
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);

  const remoteUrl = resolveAssetUrl(profile.avatarUrl);
  const src = previewUrl ?? remoteUrl;

  function openFileDialog() {
    inputRef.current?.click();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // чтобы можно было выбрать тот же файл ещё раз
    if (!file) return;

    const validationError = validateAvatar(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Пока файл летит на сервер, показываем локальное превью.
    const objectUrl = URL.createObjectURL(file);
    setError(null);
    setPreviewUrl(objectUrl);
    setIsBusy(true);

    try {
      onProfileChange(await PROFILE_SERVICE.uploadAvatar(file));
    } catch (uploadError) {
      setError(getAvatarError(uploadError, "Не удалось загрузить аватар"));
    } finally {
      setPreviewUrl(null);
      URL.revokeObjectURL(objectUrl);
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setIsBusy(true);

    try {
      onProfileChange(await PROFILE_SERVICE.deleteAvatar());
    } catch (deleteError) {
      setError(getAvatarError(deleteError, "Не удалось удалить аватар"));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={openFileDialog}
        disabled={isBusy}
        aria-label={remoteUrl ? "Сменить аватар" : "Загрузить аватар"}
        className="group relative size-28 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-wait"
      >
        {src && src !== brokenSrc ? (
          <img
            src={src}
            alt=""
            className="size-full object-cover"
            onError={() => setBrokenSrc(src)}
          />
        ) : (
          <span className="flex size-full items-center justify-center bg-accent text-3xl font-semibold text-accent-foreground">
            {getInitials(profile)}
          </span>
        )}

        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/55 text-white transition-opacity",
            isBusy ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
          )}
        >
          {isBusy ? <LoaderCircle className="size-6 animate-spin" /> : <Camera className="size-6" />}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_TYPES.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={openFileDialog} disabled={isBusy}>
          <Upload />
          {remoteUrl ? "Сменить" : "Загрузить"}
        </Button>
        {remoteUrl && (
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isBusy}>
            <Trash2 />
            Удалить
          </Button>
        )}
      </div>

      {error ? (
        <p role="alert" className="max-w-52 text-center text-[12px] text-destructive">
          {error}
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">JPG, PNG или WEBP до 2 МБ</p>
      )}
    </div>
  );
}
