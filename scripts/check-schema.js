/**
 * Verify prisma/schema.prisma still matches the live database.
 *
 * Does a typed Prisma write inside a transaction that always rolls back, so it
 * exercises the bind path without changing data. Catches column-type drift
 * (e.g. balance Float vs Int) that reads alone will not surface.
 *
 * Usage: POSTGRES_URL_NON_POOLING="postgres://..." node scripts/check-schema.js
 */

const { PrismaClient } = require("@prisma/client");

const url = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!url) {
  console.error("Set POSTGRES_URL_NON_POOLING (or DATABASE_URL).");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });
const ROLLBACK = "__rollback__";

prisma
  .$transaction(async (tx) => {
    const [user] = await tx.user.findMany({ take: 1 });
    if (!user) throw new Error("no users to test against");
    // Writing every scalar back unchanged binds each column type.
    const { id, createdAt, updatedAt, ...scalars } = user;
    await tx.user.update({ where: { id }, data: scalars });
    throw new Error(ROLLBACK);
  })
  .then(() => console.error("expected a rollback"))
  .catch((e) => {
    if (e.message === ROLLBACK) {
      console.log("OK: schema matches the live database (change rolled back)");
    } else {
      console.error("DRIFT:", e.message);
      console.error("\nRun: npx prisma db pull   # then review the diff");
      process.exitCode = 1;
    }
  })
  .finally(() => prisma.$disconnect());
