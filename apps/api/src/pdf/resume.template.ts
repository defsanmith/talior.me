import { EditableResume } from "@tailor.me/shared";

/**
 * Escapes special LaTeX characters to prevent compilation errors
 */
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

/**
 * Generates the LaTeX document from an EditableResume using Jake's Resume template
 */
export function generateResumeLatex(resume: EditableResume): string {
  const visibleSections = (resume.sectionOrder || [])
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  let sectionsLatex = "";

  for (const section of visibleSections) {
    switch (section.type) {
      case "education":
        sectionsLatex += generateEducationSection(resume);
        break;
      case "experience":
        sectionsLatex += generateExperienceSection(resume);
        break;
      case "skills":
        sectionsLatex += generateSkillsSection(resume);
        break;
      case "projects":
        sectionsLatex += generateProjectsSection(resume);
        break;
    }
  }

  return `%-------------------------
% Resume - LaTeX Template
% Based on Jake's Resume Template
%-------------------------

\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

%-------------------------
% Custom commands
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

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

%-------------------------------------------
%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%

\\begin{document}

%----------HEADING----------
${generateHeaderSection(resume)}

${sectionsLatex}

\\end{document}
`;
}

/**
 * Formats a phone number to (xxx)-xxx-xxxx format
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // If we have 10 digits, format as (xxx)-xxx-xxxx
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // If we have 11 digits starting with 1, format as (xxx)-xxx-xxxx
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)})-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Otherwise return as-is
  return phone;
}

/**
 * Cleans up URL for display (removes https://, www., and trailing slash)
 */
function cleanUrlForDisplay(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

function generateHeaderSection(resume: EditableResume): string {
  const user = resume.user;
  const name = user?.name ? escapeLatex(user.name) : "Your Name";

  // Build contact info parts
  const contactParts: string[] = [];

  if (user?.phone) {
    const formattedPhone = formatPhoneNumber(user.phone);
    contactParts.push(escapeLatex(formattedPhone));
  }

  if (user?.email) {
    const email = escapeLatex(user.email);
    contactParts.push(`\\href{mailto:${email}}{${email}}`);
  }

  if (user?.location) {
    contactParts.push(escapeLatex(user.location));
  }

  if (user?.linkedin) {
    // Clean up linkedin URL for display (remove https://, www., trailing slash)
    const linkedinDisplay = cleanUrlForDisplay(user.linkedin);
    const linkedinUrl = user.linkedin.startsWith("http")
      ? user.linkedin
      : `https://${user.linkedin}`;
    contactParts.push(
      `\\href{${escapeLatex(linkedinUrl)}}{${escapeLatex(linkedinDisplay)}}`
    );
  }

  if (user?.website) {
    // Clean up website URL for display (remove https://, www., trailing slash)
    const websiteDisplay = cleanUrlForDisplay(user.website);
    const websiteUrl = user.website.startsWith("http")
      ? user.website
      : `https://${user.website}`;
    contactParts.push(
      `\\href{${escapeLatex(websiteUrl)}}{${escapeLatex(websiteDisplay)}}`
    );
  }

  const contactLine = contactParts.length > 0 ? contactParts.join(" $|$ ") : "";

  return `\\begin{center}
    \\textbf{\\Huge \\scshape ${name}} \\\\ \\vspace{1pt}
    \\small ${contactLine}
\\end{center}
`;
}

function generateEducationSection(resume: EditableResume): string {
  const visibleItems = (resume.education || [])
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order);

  if (visibleItems.length === 0) return "";

  let content = `%-----------EDUCATION-----------%
\\section{Education}
    \\resumeSubHeadingListStart
`;

  for (const item of visibleItems) {
    const visibleCoursework = (item.coursework || []).filter((c) => c.visible);
    const degree = escapeLatex(item.degree || "Degree");
    const institution = escapeLatex(item.institution || "Institution");
    const gradDate = item.graduationDate
      ? escapeLatex(item.graduationDate)
      : "";

    content += `
    \\resumeEducationHeading
    {${institution}}{${gradDate}}
    {${degree}}{}
`;

    if (visibleCoursework.length > 0) {
      const courseworkList = visibleCoursework
        .map((c) => escapeLatex(c.name))
        .join(", ");
      content += `    \\resumeItemListStart
        \\resumeItem{\\textbf{Relevant Coursework}: ${courseworkList}}
    \\resumeItemListEnd
`;
    }
  }

  content += `
    \\resumeSubHeadingListEnd

`;
  return content;
}

function generateExperienceSection(resume: EditableResume): string {
  const visibleItems = (resume.experiences || [])
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order);

  if (visibleItems.length === 0) return "";

  let content = `%-----------EXPERIENCE-----------%
\\section{Experience}
\\resumeSubHeadingListStart
`;

  for (const item of visibleItems) {
    const visibleBullets = (item.bullets || [])
      .filter((b) => b.visible)
      .sort((a, b) => a.order - b.order);

    const title = escapeLatex(item.title || "Position");
    const company = escapeLatex(item.company || "Company");
    const startDate = escapeLatex(item.startDate || "Start");
    const endDate = item.endDate ? escapeLatex(item.endDate) : "Present";

    content += `
    \\resumeSubheading
    {${title}}{${startDate} -- ${endDate}}
    {${company}}{}
`;

    if (visibleBullets.length > 0) {
      content += `    \\resumeItemListStart
`;
      for (const bullet of visibleBullets) {
        content += `        \\resumeItem{${escapeLatex(bullet.text || "...")}}\n`;
      }
      content += `    \\resumeItemListEnd
`;
    }
  }

  content += `\\resumeSubHeadingListEnd

`;
  return content;
}

function generateSkillsSection(resume: EditableResume): string {
  const visibleItems = (resume.skillCategories || [])
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order);

  if (visibleItems.length === 0) return "";

  let content = `%-----------SKILLS-----------
\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
`;

  for (const category of visibleItems) {
    const visibleSkills = (category.skills || []).filter((s) => s.visible);
    if (visibleSkills.length === 0) continue;

    const categoryName = escapeLatex(category.name || "Category");
    const skillsList = visibleSkills.map((s) => escapeLatex(s.name)).join(", ");

    content += `    \\textbf{${categoryName}}{: ${skillsList}} \\\\\n`;
  }

  content += `    }}
 \\end{itemize}

`;
  return content;
}

function generateProjectsSection(resume: EditableResume): string {
  const visibleItems = (resume.projects || [])
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order);

  if (visibleItems.length === 0) return "";

  let content = `%-----------PROJECTS-----------
\\section{Projects}
    \\resumeSubHeadingListStart
`;

  for (const item of visibleItems) {
    const visibleBullets = (item.bullets || [])
      .filter((b) => b.visible)
      .sort((a, b) => a.order - b.order);

    const name = escapeLatex(item.name || "Project");
    const tech = (item.tech || []).map((t) => escapeLatex(t)).join(", ");

    content += `    \\resumeProjectHeading
    {\\textbf{${name}}${tech ? ` $|$ \\emph{${tech}}` : ""}}{}
`;

    if (visibleBullets.length > 0) {
      content += `    \\resumeItemListStart
`;
      for (const bullet of visibleBullets) {
        content += `        \\resumeItem{${escapeLatex(bullet.text || "...")}}\n`;
      }
      content += `    \\resumeItemListEnd
`;
    }
  }

  content += `    \\resumeSubHeadingListEnd

`;
  return content;
}
