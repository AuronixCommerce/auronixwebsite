import { isDeveloperTopic } from "./developer-brand";
import type { AioSource } from "./types";

/** Only sources actually returned by retrieval appear in the activity panel. */
export function sourceActivityItems(sources: AioSource[]) {
  const seen = new Set<string>();
  return sources.flatMap(source => {
    const developer = isDeveloperTopic(source.title, [source.route || ""]);
    const key = source.id;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ key, title: source.title, developer }];
  });
}
