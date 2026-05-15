import { Injectable, Logger } from "@nestjs/common";
import {
  EditableResume,
  EditPlan,
  EvidenceCandidate,
  EvidenceRewriteResult,
  JobStage,
  JobStatus,
  NormalizedRequirement,
  ParsedJD,
  SectionOrder,
  SelectionResult,
  VerificationResult,
  ProfileBulletClaim,
} from "@tailor.me/shared";
import { Job } from "bullmq";
import { randomBytes } from "crypto";
import { AIService } from "../ai/ai.service";
import { ProfileData } from "../ai/ai-provider.interface";
import { BulletSelector } from "../bm25/bullet-selector";
import { KeywordExtractor } from "../bm25/keyword-extractor";
import { PrismaService } from "../prisma/prisma.service";
import { SearchService } from "../search/search.service";

interface EvidenceJobData {
  jobId: string;
  userId: string;
  jobDescription: string;
  strategy?: string;
}

interface EvidenceTrace {
  selection: SelectionResult;
  editPlan: EditPlan;
  rewrite: EvidenceRewriteResult;
  verification: VerificationResult;
  finalText: string;
  verifierNote: string | null;
}

@Injectable()
export class EvidenceWorkflowService {
  private readonly logger = new Logger(EvidenceWorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AIService,
    private readonly searchService: SearchService,
  ) {}

  async processEvidenceJob(job: Job<EvidenceJobData>): Promise<void> {
    const { jobId, userId, jobDescription } = job.data;

    try {
      await this.updateProgress(
        job,
        jobId,
        userId,
        JobStatus.PROCESSING,
        JobStage.PARSING_JD,
        10,
      );

      const jobRecord = await this.prisma.resumeJob.findUnique({
        where: { id: jobId },
        select: {
          companyId: true,
          positionId: true,
          teamId: true,
        },
      });

      const parsedJd = await this.ai.parseJobDescription(jobDescription);
      const metadata = await this.upsertMissingMetadata(
        userId,
        jobRecord,
        parsedJd,
      );
      await this.prisma.resumeJob.update({
        where: { id: jobId },
        data: {
          parsedJd: parsedJd as any,
          ...metadata,
        },
      });

      await this.updateProgress(
        job,
        jobId,
        userId,
        JobStatus.PROCESSING,
        JobStage.RETRIEVING_BULLETS,
        20,
      );

      const profile = await this.fetchProfile(userId);
      const requirements = this.normalizeRequirements(parsedJd);
      const candidates = await this.retrieveCandidates(
        userId,
        profile,
        requirements,
        jobDescription,
      );

      await this.updateProgress(
        job,
        jobId,
        userId,
        JobStatus.PROCESSING,
        JobStage.SELECTING_BULLETS,
        40,
      );

      const selections = await this.rankCandidates(
        candidates,
        requirements,
        parsedJd,
      );
      const selectedCandidates = this.selectCandidates(candidates, selections);

      await this.updateProgress(
        job,
        jobId,
        userId,
        JobStatus.PROCESSING,
        JobStage.REWRITING_BULLETS,
        55,
      );

      const traces = await this.rewriteAndVerify(
        selectedCandidates,
        selections,
        requirements,
        parsedJd,
        jobDescription,
      );

      await this.updateProgress(
        job,
        jobId,
        userId,
        JobStatus.PROCESSING,
        JobStage.ASSEMBLING,
        85,
      );

      const resume = this.assembleResume(profile, selectedCandidates, traces);
      await this.applyDefaultPreset(userId, resume);
      await this.saveResults(jobId, resume, selectedCandidates, traces);

      await this.updateProgress(
        job,
        jobId,
        userId,
        JobStatus.COMPLETED,
        JobStage.COMPLETED,
        100,
      );
    } catch (error) {
      this.logger.error(`Evidence job ${jobId} failed`, error);
      await this.updateJobStatus(
        jobId,
        JobStatus.FAILED,
        JobStage.FAILED,
        0,
        error instanceof Error ? error.message : "Unknown error",
      );
      throw error;
    }
  }

