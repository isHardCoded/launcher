import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AUTH_SERVICE } from "@/services/auth";
import { FormField } from "../form-field";

type Mode = "login" | "register";

type AuthErrors = {
  email?: string;
  password?: string;
};

const MODES: { value: Mode; label: string }[] = [
  { value: "login", label: "Вход" },
  { value: "register", label: "Регистрация" },
];

const PASSWORD_MIN = 8;

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<AuthErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function changeMode(next: Mode) {
    setMode(next);
    setErrors({});
    setSubmitError(null);
  }

  function validate(): AuthErrors {
    const result: AuthErrors = {};

    if (!email.trim()) result.email = "Укажите email";
    if (!password) result.password = "Укажите пароль";
    else if (mode === "register" && password.length < PASSWORD_MIN) {
      result.password = `Минимум ${PASSWORD_MIN} символов`;
    }

    return result;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);
    setSubmitError(null);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const credentials = { email: email.trim(), password };
      // После успеха токены попадут в хранилище и страница сама переключится на профиль.
      if (mode === "login") await AUTH_SERVICE.login(credentials);
      else await AUTH_SERVICE.register(credentials);
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors = {
          email: error.fieldErrors.email,
          password: error.fieldErrors.password,
        };
        setErrors(fieldErrors);
        setSubmitError(fieldErrors.email || fieldErrors.password ? null : error.message);
      } else {
        setSubmitError("Что-то пошло не так");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-4 w-full max-w-sm rounded-xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground">
        {mode === "login" ? "Вход в PLAYHUB" : "Создание аккаунта"}
      </h3>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Войдите, чтобы открыть личный кабинет.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {MODES.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={mode === item.value}
            onClick={() => changeMode(item.value)}
            className={cn(
              "h-8 rounded-md text-[13px] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              mode === item.value
                ? "bg-card text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-4">
        <FormField id="auth-email" label="Email" error={errors.email}>
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            className="h-9"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "auth-email-error" : undefined}
          />
        </FormField>

        <FormField
          id="auth-password"
          label="Пароль"
          error={errors.password}
          hint={mode === "register" ? `Минимум ${PASSWORD_MIN} символов` : undefined}
        >
          <Input
            id="auth-password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="h-9"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "auth-password-error" : undefined}
          />
        </FormField>

        {submitError && (
          <p role="alert" className="text-[13px] text-destructive">
            {submitError}
          </p>
        )}

        <Button type="submit" size="lg" disabled={isSubmitting} className="mt-1 w-full">
          {isSubmitting && <LoaderCircle className="animate-spin" />}
          {mode === "login" ? "Войти" : "Зарегистрироваться"}
        </Button>
      </form>
    </div>
  );
}
