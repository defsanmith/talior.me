import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, JwtPayload } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { ApiKeyGuard } from "../auth/guards/api-key.guard";
import { SubmitResumeDto } from "./dto/submit-resume.dto";
import { WebhookService } from "./webhook.service";

@Controller("api/webhook")
@Public()
@UseGuards(ApiKeyGuard)
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post("resume")
  @HttpCode(HttpStatus.CREATED)
  submitResume(@Body() dto: SubmitResumeDto, @CurrentUser() user: JwtPayload) {
    return this.webhookService.submitResume(dto, user.userId);
  }
}
