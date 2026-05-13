import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

let prisma: PrismaClient;

if (process.env.TURSO_DATABASE_URL) {
  prisma = new PrismaClient({
    adapter: new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    }),
  });
} else {
  prisma = new PrismaClient();
}

export default prisma;
