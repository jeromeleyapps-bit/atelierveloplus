import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { StripeTerminalProvider } from "./stripe-terminal.provider";
import { SumUpProvider } from "./sumup.provider";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [PaymentsController],
  providers: [StripeTerminalProvider, SumUpProvider, PrismaService],
})
export class PaymentsModule {}
