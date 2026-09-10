import { useIsAuthenticated } from "@/hooks/use-auth";
import { AuthForm } from "../auth-form";
import { ProfileContent } from "./profile-content";

export function ProfilePage() {
  const isAuthenticated = useIsAuthenticated();

  return (
    <section className="mx-auto w-full max-w-3xl">
      <h2 className="text-[13px] font-semibold tracking-[0.14em] text-muted-foreground">
        PROFILE
      </h2>

      {/* При 401 токены очищаются, и вместо профиля автоматически появляется форма входа. */}
      {isAuthenticated ? <ProfileContent /> : <AuthForm />}
    </section>
  );
}
