import { PrismaClient } from "@prisma/client";
import { environment } from "./environment.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const database = globalForPrisma.prisma ?? new PrismaClient({
  log: environment.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});

if (environment.NODE_ENV !== "production") {
  globalForPrisma.prisma = database;
}
