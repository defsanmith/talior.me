import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser, JwtPayload } from "../auth/decorators/current-user.decorator";
import { ApiKeysService } from "./api-keys.service";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";

@ApiTags("API Keys")
@ApiBearerAuth("BearerAuth")
@Controller("api/api-keys")
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create an API key",
    description:
      "Generates a new API key scoped to the authenticated user. " +
      "The full plaintext key is returned exactly once — store it immediately, it is never retrievable again.",
  })
  @ApiResponse({
    status: 201,
    description: "Key created. The `key` field will not appear again.",
    schema: {
      example: {
        success: true,
        data: {
          id: "clkey123abc",
          name: "Resume Generator",
          prefix: "tlr_ab12",
          createdAt: "2026-06-04T10:00:00.000Z",
          expiresAt: null,
          key: "tlr_ab12cd34ef56gh78ij90kl12mn34op56qr78st90uv12wx34yz56ab78cd90ef12",
        },
        statusCode: 201,
        timestamp: "2026-06-04T10:00:00.000Z",
      },
    },
  })
  create(@Body() dto: CreateApiKeyDto, @CurrentUser() user: JwtPayload) {
    return this.apiKeysService.createApiKey(user.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: "List API keys",
    description:
      "Returns all API keys for the authenticated user. The plaintext key is never returned — only the 8-character prefix for identification.",
  })
  @ApiResponse({
    status: 200,
    description: "List of API keys (no secrets).",
    schema: {
      example: {
        success: true,
        data: [
          {
            id: "clkey123abc",
            name: "Resume Generator",
            prefix: "tlr_ab12",
            lastUsedAt: "2026-06-10T08:00:00.000Z",
            createdAt: "2026-06-04T10:00:00.000Z",
            expiresAt: null,
          },
        ],
        statusCode: 200,
        timestamp: "2026-06-04T10:00:00.000Z",
      },
    },
  })
  list(@CurrentUser() user: JwtPayload) {
    return this.apiKeysService.listApiKeys(user.userId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete an API key",
    description:
      "Permanently revokes a key. Any webhook calls using it will immediately return 401.",
  })
  @ApiResponse({ status: 204, description: "Key deleted." })
  @ApiResponse({ status: 404, description: "Key not found or belongs to another user." })
  delete(@Param("id") id: string, @CurrentUser() user: JwtPayload) {
    return this.apiKeysService.deleteApiKey(id, user.userId);
  }
}