  private normalizeRequirements(parsedJd: ParsedJD): NormalizedRequirement[] {
    let index = 0;
    const build = (
      category: NormalizedRequirement["category"],
      values: string[],
      weight: number,
    ) =>
      values
        .filter((text) => text.trim().length > 0)
        .map((text) => ({
          id: `${category}-${index++}`,
          text,
          category,
          terms: this.tokenize(text),
          weight,
        }));

    return [
      ...build("required", parsedJd.required_skills, 1),
      ...build("preferred", parsedJd.nice_to_have, 0.7),
      ...build("responsibility", parsedJd.responsibilities, 0.8),
      ...build("keyword", parsedJd.keywords, 0.45),
    ];
  }

  private async retrieveCandidates(
    userId: string,
    profile: ProfileData,
    requirements: NormalizedRequirement[],
    jobDescription: string,
  ): Promise<EvidenceCandidate[]> {
    const allCandidates = this.flattenProfile(profile);
    const byId = new Map(allCandidates.map((c) => [c.bulletId, c]));
    const extracted = KeywordExtractor.extract(jobDescription);
    const terms = [
      ...extracted.keywords,
      ...extracted.skills,
      ...extracted.techStack,
      ...requirements.flatMap((r) => r.terms),
    ];

    try {
      const hits = await this.searchService.queryBullets(userId, terms, [], 50);
      const found: EvidenceCandidate[] = [];
      for (const hit of hits) {
        const candidate = byId.get(hit.bulletId);
        if (!candidate) continue;
        found.push({
          ...candidate,
          retrievalScore: hit.score,
          retrievalSource: "opensearch",
        });
      }

      if (found.length >= 8) {
        return found;
      }
    } catch (error) {
      this.logger.warn("OpenSearch candidate retrieval failed; using lexical fallback");
    }

    const lexicalCandidates = allCandidates
      .map((candidate) => ({
        ...candidate,
        retrievalScore: this.lexicalScore(candidate, requirements),
        retrievalSource: "lexical" as const,
      }))
      .filter((candidate) => candidate.retrievalScore > 0)
      .sort((a, b) => b.retrievalScore - a.retrievalScore)
      .slice(0, 50);

    return lexicalCandidates.length > 0
      ? lexicalCandidates
      : allCandidates.slice(0, 50);
  }

  private async rankCandidates(
    candidates: EvidenceCandidate[],
    requirements: NormalizedRequirement[],
    parsedJd: ParsedJD,
  ): Promise<SelectionResult[]> {
    const topK = Math.min(24, Math.max(12, candidates.length));
    try {
      return await this.ai.rankEvidenceCandidates(
        candidates.slice(0, 50),
        requirements,
        parsedJd,
        topK,
      );
    } catch (error) {
      this.logger.warn("Evidence ranking failed; using retrieval scores");
      return candidates.slice(0, topK).map((candidate, index) => ({
        bulletId: candidate.bulletId,
        rank: index + 1,
        relevanceScore: Math.min(1, candidate.retrievalScore),
        confidence: 0.45,
        matchedRequirements: [],
        jobEvidence: [],
        profileEvidence: [candidate.content],
        riskFlags: ["ranker_fallback"],
      }));
    }
  }

  private selectCandidates(
    candidates: EvidenceCandidate[],
    selections: SelectionResult[],
  ): EvidenceCandidate[] {
    const byId = new Map(candidates.map((candidate) => [candidate.bulletId, candidate]));
    const rankedCandidates = selections
      .map((selection) => {
        const candidate = byId.get(selection.bulletId);
        if (!candidate) return null;
        return {
          ...candidate,
          retrievalScore: selection.relevanceScore,
        };
      })
      .filter((candidate): candidate is EvidenceCandidate => candidate !== null);

    const selected = BulletSelector.select(
      rankedCandidates.map((candidate) => ({
        bulletId: candidate.bulletId,
        content: candidate.content,
        score: candidate.retrievalScore,
        parentId: candidate.parentId,
        parentType: candidate.parentType,
        startDate: candidate.startDate ?? undefined,
        endDate: candidate.endDate ?? undefined,
      })),
      {
        maxBulletsPerParent: 4,
        similarityThreshold: 0.7,
        targetCount: { min: 12, max: 16 },
      },
    );

    return selected
      .map((bullet) => byId.get(bullet.bulletId))
      .filter((candidate): candidate is EvidenceCandidate => candidate !== undefined);
  }

