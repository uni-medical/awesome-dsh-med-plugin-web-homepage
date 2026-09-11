import { Link } from "react-router-dom";
import { useWorkspace } from "../state/WorkspaceContext";

export function CollectionPicker({ entryId }: { entryId: string }) {
  const { collections, toggleCollectionEntry } = useWorkspace();
  return <details className="collection-picker" onClick={event => event.stopPropagation()}><summary aria-label="Add to collections">＋ Save</summary><div>{collections.length ? collections.map(collection => <label key={collection.id}><input type="checkbox" checked={collection.entryIds.includes(entryId)} onChange={() => toggleCollectionEntry(collection.id, entryId)}/><span>{collection.name}</span></label>) : <p>No personal collections yet.</p>}<Link to="/collections">Manage collections</Link></div></details>;
}
