import { useId } from "react";
import { useTheme } from "@/ui/theme/ThemeProvider";
import "./themeToggle.css";

type Props = {
  label?: string;
};

export function ThemeToggle({ label = "Dark mode" }: Props) {
  const id = useId();
  const { theme, setTheme } = useTheme();

  const checked = theme === "dark";

  function onChange(nextChecked: boolean) {
    setTheme(nextChecked ? "dark" : "light");
  }

  return (
    <div className="themeRow">
      <label className="themeLabel" htmlFor={id}>
        {label}
      </label>

      <button
        id={id}
        type="button"
        className={`switch ${checked ? "switchOn" : "switchOff"}`}
        role="switch"
        aria-checked={checked}
        onClick={(e) => {
          onChange(!checked);

          requestAnimationFrame(() => e.currentTarget.blur());
        }}
      >
        <span className="switchThumb" />
      </button>
    </div>
  );
}