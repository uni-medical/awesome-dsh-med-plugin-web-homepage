// FNV-1a over UTF-16 code units. Must stay identical to src/lib/shard.ts.
export function shardOf(id, count) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % count;
}
