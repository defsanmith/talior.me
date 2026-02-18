import {
  Controller,
  ForbiddenException,
  Get,
  Post,
} from "@nestjs/common";
import { Public } from "../auth/decorators/public.decorator";
import { SearchService } from "./search.service";

@Controller("api/search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get("health")
  @Public()
  async health() {
    return this.searchService.health();
  }

  @Post("reindex")
  async reindex() {
    if (process.env.NODE_ENV === "production") {
      throw new ForbiddenException("Reindex is only available in development");
    }
    return this.searchService.reindexAll();
  }
}
