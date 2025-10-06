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
import * as bcrypt from "bcryptjs";

@Controller("auth")
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Post("register")
  async register(
    @Body()
    body: {
      email: string;
      firstName?: string;
      lastName?: string;
      password: string;
      shopName?: string;
      isAutoEntrepreneur?: boolean;
    },
  ) {
    const email = body.email?.trim().toLowerCase();
    if (!email || !body.password) {
      throw new UnauthorizedException("Email et mot de passe requis");
    }
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing)
      throw new UnauthorizedException(
        "Un utilisateur existe déjà avec cet email",
      );
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        firstName: body.firstName || null,
        lastName: body.lastName || null,
        passwordHash,
        shopName: body.shopName || null,
        isAutoEntrepreneur: !!body.isAutoEntrepreneur,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        shopName: true,
        isAutoEntrepreneur: true,
      },
    });
    return user;
  }

  @Post("login")
  async login(@Body() body: { email: string; password: string }) {
    const email = body.email?.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException("Identifiants invalides");
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Identifiants invalides");
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  @Get("me")
  async me(@Req() req: Request) {
    const id = (req.headers["x-user-id"] as string | undefined) || undefined;
    if (!id) throw new UnauthorizedException("Non authentifié");
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!user) throw new UnauthorizedException("Session invalide");
    return user;
  }
}
