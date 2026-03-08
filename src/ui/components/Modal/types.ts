import type { ReactNode } from "react";

export type ModalVariant = "form" | "info" | "warning" | "error" | "success";

export type ModalFieldType = "text" | "number" | "select" | "textarea" | "checkbox";

export type ModalFieldOption = {
  value: string;
  label: string;
};

type ModalFieldBase = {
  id: string;
  label: string;
  type: ModalFieldType;
  fieldClassName?: string;
  placeholder?: string;
  required?: boolean;
  helperText?: string;
  defaultValue?: string;
  visibleWhen?: (values: Record<string, string>) => boolean;
};

export type ModalFieldText = ModalFieldBase & {
  type: "text" | "number" | "textarea";
};

export type ModalFieldSelect = ModalFieldBase & {
  type: "select";
  options: ModalFieldOption[];
};

export type ModalFieldCheckbox = ModalFieldBase & {
  type: "checkbox";
  defaultChecked?: boolean;
};

export type ModalField = ModalFieldText | ModalFieldSelect | ModalFieldCheckbox;

export type ModalSubmitResult = {
  values: Record<string, string>;
  parsedValues: Record<string, string | number | boolean>;
};

export type ModalProps = {
  open: boolean;
  title: string;
  className?: string;
  variant?: ModalVariant;
  typeLabel?: string;
  labels?: string[];
  description?: string;
  fields: ModalField[];
  initialValues?: Record<string, string>;
  submitLabel?: string;
  cancelLabel?: string;
  closeOnBackdropClick?: boolean;
  renderPreview?: (values: Record<string, string>) => ReactNode;
  onClose: () => void;
  onSubmit: (result: ModalSubmitResult) => void;
};
