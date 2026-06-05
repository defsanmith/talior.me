import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async createApiKey(userId: string, dto: CreateApiKeyDto) {
    const raw = crypto.randomBytes(24).toString("hex");
    const key = `tlr_${raw}`;
    const prefix = key.slice(0, 8);
    const hash = await bcrypt.hash(key, 10);

    const record = await this.prisma.apiKey.create({
      data: {
        userId,
        name: dto.name,
        prefix,
        hash,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    return {
      id: record.id,
      name: record.name,
      prefix: record.prefix,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      key,
    };
  }

  async listApiKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async deleteApiKey(id: string, userId: string) {
    const record = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!record || record.userId !== userId) {
      throw new NotFoundException("API key not found");
    }
    await this.prisma.apiKey.delete({ where: { id } });
  }

  async validateApiKey(rawKey: string): Promise<{ userId: string }> {
    const prefix = rawKey.slice(0, 8);
    const record = await this.prisma.apiKey.findUnique({ where: { prefix } });

    if (!record) throw new UnauthorizedException("Invalid API key");
    if (record.expiresAt && record.expiresAt < new Date()) {
      throw new UnauthorizedException("API key has expired");
    }

    const valid = await bcrypt.compare(rawKey, record.hash);
    if (!valid) throw new UnauthorizedException("Invalid API key");

    await this.prisma.apiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });

    return { userId: record.userId };
  }
}
