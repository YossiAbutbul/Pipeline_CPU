import "./panel.css";

type HeaderSize = "xs" | "sm" | "md" | "lg" | "xl";

type Props = {
  title?: string;
  toolbar?: React.ReactNode;
  headerSize?: HeaderSize;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
};

export function Panel({
  title,
  toolbar,
  headerSize = "md",
  className = "",
  bodyClassName = "",
  children,
}: Props) {
  const hasHeader = Boolean(title || toolbar);
  const toolbarOnly = Boolean(!title && toolbar);
  return (
    <section className={`panel ${className}`.trim()}>
      {hasHeader && (
        <header
          className={`panelHeader panelHeader-${headerSize} ${
            toolbarOnly ? "panelHeaderToolbarOnly" : ""
          }`}
        >
          {title && <div className="panelTitle">{title}</div>}
          <div className="panelToolbar">{toolbar}</div>
        </header>
      )}
      <div className={`panelBody ${bodyClassName}`.trim()}>{children}</div>
    </section>
  );
}
