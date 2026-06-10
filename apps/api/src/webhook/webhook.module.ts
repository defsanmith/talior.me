import { Module } from "@nestjs/common";
import { ApiKeyModule } from "../api-keys/api-keys.module";
import { ApiKeyGuard } from "../auth/guards/api-key.guard";
import { WebhookController } from "./webhook.controller";
import { WebhookService } from "./webhook.service";

@Module({
  imports: [ApiKeyModule],
  controllers: [WebhookController],
  providers: [WebhookService, ApiKeyGuard],
})
export class WebhookModule {}
