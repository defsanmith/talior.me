# Evidence-First Tailoring Workflow

Tailor.me supports an `evidence` resume generation strategy in addition to the legacy `openai` and `bm25` strategies. The evidence path keeps the existing job queue, database shape, resume JSON contract, and PDF flow, but replaces the monolithic selection/rewrite prompt with explicit worker stages.

## Runtime Stages

1. Parse the job description with the configured AI provider.
2. Normalize parsed JD fields into weighted requirements.
3. Flatten profile experience and project bullets into evidence candidates with parent metadata, skills, and lightweight claim spans.
4. Retrieve candidates through OpenSearch/BM25, falling back to in-memory lexical scoring if search fails or returns too few bullets.
5. Rerank the shortlist with evidence-first AI output: matched requirements, job evidence, profile evidence, score, confidence, and risk flags.
6. Create an edit plan for each selected bullet with preserved facts, approved terms, and forbidden inferences.
7. Rewrite from the edit plan instead of directly from the JD.
8. Verify with deterministic checks and optional model verification.
9. Assemble the existing `EditableResume` shape and persist trace evidence in `ResumeJobBullet.evidence`.

## Configuration

- `strategy: "evidence"` selects the new workflow.
- `OPENAI_SELECTION_MODEL` and `GEMINI_SELECTION_MODEL` control evidence ranking.
- `OPENAI_REWRITE_MODEL` and `GEMINI_REWRITE_MODEL` control edit-plan and rewrite stages.
- `OPENAI_VERIFIER_MODEL` and `GEMINI_VERIFIER_MODEL` optionally override verifier models.
- `EVIDENCE_MODEL_VERIFIER=false` disables model verification while retaining deterministic verification.

Rollback is a job-submission concern: choose `openai` for the previous AI path or `bm25` for the sparse retrieval path. No Prisma migration is required for the v1 evidence workflow.

## Evidence Persistence

Each `ResumeJobBullet.evidence` object stores:

- retrieval score and source
- selection result with matched requirements, evidence spans, score, confidence, and risk flags
- edit plan
- rewrite output
- verification result
- combined risk flags

The user-facing resume remains `ResumeJob.resultResume`, so existing editing, tracking, and PDF behavior continue to work.
