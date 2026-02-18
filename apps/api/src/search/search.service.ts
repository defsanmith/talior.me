import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Client } from "@opensearch-project/opensearch";
import { PrismaService } from "../prisma/prisma.service";
import type { BulletSearchHit } from "./types/opensearch.types";
import * as bulletsMapping from "./mappings/bullets.json";

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly client: Client;
  private readonly logger = new Logger(SearchService.name);
  private readonly indexName: string;

  constructor(private prisma: PrismaService) {
    this.indexName = process.env.OPENSEARCH_INDEX_BULLETS || "bullets";
    this.client = new Client({
      node: process.env.OPENSEARCH_URL || "http://localhost:9200",
      auth: {
        username: process.env.OPENSEARCH_USERNAME || "admin",
        password: process.env.OPENSEARCH_PASSWORD || "admin",
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureIndex();
    } catch {
      this.logger.warn(
        "OpenSearch index creation skipped (OpenSearch may be unavailable)"
      );
    }
  }

  async health(): Promise<{ status: string; cluster?: string }> {
    try {
      const response = await this.client.cluster.health();
      const body = response.body as { status: string; cluster_name?: string };
      return {
        status: body.status === "green" || body.status === "yellow" ? "ok" : body.status,
        cluster: body.cluster_name,
      };
    } catch (error) {
      this.logger.warn("OpenSearch health check failed", error);
      return { status: "unavailable" };
    }
  }

  async ensureIndex(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({
        index: this.indexName,
      });
      if (exists.body) {
        return;
      }
      const body =
        (bulletsMapping as { default?: typeof bulletsMapping }).default ??
        bulletsMapping;
      await this.client.indices.create({
        index: this.indexName,
        body: body as Record<string, unknown>,
      });
      this.logger.log(`Created OpenSearch index: ${this.indexName}`);
    } catch (error) {
      this.logger.error("Failed to create OpenSearch index", error);
      throw error;
    }
  }

  async indexBullet(bulletId: string): Promise<void> {
    try {
      const bullet = await this.prisma.bullet.findUnique({
        where: { id: bulletId },
        include: {
          experience: true,
          project: true,
          skills: { include: { skill: true } },
        },
      });

      if (!bullet) return;

      const userId =
        bullet.experience?.userId ?? bullet.project?.userId ?? null;
      if (!userId) return;

      const doc = {
        bulletId: bullet.id,
        userId,
        content: bullet.content,
        tags: bullet.tags,
        skills: bullet.skills.map((bs) => bs.skill.name),
        parentType: bullet.experienceId ? "experience" : "project",
        parentId: bullet.experienceId ?? bullet.projectId!,
        parentTitle: bullet.experience?.title ?? bullet.project?.name ?? "",
        parentCompany: bullet.experience?.company ?? undefined,
        startDate: bullet.experience?.startDate ?? bullet.project?.date ?? undefined,
        endDate: bullet.experience?.endDate ?? undefined,
      };

      await this.client.index({
        index: this.indexName,
        id: bullet.id,
        body: doc,
        refresh: true,
      });
    } catch (error) {
      this.logger.error(`Failed to index bullet ${bulletId}`, error);
    }
  }

  async deleteBullet(bulletId: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.indexName,
        id: bulletId,
      });
    } catch (error) {
      this.logger.error(`Failed to delete bullet ${bulletId} from index`, error);
    }
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
  }

  async reindexAll(): Promise<{ indexed: number }> {
    const bullets = await this.prisma.bullet.findMany({
      include: {
        experience: true,
        project: true,
        skills: { include: { skill: true } },
      },
    });

    for (const bullet of bullets) {
      await this.indexBullet(bullet.id);
    }

    this.logger.log(`Reindexed ${bullets.length} bullets`);
    return { indexed: bullets.length };
  }
}
