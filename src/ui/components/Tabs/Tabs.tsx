import "./tabs.css";

export type TabItem<T extends string> = {
  key: T;
  label: string;
};

type Props<T extends string> = {
  items: TabItem<T>[];
  value: T;
  onChange: (key: T) => void;
};

export function Tabs<T extends string>({ items, value, onChange }: Props<T>) {
  return (
    <div className="tabs">
      {items.map((t) => (
        <button
          key={t.key}
          className={`tab ${t.key === value ? "tabActive" : ""}`}
          onClick={() => onChange(t.key)}
          type="button"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}