  private async rewriteAndVerify(
    candidates: EvidenceCandidate[],
    selections: SelectionResult[],
    requirements: NormalizedRequirement[],
    parsedJd: ParsedJD,
    jobDescription: string,
  ): Promise<Map<string, EvidenceTrace>> {
    const selectionById = new Map(
      selections.map((selection) => [selection.bulletId, selection]),
    );
    const traces = new Map<string, EvidenceTrace>();

    await Promise.all(
      candidates.map(async (candidate) => {
        const selection =
          selectionById.get(candidate.bulletId) ??
          this.fallbackSelection(candidate, traces.size + 1);
        const trace = await this.rewriteOne(
          candidate,
          selection,
          requirements,
          parsedJd,
          jobDescription,
        );
        traces.set(candidate.bulletId, trace);
      }),
    );

    return traces;
  }

  private async rewriteOne(
    candidate: EvidenceCandidate,
    selection: SelectionResult,
    requirements: NormalizedRequirement[],
    parsedJd: ParsedJD,
    jobDescription: string,
  ): Promise<EvidenceTrace> {
    const editPlan = await this.safeEditPlan(candidate, selection, requirements);
    const rewrite = await this.safeRewrite(candidate, editPlan, parsedJd);
    const modelVerification = await this.safeModelVerification(
      candidate,
      rewrite,
      editPlan,
      parsedJd,
    );
    const deterministic = this.deterministicVerify(
      candidate,
      rewrite,
      editPlan,
      jobDescription,
    );
    const verification = this.mergeVerification(modelVerification, deterministic);
    const finalText = verification.pass ? rewrite.rewriteText : candidate.content;
    const verifierNote = verification.pass
      ? null
      : [
          ...verification.unsupportedClaims,
          ...verification.droppedFacts,
          ...verification.fixInstructions,
        ].join("; ") || "Verifier rejected rewrite";

    return {
      selection,
      editPlan,
      rewrite,
      verification,
      finalText,
      verifierNote,
    };
  }

  private async safeEditPlan(
    candidate: EvidenceCandidate,
    selection: SelectionResult,
    requirements: NormalizedRequirement[],
  ): Promise<EditPlan> {
    try {
      return await this.ai.createEditPlan(candidate, selection, requirements);
    } catch {
      return {
        bulletId: candidate.bulletId,
        preservedFacts: this.extractPreservedFacts(candidate),
        approvedTerms: selection.matchedRequirements,
        forbiddenInferences: [
          "new metrics",
          "new technologies",
          "new leadership scope",
        ],
        rewriteIntent: "Clarify relevance while preserving original facts.",
      };
    }
  }

  private async safeRewrite(
    candidate: EvidenceCandidate,
    editPlan: EditPlan,
    parsedJd: ParsedJD,
  ): Promise<EvidenceRewriteResult> {
    try {
      return await this.ai.rewriteFromEditPlan(candidate, editPlan, parsedJd);
    } catch {
      return {
        bulletId: candidate.bulletId,
        rewriteText: candidate.content,
        preservedFacts: editPlan.preservedFacts,
        alignedTerms: [],
        forbiddenInferences: editPlan.forbiddenInferences,
        newInformationAdded: false,
        riskFlags: ["rewrite_fallback"],
      };
    }
  }

  private async safeModelVerification(
    candidate: EvidenceCandidate,
    rewrite: EvidenceRewriteResult,
    editPlan: EditPlan,
    parsedJd: ParsedJD,
  ): Promise<VerificationResult> {
    if (process.env.EVIDENCE_MODEL_VERIFIER === "false") {
      return this.passVerification();
    }

    try {
      return await this.ai.verifyRewrite(candidate, rewrite, editPlan, parsedJd);
    } catch {
      return this.passVerification(["model_verifier_fallback"]);
    }
  }

