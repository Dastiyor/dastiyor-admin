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

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashed,
      role: "ADMIN",
      isVerified: true,
      loginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      fullName: "Dastiyor Admin",
      email,
      password: hashed,
      role: "ADMIN",
      isVerified: true,
    },
    select: { email: true, role: true, isVerified: true },
  });

  console.log("Admin user ready:", user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
