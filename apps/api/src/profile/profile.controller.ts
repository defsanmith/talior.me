import { Controller, Post, Get, Body } from "@nestjs/common";
import { ProfileService } from "./profile.service";
import { CreateBulletDto, CreateExperienceDto } from "@tailor.me/shared";

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

    return {
      user,
      experiences,
      education,
      projects,
      skills,
    };
  }

  @Post("experiences")
  async createExperience(@Body() dto: CreateExperienceDto) {
    return this.profileService.createExperience(dto);
  }

  @Post("bullets")
  async createBullet(@Body() dto: CreateBulletDto) {
    return this.profileService.createBullet(dto);
  }

  @Post("seed")
  async seed() {
    // This is handled by prisma seed script
    return { message: "Use `pnpm db:seed` instead" };
  }
}
