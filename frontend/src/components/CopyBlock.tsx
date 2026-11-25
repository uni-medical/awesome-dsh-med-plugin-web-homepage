import { useState } from "react";
import { useComponentCopy } from "../state/useComponentCopy";

const COPIED_MS = 1600;

/** Code block with a copy button; `inline` renders a single-line variant. */
export function CopyBlock({ text, label, inline = false }: { text: string; label: string; inline?: boolean }) {
  const { c } = useComponentCopy();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_MS);
    } catch (reason) {
      console.error("Copying failed", reason);
    }
  }

  return <div className={`copy-block${inline ? " is-inline" : ""}`}>
    <pre><code>{text}</code></pre>
    <button type="button" onClick={copy} aria-label={`${c.copy}: ${label}`}>{copied ? c.copied : c.copy}</button>
  </div>;
}
