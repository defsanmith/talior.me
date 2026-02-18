import { Injectable, Logger } from "@nestjs/common";
import { Client } from "@opensearch-project/opensearch";

export interface BulletSearchHit {
  bulletId: string;
  userId: string;
  content: string;
  score: number;
  parentId: string;
  parentType: string;
  parentTitle?: string;
  parentCompany?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  skills?: string[];
}

@Injectable()
export class SearchService {
  private readonly client: Client;
  private readonly logger = new Logger(SearchService.name);
  private readonly indexName: string;

  constructor() {
    this.indexName = process.env.OPENSEARCH_INDEX_BULLETS || "bullets";
    this.client = new Client({
      node: process.env.OPENSEARCH_URL || "http://localhost:9200",
      auth: {
        username: process.env.OPENSEARCH_USERNAME || "admin",
        password: process.env.OPENSEARCH_PASSWORD || "admin",
      },
    });
  }

  async queryBullets(
    userId: string,
    keywords: string[],
    skills: string[],
    size = 50
  ): Promise<BulletSearchHit[]> {
    const query = [...keywords, ...skills].filter(Boolean).join(" ");
    if (!query.trim()) {
      return [];
    }

    try {
      const response = await this.client.search({
        index: this.indexName,
        body: {
          query: {
            bool: {
              must: [
                { term: { userId } },
                {
                  multi_match: {
                    query,
                    fields: ["content^2", "parentTitle", "skills^1.5"],
                    type: "best_fields",
                  },
                },
              ],
            },
          },
          size,
        },
      });

      const hits = (response.body as any).hits?.hits ?? [];
      return hits.map((hit: any) => ({
        ...hit._source,
        score: hit._score ?? 0,
      }));
    } catch (error) {
      this.logger.error("OpenSearch query failed", error);
      throw error;
    }
  }
}
