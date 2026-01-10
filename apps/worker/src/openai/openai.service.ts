import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ParsedJDSchema, ParsedJD, RewrittenBullet } from '@tailor.me/shared';

@Injectable()
export class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async parseJobDescription(jobDescription: string): Promise<ParsedJD> {
    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a job description parser. Extract required skills, nice-to-have skills, responsibilities, and keywords from the job description. Return only valid JSON.',
        },
        {
          role: 'user',
          content: `Parse this job description:\n\n${jobDescription}\n\nReturn JSON with: required_skills (array), nice_to_have (array), responsibilities (array), keywords (array)`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return ParsedJDSchema.parse(result);
  }

  async rewriteBullet(
    bullet: { id: string; content: string; tags: string[]; tech: string[] },
    jd: ParsedJD,
  ): Promise<RewrittenBullet> {
    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a resume bullet rewriter. Rewrite bullets to match the job description but ONLY rephrase existing content. 
          
CRITICAL RULES:
- DO NOT add new metrics, numbers, or percentages not in the original
- DO NOT add new technologies not in the original bullet's tech/tags
- DO NOT add scope words like "led", "owned", "architected" unless already present
- DO NOT make new claims about impact or responsibility
- ONLY rephrase and reorder existing information to emphasize relevance

Return JSON with:
- bulletId: the bullet ID
- rewrittenText: the rewritten text (grounded in original)
- evidenceBulletIds: [bulletId] (always just the original bullet)
- riskFlags: array of any concerns (empty if none)`,
        },
        {
          role: 'user',
          content: `Original bullet: "${bullet.content}"
Tech/Tags: ${[...bullet.tech, ...bullet.tags].join(', ')}

Job requires: ${jd.required_skills.join(', ')}
Keywords: ${jd.keywords.join(', ')}

Rewrite to emphasize relevance while staying 100% grounded in the original content.`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return {
      bulletId: bullet.id,
      rewrittenText: result.rewrittenText || bullet.content,
      evidenceBulletIds: [bullet.id],
      riskFlags: result.riskFlags || [],
    };
  }
}
