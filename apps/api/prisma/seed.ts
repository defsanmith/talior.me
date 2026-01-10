import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@tailor.me" },
    update: {},
    create: {
      email: "demo@tailor.me",
      name: "Demo User",
    },
  });

  console.log("✅ Created user:", user.email);

  // Create experiences
  const exp1 = await prisma.experience.create({
    data: {
      userId: user.id,
      company: "TechCorp Inc",
      title: "Senior Software Engineer",
      startDate: "2022-01",
      endDate: null,
      description: "Building scalable web applications",
    },
  });

  const exp2 = await prisma.experience.create({
    data: {
      userId: user.id,
      company: "StartupXYZ",
      title: "Full Stack Developer",
      startDate: "2020-06",
      endDate: "2021-12",
      description: "Developed features for SaaS platform",
    },
  });

  console.log("✅ Created experiences");

  // Create bullets for exp1
  const bullets1 = [
    {
      content:
        "Designed and implemented RESTful APIs using Node.js and Express, improving response time by 40%",
      tags: ["backend", "api", "performance"],
      tech: ["Node.js", "Express", "PostgreSQL"],
    },
    {
      content:
        "Built responsive React components for dashboard, increasing user engagement by 25%",
      tags: ["frontend", "ui", "metrics"],
      tech: ["React", "TypeScript", "Tailwind"],
    },
    {
      content:
        "Migrated legacy monolith to microservices architecture, reducing deployment time from 2 hours to 15 minutes",
      tags: ["architecture", "devops", "migration"],
      tech: ["Docker", "Kubernetes", "AWS"],
    },
    {
      content:
        "Implemented automated testing pipeline with Jest and Cypress, achieving 85% code coverage",
      tags: ["testing", "quality", "automation"],
      tech: ["Jest", "Cypress", "GitHub Actions"],
    },
    {
      content:
        "Mentored 3 junior developers on React best practices and code review standards",
      tags: ["leadership", "mentoring", "teamwork"],
      tech: ["React", "JavaScript"],
    },
  ];

  for (const bullet of bullets1) {
    await prisma.bullet.create({
      data: {
        experienceId: exp1.id,
        ...bullet,
      },
    });
  }

  // Create bullets for exp2
  const bullets2 = [
    {
      content:
        "Developed GraphQL API serving 10K+ daily active users with 99.9% uptime",
      tags: ["backend", "api", "scale"],
      tech: ["GraphQL", "Apollo", "Node.js"],
    },
    {
      content:
        "Optimized database queries reducing page load time by 60% for key user flows",
      tags: ["database", "performance", "optimization"],
      tech: ["PostgreSQL", "Redis", "SQL"],
    },
    {
      content:
        "Created real-time notification system using WebSockets for 5000+ concurrent users",
      tags: ["realtime", "websockets", "scale"],
      tech: ["Socket.IO", "Redis", "Node.js"],
    },
    {
      content:
        "Integrated Stripe payment processing, handling $100K+ in monthly transactions",
      tags: ["payments", "integration", "backend"],
      tech: ["Stripe", "Node.js", "Webhooks"],
    },
    {
      content:
        "Implemented OAuth2 authentication with Google and GitHub for seamless user onboarding",
      tags: ["auth", "security", "integration"],
      tech: ["OAuth2", "Passport.js", "JWT"],
    },
    {
      content:
        "Built admin dashboard with analytics and reporting features using Next.js",
      tags: ["frontend", "analytics", "admin"],
      tech: ["Next.js", "Chart.js", "TypeScript"],
    },
  ];

  for (const bullet of bullets2) {
    await prisma.bullet.create({
      data: {
        experienceId: exp2.id,
        ...bullet,
      },
    });
  }

  console.log("✅ Created bullets");

  // Create education
  await prisma.education.create({
    data: {
      userId: user.id,
      institution: "Tech University",
      degree: "B.S. Computer Science",
      graduationDate: "2020-05",
    },
  });

  console.log("✅ Created education");

  // Create projects
  await prisma.project.create({
    data: {
      userId: user.id,
      name: "Open Source Contribution - React Query",
      description: "Added TypeScript support and bug fixes",
      tech: ["TypeScript", "React", "Testing"],
    },
  });

  console.log("✅ Created projects");

  // Create skills
  const skills = [
    { name: "TypeScript", category: "Languages" },
    { name: "JavaScript", category: "Languages" },
    { name: "Python", category: "Languages" },
    { name: "React", category: "Frontend" },
    { name: "Next.js", category: "Frontend" },
    { name: "Node.js", category: "Backend" },
    { name: "NestJS", category: "Backend" },
    { name: "PostgreSQL", category: "Databases" },
    { name: "Redis", category: "Databases" },
    { name: "Docker", category: "DevOps" },
    { name: "AWS", category: "Cloud" },
  ];

  for (const skill of skills) {
    await prisma.skill.create({
      data: {
        userId: user.id,
        ...skill,
      },
    });
  }

  console.log("✅ Created skills");
  console.log("🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
