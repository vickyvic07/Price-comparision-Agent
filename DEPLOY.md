# Deployment Guide

## Overview

| Part     | Platform | URL pattern                                   |
|----------|----------|-----------------------------------------------|
| Backend  | Render   | `https://<service-name>.onrender.com`         |
| Frontend | Vercel   | `https://<project-name>.vercel.app`           |

---

## 1. Deploy the Backend on Render

### Prerequisites
- A [Render](https://render.com) account
- A MongoDB Atlas cluster ([cloud.mongodb.com](https://cloud.mongodb.com)) — free tier works fine
- A [Groq](https://console.groq.com) API key for the AI chat feature
- (Optional) A [SerpAPI](https://serpapi.com) key for product search

### Steps

1. **Push your code** to GitHub (or GitLab/Bitbucket).

2. **Create a new Web Service** in the Render dashboard:
   - Click **New → Web Service**
   - Connect your repository
   - Set **Root Directory** to `backend`
   - Render will auto-detect the `render.yaml` — confirm the settings:
     - **Build Command:** `npm ci && npx playwright install --with-deps chromium`
     - **Start Command:** `npm start`
     - **Runtime:** Node
     - **Health Check Path:** `/health`

3. **Set Environment Variables** in the Render dashboard under **Environment**:

   | Variable             | Value / Notes                                          |
   |----------------------|--------------------------------------------------------|
   | `MONGODB_URI`        | Your MongoDB Atlas connection string                   |
   | `JWT_SECRET`         | Long random string (run `openssl rand -hex 64`)        |
   | `JWT_EXPIRES_IN`     | `7d`                                                   |
   | `ALLOWED_ORIGINS`    | Your Vercel URL, e.g. `https://your-app.vercel.app`    |
   | `GROQ_API_KEY`       | From console.groq.com                                  |
   | `SERPAPI_KEY`        | From serpapi.com (optional — falls back to Playwright) |
   | `SMTP_HOST`          | e.g. `smtp.gmail.com`                                  |
   | `SMTP_PORT`          | `587`                                                  |
   | `SMTP_SECURE`        | `false`                                                |
   | `SMTP_USER`          | Your email address                                     |
   | `SMTP_PASS`          | Your email app password                                |

   > **Tip:** Copy the keys from `backend/.env.example` as a checklist.

4. **Deploy** — Render will build and start the service automatically.

5. **Verify** — Visit `https://<service-name>.onrender.com/health`. You should see:
   ```json
   { "status": "ok", "timestamp": "..." }
   ```

6. **Copy the service URL** — you'll need it for the frontend step.

---

## 2. Deploy the Frontend on Vercel

### Steps

1. Go to [vercel.com](https://vercel.com) and click **Add New → Project**.

2. Import your repository and set the **Root Directory** to `frontend`.

3. Vercel will detect Vite automatically. Confirm:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm ci`

4. **Set Environment Variables** in the Vercel dashboard under **Settings → Environment Variables**:

   | Variable            | Value                                                        |
   |---------------------|--------------------------------------------------------------|
   | `VITE_API_BASE_URL` | `https://<your-render-service>.onrender.com/api`             |

   > Make sure to set this for **Production**, **Preview**, and **Development** environments.

5. **Deploy** — Vercel builds and deploys in about 1–2 minutes.

6. **Update ALLOWED_ORIGINS on Render** — paste your Vercel URL into the `ALLOWED_ORIGINS` env var on the Render dashboard, then trigger a redeploy.

---

## 3. MongoDB Atlas — Quick Setup

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Under **Database Access**, create a user with **readWrite** on your database.
3. Under **Network Access**, add `0.0.0.0/0` (allow all IPs) — Render uses dynamic IPs.
4. Click **Connect → Drivers** and copy the connection string. Replace `<password>` with your user's password and set it as `MONGODB_URI`.

---

## 4. Common Issues

| Symptom | Fix |
|---------|-----|
| CORS errors in browser | Make sure `ALLOWED_ORIGINS` on Render matches your Vercel URL exactly (no trailing slash) |
| `MONGODB_URI is not defined` on startup | Check the env var is set in the Render dashboard and redeploy |
| Playwright crashes on Render free tier | Free tier has limited RAM; consider upgrading to **Starter** plan or rely on `SERPAPI_KEY` instead |
| Render service sleeps after 15 min (free tier) | Expected on free plan — first request after sleep takes ~30s; upgrade to avoid |
| Vercel 404 on page refresh | Already handled by the rewrite rule in `frontend/vercel.json` |

---

## 5. Local Development

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env        # fill in your values
npm install
npm run dev                 # starts on http://localhost:5000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev                 # starts on http://localhost:5173, proxies /api to :5000
```

No `VITE_API_BASE_URL` needed locally — the Vite dev proxy handles it automatically.
