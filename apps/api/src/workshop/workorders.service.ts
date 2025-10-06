import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { HubSpotService } from "../comms/hubspot.service";

interface CreateWorkOrderDto {
  customerId: string;
  bikeId?: string;
  scheduledAt?: string; // ISO date
  dueAt?: string; // ISO date
}

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hubspot: HubSpotService,
  ) {}

  private ensureOwner(ownerId?: string) {
    if (!ownerId) throw new UnauthorizedException("Missing owner");
  }

  async get(ownerId: string | undefined, id: string) {
    this.ensureOwner(ownerId);
    const wo = await this.prisma.workOrder.findFirst({
      where: { id, ownerId: ownerId! },
      include: { customer: true, bike: true },
    });
    if (!wo) throw new NotFoundException("WorkOrder not found");
    return wo;
  }

  async create(ownerId: string | undefined, dto: CreateWorkOrderDto) {
    this.ensureOwner(ownerId);
    // Ownership consistency checks
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, ownerId: ownerId! },
    });
    if (!customer)
      throw new UnauthorizedException("Customer not found for this owner");
    if (dto.bikeId) {
      const bike = await this.prisma.bike.findFirst({
        where: { id: dto.bikeId, ownerId: ownerId! },
      });
      if (!bike)
        throw new UnauthorizedException("Bike not found for this owner");
      // Optional: ensure the bike belongs to the same customer
      if (bike.customerId !== dto.customerId)
        throw new UnauthorizedException(
          "Bike does not belong to provided customer",
        );
    }
    const workOrder = await this.prisma.workOrder.create({
      data: {
        ownerId: ownerId!,
        customerId: dto.customerId,
        bikeId: dto.bikeId ?? null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      },
    });
    return workOrder;
  }

  async start(ownerId: string | undefined, id: string) {
    this.ensureOwner(ownerId);
    // ownership check first
    await this.get(ownerId, id);
    const updated = await (this.prisma as any).workOrder.update({
      where: { id },
      data: { status: "in_progress", inProgressAt: new Date() },
      include: { customer: true, bike: true },
    });
    return updated as any;
  }

  async markReady(ownerId: string | undefined, id: string) {
    this.ensureOwner(ownerId);
    await this.get(ownerId, id);
    const updated = await (this.prisma as any).workOrder.update({
      where: { id },
      data: { status: "ready", readyAt: new Date() },
      include: { customer: true, bike: true },
    });

    // Emit event to HubSpot (properties minimal for now)
    await this.hubspot.emitCustomEvent("workorder.ready", {
      workOrderId: (updated as any).id,
      customerId: (updated as any).customerId,
      bikeId: (updated as any).bikeId ?? undefined,
      status: (updated as any).status,
      readyAt: new Date().toISOString(),
    });

    // Fallback: update HubSpot contact properties to trigger Workflows (Sakari SMS/Email)
    const customerEmail = updated.customer?.email;
    let hubspotFallbackAt: string | null = null;
    if (customerEmail) {
      hubspotFallbackAt = new Date().toISOString();
      await this.hubspot.updateContactByEmail(customerEmail, {
        last_repair_ready_at: new Date().toISOString(),
        last_repair_id: updated.id,
      });

      // Persist the fallback timestamp in DB
      await (this.prisma as any).workOrder.update({
        where: { id: updated.id },
        data: { hubspotFallbackAt: new Date(hubspotFallbackAt) },
      });
    }

    return { ...updated, hubspotFallbackAt };
  }

  async list(ownerId: string | undefined, status?: string, q?: string) {
    this.ensureOwner(ownerId);
    const where: any = { ownerId: ownerId! };
    if (status) where.status = status;
    if (q && q.trim()) {
      const query = q.trim();
      where.OR = [
        { id: { contains: query, mode: "insensitive" } },
        { bikeId: { contains: query, mode: "insensitive" } },
        { customer: { firstName: { contains: query, mode: "insensitive" } } },
        { customer: { lastName: { contains: query, mode: "insensitive" } } },
        { customer: { email: { contains: query, mode: "insensitive" } } },
      ];
    }
    return this.prisma.workOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { customer: true, bike: true },
      take: 50,
    });
  }

  async updateStatus(
    ownerId: string | undefined,
    id: string,
    status: "created" | "in_progress" | "ready" | "delivered",
  ) {
    this.ensureOwner(ownerId);
    await this.get(ownerId, id);
    const data: any = { status };
    const now = new Date();
    if (status === "in_progress") data.inProgressAt = now;
    if (status === "ready") data.readyAt = now;
    const updated = await (this.prisma as any).workOrder.update({
      where: { id },
      data,
      include: { customer: true, bike: true },
    });
    return updated as any;
  }

  async updateEstimate(
    ownerId: string | undefined,
    id: string,
    estimatedMinutes?: number | null,
    hourlyRate?: number | null,
  ) {
    this.ensureOwner(ownerId);
    await this.get(ownerId, id);
    const data: any = {};
    if (typeof estimatedMinutes === "number")
      data.estimatedMinutes = estimatedMinutes;
    if (typeof hourlyRate === "number") data.hourlyRate = hourlyRate;
    const updated = await (this.prisma as any).workOrder.update({
      where: { id },
      data,
      include: { customer: true, bike: true },
    });
    return updated as any;
  }
}
