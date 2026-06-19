import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateApiKeyDto {
  @ApiProperty({
    description: "Human-readable label so you can identify the key later.",
    maxLength: 100,
    example: "Resume Generator",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description:
      "Optional expiry date in ISO 8601 format. Omit for a key that never expires.",
    example: "2027-01-01T00:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
