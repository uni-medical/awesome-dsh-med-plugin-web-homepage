import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { COLLECTIONS_KEY, DEFAULT_PREFERENCES, PREFERENCES_KEY, addEntryToCollection, createCollection, parseCollections, parsePreferences, removeEntryFromCollection, type PersonalCollection, type WorkspacePreferences } from "../lib/workspace";

interface WorkspaceValue {
  preferences: WorkspacePreferences;
  collections: PersonalCollection[];
  updatePreferences: (patch: Partial<WorkspacePreferences>) => void;
  restorePreferences: () => void;
  createCollection: (name: string) => void;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => void;
  toggleCollectionEntry: (collectionId: string, entryId: string) => void;
  clearCollections: () => void;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);
const readPreferences = () => { try { return typeof window === "undefined" ? DEFAULT_PREFERENCES : parsePreferences(localStorage.getItem(PREFERENCES_KEY)); } catch { return { ...DEFAULT_PREFERENCES }; } };
const readCollections = () => { try { return typeof window === "undefined" ? [] : parseCollections(localStorage.getItem(COLLECTIONS_KEY)); } catch { return []; } };
const safelyStore = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* The workspace remains usable without persistence. */ } };

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(readPreferences);
  const [collections, setCollections] = useState<PersonalCollection[]>(readCollections);
  useEffect(() => { safelyStore(PREFERENCES_KEY, JSON.stringify(preferences)); }, [preferences]);
  useEffect(() => { safelyStore(COLLECTIONS_KEY, JSON.stringify({ version: 1, collections })); }, [collections]);
  useEffect(() => { document.documentElement.dataset.density = preferences.density; document.documentElement.dataset.motion = preferences.motion; document.documentElement.lang = preferences.locale === "zh" ? "zh-CN" : "en"; }, [preferences]);
  const value: WorkspaceValue = {
    preferences, collections,
    updatePreferences: patch => setPreferences(current => parsePreferences(JSON.stringify({ ...current, ...patch, version: 1 }))),
    restorePreferences: () => setPreferences({ ...DEFAULT_PREFERENCES }),
    createCollection: name => setCollections(current => createCollection(current, name)),
    renameCollection: (id, name) => setCollections(current => current.map(item => item.id === id && name.trim() ? { ...item, name: name.trim().slice(0, 80), updatedAt: new Date().toISOString() } : item)),
    deleteCollection: id => setCollections(current => current.filter(item => item.id !== id)),
    toggleCollectionEntry: (collectionId, entryId) => setCollections(current => current.find(item => item.id === collectionId)?.entryIds.includes(entryId) ? removeEntryFromCollection(current, collectionId, entryId) : addEntryToCollection(current, collectionId, entryId)),
    clearCollections: () => setCollections([]),
  };
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return value;
}
