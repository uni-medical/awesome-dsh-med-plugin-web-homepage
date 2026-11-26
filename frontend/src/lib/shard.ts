/** Number of detail files under public/data/components/detail/. Must match the import script. */
export const DETAIL_SHARD_COUNT = 128;

/** FNV-1a over UTF-16 code units. Must stay identical to scripts/lib/shard.mjs. */
export function shardOf(id: string, count = DETAIL_SHARD_COUNT): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % count;
}
