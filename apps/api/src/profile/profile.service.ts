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

  async getUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async getExperiences(userId: string) {
    return this.prisma.experience.findMany({
      where: { userId },
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

  async getEducation(userId: string) {
    return this.prisma.education.findMany({
      where: { userId },
      orderBy: {
        graduationDate: "desc",
      },
    });
  }

  async getProjects(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      include: projectInclude,
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getSkills(userId: string) {
    return this.prisma.skill.findMany({
      where: { userId },
      include: {
        category: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async getSkillCategories(userId: string) {
    return this.prisma.skillCategory.findMany({
      where: { userId },
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

  async updateUser(dto: UpdateUserDto, userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
  }

  // ============================================
  // Experience methods
  // ============================================

  async createExperience(dto: CreateProfileExperienceDto, userId: string) {
    return this.prisma.experience.create({
      data: {
        userId,
        ...dto,
      },
      include: {
        bullets: {
          include: bulletInclude,
        },
      },
    });
  }

  async updateExperience(id: string, dto: UpdateProfileExperienceDto, userId: string) {
    const experience = await this.prisma.experience.findUnique({
      where: { id },
    });

    if (!experience) {
      throw new NotFoundException(`Experience with id ${id} not found`);
    }

    if (experience.userId !== userId) {
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

  async deleteExperience(id: string, userId: string) {
    const experience = await this.prisma.experience.findUnique({
      where: { id },
    });

    if (!experience) {
      throw new NotFoundException(`Experience with id ${id} not found`);
    }

    if (experience.userId !== userId) {
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

  async createBullet(dto: CreateBulletDto, userId: string) {
    // Verify that the bullet belongs to the user's experience or project
    if (dto.experienceId) {
      const experience = await this.prisma.experience.findUnique({
        where: { id: dto.experienceId },
      });
      if (!experience || experience.userId !== userId) {
        throw new NotFoundException("Experience not found");
      }
    }
    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
      });
      if (!project || project.userId !== userId) {
        throw new NotFoundException("Project not found");
      }
    }

    return this.prisma.bullet.create({
      data: dto,
      include: bulletInclude,
    });
  }

  async updateBullet(id: string, dto: UpdateProfileBulletDto, userId: string) {
    const bullet = await this.prisma.bullet.findUnique({
      where: { id },
      include: {
        experience: true,
        project: true,
      },
    });

    if (!bullet) {
      throw new NotFoundException(`Bullet with id ${id} not found`);
    }

    // Verify ownership through experience or project
    if (bullet.experience && bullet.experience.userId !== userId) {
      throw new NotFoundException(`Bullet with id ${id} not found`);
    }
    if (bullet.project && bullet.project.userId !== userId) {
      throw new NotFoundException(`Bullet with id ${id} not found`);
    }

    return this.prisma.bullet.update({
      where: { id },
      data: dto,
      include: bulletInclude,
    });
  }

  async updateBulletSkills(id: string, dto: UpdateBulletSkillsDto, userId: string) {
    const bullet = await this.prisma.bullet.findUnique({
      where: { id },
      include: {
        experience: true,
        project: true,
      },
    });

    if (!bullet) {
      throw new NotFoundException(`Bullet with id ${id} not found`);
    }

    // Verify ownership through experience or project
    if (bullet.experience && bullet.experience.userId !== userId) {
      throw new NotFoundException(`Bullet with id ${id} not found`);
    }
    if (bullet.project && bullet.project.userId !== userId) {
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

  async deleteBullet(id: string, userId: string) {
    const bullet = await this.prisma.bullet.findUnique({
      where: { id },
      include: {
        experience: true,
        project: true,
      },
    });

    if (!bullet) {
      throw new NotFoundException(`Bullet with id ${id} not found`);
    }

    // Verify ownership through experience or project
    if (bullet.experience && bullet.experience.userId !== userId) {
      throw new NotFoundException(`Bullet with id ${id} not found`);
    }
    if (bullet.project && bullet.project.userId !== userId) {
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

  async createEducation(dto: CreateProfileEducationDto, userId: string) {
    return this.prisma.education.create({
      data: {
        userId,
        ...dto,
      },
    });
  }

  async updateEducation(id: string, dto: UpdateProfileEducationDto, userId: string) {
    const education = await this.prisma.education.findUnique({
      where: { id },
    });

    if (!education) {
      throw new NotFoundException(`Education with id ${id} not found`);
    }

    if (education.userId !== userId) {
      throw new NotFoundException(`Education with id ${id} not found`);
    }

    return this.prisma.education.update({
      where: { id },
      data: dto,
    });
  }

  async deleteEducation(id: string, userId: string) {
    const education = await this.prisma.education.findUnique({
      where: { id },
    });

    if (!education) {
      throw new NotFoundException(`Education with id ${id} not found`);
    }

    if (education.userId !== userId) {
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

  async createProject(dto: CreateProfileProjectDto, userId: string) {
    return this.prisma.project.create({
      data: {
        userId,
        ...dto,
      },
      include: projectInclude,
    });
  }

  async updateProject(id: string, dto: UpdateProfileProjectDto, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    if (project.userId !== userId) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    return this.prisma.project.update({
      where: { id },
      data: dto,
      include: projectInclude,
    });
  }

  async updateProjectSkills(id: string, dto: UpdateProjectSkillsDto, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    if (project.userId !== userId) {
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

  async deleteProject(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    if (project.userId !== userId) {
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

  async createSkillCategory(dto: CreateProfileSkillCategoryDto, userId: string) {
    return this.prisma.skillCategory.create({
      data: {
        userId,
        ...dto,
      },
      include: {
        skills: true,
      },
    });
  }

  async updateSkillCategory(id: string, dto: UpdateProfileSkillCategoryDto, userId: string) {
    const category = await this.prisma.skillCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Skill category with id ${id} not found`);
    }

    if (category.userId !== userId) {
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

  async deleteSkillCategory(id: string, userId: string) {
    const category = await this.prisma.skillCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Skill category with id ${id} not found`);
    }

    if (category.userId !== userId) {
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

  async createSkill(dto: CreateProfileSkillDto, userId: string) {
    // Verify category belongs to user if provided
    if (dto.categoryId) {
      const category = await this.prisma.skillCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category || category.userId !== userId) {
        throw new NotFoundException("Skill category not found");
      }
    }

    return this.prisma.skill.create({
      data: {
        userId,
        ...dto,
      },
      include: {
        category: true,
      },
    });
  }

  async updateSkill(id: string, dto: UpdateProfileSkillDto, userId: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id },
    });

    if (!skill) {
      throw new NotFoundException(`Skill with id ${id} not found`);
    }

    if (skill.userId !== userId) {
      throw new NotFoundException(`Skill with id ${id} not found`);
    }

    // Verify category belongs to user if provided
    if (dto.categoryId) {
      const category = await this.prisma.skillCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category || category.userId !== userId) {
        throw new NotFoundException("Skill category not found");
      }
    }

    return this.prisma.skill.update({
      where: { id },
      data: dto,
      include: {
        category: true,
      },
    });
  }

  async deleteSkill(id: string, userId: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id },
    });

    if (!skill) {
      throw new NotFoundException(`Skill with id ${id} not found`);
    }

    if (skill.userId !== userId) {
      throw new NotFoundException(`Skill with id ${id} not found`);
    }

    await this.prisma.skill.delete({
      where: { id },
    });

    return { success: true };
  }
}
