# Dastiyor admin panel

Internal admin for the Dastiyor service marketplace: users, tasks, responses, complaints, reviews, subscriptions and payments, sourcing requests, notifications and an audit log of every admin action.

- **Production:** https://admin.dastiyor.com (Vercel, deploys on every push to `main`)
- **Stack:** Next.js 14 (app router), Prisma 5, Postgres, Tailwind
- **Languages:** Russian and Tajik (`constant/locales/ru.json`, `tg.json`)

## The database is shared

This panel reads and writes the same Postgres database as the Dastiyor web app and mobile API. **The web app owns the schema.** `prisma/schema.prisma` here mirrors it.

- Never run `prisma db push` or `prisma migrate` against production from this repo. An outdated copy of the schema would drop the web app's columns.
- When the web app changes the schema, copy the change into `prisma/schema.prisma` and run `npx prisma generate`.

## Environment

See `.env.example`. On Vercel:

| Variable | Purpose |
|---|---|
| `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` | Database (from the Vercel Postgres integration) |
| `JWT_SECRET` | Signs admin login cookies. **Required**, 32+ random characters; without it, logins are refused. Marked Sensitive, so `vercel env pull` leaves it out. Changing it signs every admin out. |
| `BLOB_READ_WRITE_TOKEN` | Avatar uploads (Vercel Blob) |
| `BREVO_API_KEY`, `BREVO_FROM_EMAIL` | Emails sent from sourcing requests |

`GET /api/health` reports whether the database is reachable and whether `JWT_SECRET` is configured.

## Admin accounts

The panel cannot create admins. Create or reset one from your machine:

```bash
POSTGRES_URL_NON_POOLING="postgresql://…" ADMIN_PASSWORD="a-new-password-of-12+-chars" \
  node scripts/create-admin.js admin@example.com
```

This also unlocks an account that was locked after 5 wrong passwords (otherwise it unlocks itself after 15 minutes).

## Developing

```bash
npm install
npm run dev                      # http://localhost:3000
node scripts/check-i18n.js       # every t("key") exists in ru and tg
npx prisma generate && npx next build
```

In local development a built-in key is used if `JWT_SECRET` is unset.

### Conventions

- **API routes** wrap their handler in `withAdmin` (`lib/api.js`). It checks the admin against the database and turns thrown `HttpError`s into JSON. Every change calls `logAction(...)` so it shows up in the audit log with the acting admin.
- **List endpoints** use `lib/listQuery.js`: `?page`, `limit` (max 100), `q`, `orderBy` and `dir`, with sorting limited to an allowed list of fields.
- **List pages** use `hooks/useServerTable.js` with `DataTable` and `TablePagination`. Don't fetch a large `limit` and filter in the browser: the API caps the page size, so rows would silently go missing.
