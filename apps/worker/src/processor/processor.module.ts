import { Module } from "@nestjs/common";
import { EvidenceWorkflowService } from "../evidence/evidence-workflow.service";
import { SearchModule } from "../search/search.module";
import { BM25Processor } from "./bm25.processor";
import { ResumeProcessor } from "./resume.processor";

@Module({
  imports: [SearchModule],
  providers: [ResumeProcessor, BM25Processor, EvidenceWorkflowService],
})
export class ProcessorModule {}
