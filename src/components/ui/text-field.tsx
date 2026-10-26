import { useId } from "react";

type TextFieldProps = React.ComponentProps<"input"> & {
  label: string;
  error?: string;
};

// A labelled input. The label is always visible (never a placeholder) and an
// error shows under the field and is linked to it for screen readers.
export const TextField = ({ label, error, ...inputProps }: TextFieldProps) => {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-small font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`h-10 rounded-sm border bg-surface px-3 text-body read-only:text-text-muted ${
          error ? "border-negative" : "border-control-border"
        }`}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-small text-negative">
          {error}
        </p>
      )}
    </div>
  );
};
