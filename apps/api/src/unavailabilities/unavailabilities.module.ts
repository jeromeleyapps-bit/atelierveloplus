import { Module } from "@nestjs/common";
import { UnavailabilitiesService } from "./unavailabilities.service";
import { UnavailabilitiesController } from "./unavailabilities.controller";
import { PrismaService } from "../prisma.service";

@Module({
  controllers: [UnavailabilitiesController],
  providers: [UnavailabilitiesService, PrismaService],
  exports: [UnavailabilitiesService],
})
export class UnavailabilitiesModule {}
