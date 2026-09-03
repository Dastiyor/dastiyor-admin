/**
 * Verify lib/cascade.js still covers every row that blocks a User/Task delete.
 *
 * The schema has no onDelete rules, so each relation pointing at User or Task is
 * a foreign key that makes prisma.user.delete() fail. Add a relation to the
 * schema without touching lib/cascade.js and this fails.
 *
 * Usage: node scripts/check-cascade.js
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const cascade = fs.readFileSync(path.join(root, "lib/cascade.js"), "utf8");

const missing = [];
let model = null;

for (const line of schema.split("\n")) {
    const start = line.match(/^model (\w+) \{/);
    if (start) model = start[1];

    const rel = line.match(/^\s+\w+\s+(User|Task)\??\s+@relation\((.*)\)\s*$/);
    if (!rel || model === null) continue;

    const [, target, args] = rel;
    if (/onDelete:\s*Cascade/.test(args)) continue; // the DB handles it

    const field = args.match(/fields:\s*\[(\w+)\]/)?.[1];
    if (!field) continue; // back-relation, no FK column

    const client = model[0].toLowerCase() + model.slice(1);
    if (!cascade.includes(`tx.${client}.`) || !cascade.includes(field)) {
        missing.push(`${model}.${field} -> ${target}`);
    }
}

if (missing.length) {
    console.error("lib/cascade.js does not handle:\n  " + missing.join("\n  "));
    process.exit(1);
}
console.log("cascade covers every User/Task foreign key");
