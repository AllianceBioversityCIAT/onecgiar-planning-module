import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from 'process';
import { HttpExceptionFilter } from './exception-filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
async function bootstrap() {
  const app = await NestFactory.create(AppModule,{ cors: true });
  // //app.useGlobalFilters(new HttpExceptionFilter());
  app.use(compression());
  app.enableCors({
    origin: '*',
    methods: 'GET, PUT, POST, PATCH, DELETE',
    allowedHeaders: 'Content-Type, Authorization, x-socket-id',
    credentials: true,
  });
  const config = new DocumentBuilder()
    .setTitle('Planning Module')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(env.APP_Prefix || '', app, document);
  await app.listen(env.APP_PORT);
}
bootstrap();
