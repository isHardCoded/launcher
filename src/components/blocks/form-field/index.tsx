import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
};

// Подпись + контрол + ошибка (или подсказка). У контрола должен быть id={id}
// и aria-describedby={`${id}-error`}, когда есть ошибка.
export function FormField({ id, label, error, hint, className, children }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[12px] font-medium text-muted-foreground">
        {label}
      </label>

      {children}

      {error ? (
        <p id={`${id}-error`} className="text-[12px] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
