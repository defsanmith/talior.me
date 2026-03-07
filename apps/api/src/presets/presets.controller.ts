import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  StreamableFile,
} from "@nestjs/common";
import {
  CreatePresetDto,
  PreviewPresetDto,
  UpdatePresetDto,
} from "@tailor.me/shared";
import {
  CurrentUser,
  JwtPayload,
} from "../auth/decorators/current-user.decorator";
import { PresetsService } from "./presets.service";

@Controller("api/presets")
export class PresetsController {
  constructor(private readonly presetsService: PresetsService) {}

  @Get()
  async listPresets(@CurrentUser() user: JwtPayload) {
    const presets = await this.presetsService.listPresets(user.userId);
    return { presets };
  }

  @Post()
  async createPreset(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePresetDto,
  ) {
    const preset = await this.presetsService.createPreset(user.userId, dto);
    return { preset };
  }

  @Patch(":presetId")
  async updatePreset(
    @CurrentUser() user: JwtPayload,
    @Param("presetId") presetId: string,
    @Body() dto: UpdatePresetDto,
  ) {
    const preset = await this.presetsService.updatePreset(
      user.userId,
      presetId,
      dto,
    );
    return { preset };
  }

  @Delete(":presetId")
  async deletePreset(
    @CurrentUser() user: JwtPayload,
    @Param("presetId") presetId: string,
  ) {
    await this.presetsService.deletePreset(user.userId, presetId);
    return { success: true };
  }

  @Post(":presetId/default")
  async setDefault(
    @CurrentUser() user: JwtPayload,
    @Param("presetId") presetId: string,
  ) {
    const preset = await this.presetsService.setDefault(user.userId, presetId);
    return { preset };
  }

  @Post("preview")
  async generatePreview(
    @CurrentUser() user: JwtPayload,
    @Body() dto: PreviewPresetDto,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.presetsService.generatePreview(
      user.userId,
      dto,
    );
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new HttpException(
        "Could not generate preview — fill out your profile first",
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return new StreamableFile(pdfBuffer, {
      type: "application/pdf",
      disposition: 'inline; filename="preview.pdf"',
      length: pdfBuffer.length,
    });
  }
}
