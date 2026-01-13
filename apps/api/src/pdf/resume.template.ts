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
 * Generates the LaTeX document from an EditableResume
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

  return `\\documentclass[11pt,letterpaper]{article}

% Packages
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{hyperref}
\\usepackage{xcolor}

% Remove page numbers
\\pagestyle{empty}

% Section formatting
\\titleformat{\\section}{\\large\\bfseries\\uppercase}{}{0em}{}[\\titlerule]
\\titlespacing{\\section}{0pt}{12pt}{6pt}

% List formatting
\\setlist[itemize]{nosep, leftmargin=1.5em, label={\\textbullet}}

% Hyperlink styling
\\hypersetup{
  colorlinks=true,
  linkcolor=black,
  urlcolor=blue!70!black
}

\\begin{document}

% Header
\\begin{center}
  {\\LARGE\\bfseries Your Name}\\\\[4pt]
  email@example.com \\textbar{} (555) 123-4567 \\textbar{} City, State \\textbar{} linkedin.com/in/yourprofile
\\end{center}

\\vspace{8pt}

${resume.summary ? `\\textit{${escapeLatex(resume.summary)}}\\\\[8pt]` : ""}

${sectionsLatex}

\\end{document}
`;
}

function generateEducationSection(resume: EditableResume): string {
  const visibleItems = (resume.education || [])
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order);

  if (visibleItems.length === 0) return "";

  let content = `\\section{Education}\n\n`;

  for (const item of visibleItems) {
    const visibleCoursework = (item.coursework || []).filter((c) => c.visible);
    const degree = escapeLatex(item.degree || "Degree");
    const institution = escapeLatex(item.institution || "");
    const gradDate = item.graduationDate ? escapeLatex(item.graduationDate) : "";

    content += `\\textbf{${degree}}`;
    if (institution) {
      content += ` -- ${institution}`;
    }
    if (gradDate) {
      content += ` \\hfill ${gradDate}`;
    }
    content += `\\\\\n`;

    if (visibleCoursework.length > 0) {
      const courseworkList = visibleCoursework
        .map((c) => escapeLatex(c.name))
        .join(", ");
      content += `\\textit{Relevant Coursework:} ${courseworkList}\\\\\n`;
    }
    content += `\\vspace{4pt}\n`;
  }

  content += `\n`;
  return content;
}

function generateExperienceSection(resume: EditableResume): string {
  const visibleItems = (resume.experiences || [])
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order);

  if (visibleItems.length === 0) return "";

  let content = `\\section{Experience}\n\n`;

  for (const item of visibleItems) {
    const visibleBullets = (item.bullets || [])
      .filter((b) => b.visible)
      .sort((a, b) => a.order - b.order);

    const title = escapeLatex(item.title || "Position");
    const company = escapeLatex(item.company || "");
    const startDate = escapeLatex(item.startDate || "Start");
    const endDate = item.endDate ? escapeLatex(item.endDate) : "Present";

    content += `\\textbf{${title}}`;
    if (company) {
      content += ` -- ${company}`;
    }
    content += ` \\hfill ${startDate} -- ${endDate}\\\\\n`;

    if (visibleBullets.length > 0) {
      content += `\\begin{itemize}\n`;
      for (const bullet of visibleBullets) {
        content += `  \\item ${escapeLatex(bullet.text || "...")}\n`;
      }
      content += `\\end{itemize}\n`;
    }
    content += `\\vspace{4pt}\n`;
  }

  content += `\n`;
  return content;
}

function generateSkillsSection(resume: EditableResume): string {
  const visibleItems = (resume.skillCategories || [])
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order);

  if (visibleItems.length === 0) return "";

  let content = `\\section{Skills}\n\n`;

  for (const category of visibleItems) {
    const visibleSkills = (category.skills || []).filter((s) => s.visible);
    if (visibleSkills.length === 0) continue;

    const categoryName = escapeLatex(category.name || "Category");
    const skillsList = visibleSkills.map((s) => escapeLatex(s.name)).join(", ");

    content += `\\textbf{${categoryName}:} ${skillsList}\\\\\n`;
  }

  content += `\\vspace{4pt}\n\n`;
  return content;
}

function generateProjectsSection(resume: EditableResume): string {
  const visibleItems = (resume.projects || [])
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order);

  if (visibleItems.length === 0) return "";

  let content = `\\section{Projects}\n\n`;

  for (const item of visibleItems) {
    const visibleBullets = (item.bullets || [])
      .filter((b) => b.visible)
      .sort((a, b) => a.order - b.order);

    const name = escapeLatex(item.name || "Project");
    const tech = (item.tech || []).map((t) => escapeLatex(t)).join(", ");
    const description = escapeLatex(item.description || "");

    content += `\\textbf{${name}}`;
    if (tech) {
      content += ` \\textit{(${tech})}`;
    }
    content += `\\\\\n`;

    if (description) {
      content += `${description}\\\\\n`;
    }

    if (visibleBullets.length > 0) {
      content += `\\begin{itemize}\n`;
      for (const bullet of visibleBullets) {
        content += `  \\item ${escapeLatex(bullet.text || "...")}\n`;
      }
      content += `\\end{itemize}\n`;
    }
    content += `\\vspace{4pt}\n`;
  }

  content += `\n`;
  return content;
}

