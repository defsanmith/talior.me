import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiKeysService } from "../../api-keys/api-keys.service";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawKey = request.headers["x-api-key"];

    if (!rawKey) {
      throw new UnauthorizedException("Missing X-API-Key header");
    }

    const payload = await this.apiKeysService.validateApiKey(rawKey);
    request.user = { userId: payload.userId, email: "" };
    return true;
  }
}
