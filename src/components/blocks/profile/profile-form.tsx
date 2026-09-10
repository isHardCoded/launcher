import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import {
  PROFILE_FIELDS,
  PROFILE_LIMITS,
  mapServerErrors,
  toFormValues,
  toUpdateRequest,
  todayIso,
  validateProfile,
  type ProfileField,
  type ProfileFormErrors,
} from "@/lib/profile";
import { PROFILE_SERVICE } from "@/services/profile";
import type { Profile } from "@/types/profile";
import { FormField } from "../form-field";

type ProfileFormProps = {
  profile: Profile;
  onCancel: () => void;
  onSaved: (profile: Profile) => void;
};

export function ProfileForm({ profile, onCancel, onSaved }: ProfileFormProps) {
  // Запоминаем значения на момент открытия формы, чтобы понимать, есть ли изменения.
  const [initialValues] = useState(() => toFormValues(profile));
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = PROFILE_FIELDS.some((field) => values[field] !== initialValues[field]);

  function update(field: ProfileField, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  // Общие пропсы для любого контрола формы.
  function control(field: ProfileField) {
    const id = `profile-${field}`;
    return {
      id,
      name: field,
      value: values[field],
      onChange: (event: { target: { value: string } }) => update(field, event.target.value),
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": errors[field] ? `${id}-error` : undefined,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateProfile(values);
    setErrors(validationErrors);
    setSubmitError(null);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSaving(true);
    try {
      onSaved(await PROFILE_SERVICE.update(toUpdateRequest(values)));
    } catch (error) {
      if (error instanceof ApiError) {
        const serverErrors = mapServerErrors(error.fieldErrors);
        setErrors(serverErrors);
        // Ошибку, не привязанную к полю, показываем над кнопками.
        setSubmitError(Object.keys(serverErrors).length > 0 ? null : error.message);
      } else {
        setSubmitError("Не удалось сохранить профиль");
      }
    } finally {
      setIsSaving(false);
    }
  }

  const { usernameMax, nameMax, emailMax, bioMax, minBirthDate } = PROFILE_LIMITS;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <h3 className="text-[15px] font-semibold text-foreground">Редактирование профиля</h3>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="profile-username"
          label="Никнейм"
          error={errors.username}
          hint="Латинские буквы, цифры и _"
        >
          <Input {...control("username")} className="h-9" autoComplete="username" maxLength={usernameMax} />
        </FormField>

        <FormField id="profile-email" label="Email" error={errors.email}>
          <Input {...control("email")} className="h-9" type="email" autoComplete="email" maxLength={emailMax} />
        </FormField>

        <FormField id="profile-firstName" label="Имя" error={errors.firstName}>
          <Input {...control("firstName")} className="h-9" autoComplete="given-name" maxLength={nameMax} />
        </FormField>

        <FormField id="profile-lastName" label="Фамилия" error={errors.lastName}>
          <Input {...control("lastName")} className="h-9" autoComplete="family-name" maxLength={nameMax} />
        </FormField>

        <FormField id="profile-birthDate" label="Дата рождения" error={errors.birthDate}>
          <Input
            {...control("birthDate")}
            className="h-9 [color-scheme:dark]"
            type="date"
            autoComplete="bday"
            min={minBirthDate}
            max={todayIso()}
          />
        </FormField>
      </div>

      <FormField
        id="profile-bio"
        label="О себе"
        error={errors.bio}
        hint={`${values.bio.length} / ${bioMax}`}
      >
        <Textarea
          {...control("bio")}
          className="min-h-24"
          maxLength={bioMax}
          placeholder="Пара слов о себе и любимых играх"
        />
      </FormField>

      {submitError && (
        <p role="alert" className="text-[13px] text-destructive">
          {submitError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel} disabled={isSaving}>
          Отмена
        </Button>
        <Button type="submit" size="lg" disabled={isSaving || !isDirty}>
          {isSaving && <LoaderCircle className="animate-spin" />}
          Сохранить
        </Button>
      </div>
    </form>
  );
}
