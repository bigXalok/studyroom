Study Room — Deployment & environment guide

This document explains the steps to deploy the frontend to Vercel and backend to Render, plus required environment variables and quick test commands.

1) Backend (Render)

Required environment variables on Render (Service > Environment > Environment Keys):
- `DATABASE_URL` (required) — set to your database connection string.
- `JWT_SECRET` (recommended) — secret used for access tokens.
- `REFRESH_TOKEN_SECRET` (recommended) — secret used for refresh tokens.
- `FRONTEND_URL` (optional) — set to your Vercel site origin (e.g. `https://your-site.vercel.app`) to restrict CORS.
- `NODE_ENV=production`

If you use managed Postgres/MySQL on Render, copy the provided DB URL into `DATABASE_URL`.

When you change secrets or migrate schema, redeploy the Render service.

Run Prisma migrations locally (before deploying) or as part of a CI step:

```bash
cd backend
# create migration and apply locally
npx prisma migrate dev --name init
npx prisma generate
```

2) Frontend (Vercel)

Set environment variable in Vercel (Project → Settings → Environment Variables):
- `VITE_API_URL` = `https://studyroom-50pp.onrender.com` (or your Render URL)

After setting env vars, redeploy the Vercel project.

3) Testing the deployed services

Signup:
```bash
curl -i -X POST https://studyroom-50pp.onrender.com/users/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"test+remote@example.com","password":"pass"}'
```

Login:
```bash
curl -s -X POST https://studyroom-50pp.onrender.com/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test+remote@example.com","password":"pass"}' | jq
```

Health check (should return 200 JSON):
```bash
curl -s https://studyroom-50pp.onrender.com/api/health | jq
```

4) Useful tips
- Use `FRONTEND_URL` on Render to restrict CORS (set to your Vercel domain). Using `*` is OK for testing but not recommended for production.
- For better security move refresh tokens to httpOnly cookies (server-side change + frontend flow update).
- Monitor logs on Render and Vercel for errors after redeploy.

If you want, I can:
- Prepare a commit to read the `VITE_API_URL` in the frontend (already done) and create a small PR branch.
- Generate a small health-check page in the frontend showing API base URL and health status.
- Walk through setting Vercel & Render env vars step-by-step (I can provide exact UI clicks or a script using their APIs).
