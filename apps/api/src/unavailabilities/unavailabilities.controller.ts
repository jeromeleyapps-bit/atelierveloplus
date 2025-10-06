import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { UnavailabilitiesService } from "./unavailabilities.service";

// Types reçus en entrée HTTP (peuvent contenir des dates sous forme de string)
type CreateUnavailabilityBody = {
  title: string;
  start: string | Date;
  end: string | Date;
  type?: "meeting" | "vacation" | "training" | "other";
};

type UpdateUnavailabilityBody = Partial<CreateUnavailabilityBody>;

// Types attendus par le service (dates typées en Date)
type CreateUnavailabilityInput = {
  title: string;
  start: Date;
  end: Date;
  type?: "meeting" | "vacation" | "training" | "other";
};

type UpdateUnavailabilityInput = Partial<CreateUnavailabilityInput>;

@Controller("unavailabilities")
export class UnavailabilitiesController {
  constructor(private readonly service: UnavailabilitiesService) {}

  @Post()
  create(@Req() req: Request, @Body() data: CreateUnavailabilityBody) {
    const payload: CreateUnavailabilityInput = {
      ...data,
      start: new Date(data.start),
      end: new Date(data.end),
    };
    const ownerId = (req as any).user?.id as string | undefined;
    return this.service.create(ownerId, payload);
  }

  @Get()
  findAll(@Req() req: Request) {
    const ownerId = (req as any).user?.id as string | undefined;
    return this.service.findAll(ownerId);
  }

  @Get("upcoming")
  findUpcoming(@Req() req: Request) {
    const ownerId = (req as any).user?.id as string | undefined;
    return this.service.findUpcoming(ownerId);
  }

  @Get(":id")
  findOne(@Req() req: Request, @Param("id") id: string) {
    const ownerId = (req as any).user?.id as string | undefined;
    return this.service.findOne(ownerId, id);
  }

  @Put(":id")
  update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() data: UpdateUnavailabilityBody,
  ) {
    const { title, type, start, end } = data;
    const payload: UpdateUnavailabilityInput = {
      ...(title !== undefined ? { title } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(start ? { start: new Date(start) } : {}),
      ...(end ? { end: new Date(end) } : {}),
    };
    const ownerId = (req as any).user?.id as string | undefined;
    return this.service.update(ownerId, id, payload);
  }

  @Delete(":id")
  remove(@Req() req: Request, @Param("id") id: string) {
    const ownerId = (req as any).user?.id as string | undefined;
    return this.service.remove(ownerId, id);
  }
}
