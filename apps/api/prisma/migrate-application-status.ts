import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Migrating job application data...");

  // Get all resume jobs with parsedJd
  const jobs = await prisma.resumeJob.findMany({
    select: {
      id: true,
      userId: true,
      parsedJd: true,
      status: true,
      companyId: true,
      positionId: true,
      teamId: true,
    },
  });

  console.log(`Found ${jobs.length} jobs to migrate`);

  let companiesCreated = 0;
  let positionsCreated = 0;
  let teamsCreated = 0;
  let jobsUpdated = 0;

  for (const job of jobs) {
    const updates: any = {};
    const parsedJd = job.parsedJd as any;

    // Handle company from parsedJd
    if (
      parsedJd?.companyName &&
      typeof parsedJd.companyName === "string" &&
      parsedJd.companyName.trim() &&
      !job.companyId
    ) {
      let company = await prisma.company.findFirst({
        where: {
          userId: job.userId,
          name: parsedJd.companyName.trim(),
        },
      });

      if (!company) {
        company = await prisma.company.create({
          data: {
            userId: job.userId,
            name: parsedJd.companyName.trim(),
          },
        });
        companiesCreated++;
        console.log(`  ✅ Created company: ${company.name}`);
      }

      updates.companyId = company.id;
    }

    // Handle position from parsedJd
    if (
      parsedJd?.jobPosition &&
      typeof parsedJd.jobPosition === "string" &&
      parsedJd.jobPosition.trim() &&
      !job.positionId
    ) {
      let position = await prisma.position.findFirst({
        where: {
          userId: job.userId,
          title: parsedJd.jobPosition.trim(),
        },
      });

      if (!position) {
        position = await prisma.position.create({
          data: {
            userId: job.userId,
            title: parsedJd.jobPosition.trim(),
          },
        });
        positionsCreated++;
        console.log(`  ✅ Created position: ${position.title}`);
      }

      updates.positionId = position.id;
    }

    // Handle team from parsedJd
    if (
      parsedJd?.teamName &&
      typeof parsedJd.teamName === "string" &&
      parsedJd.teamName.trim() &&
      !job.teamId
    ) {
      let team = await prisma.team.findFirst({
        where: {
          userId: job.userId,
          name: parsedJd.teamName.trim(),
        },
      });

      if (!team) {
        team = await prisma.team.create({
          data: {
            userId: job.userId,
            name: parsedJd.teamName.trim(),
          },
        });
        teamsCreated++;
        console.log(`  ✅ Created team: ${team.name}`);
      }

      updates.teamId = team.id;
    }

    // Set applicationStatus to READY_TO_APPLY for completed jobs
    if (job.status === "COMPLETED") {
      updates.applicationStatus = "READY_TO_APPLY";
    }

    // Update job if there are changes
    if (Object.keys(updates).length > 0) {
      await prisma.resumeJob.update({
        where: { id: job.id },
        data: updates,
      });
      jobsUpdated++;
    }
  }

  console.log("\n📊 Migration Summary:");
  console.log(`  Companies created: ${companiesCreated}`);
  console.log(`  Positions created: ${positionsCreated}`);
  console.log(`  Teams created: ${teamsCreated}`);
  console.log(`  Jobs updated: ${jobsUpdated}`);
  console.log("\n✅ Migration complete!");
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
