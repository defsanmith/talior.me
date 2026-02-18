import { Module } from "@nestjs/common";
import { BM25Processor } from "./bm25.processor";
import { ResumeProcessor } from "./resume.processor";
import { SearchModule } from "../search/search.module";

@Module({
  imports: [SearchModule],
  providers: [ResumeProcessor, BM25Processor],
})
export class ProcessorModule {}