  private deterministicVerify(
    candidate: EvidenceCandidate,
    rewrite: EvidenceRewriteResult,
    editPlan: EditPlan,
    jobDescription: string,
  ): VerificationResult {
    const unsupportedClaims: string[] = [];
    const droppedFacts: string[] = [];
    const originalText = candidate.content.toLowerCase();
    const rewrittenText = rewrite.rewriteText.toLowerCase();

    const originalNumbers: string[] = originalText.match(/\d+/g) || [];
    const rewrittenNumbers: string[] = rewrittenText.match(/\d+/g) || [];
    for (const number of rewrittenNumbers) {
      if (!originalNumbers.includes(number)) {
        unsupportedClaims.push(`New number added: ${number}`);
      }
    }

    const commonTechWords = [
      "react",
      "vue",
      "angular",
      "node",
      "python",
      "java",
      "go",
      "rust",
      "kubernetes",
      "docker",
      "aws",
      "azure",
      "gcp",
      "postgresql",
      "mongodb",
      "redis",
      "graphql",
      "rest",
    ];
    const knownSkills = new Set(
      [...candidate.skills, ...candidate.tags].map((skill) => skill.toLowerCase()),
    );
    for (const tech of commonTechWords) {
      if (
        rewrittenText.includes(tech) &&
        !originalText.includes(tech) &&
        !knownSkills.has(tech)
      ) {
        unsupportedClaims.push(`New tech mentioned: ${tech}`);
      }
    }

    for (const word of [
      "led",
      "owned",
      "architected",
      "managed",
      "directed",
      "spearheaded",
    ]) {
      if (rewrittenText.includes(word) && !originalText.includes(word)) {
        unsupportedClaims.push(`Scope inflation: ${word}`);
      }
    }

    for (const fact of editPlan.preservedFacts) {
      if (!this.hasTokenOverlap(fact, rewrite.rewriteText, 0.35)) {
        droppedFacts.push(`Missing preserved fact: ${fact}`);
      }
    }

    const copyRisk = this.copyRisk(jobDescription, rewrite.rewriteText);
    return {
      pass: unsupportedClaims.length === 0 && droppedFacts.length === 0,
      unsupportedClaims,
      droppedFacts,
      copyRisk,
      naturalnessNotes: [],
      fixInstructions: copyRisk === "high" ? ["Rewrite copies job language too closely"] : [],
    };
  }

  private mergeVerification(
    model: VerificationResult,
    deterministic: VerificationResult,
  ): VerificationResult {
    const copyRisk =
      model.copyRisk === "high" || deterministic.copyRisk === "high"
        ? "high"
        : model.copyRisk === "medium" || deterministic.copyRisk === "medium"
          ? "medium"
          : "low";

    return {
      pass: model.pass && deterministic.pass && copyRisk !== "high",
      unsupportedClaims: [
        ...model.unsupportedClaims,
        ...deterministic.unsupportedClaims,
      ],
      droppedFacts: [...model.droppedFacts, ...deterministic.droppedFacts],
      copyRisk,
      naturalnessNotes: [
        ...model.naturalnessNotes,
        ...deterministic.naturalnessNotes,
      ],
      fixInstructions: [
        ...model.fixInstructions,
        ...deterministic.fixInstructions,
      ],
    };
  }

  private flattenProfile(profile: ProfileData): EvidenceCandidate[] {
    const candidates: EvidenceCandidate[] = [];

    for (const experience of profile.experiences) {
      for (const bullet of experience.bullets) {
        candidates.push({
          bulletId: bullet.id,
          content: bullet.content,
          parentId: experience.id,
          parentType: "experience",
          parentTitle: experience.title,
          parentCompany: experience.company,
          startDate: experience.startDate,
          endDate: experience.endDate,
          skills: bullet.skills,
          tags: [],
          claims: this.extractClaims(bullet.content, bullet.skills),
          retrievalScore: 0,
          retrievalSource: "profile",
        });
      }
    }

    for (const project of profile.projects) {
      for (const bullet of project.bullets) {
        candidates.push({
          bulletId: bullet.id,
          content: bullet.content,
          parentId: project.id,
          parentType: "project",
          parentTitle: project.name,
          skills: project.skills,
          tags: [],
          claims: this.extractClaims(bullet.content, project.skills),
          retrievalScore: 0,
          retrievalSource: "profile",
        });
      }
    }

    return candidates;
  }

