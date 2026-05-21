import { Module } from "@nestjs/common";
import { BM25Processor } from "./bm25.processor";
import { EvaluationProcessor } from "./evaluation.processor";
import { ProfileFetcher } from "./profile-fetcher";
import { ResumeProcessor } from "./resume.processor";
import { SearchModule } from "../search/search.module";

@Module({
  imports: [SearchModule],
  providers: [ResumeProcessor, BM25Processor, EvaluationProcessor, ProfileFetcher],
})
export class ProcessorModule {}
