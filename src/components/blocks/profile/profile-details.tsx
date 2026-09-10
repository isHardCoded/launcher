import { cn } from "@/lib/utils";
import { formatDateOnly } from "@/lib/profile";
import type { Profile } from "@/types/profile";

type ProfileDetailsProps = {
  profile: Profile;
};

export function ProfileDetails({ profile }: ProfileDetailsProps) {
  const rows = [
    { label: "Никнейм", value: profile.username ? `@${profile.username}` : null },
    { label: "Email", value: profile.email },
    { label: "Имя", value: profile.firstName },
    { label: "Фамилия", value: profile.lastName },
    { label: "Дата рождения", value: formatDateOnly(profile.birthDate) },
    { label: "О себе", value: profile.bio, wide: true },
  ];

  return (
    <>
      <h3 className="text-[15px] font-semibold text-foreground">Основная информация</h3>

      <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className={row.wide ? "sm:col-span-2" : undefined}>
            <dt className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              {row.label}
            </dt>
            <dd
              className={cn(
                "mt-1 text-[14px] break-words whitespace-pre-line",
                row.value ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {row.value || "Не указано"}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
