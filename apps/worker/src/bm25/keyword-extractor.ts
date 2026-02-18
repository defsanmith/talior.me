import { SKILL_DICTIONARY } from "./skill-dictionary";

// TODO: Create a robust stopwords list
const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "that",
  "the",
  "to",
  "was",
  "will",
  "with",
  "we",
  "you",
  "our",
  "their",
  "this",
  "have",
  "had",
  "or",
  "but",
  "not",
  "can",
  "all",
  "each",
  "other",
  "into",
  "up",
  "out",
  "if",
  "when",
  "where",
  "which",
  "who",
  "how",
  "about",
  "than",
  "then",
  "so",
  "some",
  "any",
  "no",
  "only",
  "own",
  "same",
  "just",
  "being",
  "both",
  "between",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "such",
  "them",
  "these",
  "they",
]);

const TECH_PATTERNS = [
  /\breact\.?js\b/gi,
  /\bvue\.?js\b/gi,
  /\bangular\b/gi,
  /\bnext\.?js\b/gi,
  /\bnode\.?js\b/gi,
  /\bexpress\.?js\b/gi,
  /\bnest\.?js\b/gi,
  /\btypescript\b/gi,
  /\bjavascript\b/gi,
  /\bkubernetes\b/gi,
  /\bk8s\b/gi,
  /\bdocker\b/gi,
  /\baws\b/gi,
  /\bazure\b/gi,
  /\bgcp\b/gi,
  /\bterraform\b/gi,
  /\bpostgres(ql)?\b/gi,
  /\bmysql\b/gi,
  /\bmongodb\b/gi,
  /\bredis\b/gi,
  /\belasticsearch\b/gi,
  /\bopensearch\b/gi,
  /\bkafka\b/gi,
  /\brabbitmq\b/gi,
  /\bgraphql\b/gi,
  /\bgrpc\b/gi,
  /\bmicroservices\b/gi,
  /\bterraform\b/gi,
  /\blambda\b/gi,
  /\bgithub\s*actions\b/gi,
  /\bjenkins\b/gi,
  /\bjest\b/gi,
  /\bcypress\b/gi,
];

export interface ExtractedTerms {
  keywords: string[];
  skills: string[];
  techStack: string[];
}

export class KeywordExtractor {
  static extract(text: string): ExtractedTerms {
    const keywords = this.extractKeywords(text);
    const skills = this.extractSkills(text);
    const techStack = this.extractTechStack(text);
    return { keywords, skills, techStack };
  }

  static extractKeywords(text: string, maxKeywords = 20): string[] {
    if (!text || typeof text !== "string") return [];

    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t));

    const freq = new Map<string, number>();
    for (const t of tokens) {
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }

    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  static extractSkills(text: string): string[] {
    if (!text || typeof text !== "string") return [];

    const lowerText = text.toLowerCase();
    return SKILL_DICTIONARY.filter((skill) =>
      lowerText.includes(skill.toLowerCase()),
    );
  }

  static extractTechStack(text: string): string[] {
    if (!text || typeof text !== "string") return [];

    const matches: string[] = [];
    for (const pattern of TECH_PATTERNS) {
      const found = text.match(pattern);
      if (found) {
        matches.push(...found.map((m) => m.toLowerCase()));
      }
    }
    return [...new Set(matches)];
  }
}
