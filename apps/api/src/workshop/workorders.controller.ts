import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { WorkOrdersService } from "./workorders.service";

@Controller("workshop/workorders")
export class WorkOrdersController {
  constructor(private readonly svc: WorkOrdersService) {}

  @Get()
  async list(
    @Req() req: Request,
    @Query("status") status?: string,
    @Query("q") q?: string,
  ) {
    const ownerId = (req as any).user?.id as string | undefined;
    return this.svc.list(ownerId, status, q);
  }

  @Get(":id")
  async get(@Req() req: Request, @Param("id") id: string) {
    const ownerId = (req as any).user?.id as string | undefined;
    return this.svc.get(ownerId, id);
  }

  @Post()
  async create(
    @Req() req: Request,
    @Body()
    body: {
      customerId: string;
      bikeId?: string;
      scheduledAt?: string;
      dueAt?: string;
    },
  ) {
    const ownerId = (req as any).user?.id as string | undefined;
    return this.svc.create(ownerId, body);
  }

  @Post(":id/start")
  async start(@Req() req: Request, @Param("id") id: string) {
    const ownerId = (req as any).user?.id as string | undefined;
    return this.svc.start(ownerId, id);
  }

  @Post(":id/ready")
  async markReady(@Req() req: Request, @Param("id") id: string) {
    const ownerId = (req as any).user?.id as string | undefined;
    return this.svc.markReady(ownerId, id);
  }

  @Post(":id/status")
  async setStatus(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { status: "created" | "in_progress" | "ready" | "delivered" },
  ) {
    const ownerId = (req as any).user?.id as string | undefined;
    return this.svc.updateStatus(ownerId, id, body.status);
  }

  @Post(":id/estimate")
  async setEstimate(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { estimatedMinutes?: number; hourlyRate?: number },
  ) {
    const ownerId = (req as any).user?.id as string | undefined;
    return this.svc.updateEstimate(
      ownerId,
      id,
      body.estimatedMinutes,
      body.hourlyRate,
    );
  }
}
