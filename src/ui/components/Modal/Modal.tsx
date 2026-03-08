import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "../Button/Button";
import type { ModalField, ModalProps } from "./types";
import "./modal.css";

function buildInitialValues(fields: ModalField[]) {
  const next: Record<string, string> = {};
  for (const field of fields) {
    if (field.defaultValue !== undefined) {
      next[field.id] = field.defaultValue;
      continue;
    }
    if (field.type === "select" && field.options.length > 0) {
      next[field.id] = field.options[0].value;
      continue;
    }
    next[field.id] = "";
  }
  return next;
}

function parseValues(fields: ModalField[], values: Record<string, string>) {
  const parsedValues: Record<string, string | number> = {};
  for (const field of fields) {
    const raw = values[field.id] ?? "";
    if (field.type === "number") {
      const parsed = Number(raw);
      parsedValues[field.id] = Number.isNaN(parsed) ? raw : parsed;
      continue;
    }
    parsedValues[field.id] = raw;
  }
  return parsedValues;
}

export function Modal({
  open,
  title,
  variant = "form",
  typeLabel,
  labels = [],
  description,
  fields,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  closeOnBackdropClick = true,
  onClose,
  onSubmit,
}: ModalProps) {
  const [values, setValues] = useState<Record<string, string>>(() => buildInitialValues(fields));

  const effectiveTypeLabel = useMemo(
    () => typeLabel ?? (variant === "form" ? "Form" : variant.charAt(0).toUpperCase() + variant.slice(1)),
    [typeLabel, variant],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setValues(buildInitialValues(fields));
  }, [open, fields]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="modalOverlay" role="presentation" onMouseDown={closeOnBackdropClick ? onClose : undefined}>
      <div
        className={`modalCard modalCard-${variant}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modalHeader">
          <div className="modalHeaderMain">
            <span className={`modalTypeTag modalTypeTag-${variant}`}>{effectiveTypeLabel}</span>
            <h3 className="modalTitle">{title}</h3>
            {description && <p className="modalDescription">{description}</p>}
            {labels.length > 0 && (
              <div className="modalLabels" aria-label="Modal labels">
                {labels.map((label) => (
                  <span className="modalLabelChip" key={label}>
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="modalCloseBtn" aria-label="Close modal" onClick={onClose}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        <form
          className="modalBody"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({ values, parsedValues: parseValues(fields, values) });
          }}
        >
          {fields.map((field) => (
            <label className="modalField" key={field.id} htmlFor={`modal-field-${field.id}`}>
              <span className="modalFieldLabel">{field.label}</span>

              {field.type === "textarea" && (
                <textarea
                  id={`modal-field-${field.id}`}
                  className="modalInput modalTextarea"
                  value={values[field.id] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [field.id]: event.target.value }))
                  }
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )}

              {field.type === "select" && (
                <select
                  id={`modal-field-${field.id}`}
                  className="modalInput modalSelect"
                  value={values[field.id] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [field.id]: event.target.value }))
                  }
                  required={field.required}
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}

              {(field.type === "text" || field.type === "number") && (
                <input
                  id={`modal-field-${field.id}`}
                  className="modalInput"
                  type={field.type}
                  value={values[field.id] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [field.id]: event.target.value }))
                  }
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )}

              {field.helperText && <span className="modalHelperText">{field.helperText}</span>}
            </label>
          ))}

          <div className="modalFooter">
            <Button type="button" variant="ghost" onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button type="submit" variant="primary">
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
