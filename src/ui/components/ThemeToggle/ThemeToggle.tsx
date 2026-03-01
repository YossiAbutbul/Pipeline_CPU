import { useEffect, useId, useState } from "react";
import {
  applyTheme,
  getStoredTheme,
  getSystemTheme,
  storeTheme,
  type Theme,
} from "@/ui/theme/theme";
import "./themeToggle.css";

type Props = {
  label?: string;
};

export function ThemeToggle({ label = "Dark mode" }: Props) {
  const id = useId();
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const t = getStoredTheme() ?? getSystemTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  const checked = theme === "dark";

  function onChange(nextChecked: boolean) {
    const next: Theme = nextChecked ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
    storeTheme(next);
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
        onClick={() => onChange(!checked)}
      >
        <span className="switchThumb" />
      </button>
    </div>
  );
}