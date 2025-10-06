import { Injectable, INestApplication, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Configure Prisma client options here if needed
    // e.g. log queries in dev, set error format, etc.
    const log: Prisma.LogLevel[] =
      process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'info', 'warn', 'error'];

    super({
      log,
      errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'pretty',
      datasources: {
        db: {
          // DATABASE_URL is read automatically by Prisma, override here only if necessary
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected');
  }

  // Optional: clean shutdown when Nest app closes
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }

  // Hook into Nest shutdown to close Prisma properly
  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      this.logger.warn('Prisma beforeExit: closing Nest application...');
      await app.close();
    });
  }
}