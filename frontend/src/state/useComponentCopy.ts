import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GROUP_LABELS, RISK_LABELS, TYPE_LABELS, componentCopy } from "../lib/componentCopy";
import { useUiLanguage } from "./useUiLanguage";

export function useComponentCopy() {
  const { locale, formatNumber } = useUiLanguage();
  return { locale, formatNumber, c: componentCopy[locale], types: TYPE_LABELS[locale], groups: GROUP_LABELS[locale], risks: RISK_LABELS[locale] };
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