  private extractClaims(
    content: string,
    skills: string[],
  ): ProfileBulletClaim[] {
    const claims: ProfileBulletClaim[] = [];
    for (const match of content.matchAll(/\b\d+(?:[.,]\d+)?%?\b/g)) {
      claims.push({
        claimType: "metric" as const,
        value: match[0],
        spanStart: match.index,
        spanEnd: (match.index ?? 0) + match[0].length,
      });
    }

    const lower = content.toLowerCase();
    for (const skill of skills) {
      const index = lower.indexOf(skill.toLowerCase());
      if (index >= 0) {
        claims.push({
          claimType: "skill" as const,
          value: skill,
          spanStart: index,
          spanEnd: index + skill.length,
        });
      }
    }

    return claims;
  }

  private lexicalScore(
    candidate: EvidenceCandidate,
    requirements: NormalizedRequirement[],
  ): number {
    const textTokens = new Set([
      ...this.tokenize(candidate.content),
      ...candidate.skills.flatMap((skill) => this.tokenize(skill)),
      ...candidate.tags.flatMap((tag) => this.tokenize(tag)),
    ]);
    const weightedHits = requirements.reduce((score, requirement) => {
      const hits = requirement.terms.filter((term) => textTokens.has(term)).length;
      return score + hits * requirement.weight;
    }, 0);
    return Math.min(1, weightedHits / 8);
  }

  private extractPreservedFacts(candidate: EvidenceCandidate): string[] {
    const claimFacts = candidate.claims.map((claim) => claim.value);
    return [...new Set([candidate.content, ...claimFacts])].slice(0, 6);
  }

  private fallbackSelection(
    candidate: EvidenceCandidate,
    rank: number,
  ): SelectionResult {
    return {
      bulletId: candidate.bulletId,
      rank,
      relevanceScore: candidate.retrievalScore,
      confidence: 0.4,
      matchedRequirements: [],
      jobEvidence: [],
      profileEvidence: [candidate.content],
      riskFlags: ["selection_fallback"],
    };
  }

  private passVerification(notes: string[] = []): VerificationResult {
    return {
      pass: true,
      unsupportedClaims: [],
      droppedFacts: [],
      copyRisk: "low",
      naturalnessNotes: notes,
      fixInstructions: [],
    };
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9+#.\s-]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 1);
  }

  private hasTokenOverlap(a: string, b: string, threshold: number): boolean {
    const tokensA = new Set(this.tokenize(a));
    const tokensB = new Set(this.tokenize(b));
    if (tokensA.size === 0) return true;
    const overlap = [...tokensA].filter((token) => tokensB.has(token)).length;
    return overlap / tokensA.size >= threshold;
  }

  private copyRisk(jobDescription: string, rewrite: string) {
    const jdTokens = new Set(this.tokenize(jobDescription));
    const rewriteTokens = this.tokenize(rewrite);
    if (rewriteTokens.length === 0) return "low" as const;
    const overlap =
      rewriteTokens.filter((token) => jdTokens.has(token)).length /
      rewriteTokens.length;
    if (overlap > 0.85) return "high" as const;
    if (overlap > 0.65) return "medium" as const;
    return "low" as const;
  }

