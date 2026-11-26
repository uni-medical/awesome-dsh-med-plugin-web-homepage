import { parseComponentDetailShard, parseComponentIndex, type ComponentDetail, type ComponentIndex } from "../lib/components";
import { shardOf } from "../lib/shard";

export interface ComponentClient {
  loadIndex(): Promise<ComponentIndex>;
  getDetail(id: string): Promise<ComponentDetail | undefined>;
}

type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Static client over the generated files in public/data/components/. Responses are cached per session. */
export function createComponentClient(fetcher: Fetcher, baseUrl: string): ComponentClient {
  const root = `${baseUrl.replace(/\/?$/, "/")}data/components/`;
  let index: Promise<ComponentIndex> | undefined;
  const shards = new Map<number, Promise<Map<string, ComponentDetail>>>();

  async function readJson(path: string): Promise<unknown> {
    const response = await fetcher(`${root}${path}`);
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
  }

  return {
    loadIndex() {
      index ??= readJson("index.json").then(parseComponentIndex);
      index.catch(() => { index = undefined; });
      return index;
    },
    async getDetail(id) {
      const shard = shardOf(id);
      let pending = shards.get(shard);
      if (!pending) {
        pending = readJson(`detail/${String(shard).padStart(3, "0")}.json`).then(parseComponentDetailShard);
        pending.catch(() => shards.delete(shard));
        shards.set(shard, pending);
      }
      return (await pending).get(id);
    },
  };
}

export const componentClient = createComponentClient((url) => fetch(url), import.meta.env.BASE_URL);
