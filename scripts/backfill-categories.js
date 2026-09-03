/**
 * Fill the Category table from the category strings already on tasks.
 *
 * Task.category is free text with no foreign key to Category, so the two drift:
 * the app can show a long list of services while the admin Categories page is
 * empty. This reads the distinct Task.category values and inserts the missing
 * ones. Existing rows are left alone, so it is safe to re-run.
 *
 * Dry run:  POSTGRES_URL_NON_POOLING="postgres://..." node scripts/backfill-categories.js
 * Apply:    ... node scripts/backfill-categories.js --write
 */

const { PrismaClient } = require("@prisma/client");

const url = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!url) {
  console.error("Set POSTGRES_URL_NON_POOLING (or DATABASE_URL).");
  process.exit(1);
}

const write = process.argv.includes("--write");
const prisma = new PrismaClient({ datasources: { db: { url } } });

// Unicode-aware: category names are Russian, so [^a-z0-9] would strip every
// character and collapse each name to an empty slug (unique-constraint clash
// on the second insert). \p{L}/\p{N} keep Cyrillic letters and digits.
const slugify = (name) =>
  name.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");

(async () => {
  const existing = await prisma.category.findMany({ select: { slug: true, order: true } });
  const known = new Set(existing.map((c) => c.slug));
  const used = await prisma.task.groupBy({ by: ["category"], _count: { category: true } });

  console.log(`Category rows: ${existing.length}`);
  console.log(`distinct Task.category values: ${used.length}`);

  let order = existing.reduce((max, c) => Math.max(max, c.order), -1) + 1;
  const missing = used
    .filter((u) => u.category && !known.has(slugify(u.category)))
    .sort((a, b) => b._count.category - a._count.category);

  for (const { category, _count } of missing) {
    const slug = slugify(category);
    if (known.has(slug)) continue; // two names, one slug
    known.add(slug);
    console.log(`${write ? "insert" : "would insert"}  ${slug.padEnd(24)} ${category}  (${_count.category} tasks)`);
    if (write) {
      await prisma.category.create({ data: { name: category, slug, order: order++ } });
    }
  }

  if (!missing.length) console.log("nothing to backfill");
  else if (!write) console.log("\nre-run with --write to apply");
  await prisma.$disconnect();
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
