/**
 * Create or reset the admin user. Safe to run against production.
 *
 * Usage:
 *   POSTGRES_URL_NON_POOLING="postgres://..." ADMIN_PASSWORD="your-new-password" \
 *     node scripts/create-admin.js [email]
 *
 * Defaults to admin@dastiyor.com. ADMIN_PASSWORD is required — never hardcode it,
 * this file is in git.
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const url =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL;
if (!url) {
  console.error("Set POSTGRES_URL_NON_POOLING (or DATABASE_URL) to the database connection string.");
  process.exit(1);
}

const password = process.env.ADMIN_PASSWORD;
if (!password || password.length < 12) {
  console.error("Set ADMIN_PASSWORD to a new password of at least 12 characters.");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  const email = (process.argv[2] || "admin@dastiyor.com").trim().toLowerCase();
  const hashed = await bcrypt.hash(password, 10);

  // ponytail: raw SQL — schema.prisma has drifted from the live Supabase columns,
  // so Prisma's typed binds fail (22P03). Untouched columns keep their DB defaults.
  await prisma.$executeRaw`
    INSERT INTO "User" ("id", "fullName", "email", "password", "role", "isVerified", "createdAt", "updatedAt")
    VALUES (${crypto.randomUUID()}, 'Dastiyor Admin', ${email}, ${hashed}, 'ADMIN', true, NOW(), NOW())
    ON CONFLICT ("email") DO UPDATE SET
      "password" = EXCLUDED."password",
      "role" = 'ADMIN',
      "isVerified" = true,
      "loginAttempts" = 0,
      "lockedUntil" = NULL,
      "updatedAt" = NOW()
  `;

  const [row] = await prisma.$queryRaw`
    SELECT "email", "role", "isVerified" FROM "User" WHERE "email" = ${email}
  `;
  console.log("Admin user ready:", row);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
