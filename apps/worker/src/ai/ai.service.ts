import { Injectable, Logger } from "@nestjs/common";
import { AIProvider } from "@tailor.me/shared";
import { IAIProvider } from "./ai-provider.interface";
import { GeminiProvider } from "./gemini.provider";
import { OpenAIProvider } from "./openai.provider";

/**
 * AIService acts as a factory that provides the appropriate AI provider
 * based on the AI_PROVIDER environment variable.
 *
 * Supported providers:
 * - OPENAI (default): Uses OpenAI GPT models
 * - GEMINI: Uses Google Gemini models
 */
@Injectable()
export class AIService implements IAIProvider {
  private readonly provider: IAIProvider;
  private readonly logger = new Logger(AIService.name);

  constructor() {
    const providerType = (process.env.AI_PROVIDER || "OPENAI").toUpperCase();

    this.logger.log(`Initializing AI service with provider: ${providerType}`);

    switch (providerType) {
      case AIProvider.GEMINI:
        this.provider = new GeminiProvider();
        break;
      case AIProvider.OPENAI:
      default:
        this.provider = new OpenAIProvider();
        break;
    }
  }

  async parseJobDescription(jobDescription: string) {
    return this.provider.parseJobDescription(jobDescription);
  }

  async rewriteBullet(
    bullet: { id: string; content: string; tags: string[]; skills: string[] },
    jd: any,
  ) {
    return this.provider.rewriteBullet(bullet, jd);
  }

  async selectRelevantContent(profile: any, parsedJd: any) {
    return this.provider.selectRelevantContent(profile, parsedJd);
  }
}