  private async fetchProfile(userId: string): Promise<ProfileData> {
    const [
      user,
      experiences,
      projects,
      education,
      skillCategories,
      certifications,
    ] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.experience.findMany({
        where: { userId },
        orderBy: { startDate: "desc" },
        include: {
          bullets: {
            include: {
              skills: { include: { skill: true } },
            },
          },
        },
      }),
      this.prisma.project.findMany({
        where: { userId },
        include: {
          bullets: true,
          skills: { include: { skill: true } },
        },
      }),
      this.prisma.education.findMany({ where: { userId } }),
      this.prisma.skillCategory.findMany({
        where: { userId },
        include: { skills: true },
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
        skills: cat.skills.map((s) => ({ id: s.id, name: s.name })),
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

  private assembleResume(
    profile: ProfileData,
    selectedCandidates: EvidenceCandidate[],
    traces: Map<string, EvidenceTrace>,
  ): EditableResume {
    const byParent = new Map<string, EvidenceCandidate[]>();
    for (const candidate of selectedCandidates) {
      const list = byParent.get(candidate.parentId) ?? [];
      list.push(candidate);
      byParent.set(candidate.parentId, list);
    }

    const experienceIds = [
      ...new Set(
        selectedCandidates
          .filter((candidate) => candidate.parentType === "experience")
          .map((candidate) => candidate.parentId),
      ),
    ];
    const projectIds = [
      ...new Set(
        selectedCandidates
          .filter((candidate) => candidate.parentType === "project")
          .map((candidate) => candidate.parentId),
      ),
    ];

    const experiences = experienceIds
      .map((parentId, index) => {
        const exp = profile.experiences.find((item) => item.id === parentId);
        if (!exp) return null;
        const bullets = (byParent.get(parentId) ?? [])
          .sort((a, b) => b.retrievalScore - a.retrievalScore)
          .map((candidate, order) => ({
            id: candidate.bulletId,
            text: traces.get(candidate.bulletId)?.finalText ?? candidate.content,
            visible: true as const,
            order,
          }));
        return {
          id: exp.id,
          company: exp.company,
          title: exp.title,
          location: exp.location,
          startDate: exp.startDate,
          endDate: exp.endDate,
          bullets,
          visible: true,
          order: index,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const projects = projectIds
      .map((parentId, index) => {
        const project = profile.projects.find((item) => item.id === parentId);
        if (!project) return null;
        const bullets = (byParent.get(parentId) ?? [])
          .sort((a, b) => b.retrievalScore - a.retrievalScore)
          .map((candidate, order) => ({
            id: candidate.bulletId,
            text: traces.get(candidate.bulletId)?.finalText ?? candidate.content,
            visible: true as const,
            order,
          }));
        return {
          id: project.id,
          name: project.name,
          date: project.date,
          url: project.url,
          tech: project.skills,
          bullets,
          visible: true,
          order: index,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      user: profile.user
        ? {
            firstName: profile.user.firstName ?? undefined,
            lastName: profile.user.lastName ?? undefined,
            email: profile.user.email ?? undefined,
            phone: profile.user.phone ?? undefined,
            location: profile.user.location ?? undefined,
            website: profile.user.website ?? undefined,
            linkedin: profile.user.linkedin ?? undefined,
          }
        : undefined,
      sectionOrder: [
        { id: "education", type: "education", visible: true, order: 0 },
        { id: "experience", type: "experience", visible: true, order: 1 },
        { id: "skills", type: "skills", visible: true, order: 2 },
        { id: "projects", type: "projects", visible: true, order: 3 },
        { id: "certifications", type: "certifications", visible: true, order: 4 },
      ],
      education: profile.education.map((edu, index) => ({
        id: edu.id,
        institution: edu.institution,
        degree: edu.degree,
        location: edu.location,
        graduationDate: edu.graduationDate,
        coursework: edu.coursework.map((name, i) => ({
          id: `${edu.id}-cw-${i}`,
          name,
          visible: true,
        })),
        visible: true,
        order: index,
      })),
      experiences,
      skillCategories: profile.skillCategories.map((cat, index) => ({
        id: cat.id,
        name: cat.name,
        skills: cat.skills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          visible: true,
        })),
        visible: true,
        order: index,
      })),
      projects,
      certifications: profile.certifications.map((cert, index) => ({
        id: cert.id,
        title: cert.title,
        issuer: cert.issuer,
        issueDate: cert.issueDate,
        expirationDate: cert.expirationDate,
        credentialUrl: cert.credentialUrl,
        visible: true,
        order: index,
      })),
    };
  }

  private async applyDefaultPreset(
    userId: string,
    resume: EditableResume,
  ): Promise<void> {
    const defaultPreset = await this.prisma.resumePreset.findFirst({
      where: { userId, isDefault: true },
    });
    if (!defaultPreset) return;

    const presetSectionOrder = defaultPreset.sectionOrder as SectionOrder[];
    if (presetSectionOrder?.length) {
      const assembledMap = new Map(resume.sectionOrder.map((s) => [s.type, s]));
      const mergedOrder = presetSectionOrder
        .map((preset, index) => {
          const assembled = assembledMap.get(preset.type);
          return assembled
            ? { ...assembled, order: index, visible: preset.visible }
            : null;
        })
        .filter((item): item is SectionOrder => item !== null);
      for (const section of resume.sectionOrder) {
        if (!mergedOrder.find((item) => item.type === section.type)) {
          mergedOrder.push({ ...section, order: mergedOrder.length });
        }
      }
      resume.sectionOrder = mergedOrder;
    }

    resume.styleOptions = {
      fontFamily: defaultPreset.fontFamily as any,
      fontSize: (defaultPreset.fontSize as 10 | 11 | 12) ?? 11,
    };
  }

  private async saveResults(
    jobId: string,
    resume: EditableResume,
    selectedCandidates: EvidenceCandidate[],
    traces: Map<string, EvidenceTrace>,
  ): Promise<void> {
    const trackingSlug = randomBytes(6).toString("hex");
    const job = await this.prisma.resumeJob.findUnique({
      where: { id: jobId },
      include: { user: true },
    });
    const user = job?.user as any;
    if (user?.trackingEnabled && user?.website) {
      const prefix = (user.trackingSlugPrefix as string) || "r";
      const base = (user.website as string).replace(/\/+$/, "");
      resume = {
        ...resume,
        user: {
          ...resume.user,
          websiteHref: `${base}/${prefix}/${trackingSlug}`,
        },
      };
    }

    await this.prisma.resumeJob.update({
      where: { id: jobId },
      data: {
        resultResume: resume as any,
        completedAt: new Date(),
        trackingSlug,
      },
    });

    await Promise.all(
      selectedCandidates.map((candidate) => {
        const trace = traces.get(candidate.bulletId);
        if (!trace) return Promise.resolve();
        return this.prisma.resumeJobBullet.create({
          data: {
            resumeJobId: jobId,
            bulletId: candidate.bulletId,
            originalText: candidate.content,
            rewrittenText: trace.finalText,
            evidence: {
              strategy: "evidence",
              retrieval: {
                score: candidate.retrievalScore,
                source: candidate.retrievalSource,
              },
              selection: trace.selection,
              editPlan: trace.editPlan,
              rewrite: trace.rewrite,
              verification: trace.verification,
              riskFlags: [
                ...trace.selection.riskFlags,
                ...trace.rewrite.riskFlags,
              ],
            },
            verifierNote: trace.verifierNote,
          },
        });
      }),
    );
  }

  private async upsertMissingMetadata(
    userId: string,
    jobRecord:
      | { companyId: string | null; positionId: string | null; teamId: string | null }
      | null,
    parsedJd: ParsedJD,
  ) {
    let companyId = jobRecord?.companyId ?? null;
    let positionId = jobRecord?.positionId ?? null;
    let teamId = jobRecord?.teamId ?? null;

    if (!companyId && parsedJd.companyName) {
      const company = await this.prisma.company.upsert({
        where: { userId_name: { userId, name: parsedJd.companyName } },
        create: { userId, name: parsedJd.companyName },
        update: {},
      });
      companyId = company.id;
    }

    if (!positionId && parsedJd.jobPosition) {
      const position = await this.prisma.position.upsert({
        where: { userId_title: { userId, title: parsedJd.jobPosition } },
        create: { userId, title: parsedJd.jobPosition },
        update: {},
      });
      positionId = position.id;
    }

    if (!teamId && parsedJd.teamName) {
      const team = await this.prisma.team.upsert({
        where: { userId_name: { userId, name: parsedJd.teamName } },
        create: { userId, name: parsedJd.teamName },
        update: {},
      });
      teamId = team.id;
    }

    return { companyId, positionId, teamId };
  }

  private async updateProgress(
    job: Job<EvidenceJobData>,
    jobId: string,
    userId: string,
    status: JobStatus,
    stage: string,
    progress: number,
  ): Promise<void> {
    await this.updateJobStatus(jobId, status, stage, progress);
    await job.updateProgress({ progress, stage, userId });
  }

  private async updateJobStatus(
    jobId: string,
    status: JobStatus,
    stage: string,
    progress: number,
    errorMessage?: string,
  ): Promise<void> {
    await this.prisma.resumeJob.update({
      where: { id: jobId },
      data: { status, stage, progress, errorMessage },
    });
  }
}
