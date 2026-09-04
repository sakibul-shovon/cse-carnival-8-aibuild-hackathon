import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const backendDirectory = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
dotenv.config({ path: path.resolve(backendDirectory, "../.env") });

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BACKEND_PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1).default("mysql://campusos:campusos_dev_password@localhost:3306/campusos"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-5-mini"),
  DEV_USER_ID: z.string().min(1).default("user-student-001")
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  throw new Error(`Invalid environment configuration: ${result.error.message}`);
}

export const environment = result.data;
