import { useEffect, useMemo, useRef, useState } from "react";
import "./codeEditor.css";

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  minLines?: number;
};

function countLines(text: string) {
  return Math.max(1, text.split("\n").length);
}

function getCurrentLine(text: string, caret: number) {
  return text.slice(0, caret).split("\n").length;
}

export function CodeEditor({
  value,
  onChange,
  placeholder,
  ariaLabel = "Code editor",
  className = "",
  minLines = 12,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const [currentLine, setCurrentLine] = useState(1);

  const lineCount = useMemo(
    () => Math.max(minLines, countLines(value)),
    [value, minLines]
  );

  const lines = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1),
    [lineCount]
  );

  useEffect(() => {
    const ta = textareaRef.current;
    const gutter = gutterRef.current;
    if (!ta || !gutter) return;

    const sync = () => {
      gutter.scrollTop = ta.scrollTop;
    };

    ta.addEventListener("scroll", sync, { passive: true });
    return () => ta.removeEventListener("scroll", sync);
  }, []);

  function handleCaret() {
    const ta = textareaRef.current;
    if (!ta) return;
    setCurrentLine(getCurrentLine(value, ta.selectionStart));
  }

  return (
  <div className={`codeEditor ${className}`}>
    <div className="codeGutter" ref={gutterRef}>
      {lines.map((n) => (
        <div
          key={n}
          className={`codeLineNo ${n === currentLine ? "codeLineActive" : ""}`}
        >
          {n}
        </div>
      ))}
    </div>

    <textarea
      ref={textareaRef}
      className="codeTextarea"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={handleCaret}
      onKeyUp={handleCaret}
      onKeyDown={(e) => {
        if (e.key === "Tab") {
          e.preventDefault();
          const ta = textareaRef.current;
          if (!ta) return;

          const start = ta.selectionStart;
          const end = ta.selectionEnd;

          // Insert 2 spaces at caret (or replace selection)
          const newValue = value.substring(0, start) + "  " + value.substring(end);

          onChange(newValue);

          // Restore caret position after React state update
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = start + 2;
          });
        }
      }}
      placeholder={placeholder}
      spellCheck={false}
      autoCorrect="off"
      autoCapitalize="off"
      aria-label={ariaLabel}
    />
  </div>
);
}