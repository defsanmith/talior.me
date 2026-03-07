import { Module } from "@nestjs/common";
import { PdfModule } from "../pdf/pdf.module";
import { PresetsModule } from "../presets/presets.module";
import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";

@Module({
  imports: [PdfModule, PresetsModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
