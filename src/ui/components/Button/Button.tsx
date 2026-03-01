import "./button.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: Props) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${className}`}
      {...props}
    />
  );
}