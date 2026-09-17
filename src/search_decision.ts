import type { VectorMatch } from "./infrai_property_index.ts";

export type SearchResult = VectorMatch & { reason: "semantic_match" | "urgent_maintenance" };

export function rankPropertyMatches(matches: VectorMatch[]): SearchResult[] {
  return matches
    .map((match) => {
      const urgent = match.metadata.kind === "maintenance_request" &&
        match.metadata.priority === "urgent";
      return {
        ...match,
        score: match.score + (urgent ? 0.08 : 0),
        reason: urgent ? "urgent_maintenance" as const : "semantic_match" as const,
      };
    })
    .sort((left, right) => right.score - left.score);
}
