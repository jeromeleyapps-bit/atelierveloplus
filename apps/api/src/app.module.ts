import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { CommsController } from "./comms/comms.controller";
import { HubSpotService } from "./comms/hubspot.service";
import { PaymentsModule } from "./payments/payments.module";
import { PrismaService } from "./prisma.service";
import { WorkOrdersController } from "./workshop/workorders.controller";
import { WorkOrdersService } from "./workshop/workorders.service";
import { CustomersController } from "./customers/customers.controller";
import { POSController } from "./pos/pos.controller";
import { POSService } from "./pos/pos.service";
import { UnavailabilitiesModule } from "./unavailabilities/unavailabilities.module";
import { UserContextMiddleware } from "./common/user-context.middleware";
import { AuthController } from "./auth/auth.controller";

@Module({
  imports: [PaymentsModule, UnavailabilitiesModule],
  controllers: [
    HealthController,
    CommsController,
    WorkOrdersController,
    CustomersController,
    POSController,
    AuthController,
  ],
  providers: [HubSpotService, PrismaService, WorkOrdersService, POSService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UserContextMiddleware).forRoutes("*");
  }
}
