import type { IAdmin } from "@/modules/auth/types/admin.types";
import type { IUser } from "@/modules/auth/types/user.types";

declare global {
  namespace Express {
    interface Request {
      admin?: IAdmin;
      user?: IUser;
      sessionId?: string;
      correlationId?: string;
      traceId?: string;
    }
  }
}
