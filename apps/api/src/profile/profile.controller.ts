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
import { ProfileService } from "./profile.service";

@Controller("api/profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile() {
    const user = await this.profileService.getUser();
    const experiences = await this.profileService.getExperiences();
    const education = await this.profileService.getEducation();
    const projects = await this.profileService.getProjects();
    const skills = await this.profileService.getSkills();
    const skillCategories = await this.profileService.getSkillCategories();

    return {
      user,
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
  async updateUser(@Body() dto: UpdateUserDto) {
    return this.profileService.updateUser(dto);
  }

  // ============================================
  // Experience endpoints
  // ============================================

  @Post("experiences")
  async createExperience(@Body() dto: CreateProfileExperienceDto) {
    return this.profileService.createExperience(dto);
  }

  @Put("experiences/:id")
  async updateExperience(
    @Param("id") id: string,
    @Body() dto: UpdateProfileExperienceDto
  ) {
    return this.profileService.updateExperience(id, dto);
  }

  @Delete("experiences/:id")
  async deleteExperience(@Param("id") id: string) {
    return this.profileService.deleteExperience(id);
  }

  // ============================================
  // Bullet endpoints
  // ============================================

  @Post("bullets")
  async createBullet(@Body() dto: CreateBulletDto) {
    return this.profileService.createBullet(dto);
  }

  @Put("bullets/:id")
  async updateBullet(
    @Param("id") id: string,
    @Body() dto: UpdateProfileBulletDto
  ) {
    return this.profileService.updateBullet(id, dto);
  }

  @Put("bullets/:id/skills")
  async updateBulletSkills(
    @Param("id") id: string,
    @Body() dto: UpdateBulletSkillsDto
  ) {
    return this.profileService.updateBulletSkills(id, dto);
  }

  @Delete("bullets/:id")
  async deleteBullet(@Param("id") id: string) {
    return this.profileService.deleteBullet(id);
  }

  // ============================================
  // Education endpoints
  // ============================================

  @Post("education")
  async createEducation(@Body() dto: CreateProfileEducationDto) {
    return this.profileService.createEducation(dto);
  }

  @Put("education/:id")
  async updateEducation(
    @Param("id") id: string,
    @Body() dto: UpdateProfileEducationDto
  ) {
    return this.profileService.updateEducation(id, dto);
  }

  @Delete("education/:id")
  async deleteEducation(@Param("id") id: string) {
    return this.profileService.deleteEducation(id);
  }

  // ============================================
  // Project endpoints
  // ============================================

  @Post("projects")
  async createProject(@Body() dto: CreateProfileProjectDto) {
    return this.profileService.createProject(dto);
  }

  @Put("projects/:id")
  async updateProject(
    @Param("id") id: string,
    @Body() dto: UpdateProfileProjectDto
  ) {
    return this.profileService.updateProject(id, dto);
  }

  @Put("projects/:id/skills")
  async updateProjectSkills(
    @Param("id") id: string,
    @Body() dto: UpdateProjectSkillsDto
  ) {
    return this.profileService.updateProjectSkills(id, dto);
  }

  @Delete("projects/:id")
  async deleteProject(@Param("id") id: string) {
    return this.profileService.deleteProject(id);
  }

  // ============================================
  // Skill Category endpoints
  // ============================================

  @Post("skill-categories")
  async createSkillCategory(@Body() dto: CreateProfileSkillCategoryDto) {
    return this.profileService.createSkillCategory(dto);
  }

  @Put("skill-categories/:id")
  async updateSkillCategory(
    @Param("id") id: string,
    @Body() dto: UpdateProfileSkillCategoryDto
  ) {
    return this.profileService.updateSkillCategory(id, dto);
  }

  @Delete("skill-categories/:id")
  async deleteSkillCategory(@Param("id") id: string) {
    return this.profileService.deleteSkillCategory(id);
  }

  // ============================================
  // Skill endpoints
  // ============================================

  @Post("skills")
  async createSkill(@Body() dto: CreateProfileSkillDto) {
    return this.profileService.createSkill(dto);
  }

  @Put("skills/:id")
  async updateSkill(
    @Param("id") id: string,
    @Body() dto: UpdateProfileSkillDto
  ) {
    return this.profileService.updateSkill(id, dto);
  }

  @Delete("skills/:id")
  async deleteSkill(@Param("id") id: string) {
    return this.profileService.deleteSkill(id);
  }

  @Post("seed")
  async seed() {
    // This is handled by prisma seed script
    return { message: "Use `pnpm db:seed` instead" };
  }
}
