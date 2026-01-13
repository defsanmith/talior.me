import { Injectable, NotFoundException } from "@nestjs/common";
import {
  CreateBulletDto,
  CreateProfileEducationDto,
  CreateProfileExperienceDto,
  CreateProfileProjectDto,
  CreateProfileSkillCategoryDto,
  CreateProfileSkillDto,
  UpdateProfileBulletDto,
  UpdateProfileEducationDto,
  UpdateProfileExperienceDto,
  UpdateProfileProjectDto,
  UpdateProfileSkillCategoryDto,
  UpdateProfileSkillDto,
  UpdateUserDto,
  UpdateBulletSkillsDto,
  UpdateProjectSkillsDto,
} from "@tailor.me/shared";
import { PrismaService } from "../prisma/prisma.service";

// Helper for bullet include with skills
const bulletInclude = {
  skills: {
    include: {
      skill: {
        include: {
          category: true,
        },
      },
    },
  },
};

// Helper for project include with bullets and skills
const projectInclude = {
  bullets: {
    include: bulletInclude,
  },
  skills: {
    include: {
      skill: {
        include: {
          category: true,
        },
      },
    },
  },
};

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
        bullets: {
          include: bulletInclude,
        },
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
      orderBy: {
        graduationDate: "desc",
      },
    });
  }

  async getProjects() {
    const user = await this.getUser();
    if (!user) return [];

    return this.prisma.project.findMany({
      where: { userId: user.id },
      include: projectInclude,
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getSkills() {
    const user = await this.getUser();
    if (!user) return [];

    return this.prisma.skill.findMany({
      where: { userId: user.id },
      include: {
        category: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async getSkillCategories() {
    const user = await this.getUser();
    if (!user) return [];

    return this.prisma.skillCategory.findMany({
      where: { userId: user.id },
      include: {
        skills: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  // ============================================
  // User methods
  // ============================================

  async updateUser(dto: UpdateUserDto) {
    const user = await this.getUser();
    if (!user) {
      throw new NotFoundException("No user found");
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: dto,
    });
  }

  // ============================================
  // Experience methods
  // ============================================

  async createExperience(dto: CreateProfileExperienceDto) {
    const user = await this.getUser();
    if (!user) {
      throw new NotFoundException("No user found");
    }

    return this.prisma.experience.create({
      data: {
        userId: user.id,
        ...dto,
      },
      include: {
        bullets: {
          include: bulletInclude,
        },
      },
    });
  }

  async updateExperience(id: string, dto: UpdateProfileExperienceDto) {
    const experience = await this.prisma.experience.findUnique({
      where: { id },
    });

    if (!experience) {
      throw new NotFoundException(`Experience with id ${id} not found`);
    }

    return this.prisma.experience.update({
      where: { id },
      data: dto,
      include: {
        bullets: {
          include: bulletInclude,
        },
      },
    });
  }

  async deleteExperience(id: string) {
    const experience = await this.prisma.experience.findUnique({
      where: { id },
    });

    if (!experience) {
      throw new NotFoundException(`Experience with id ${id} not found`);
    }

    await this.prisma.experience.delete({
      where: { id },
    });

    return { success: true };
  }

  // ============================================
  // Bullet methods
  // ============================================

  async createBullet(dto: CreateBulletDto) {
    return this.prisma.bullet.create({
      data: dto,
      include: bulletInclude,
    });
  }

  async updateBullet(id: string, dto: UpdateProfileBulletDto) {
    const bullet = await this.prisma.bullet.findUnique({
      where: { id },
    });

    if (!bullet) {
      throw new NotFoundException(`Bullet with id ${id} not found`);
    }

    return this.prisma.bullet.update({
      where: { id },
      data: dto,
      include: bulletInclude,
    });
  }

  async updateBulletSkills(id: string, dto: UpdateBulletSkillsDto) {
    const bullet = await this.prisma.bullet.findUnique({
      where: { id },
    });

    if (!bullet) {
      throw new NotFoundException(`Bullet with id ${id} not found`);
    }

    // Delete existing skills and add new ones
    await this.prisma.bulletSkill.deleteMany({
      where: { bulletId: id },
    });

    if (dto.skillIds.length > 0) {
      await this.prisma.bulletSkill.createMany({
        data: dto.skillIds.map((skillId) => ({
          bulletId: id,
          skillId,
        })),
      });
    }

    return this.prisma.bullet.findUnique({
      where: { id },
      include: bulletInclude,
    });
  }

  async deleteBullet(id: string) {
    const bullet = await this.prisma.bullet.findUnique({
      where: { id },
    });

    if (!bullet) {
      throw new NotFoundException(`Bullet with id ${id} not found`);
    }

    await this.prisma.bullet.delete({
      where: { id },
    });

    return { success: true };
  }

  // ============================================
  // Education methods
  // ============================================

  async createEducation(dto: CreateProfileEducationDto) {
    const user = await this.getUser();
    if (!user) {
      throw new NotFoundException("No user found");
    }

    return this.prisma.education.create({
      data: {
        userId: user.id,
        ...dto,
      },
    });
  }

  async updateEducation(id: string, dto: UpdateProfileEducationDto) {
    const education = await this.prisma.education.findUnique({
      where: { id },
    });

    if (!education) {
      throw new NotFoundException(`Education with id ${id} not found`);
    }

    return this.prisma.education.update({
      where: { id },
      data: dto,
    });
  }

  async deleteEducation(id: string) {
    const education = await this.prisma.education.findUnique({
      where: { id },
    });

    if (!education) {
      throw new NotFoundException(`Education with id ${id} not found`);
    }

    await this.prisma.education.delete({
      where: { id },
    });

    return { success: true };
  }

  // ============================================
  // Project methods
  // ============================================

  async createProject(dto: CreateProfileProjectDto) {
    const user = await this.getUser();
    if (!user) {
      throw new NotFoundException("No user found");
    }

    return this.prisma.project.create({
      data: {
        userId: user.id,
        ...dto,
      },
      include: projectInclude,
    });
  }

  async updateProject(id: string, dto: UpdateProfileProjectDto) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    return this.prisma.project.update({
      where: { id },
      data: dto,
      include: projectInclude,
    });
  }

  async updateProjectSkills(id: string, dto: UpdateProjectSkillsDto) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    // Delete existing skills and add new ones
    await this.prisma.projectSkill.deleteMany({
      where: { projectId: id },
    });

    if (dto.skillIds.length > 0) {
      await this.prisma.projectSkill.createMany({
        data: dto.skillIds.map((skillId) => ({
          projectId: id,
          skillId,
        })),
      });
    }

    return this.prisma.project.findUnique({
      where: { id },
      include: projectInclude,
    });
  }

  async deleteProject(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    await this.prisma.project.delete({
      where: { id },
    });

    return { success: true };
  }

  // ============================================
  // Skill Category methods
  // ============================================

  async createSkillCategory(dto: CreateProfileSkillCategoryDto) {
    const user = await this.getUser();
    if (!user) {
      throw new NotFoundException("No user found");
    }

    return this.prisma.skillCategory.create({
      data: {
        userId: user.id,
        ...dto,
      },
      include: {
        skills: true,
      },
    });
  }

  async updateSkillCategory(id: string, dto: UpdateProfileSkillCategoryDto) {
    const category = await this.prisma.skillCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Skill category with id ${id} not found`);
    }

    return this.prisma.skillCategory.update({
      where: { id },
      data: dto,
      include: {
        skills: true,
      },
    });
  }

  async deleteSkillCategory(id: string) {
    const category = await this.prisma.skillCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Skill category with id ${id} not found`);
    }

    await this.prisma.skillCategory.delete({
      where: { id },
    });

    return { success: true };
  }

  // ============================================
  // Skill methods
  // ============================================

  async createSkill(dto: CreateProfileSkillDto) {
    const user = await this.getUser();
    if (!user) {
      throw new NotFoundException("No user found");
    }

    return this.prisma.skill.create({
      data: {
        userId: user.id,
        ...dto,
      },
      include: {
        category: true,
      },
    });
  }

  async updateSkill(id: string, dto: UpdateProfileSkillDto) {
    const skill = await this.prisma.skill.findUnique({
      where: { id },
    });

    if (!skill) {
      throw new NotFoundException(`Skill with id ${id} not found`);
    }

    return this.prisma.skill.update({
      where: { id },
      data: dto,
      include: {
        category: true,
      },
    });
  }

  async deleteSkill(id: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id },
    });

    if (!skill) {
      throw new NotFoundException(`Skill with id ${id} not found`);
    }

    await this.prisma.skill.delete({
      where: { id },
    });

    return { success: true };
  }
}
