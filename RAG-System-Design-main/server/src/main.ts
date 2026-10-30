import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'file:./dev.db';
  }
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'system-design-jwt-secret-render-2026';
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    process.env.JWT_REFRESH_SECRET = 'system-design-refresh-secret-render-2026';
  }

  // System Design Studio API Bootstrap - Groq & Gemini Enabled
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Structured HTTP Request Logging
  const httpLogger = new Logger('HTTP');
  app.use((req: any, res: any, next: any) => {
    const start = Date.now();
    const { method, originalUrl } = req;
    res.on('finish', () => {
      const duration = Date.now() - start;
      httpLogger.log(`${method} ${originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  // Enable CORS for frontend client
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const allowedOrigins = clientUrl.split(',').map((u) => u.trim().replace(/\/$/, ''));
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1');
      if (isAllowed) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  });

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('System Design Interview Platform API')
    .setDescription('Full-stack backend API for diagramming, deterministic metrics, and AI analysis')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  try {
    await app.listen(port, '0.0.0.0');
    logger.log(`Frontend UI available at: ${clientUrl}`);
    logger.log(`Backend Server running on: http://0.0.0.0:${port}`);
    logger.log(`Swagger API Docs available at: http://0.0.0.0:${port}/api/docs`);
  } catch (err: any) {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${port} is already in use by another process.`);
      logger.error(`To fix: terminate any lingering node processes (e.g. 'Get-Process node | Stop-Process -Force') and restart 'npm run dev'.`);
    } else {
      logger.error(`Bootstrap error: ${err?.message || err}`);
    }
    process.exit(1);
  }
}

bootstrap();
