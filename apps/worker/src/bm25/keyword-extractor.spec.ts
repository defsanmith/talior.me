import { KeywordExtractor } from "./keyword-extractor";

describe("KeywordExtractor", () => {
  describe("extractKeywords", () => {
    it("returns empty array for empty string", () => {
      expect(KeywordExtractor.extractKeywords("")).toEqual([]);
    });

    it("tokenizes, lowercases, and removes stopwords", () => {
      const result = KeywordExtractor.extractKeywords(
        "We are building APIs and services for the platform"
      );
      expect(result).toContain("building");
      expect(result).toContain("apis");
      expect(result).toContain("services");
      expect(result).toContain("platform");
      expect(result).not.toContain("we");
      expect(result).not.toContain("are");
      expect(result).not.toContain("the");
      expect(result).not.toContain("for");
    });

    it("returns top terms by frequency", () => {
      const result = KeywordExtractor.extractKeywords(
        "javascript javascript typescript typescript typescript react"
      );
      expect(result[0]).toBe("typescript");
      expect(result[1]).toBe("javascript");
      expect(result).toContain("react");
    });

    it("filters tokens shorter than 3 chars", () => {
      const result = KeywordExtractor.extractKeywords("go we us it");
      expect(result.every((w) => w.length > 2)).toBe(true);
    });

    it("handles special characters", () => {
      const result = KeywordExtractor.extractKeywords("node.js, react & vue!");
      expect(result.some((w) => w === "node")).toBe(true);
      expect(result.some((w) => w === "react")).toBe(true);
      expect(result.some((w) => w === "vue")).toBe(true);
    });

    it("respects maxKeywords limit", () => {
      const long =
        "one two three four five six seven eight nine ten eleven twelve";
      const result = KeywordExtractor.extractKeywords(long, 5);
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe("extractSkills", () => {
    it("returns empty array for empty string", () => {
      expect(KeywordExtractor.extractSkills("")).toEqual([]);
    });

    it("matches skills from dictionary case-insensitively", () => {
      const result = KeywordExtractor.extractSkills(
        "We use REACT and TypeScript and Kubernetes"
      );
      expect(result).toContain("React");
      expect(result).toContain("TypeScript");
      expect(result).toContain("Kubernetes");
    });

    it("returns empty when no skills mentioned", () => {
      const result = KeywordExtractor.extractSkills("Hello world random text");
      expect(result.length).toBe(0);
    });

    it("includes backend and cloud terms", () => {
      const result = KeywordExtractor.extractSkills(
        "Experience with Node.js, AWS, Docker and PostgreSQL"
      );
      expect(result).toContain("Node.js");
      expect(result).toContain("AWS");
      expect(result).toContain("Docker");
      expect(result).toContain("PostgreSQL");
    });
  });

  describe("extractTechStack", () => {
    it("returns empty array for empty string", () => {
      expect(KeywordExtractor.extractTechStack("")).toEqual([]);
    });

    it("matches tech patterns", () => {
      const result = KeywordExtractor.extractTechStack(
        "We use Kubernetes (k8s) and Docker"
      );
      expect(result.map((s) => s.toLowerCase())).toContain("kubernetes");
      expect(result.map((s) => s.toLowerCase())).toContain("docker");
    });

    it("deduplicates matches", () => {
      const result = KeywordExtractor.extractTechStack("react react React");
      expect(result.filter((s) => s === "react").length).toBe(1);
    });
  });

  describe("extract", () => {
    it("returns keywords, skills, and techStack", () => {
      const result = KeywordExtractor.extract(
        "Senior engineer with React and Node.js. Building microservices on AWS."
      );
      expect(result).toHaveProperty("keywords");
      expect(result).toHaveProperty("skills");
      expect(result).toHaveProperty("techStack");
      expect(Array.isArray(result.keywords)).toBe(true);
      expect(Array.isArray(result.skills)).toBe(true);
      expect(Array.isArray(result.techStack)).toBe(true);
      expect(result.skills).toContain("React");
      expect(result.skills).toContain("Node.js");
      expect(result.skills).toContain("AWS");
    });
  });
});
