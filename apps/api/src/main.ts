import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
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
