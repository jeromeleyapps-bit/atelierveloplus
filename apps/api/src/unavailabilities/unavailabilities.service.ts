import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";

type CreateUnavailabilityInput = {
  title: string;
  start: Date;
  end: Date;
  type?: "meeting" | "vacation" | "training" | "other";
};

type UpdateUnavailabilityInput = Partial<CreateUnavailabilityInput>;

@Injectable()
export class UnavailabilitiesService {
  constructor(private prisma: PrismaService) {}

  private ensureOwner(ownerId?: string) {
    if (!ownerId) throw new UnauthorizedException("Missing owner");
  }

  async create(ownerId: string | undefined, data: CreateUnavailabilityInput) {
    this.ensureOwner(ownerId);
    return this.prisma.unavailability.create({
      data: { ...data, ownerId: ownerId! },
    });
  }

  async findAll(ownerId: string | undefined) {
    this.ensureOwner(ownerId);
    return this.prisma.unavailability.findMany({
      where: { ownerId: ownerId! },
      orderBy: { start: "asc" },
    });
  }

  async findUpcoming(ownerId: string | undefined) {
    this.ensureOwner(ownerId);
    return this.prisma.unavailability.findMany({
      where: { ownerId: ownerId!, end: { gte: new Date() } },
      orderBy: { start: "asc" },
      take: 5,
    });
  }

  async findOne(ownerId: string | undefined, id: string) {
    this.ensureOwner(ownerId);
    const item = await this.prisma.unavailability.findFirst({
      where: { id, ownerId: ownerId! },
    });
    if (!item) throw new NotFoundException("Indisponibilité non trouvée");
    return item;
  }

  async update(
    ownerId: string | undefined,
    id: string,
    data: UpdateUnavailabilityInput,
  ) {
    await this.findOne(ownerId, id); // ownership check
    return this.prisma.unavailability.update({
      where: { id },
      data,
    });
  }

  async remove(ownerId: string | undefined, id: string) {
    await this.findOne(ownerId, id); // ownership check
    return this.prisma.unavailability.delete({ where: { id } });
  }
}
