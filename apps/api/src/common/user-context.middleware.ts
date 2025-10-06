import { Injectable, NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";

@Injectable()
export class UserContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const id = (req.headers["x-user-id"] as string | undefined) || undefined;
    const email =
      (req.headers["x-user-email"] as string | undefined) || undefined;
    (req as any).user = id ? { id, email } : null;
    next();
  }
}
