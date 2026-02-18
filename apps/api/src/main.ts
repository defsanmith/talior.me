import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      // Allow the origin to be overridden via CORS_ORIGIN for Docker / prod deployments.
      origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
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

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}`);
}

bootstrap();
