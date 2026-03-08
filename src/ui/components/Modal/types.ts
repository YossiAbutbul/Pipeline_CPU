export type ModalVariant = "form" | "info" | "warning" | "error" | "success";

export type ModalFieldType = "text" | "number" | "select" | "textarea";

export type ModalFieldOption = {
  value: string;
  label: string;
};

type ModalFieldBase = {
  id: string;
  label: string;
  type: ModalFieldType;
  placeholder?: string;
  required?: boolean;
  helperText?: string;
  defaultValue?: string;
};

export type ModalFieldText = ModalFieldBase & {
  type: "text" | "number" | "textarea";
};

export type ModalFieldSelect = ModalFieldBase & {
  type: "select";
  options: ModalFieldOption[];
};

export type ModalField = ModalFieldText | ModalFieldSelect;

export type ModalSubmitResult = {
  values: Record<string, string>;
  parsedValues: Record<string, string | number>;
};

export type ModalProps = {
  open: boolean;
  title: string;
  variant?: ModalVariant;
  typeLabel?: string;
  labels?: string[];
  description?: string;
  fields: ModalField[];
  submitLabel?: string;
  cancelLabel?: string;
  closeOnBackdropClick?: boolean;
  onClose: () => void;
  onSubmit: (result: ModalSubmitResult) => void;
};
