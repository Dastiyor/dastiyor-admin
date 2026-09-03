/**
 * Verify every t("key") in the UI resolves, and report Tajik gaps.
 *
 * t() falls back to Russian and then to the raw key, so a typo shows up in the
 * panel as "users.tilte" rather than an error. This turns that into a failure.
 * Template keys — t(`tasks.status.${x}`) — are checked by prefix only.
 *
 * Usage: node scripts/check-i18n.js
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const load = (l) => JSON.parse(fs.readFileSync(path.join(root, `constant/locales/${l}.json`), "utf8"));
const ru = load("ru");
const tg = load("tg");

const flat = (obj, prefix = "") =>
    Object.entries(obj).flatMap(([k, v]) =>
        v && typeof v === "object" ? flat(v, `${prefix}${k}.`) : [`${prefix}${k}`]
    );

const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(p);
        return /\.jsx?$/.test(e.name) ? [p] : [];
    });

const ruKeys = new Set(flat(ru));
const tgKeys = new Set(flat(tg));

const missing = [];
for (const file of [...walk(path.join(root, "app")), ...walk(path.join(root, "components"))]) {
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(/\bt\(\s*"([\w.]+)"/g)) {
        if (!ruKeys.has(m[1])) missing.push(`${path.relative(root, file)}: ${m[1]}`);
    }
    // t(`prefix.${expr}`) — only the literal head can be checked
    for (const m of src.matchAll(/\bt\(\s*`([\w.]+)\.\$\{/g)) {
        if (![...ruKeys].some((k) => k.startsWith(m[1] + "."))) {
            missing.push(`${path.relative(root, file)}: ${m[1]}.* (no keys under this prefix)`);
        }
    }
}

const untranslated = [...ruKeys].filter((k) => !tgKeys.has(k));
console.log(`ru keys: ${ruKeys.size}   tg keys: ${tgKeys.size}`);
if (untranslated.length) console.log(`tg missing ${untranslated.length}: ${untranslated.join(", ")}`);

if (missing.length) {
    console.error(`\nkeys used in the UI with no Russian entry:\n  ${missing.join("\n  ")}`);
    process.exit(1);
}
console.log("every t() key resolves");
