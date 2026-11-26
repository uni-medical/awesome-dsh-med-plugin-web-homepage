import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GROUP_LABELS, MECHANISM_COVERAGE, MECHANISM_LABELS, RELATION_LABELS, RISK_LABELS, TYPE_LABELS, componentCopy } from "../lib/componentCopy";
import { evaluationText } from "../lib/evaluationText";
import { useUiLanguage } from "./useUiLanguage";
import type { ComponentSummary, PaperSource } from "../lib/components";

type Labelled = Pick<ComponentSummary, "type" | "repo"> & Partial<Pick<ComponentSummary, "mechanism" | "native" | "description">> & { paper?: string | PaperSource | null };

export function useComponentCopy() {
  const { locale, formatNumber } = useUiLanguage();
  const c = componentCopy[locale];
  const types = TYPE_LABELS[locale];
  const mechanisms = MECHANISM_LABELS[locale];
  return {
    /** "Mechanism plugin · Context and Memory" for mechanism plugins, the component type otherwise. */
    kindOf: (item: Labelled) => {
      const kind = item.native ? c.nativeMechanism : item.mechanism ? c.mechanismPlugin : types[item.type];
      return item.mechanism ? `${kind} · ${mechanisms[item.mechanism]}` : kind;
    },
    /** Native DSH mechanisms carry no upstream description; they get a short explanation. */
    descriptionOf: (item: Labelled) => item.description || (item.native ? c.nativeDescription : ""),
    /** Source paper of a mechanism plugin, the repository otherwise. */
    sourceOf: (item: Labelled) => (typeof item.paper === "string" ? item.paper : item.paper?.label) ?? item.repo, locale, formatNumber, c: componentCopy[locale], types: TYPE_LABELS[locale], groups: GROUP_LABELS[locale], mechanisms: MECHANISM_LABELS[locale], mechanismCoverage: MECHANISM_COVERAGE[locale], risks: RISK_LABELS[locale], relations: RELATION_LABELS[locale], e: (text: string) => evaluationText(locale, text) };
}

/**
 * Detail dialog state in the `entry` URL parameter. Opening pushes a history
 * entry and closing goes back, so Back and close behave the same; a deep link
 * (no push from this page) closes by replacing the URL. Focus returns to the opener.
 */
export function useEntryDialog() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const openerRef = useRef<HTMLElement | null>(null);
  const pushedRef = useRef(false);
  const entryId = params.get("entry");

  useEffect(() => { if (!entryId) pushedRef.current = false; }, [entryId]);

  const open = useCallback((id: string) => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const replace = Boolean(params.get("entry"));
    if (!replace) pushedRef.current = true;
    setParams(current => { const next = new URLSearchParams(current); next.set("entry", id); return next; }, { replace });
  }, [params, setParams]);

  const close = useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false;
      navigate(-1);
    } else {
      setParams(current => { const next = new URLSearchParams(current); next.delete("entry"); return next; }, { replace: true });
    }
    const opener = openerRef.current;
    if (opener) requestAnimationFrame(() => { if (opener.isConnected) opener.focus(); });
  }, [navigate, setParams]);

  return { entryId, open, close };
}
