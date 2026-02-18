import type { BulletCandidate, SelectionConstraints, SelectedBullet } from "./types";

export class BulletSelector {
  static select(
    candidates: BulletCandidate[],
    constraints: SelectionConstraints
  ): SelectedBullet[] {
    if (candidates.length === 0) return [];

    const grouped = this.groupByParent(candidates);

    const capped = new Map<string, BulletCandidate[]>();
    for (const [parentId, bullets] of grouped) {
      const sorted = [...bullets].sort((a, b) => b.score - a.score);
      capped.set(parentId, sorted.slice(0, constraints.maxBulletsPerParent));
    }

    let selected: BulletCandidate[] = Array.from(capped.values()).flat();
    selected = this.deduplicateBySimilarity(
      selected,
      constraints.similarityThreshold
    );

    selected.sort((a, b) => {
      const dateA = a.startDate ?? "";
      const dateB = b.startDate ?? "";
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      return b.score - a.score;
    });

    const { max } = constraints.targetCount;
    return selected.slice(0, max);
  }

  static groupByParent(
    bullets: BulletCandidate[]
  ): Map<string, BulletCandidate[]> {
    const map = new Map<string, BulletCandidate[]>();
    for (const b of bullets) {
      const list = map.get(b.parentId) ?? [];
      list.push(b);
      map.set(b.parentId, list);
    }
    return map;
  }

  static deduplicateBySimilarity(
    bullets: BulletCandidate[],
    threshold: number
  ): BulletCandidate[] {
    const result: BulletCandidate[] = [];
    for (const bullet of bullets) {
      const isDuplicate = result.some((existing) => {
        const similarity = this.tokenOverlap(bullet.content, existing.content);
        return similarity > threshold;
      });
      if (!isDuplicate) result.push(bullet);
    }
    return result;
  }

  /** Exposed for unit testing. */
  static tokenOverlap(a: string, b: string): number {
    const tokensA = new Set(
      a
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 0)
    );
    const tokensB = new Set(
      b
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 0)
    );
    const intersection = new Set(
      [...tokensA].filter((t) => tokensB.has(t))
    );
    const union = new Set([...tokensA, ...tokensB]);
    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }
}
