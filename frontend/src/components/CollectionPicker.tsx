import { Link } from "react-router-dom";
import { useWorkspace } from "../state/WorkspaceContext";
import { useUiLanguage } from "../state/useUiLanguage";

export function CollectionPicker({ entryId }: { entryId: string }) {
  const { collections, toggleCollectionEntry } = useWorkspace();
  const { t } = useUiLanguage();
  return <details className="collection-picker" onClick={event => event.stopPropagation()}><summary aria-label={t("collections.addAria")}>{t("collections.save")}</summary><div>{collections.length ? collections.map(collection => <label key={collection.id}><input type="checkbox" checked={collection.entryIds.includes(entryId)} onChange={() => toggleCollectionEntry(collection.id, entryId)}/><span>{collection.name}</span></label>) : <p>{t("collections.noneYet")}</p>}<Link to="/collections">{t("collections.manage")}</Link></div></details>;
}
