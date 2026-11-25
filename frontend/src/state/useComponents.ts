import { useEffect, useMemo, useState } from "react";
import { componentClient } from "../api/componentClient";
import { searchText, type ComponentDetail, type ComponentSummary } from "../lib/components";
import type { IndexedComponent } from "../lib/marketplace";

export function useComponents() {
  const [components, setComponents] = useState<ComponentSummary[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    componentClient.loadIndex()
      .then(index => { if (active) setComponents(index.components); })
      .catch(reason => { console.error("Component index failed to load", reason); if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const indexed = useMemo<IndexedComponent[]>(() => components.map(item => ({ item, text: searchText(item) })), [components]);
  const byId = useMemo(() => new Map(components.map(item => [item.id, item])), [components]);
  return { components, indexed, byId, loading, error };
}

type DetailState = { id: string; detail?: ComponentDetail; error: boolean };

export function useComponentDetail(id: string | null) {
  const [state, setState] = useState<DetailState | undefined>();
  useEffect(() => {
    if (!id) return;
    let active = true;
    componentClient.getDetail(id)
      .then(detail => { if (active) setState({ id, detail, error: false }); })
      .catch(reason => { console.error("Component detail failed to load", reason); if (active) setState({ id, error: true }); });
    return () => { active = false; };
  }, [id]);
  const current = id && state?.id === id ? state : undefined;
  return { detail: current?.detail, loading: Boolean(id) && !current, error: current?.error ?? false, missing: Boolean(current && !current.error && !current.detail) };
}
