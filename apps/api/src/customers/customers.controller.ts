import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "../prisma.service";

@Controller("customers")
export class CustomersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: Request) {
    const ownerId = (req as any).user?.id as string | undefined;
    if (!ownerId) throw new UnauthorizedException("Missing owner");
    return this.prisma.customer.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  @Post()
  async create(
    @Req() req: Request,
    @Body()
    body: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
    },
  ) {
    const ownerId = (req as any).user?.id as string | undefined;
    if (!ownerId) throw new UnauthorizedException("Missing owner");
    const { email, firstName, lastName, phone } = body || {};
    return this.prisma.customer.create({
      data: { email, firstName, lastName, phone, ownerId },
    });
  }
}
