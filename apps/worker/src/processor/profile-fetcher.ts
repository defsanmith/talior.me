import { Injectable } from "@nestjs/common";
import { ProfileData } from "../ai/ai-provider.interface";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProfileFetcher {
  constructor(private readonly prisma: PrismaService) {}

  async fetchFullProfile(userId: string): Promise<ProfileData> {
    const [
      user,
      experiences,
      projects,
      education,
      skillCategories,
      certifications,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
      }),
      this.prisma.experience.findMany({
        where: { userId },
        orderBy: { startDate: "desc" },
        include: {
          bullets: {
            include: {
              skills: {
                include: { skill: true },
              },
            },
          },
        },
      }),
      this.prisma.project.findMany({
        where: { userId },
        include: {
          bullets: true,
          skills: {
            include: { skill: true },
          },
        },
      }),
      this.prisma.education.findMany({
        where: { userId },
      }),
      this.prisma.skillCategory.findMany({
        where: { userId },
        include: {
          skills: true,
        },
      }),
      this.prisma.certification.findMany({
        where: { userId },
        orderBy: { issueDate: "desc" },
      }),
    ]);

    return {
      user: user
        ? {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            location: user.location,
            openToRelocate: user.openToRelocate,
            website: user.website,
            linkedin: user.linkedin,
          }
        : null,
      experiences: experiences.map((exp) => ({
        id: exp.id,
        company: exp.company,
        title: exp.title,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate,
        bullets: exp.bullets.map((b) => ({
          id: b.id,
          content: b.content,
          skills: b.skills.map((bs: any) => bs.skill.name),
        })),
      })),
      projects: projects.map((proj) => ({
        id: proj.id,
        name: proj.name,
        date: proj.date,
        url: proj.url,
        skills: proj.skills.map((ps: any) => ps.skill.name),
        bullets: proj.bullets.map((b) => ({
          id: b.id,
          content: b.content,
        })),
      })),
      education: education.map((edu: any) => ({
        id: edu.id,
        institution: edu.institution,
        degree: edu.degree,
        location: edu.location,
        graduationDate: edu.graduationDate,
        coursework: edu.coursework || [],
      })),
      skillCategories: skillCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        skills: cat.skills.map((s) => ({
          id: s.id,
          name: s.name,
        })),
      })),
      certifications: certifications.map((cert) => ({
        id: cert.id,
        title: cert.title,
        issuer: cert.issuer,
        issueDate: cert.issueDate,
        expirationDate: cert.expirationDate,
        credentialUrl: cert.credentialUrl,
      })),
    };
  }
}
