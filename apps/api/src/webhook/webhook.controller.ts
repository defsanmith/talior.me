import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser, JwtPayload } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { ApiKeyGuard } from "../auth/guards/api-key.guard";
import { SubmitResumeDto } from "./dto/submit-resume.dto";
import { WebhookService } from "./webhook.service";

@ApiTags("Webhook")
@ApiSecurity("ApiKeyAuth")
@Controller("api/webhook")
@Public()
@UseGuards(ApiKeyGuard)
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post("resume")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Submit a generated resume",
    description:
      "Creates a completed ResumeJob entry in the authenticated user's account. " +
      "The job is stored with status COMPLETED and progress 100 — no further processing is triggered. " +
      "Date fields in resultResume are automatically normalised to 'Mmm YYYY' format. " +
      "Resume tracking (trackingSlug) is not supported for webhook-submitted jobs.",
  })
  @ApiResponse({
    status: 201,
    description: "Resume job created successfully.",
    schema: {
      example: {
        success: true,
        data: { jobId: "clxyz1234abcd" },
        statusCode: 201,
        timestamp: "2026-06-04T10:30:00.000Z",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Validation error — missing required fields or invalid resultResume structure.",
    schema: {
      example: {
        success: false,
        error: "Invalid resume structure: Required at experiences[0].id",
        statusCode: 400,
        timestamp: "2026-06-04T10:30:00.000Z",
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid X-API-Key header.",
    schema: {
      example: {
        success: false,
        error: "Invalid API key",
        statusCode: 401,
        timestamp: "2026-06-04T10:30:00.000Z",
      },
    },
  })
  submitResume(@Body() dto: SubmitResumeDto, @CurrentUser() user: JwtPayload) {
    return this.webhookService.submitResume(dto, user.userId);
  }
}
