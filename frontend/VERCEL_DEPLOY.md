# Deploying the Frontend to Vercel

This document explains the minimal steps to deploy the `frontend` app to Vercel (frontend-only). The backend/Supabase can be added later; the app will still build without them but some runtime features (auth, API calls) will not work.

## Quick summary (recommended settings)
- Project Root: `frontend`
- Build Command: `npm run vercel-build` (or `npm run build`)
- Output Directory: `dist`
- Node version: `18.x` (set via `engines` in `package.json` or in Vercel project settings)

## Environment variables (add these in Vercel Project > Settings > Environment Variables)
- `VITE_BACKEND_URL` — URL of the backend API (e.g. `https://api.example.com`). Can be left empty for now but features requiring API access will fail at runtime.
- `VITE_SUPABASE_URL` — Supabase project URL (optional for now; required if you use Supabase auth/storage).
- `VITE_SUPABASE_ANON_KEY` — Supabase anon public key (do NOT commit secrets to the repo). Only set the anon/public key in the frontend; never set service keys here.

Set values for both Preview and Production environments as needed.

## Vercel (UI) deploy steps
1. Go to https://vercel.com and sign in (GitHub recommended).
2. Create a New Project → Import your repository.
3. In the Import settings:
   - Set the **Root directory** to `frontend`.
   - For **Framework Preset** you can choose `Other`.
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `dist`
4. Add the Environment Variables listed above in the Vercel Project Settings.
5. Finish import — Vercel will run the first build and open the deployment URL.

## CLI deploy (optional)
```bash
cd frontend
npm ci
npm run vercel-build   # local build check
npx vercel login       # first-time login
npx vercel             # follow interactive prompts (for preview)
npx vercel --prod      # deploy production
```

## Local build verification (already run)
These commands validate the project builds the same way Vercel will:
```bash
cd frontend
npm ci
npm run vercel-build   # runs tsc and vite build -> outputs to dist
```
If `npm run vercel-build` completes successfully, Vercel should also be able to build it.

## Troubleshooting
- Build errors about missing environment variables: set the required `VITE_` variables in Vercel.
- `Unsupported engine` warnings: Vercel will use Node 18 by default for most projects; you can set the Node version in Project Settings or rely on the `engines` field in `package.json`.
- Large chunk warnings from Vite: this is only a warning; consider code-splitting or `build.rollupOptions.manualChunks` if you want smaller initial bundles.

## Notes & next steps
- Authentication and tenant isolation depend on Supabase. If you want a working login on the deployed site, create a Supabase project and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel.
- When ready, we can deploy the backend (FastAPI) separately (e.g., Render, Fly, or Vercel serverless) and update `VITE_BACKEND_URL`.

---

If you want, I can automatically create a GitHub remote and push a branch, or create a short README snippet in the repo root with these instructions. Which would you like next?