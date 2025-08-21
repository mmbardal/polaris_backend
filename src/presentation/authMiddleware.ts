import type { Request, Response } from "hyper-express";
import jwt from "jsonwebtoken";
import { finishRes } from "@/presentation/helpers";

const JWT_SECRET = "your-super-secret-key";

// Define the structure of our token payload
export interface UserPayload {
  userId: number;
  username: string;
  accessLevel: "admin" | "viewer";
}

// Extend the Request type to include our user context
declare module "hyper-express" {
  interface Request {
    userContext?: UserPayload;
  }
}

export function authMiddleware(req: Request, res: Response): void {
  try {
    const authHeader = req.headers.authorization;

    if ((authHeader === "") || !authHeader.startsWith("Bearer ")) {
      finishRes(res, { error: "Authorization header missing or invalid." }, 401);

      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;

    // Attach the decoded user payload to the request object
    req.userContext = decoded;
  } catch {
    finishRes(res, { error: "Invalid or expired token." }, 401);

    return;
  }
}

// Add this function to src/presentation/authMiddleware.ts

export function roleMiddleware(requiredRole: "admin" | "viewer") {
  return (req: Request, res: Response): void => {
    // This middleware must run *after* authMiddleware
    if (req.userContext === undefined) {
      finishRes(res, { error: "Authentication context not found." }, 500);

      return;
    }

    if (req.userContext.accessLevel !== requiredRole) {
      finishRes(res, { error: "Forbidden: You do not have the required permissions." }, 403);

      return;
    }
  };
}
