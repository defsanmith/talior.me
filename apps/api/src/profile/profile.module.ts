import { Module } from "@nestjs/common";
import { PdfModule } from "../pdf/pdf.module";
import { SearchModule } from "../search/search.module";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";

@Module({
  imports: [SearchModule, PdfModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
