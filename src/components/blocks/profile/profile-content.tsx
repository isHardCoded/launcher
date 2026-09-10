import { useEffect, useState } from "react";
import { Check, LogOut, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { formatUtcDate, getDisplayName } from "@/lib/profile";
import { AUTH_SERVICE } from "@/services/auth";
import { PROFILE_SERVICE } from "@/services/profile";
import type { Profile } from "@/types/profile";
import { ProfileAvatar } from "./profile-avatar";
import { ProfileDetails } from "./profile-details";
import { ProfileForm } from "./profile-form";

const CARD_CLASS = "mt-4 rounded-xl border border-border bg-card p-6";

export function ProfileContent() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    PROFILE_SERVICE.get()
      .then((data) => {
        if (!ignore) setProfile(data);
      })
      .catch((error: unknown) => {
        if (!ignore) setLoadError(getErrorMessage(error, "Не удалось загрузить профиль"));
      });

    return () => {
      ignore = true;
    };
  }, [attempt]);

  function retry() {
    setLoadError(null);
    setAttempt((value) => value + 1);
  }

  function startEditing() {
    setNotice(null);
    setIsEditing(true);
  }

  function handleSaved(updated: Profile) {
    setProfile(updated);
    setIsEditing(false);
    setNotice("Изменения сохранены");
  }

  if (loadError) {
    return (
      <div className={CARD_CLASS}>
        <p role="alert" className="text-[14px] text-destructive">
          {loadError}
        </p>
        <Button variant="outline" className="mt-4" onClick={retry}>
          Повторить
        </Button>
      </div>
    );
  }

  if (!profile) {
    return <ProfileSkeleton />;
  }

  const joinedAt = formatUtcDate(profile.createdAtUtc);

  return (
    <>
      <div className={CARD_CLASS}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <ProfileAvatar profile={profile} onProfileChange={setProfile} />

          <div className="min-w-0 flex-1 text-center sm:pt-6 sm:text-left">
            <p className="truncate text-xl font-semibold text-foreground">
              {getDisplayName(profile)}
            </p>
            {profile.username && (
              <p className="truncate text-[13px] text-muted-foreground">@{profile.username}</p>
            )}
            {joinedAt && (
              <p className="mt-2 text-[12px] text-muted-foreground">На PLAYHUB с {joinedAt}</p>
            )}
          </div>

          <div className="flex justify-center gap-2 sm:pt-6">
            {!isEditing && (
              <Button variant="secondary" size="lg" onClick={startEditing}>
                <Pencil />
                Редактировать
              </Button>
            )}
            <Button variant="ghost" size="lg" onClick={() => AUTH_SERVICE.logout()}>
              <LogOut />
              Выйти
            </Button>
          </div>
        </div>
      </div>

      <div className={CARD_CLASS}>
        {notice && (
          <p
            role="status"
            className="mb-5 flex items-center gap-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-[13px] text-emerald-300"
          >
            <Check className="size-4" />
            {notice}
          </p>
        )}

        {isEditing ? (
          <ProfileForm
            profile={profile}
            onCancel={() => setIsEditing(false)}
            onSaved={handleSaved}
          />
        ) : (
          <ProfileDetails profile={profile} />
        )}
      </div>
    </>
  );
}

function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Загрузка профиля" className="animate-pulse">
      <div className={CARD_CLASS}>
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="size-28 rounded-full bg-muted" />
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <div className="h-5 w-48 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className={CARD_CLASS}>
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <div className="h-2.5 w-20 rounded bg-muted" />
              <div className="h-4 w-40 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
