/**
 * Create or reset the admin user. Safe to run against production.
 * Usage: DATABASE_URL="postgresql://..." node scripts/create-admin.js
 *
 * Creates/updates: admin@dastiyor.com with password "yDFidpXBK2TDSXqONWAz"
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@dastiyor.com";
  const password = "yDFidpXBK2TDSXqONWAz";
  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      password: hashed,
      role: "ADMIN",
      fullName: "Dastiyor Admin",
      isVerified: true,
    },
    create: {
      fullName: "Dastiyor Admin",
      email,
      password: hashed,
      role: "ADMIN",
      isVerified: true,
    },
  });

  console.log("Admin user ready: %s / %s", email, password);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
