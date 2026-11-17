import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Icon, type IconName } from "../Icon";
import "./ui.css";

// Form fields: a label, the control, and a hint or an error message underneath.
// The error is linked to the control (aria-describedby) so screen readers announce it.

interface FieldShell {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  counter?: string;
}

function Shell({ id, label, hint, error, required, counter, children }: FieldShell & { id: string; children: ReactNode }) {
  return (
    <div className={`ui-field ${error ? "has-error" : ""}`}>
      <label htmlFor={id} className="ui-label">
        {label}
        {required && <span className="ui-required" aria-hidden="true">*</span>}
      </label>
      {children}
      {(error || hint || counter) && (
        <div className="ui-help" id={`${id}-help`}>
          <span className={error ? "ui-error" : ""}>{error ?? hint}</span>
          {counter && <span>{counter}</span>}
        </div>
      )}
    </div>
  );
}

function aria(id: string, error?: string, hint?: ReactNode, counter?: string) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || hint || counter ? `${id}-help` : undefined,
  };
}

type TextFieldProps = FieldShell & InputHTMLAttributes<HTMLInputElement> & { icon?: IconName };

export function TextField({ label, hint, error, required, icon, id, disabled, ...input }: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <Shell id={fieldId} label={label} hint={hint} error={error} required={required}>
      <div className={`ui-control ${disabled ? "is-disabled" : ""}`}>
        {icon && <Icon name={icon} size={18} />}
        <input id={fieldId} required={required} disabled={disabled} {...aria(fieldId, error, hint)} {...input} />
      </div>
    </Shell>
  );
}

type TextAreaProps = FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>;

/** A multi-line field. With `maxLength` set, it shows a "0 / 2,000 characters" counter like the design. */
export function TextArea({ label, hint, error, required, id, maxLength, value, disabled, rows = 5, ...textarea }: TextAreaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const length = typeof value === "string" ? value.length : 0;
  const counter = maxLength ? `${length.toLocaleString("en-ZA")} / ${maxLength.toLocaleString("en-ZA")} characters` : undefined;
  return (
    <Shell id={fieldId} label={label} hint={hint} error={error} required={required} counter={counter}>
      <div className={`ui-control ${disabled ? "is-disabled" : ""}`}>
        <textarea
          id={fieldId}
          rows={rows}
          maxLength={maxLength}
          value={value}
          required={required}
          disabled={disabled}
          {...aria(fieldId, error, hint, counter)}
          {...textarea}
        />
      </div>
    </Shell>
  );
}

type SelectFieldProps = FieldShell & SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string };

export function SelectField({ label, hint, error, required, id, options, placeholder, disabled, ...select }: SelectFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <Shell id={fieldId} label={label} hint={hint} error={error} required={required}>
      <div className={`ui-control ${disabled ? "is-disabled" : ""}`}>
        <select id={fieldId} required={required} disabled={disabled} {...aria(fieldId, error, hint)} {...select}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </Shell>
  );
}
