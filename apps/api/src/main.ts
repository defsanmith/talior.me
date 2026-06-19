import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { ApiKeyModule } from "./api-keys/api-keys.module";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { WebhookModule } from "./webhook/webhook.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      // Allow the origin to be overridden via CORS_ORIGIN for Docker / prod deployments.
      // Also accepts chrome-extension:// origins for the tailor.me browser extension.
      origin: (origin, callback) => {
        const allowed = process.env.CORS_ORIGIN ?? "http://localhost:3000";
        if (
          !origin ||
          origin === allowed ||
          origin.startsWith("chrome-extension://")
        ) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    },
  });

  // Enable cookie parser
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Apply global response interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Apply global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger docs scoped to webhook + API key management only
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Tailor.me Webhook API")
    .setDescription(
      "Webhook endpoint for third-party resume generators to push finished resumes into a user's Tailor.me account.\n\n" +
      "Use **API Keys** endpoints (JWT auth) to create a key, then pass it as `X-API-Key` on the **Webhook** endpoint.",
    )
    .setVersion("1.0")
    .addApiKey({ type: "apiKey", in: "header", name: "X-API-Key" }, "ApiKeyAuth")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "BearerAuth")
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
    include: [WebhookModule, ApiKeyModule],
  });
  SwaggerModule.setup("api/webhook/docs", app, swaggerDocument);

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}`);
}

bootstrap();
