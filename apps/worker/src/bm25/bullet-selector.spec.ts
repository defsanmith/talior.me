import { BulletSelector } from "./bullet-selector";
import type { BulletCandidate, SelectionConstraints } from "./types";

const defaultConstraints: SelectionConstraints = {
  maxBulletsPerParent: 4,
  similarityThreshold: 0.7,
  targetCount: { min: 12, max: 16 },
};

function makeCandidate(
  overrides: Partial<BulletCandidate> & { bulletId: string; parentId: string; score: number }
): BulletCandidate {
  return {
    content: "Bullet content",
    parentType: "experience",
    ...overrides,
  };
}

describe("BulletSelector", () => {
  describe("select", () => {
    it("returns empty array for no candidates", () => {
      expect(
        BulletSelector.select([], defaultConstraints)
      ).toEqual([]);
    });

    it("enforces max bullets per parent", () => {
      const candidates: BulletCandidate[] = [];
      const parentId = "exp1";
      for (let i = 0; i < 10; i++) {
        candidates.push(
          makeCandidate({
            bulletId: `b${i}`,
            parentId,
            score: 10 - i,
            content: `Unique content ${i}`,
          })
        );
      }
      const result = BulletSelector.select(candidates, {
        ...defaultConstraints,
        maxBulletsPerParent: 2,
        targetCount: { min: 0, max: 20 },
      });
      const fromParent = result.filter((b) => b.parentId === parentId);
      expect(fromParent.length).toBe(2);
      expect(fromParent[0].score).toBeGreaterThanOrEqual(fromParent[1].score);
    });

    it("returns at most targetCount.max bullets", () => {
      const candidates: BulletCandidate[] = [];
      for (let p = 0; p < 5; p++) {
        for (let i = 0; i < 4; i++) {
          candidates.push(
            makeCandidate({
              bulletId: `b${p}-${i}`,
              parentId: `parent${p}`,
              score: 10 - i,
              content: `Different content for ${p} ${i} xyz`,
            })
          );
        }
      }
      const result = BulletSelector.select(candidates, defaultConstraints);
      expect(result.length).toBeLessThanOrEqual(16);
    });

    it("deduplicates by similarity", () => {
      const candidates: BulletCandidate[] = [
        makeCandidate({
          bulletId: "1",
          parentId: "p1",
          score: 10,
          content: "Implemented REST API using Node and Express",
        }),
        makeCandidate({
          bulletId: "2",
          parentId: "p1",
          score: 8,
          content: "Implemented REST API with Node and Express",
        }),
      ];
      const result = BulletSelector.select(candidates, {
        ...defaultConstraints,
        similarityThreshold: 0.7,
        targetCount: { min: 0, max: 10 },
      });
      expect(result.length).toBe(1);
      expect(result[0].bulletId).toBe("1");
    });

    it("sorts by startDate desc then score", () => {
      const candidates: BulletCandidate[] = [
        makeCandidate({
          bulletId: "old",
          parentId: "p1",
          score: 5,
          startDate: "2020-01",
          content: "Old job",
        }),
        makeCandidate({
          bulletId: "new",
          parentId: "p2",
          score: 3,
          startDate: "2023-01",
          content: "New job",
        }),
      ];
      const result = BulletSelector.select(candidates, {
        ...defaultConstraints,
        targetCount: { min: 0, max: 10 },
      });
      expect(result[0].bulletId).toBe("new");
      expect(result[1].bulletId).toBe("old");
    });
  });

  describe("groupByParent", () => {
    it("groups bullets by parentId", () => {
      const bullets: BulletCandidate[] = [
        makeCandidate({ bulletId: "a", parentId: "p1", score: 1 }),
        makeCandidate({ bulletId: "b", parentId: "p1", score: 2 }),
        makeCandidate({ bulletId: "c", parentId: "p2", score: 3 }),
      ];
      const grouped = BulletSelector.groupByParent(bullets);
      expect(grouped.get("p1")?.length).toBe(2);
      expect(grouped.get("p2")?.length).toBe(1);
    });
  });

  describe("tokenOverlap", () => {
    it("returns 0 for disjoint text", () => {
      expect(
        BulletSelector.tokenOverlap("hello world", "foo bar")
      ).toBe(0);
    });

    it("returns 1 for identical text", () => {
      const text = "same content here";
      expect(BulletSelector.tokenOverlap(text, text)).toBe(1);
    });

    it("returns value between 0 and 1 for partial overlap", () => {
      const overlap = BulletSelector.tokenOverlap(
        "hello world foo",
        "hello world bar"
      );
      expect(overlap).toBeGreaterThan(0);
      expect(overlap).toBeLessThan(1);
    });
  });
});
