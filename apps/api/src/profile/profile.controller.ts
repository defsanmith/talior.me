import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
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
import { CurrentUser, JwtPayload } from "../auth/decorators/current-user.decorator";
import { ProfileService } from "./profile.service";

@Controller("api/profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(@CurrentUser() user: JwtPayload) {
    const userData = await this.profileService.getUser(user.userId);
    const experiences = await this.profileService.getExperiences(user.userId);
    const education = await this.profileService.getEducation(user.userId);
    const projects = await this.profileService.getProjects(user.userId);
    const skills = await this.profileService.getSkills(user.userId);
    const skillCategories = await this.profileService.getSkillCategories(user.userId);

    return {
      user: userData,
      experiences,
      education,
      projects,
      skills,
      skillCategories,
    };
  }

  // ============================================
  // User endpoints
  // ============================================

  @Patch("user")
  async updateUser(
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.updateUser(dto, user.userId);
  }

  // ============================================
  // Experience endpoints
  // ============================================

  @Post("experiences")
  async createExperience(
    @Body() dto: CreateProfileExperienceDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.createExperience(dto, user.userId);
  }

  @Put("experiences/:id")
  async updateExperience(
    @Param("id") id: string,
    @Body() dto: UpdateProfileExperienceDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.updateExperience(id, dto, user.userId);
  }

  @Delete("experiences/:id")
  async deleteExperience(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.deleteExperience(id, user.userId);
  }

  // ============================================
  // Bullet endpoints
  // ============================================

  @Post("bullets")
  async createBullet(
    @Body() dto: CreateBulletDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.createBullet(dto, user.userId);
  }

  @Put("bullets/:id")
  async updateBullet(
    @Param("id") id: string,
    @Body() dto: UpdateProfileBulletDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.updateBullet(id, dto, user.userId);
  }

  @Put("bullets/:id/skills")
  async updateBulletSkills(
    @Param("id") id: string,
    @Body() dto: UpdateBulletSkillsDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.updateBulletSkills(id, dto, user.userId);
  }

  @Delete("bullets/:id")
  async deleteBullet(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.deleteBullet(id, user.userId);
  }

  // ============================================
  // Education endpoints
  // ============================================

  @Post("education")
  async createEducation(
    @Body() dto: CreateProfileEducationDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.createEducation(dto, user.userId);
  }

  @Put("education/:id")
  async updateEducation(
    @Param("id") id: string,
    @Body() dto: UpdateProfileEducationDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.updateEducation(id, dto, user.userId);
  }

  @Delete("education/:id")
  async deleteEducation(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.deleteEducation(id, user.userId);
  }

  // ============================================
  // Project endpoints
  // ============================================

  @Post("projects")
  async createProject(
    @Body() dto: CreateProfileProjectDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.createProject(dto, user.userId);
  }

  @Put("projects/:id")
  async updateProject(
    @Param("id") id: string,
    @Body() dto: UpdateProfileProjectDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.updateProject(id, dto, user.userId);
  }

  @Put("projects/:id/skills")
  async updateProjectSkills(
    @Param("id") id: string,
    @Body() dto: UpdateProjectSkillsDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.updateProjectSkills(id, dto, user.userId);
  }

  @Delete("projects/:id")
  async deleteProject(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.deleteProject(id, user.userId);
  }

  // ============================================
  // Skill Category endpoints
  // ============================================

  @Post("skill-categories")
  async createSkillCategory(
    @Body() dto: CreateProfileSkillCategoryDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.createSkillCategory(dto, user.userId);
  }

  @Put("skill-categories/:id")
  async updateSkillCategory(
    @Param("id") id: string,
    @Body() dto: UpdateProfileSkillCategoryDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.updateSkillCategory(id, dto, user.userId);
  }

  @Delete("skill-categories/:id")
  async deleteSkillCategory(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.deleteSkillCategory(id, user.userId);
  }

  // ============================================
  // Skill endpoints
  // ============================================

  @Post("skills")
  async createSkill(
    @Body() dto: CreateProfileSkillDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.createSkill(dto, user.userId);
  }

  @Put("skills/:id")
  async updateSkill(
    @Param("id") id: string,
    @Body() dto: UpdateProfileSkillDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.updateSkill(id, dto, user.userId);
  }

  @Delete("skills/:id")
  async deleteSkill(
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.profileService.deleteSkill(id, user.userId);
  }

  @Post("seed")
  async seed() {
    // This is handled by prisma seed script
    return { message: "Use `pnpm db:seed` instead" };
  }
}
