import { GetProfileResponse } from "@tailor.me/shared";

export function generateProfileMarkdown(profile: GetProfileResponse): string {
  const sections: string[] = [];
  const { user, experiences, education, projects, skillCategories, certifications } = profile;

  // Header
  const nameParts = [user?.firstName, user?.lastName].filter(Boolean);
  const name = nameParts.length > 0 ? nameParts.join(" ") : "Profile";
  sections.push(`# ${name}`);

  const contactParts: string[] = [];
  if (user?.email) contactParts.push(`**Email:** ${user.email}`);
  if (user?.phone) contactParts.push(`**Phone:** ${user.phone}`);
  if (user?.location) {
    const loc = user.openToRelocate
      ? `${user.location} *(Open to relocate)*`
      : user.location;
    contactParts.push(`**Location:** ${loc}`);
  } else if (user?.openToRelocate) {
    contactParts.push(`**Location:** *(Open to relocate)*`);
  }
  if (user?.linkedin) contactParts.push(`**LinkedIn:** ${user.linkedin}`);
  if (user?.website) contactParts.push(`**Website:** ${user.website}`);
  if (contactParts.length > 0) {
    sections.push(contactParts.join(" | "));
  }

  // Experience
  if (experiences && experiences.length > 0) {
    sections.push("---\n\n## Experience");
    for (const exp of experiences) {
      const dateRange = exp.endDate
        ? `${exp.startDate} – ${exp.endDate}`
        : `${exp.startDate} – Present`;
      const location = exp.location ? ` | ${exp.location}` : "";
      sections.push(`### ${exp.title} at ${exp.company}\n*${dateRange}${location}*`);
      if (exp.bullets && exp.bullets.length > 0) {
        sections.push(exp.bullets.map((b) => `- ${b.content}`).join("\n"));
      }
    }
  }

  // Education
  if (education && education.length > 0) {
    sections.push("---\n\n## Education");
    for (const edu of education) {
      const grad = edu.graduationDate ? edu.graduationDate : "";
      const location = edu.location ? ` | ${edu.location}` : "";
      sections.push(`### ${edu.degree}\n**${edu.institution}**${grad ? ` | ${grad}` : ""}${location}`);
      if (edu.coursework && edu.coursework.length > 0) {
        sections.push(`*Relevant Coursework:* ${edu.coursework.join(", ")}`);
      }
    }
  }

  // Projects
  if (projects && projects.length > 0) {
    sections.push("---\n\n## Projects");
    for (const proj of projects) {
      const tech = (proj.skills || []).map((ps) => ps.skill.name).join(", ");
      const date = proj.date ? ` | ${proj.date}` : "";
      const url = proj.url ? ` | [Link](${proj.url})` : "";
      const subheading = [tech && `*${tech}*`, date, url].filter(Boolean).join("");
      sections.push(`### ${proj.name}${subheading ? `\n${subheading}` : ""}`);
      if (proj.bullets && proj.bullets.length > 0) {
        sections.push(proj.bullets.map((b) => `- ${b.content}`).join("\n"));
      }
    }
  }

  // Skills
  const nonEmptyCategories = (skillCategories || []).filter(
    (c) => c.skills && c.skills.length > 0,
  );
  if (nonEmptyCategories.length > 0) {
    sections.push("---\n\n## Skills");
    for (const cat of nonEmptyCategories) {
      sections.push(`**${cat.name}:** ${cat.skills.map((s) => s.name).join(", ")}`);
    }
  }

  // Certifications
  if (certifications && certifications.length > 0) {
    sections.push("---\n\n## Certifications");
    for (const cert of certifications) {
      const dateRange = cert.issueDate
        ? cert.expirationDate
          ? `${cert.issueDate} – ${cert.expirationDate}`
          : `Issued ${cert.issueDate}`
        : "";
      const credentialLink = cert.credentialUrl
        ? ` | [Credential](${cert.credentialUrl})`
        : "";
      sections.push(
        `### ${cert.title}\n**${cert.issuer}**${dateRange ? ` | ${dateRange}` : ""}${credentialLink}`,
      );
    }
  }

  return sections.join("\n\n");
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
