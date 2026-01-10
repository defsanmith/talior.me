import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBulletDto, CreateExperienceDto } from "@tailor.me/shared";

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getUser() {
    return this.prisma.user.findFirst();
  }

  async getExperiences() {
    const user = await this.getUser();
    if (!user) return [];

    return this.prisma.experience.findMany({
      where: { userId: user.id },
      include: {
        bullets: true,
      },
      orderBy: {
        startDate: "desc",
      },
    });
  }

  async getEducation() {
    const user = await this.getUser();
    if (!user) return [];

    return this.prisma.education.findMany({
      where: { userId: user.id },
    });
  }

  async getProjects() {
    const user = await this.getUser();
    if (!user) return [];

    return this.prisma.project.findMany({
      where: { userId: user.id },
    });
  }

  async getSkills() {
    const user = await this.getUser();
    if (!user) return [];

    return this.prisma.skill.findMany({
      where: { userId: user.id },
    });
  }

  async createExperience(dto: CreateExperienceDto) {
    const user = await this.getUser();
    if (!user) {
      throw new Error("No user found");
    }

    return this.prisma.experience.create({
      data: {
        userId: user.id,
        ...dto,
      },
    });
  }

  async createBullet(dto: CreateBulletDto) {
    return this.prisma.bullet.create({
      data: dto,
    });
  }
}
