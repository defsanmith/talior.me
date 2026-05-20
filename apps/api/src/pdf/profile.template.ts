import { GetProfileResponse } from "@tailor.me/shared";

function escapeLatex(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)})-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function cleanUrlForDisplay(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatMonthYear(dateStr: string): string {
  const [year, month] = dateStr.split("-");
  const monthIndex = parseInt(month, 10) - 1;
  if (!isNaN(monthIndex) && MONTHS[monthIndex]) {
    return `${MONTHS[monthIndex]} ${year}`;
  }
  return escapeLatex(dateStr);
}

const PREAMBLE = `%-------------------------
% Profile Export - LaTeX Template
%-------------------------

\\documentclass[letterpaper,11pt]{article}

\\usepackage{lmodern}
\\usepackage{latexsym}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage[hidelinks]{hyperref}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage[margin=0.5in, nohead, nofoot]{geometry}

\\pagestyle{empty}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\makeatletter
\\renewcommand\\section[1]{%
  \\vspace{-4pt}%
  {\\normalfont\\large\\scshape\\raggedright #1\\par}%
  \\vspace{2pt}%
  {\\color{black}\\hrule height 0.4pt}%
  \\vspace{-5pt}%
}
\\makeatother

\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeEducationHeading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{list}{}{\\setlength{\\leftmargin}{0.15in}}}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{list}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}
`;

function buildHeader(profile: GetProfileResponse): string {
  const user = profile.user;
  let name = "Your Name";
  if (user?.firstName && user?.lastName) {
    name = escapeLatex(`${user.firstName} ${user.lastName}`);
  } else if (user?.firstName) {
    name = escapeLatex(user.firstName);
  } else if (user?.lastName) {
    name = escapeLatex(user.lastName);
  }

  const contactParts: string[] = [];

  if (user?.email) {
    const email = escapeLatex(user.email);
    contactParts.push(`\\href{mailto:${email}}{${email}}`);
  }

  if (user?.phone) {
    contactParts.push(escapeLatex(formatPhoneNumber(user.phone)));
  }

  if (user?.linkedin) {
    const display = cleanUrlForDisplay(user.linkedin);
    const href = user.linkedin.startsWith("http")
      ? user.linkedin
      : `https://${user.linkedin}`;
    contactParts.push(`\\href{${escapeLatex(href)}}{${escapeLatex(display)}}`);
  }

  if (user?.website) {
    const display = cleanUrlForDisplay(user.website);
    const href = user.website.startsWith("http")
      ? user.website
      : `https://${user.website}`;
    contactParts.push(`\\href{${escapeLatex(href)}}{${escapeLatex(display)}}`);
  }

  if (user?.location) {
    const loc = escapeLatex(user.location);
    const relocate = user.openToRelocate ? ` \\textit{(Open to relocate)}` : "";
    contactParts.push(`${loc}${relocate}`);
  } else if (user?.openToRelocate) {
    contactParts.push(`\\textit{Open to relocate}`);
  }

  const contactLine = contactParts.join(" $|$ ");
  return `\\begin{center}
    \\textbf{\\Huge \\scshape ${name}} \\\\ \\vspace{1pt}
    \\small ${contactLine}
\\end{center}
`;
}

function buildExperienceSection(profile: GetProfileResponse): string {
  const items = profile.experiences || [];
  if (items.length === 0) return "";

  let content = `%-----------EXPERIENCE-----------%
\\section{Experience}
\\resumeSubHeadingListStart
`;

  for (const item of items) {
    const title = escapeLatex(item.title || "Position");
    const company = escapeLatex(item.company || "Company");
    const location = item.location ? escapeLatex(item.location) : "";
    const startDate = escapeLatex(item.startDate || "");
    const endDate = item.endDate ? escapeLatex(item.endDate) : "Present";

    content += `
    \\resumeSubheading
    {${title}}{${startDate} -- ${endDate}}
    {${company}}{${location}}
`;

    const bullets = item.bullets || [];
    if (bullets.length > 0) {
      content += `    \\resumeItemListStart\n`;
      for (const bullet of bullets) {
        content += `        \\resumeItem{${escapeLatex(bullet.content || "")}}\n`;
      }
      content += `    \\resumeItemListEnd\n`;
    }
  }

  content += `\\resumeSubHeadingListEnd\n\n`;
  return content;
}

function buildEducationSection(profile: GetProfileResponse): string {
  const items = profile.education || [];
  if (items.length === 0) return "";

  let content = `%-----------EDUCATION-----------%
\\section{Education}
    \\resumeSubHeadingListStart
`;

  for (const item of items) {
    const institution = escapeLatex(item.institution || "Institution");
    const degree = escapeLatex(item.degree || "Degree");
    const location = item.location ? escapeLatex(item.location) : "";
    const gradDate = item.graduationDate ? escapeLatex(item.graduationDate) : "";

    content += `
    \\resumeEducationHeading
    {${institution}}{${gradDate}}
    {${degree}}{${location}}
`;

    const coursework = item.coursework || [];
    if (coursework.length > 0) {
      const courseworkList = coursework.map((c) => escapeLatex(c)).join(", ");
      content += `    \\resumeItemListStart
        \\resumeItem{\\textbf{Relevant Coursework}: ${courseworkList}}
    \\resumeItemListEnd\n`;
    }
  }

  content += `\n    \\resumeSubHeadingListEnd\n\n`;
  return content;
}

function buildProjectsSection(profile: GetProfileResponse): string {
  const items = profile.projects || [];
  if (items.length === 0) return "";

  let content = `%-----------PROJECTS-----------
\\section{Projects}
    \\resumeSubHeadingListStart
`;

  for (const item of items) {
    const name = escapeLatex(item.name || "Project");
    const tech = (item.skills || [])
      .map((ps) => escapeLatex(ps.skill.name))
      .join(", ");
    const date = item.date ? escapeLatex(item.date) : "";

    let projectHeader = `{\\textbf{${name}}`;
    if (tech) {
      projectHeader += ` $|$ \\emph{${tech}}`;
    }
    if (item.url) {
      projectHeader += ` $|$ \\href{${item.url}}{Link}`;
    }
    projectHeader += "}";

    content += `    \\resumeProjectHeading\n    ${projectHeader}{${date}}\n`;

    const bullets = item.bullets || [];
    if (bullets.length > 0) {
      content += `    \\resumeItemListStart\n`;
      for (const bullet of bullets) {
        content += `        \\resumeItem{${escapeLatex(bullet.content || "")}}\n`;
      }
      content += `    \\resumeItemListEnd\n`;
    }
  }

  content += `    \\resumeSubHeadingListEnd\n\n`;
  return content;
}

function buildSkillsSection(profile: GetProfileResponse): string {
  const categories = (profile.skillCategories || []).filter(
    (c) => c.skills && c.skills.length > 0,
  );
  if (categories.length === 0) return "";

  let content = `%-----------SKILLS-----------
\\section{Technical Skills}
 \\begin{list}{}{\\setlength{\\leftmargin}{0.15in}}
    \\small{\\item{
`;

  for (const category of categories) {
    const categoryName = escapeLatex(category.name || "Category");
    const skillsList = category.skills
      .map((s) => escapeLatex(s.name))
      .join(", ");
    content += `    \\textbf{${categoryName}}{: ${skillsList}} \\\\\n`;
  }

  content += `    }}\n \\end{list}\n\n`;
  return content;
}

function buildCertificationsSection(profile: GetProfileResponse): string {
  const items = profile.certifications || [];
  if (items.length === 0) return "";

  let content = `%-----------CERTIFICATIONS-----------
\\section{Certifications}
    \\resumeSubHeadingListStart
`;

  for (const item of items) {
    const title = escapeLatex(item.title || "Certification");
    const issuer = escapeLatex(item.issuer || "");
    const issueDateFmt = item.issueDate ? formatMonthYear(item.issueDate) : "";
    const expirationDateFmt = item.expirationDate
      ? formatMonthYear(item.expirationDate)
      : "No Expiration";
    const dateRange = issueDateFmt
      ? `${issueDateFmt} -- ${expirationDateFmt}`
      : "";

    let certHeader = `{\\textbf{${title}} $|$ \\emph{${issuer}}`;
    if (item.credentialUrl) {
      certHeader += ` $|$ \\href{${item.credentialUrl}}{Credential}`;
    }
    certHeader += "}";

    content += `    \\resumeProjectHeading\n    ${certHeader}{${dateRange}}\n`;
  }

  content += `    \\resumeSubHeadingListEnd\n\n`;
  return content;
}

export function buildProfileLatex(profile: GetProfileResponse): string {
  const sections = [
    buildExperienceSection(profile),
    buildEducationSection(profile),
    buildProjectsSection(profile),
    buildSkillsSection(profile),
    buildCertificationsSection(profile),
  ].join("");

  return `${PREAMBLE}
%-------------------------------------------
\\begin{document}

%----------HEADING----------
${buildHeader(profile)}

${sections}
\\end{document}
`;
}
