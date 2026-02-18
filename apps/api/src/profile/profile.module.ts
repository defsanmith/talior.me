import { Module } from "@nestjs/common";
import { SearchModule } from "../search/search.module";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";

@Module({
  imports: [SearchModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
