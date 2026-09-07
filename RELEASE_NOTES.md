# DaamDekho Production Release Package

This package is a source release intended for a clean production build/deploy.

## Included hardening
- Mobile Compare matrix uses an isolated horizontal-scroll region.
- Product images use source data or a local neutral placeholder; no stock/Unsplash product fallbacks in active UI/API paths.
- Missing ratings/reviews remain unavailable instead of being fabricated.
- Missing EMI/bank/exchange/cashback/delivery/seller/stock data is not synthesized.
- Production frontend API configuration is environment-driven and fails fast when absent.
- Production debug routes are unmounted.
- Production CORS is explicit; Render configuration uses the deployed frontend origin.
- Sitemap/robots URLs are environment-driven.
- SQLite database integrity was checked after sanitizing the uniform placeholder rating/review/seller/stock/delivery values in the current runtime catalog.

## Important deployment step
Run `npm ci && npm run build` in `app/frontend` and `npm ci && npm test` in `app/backend-node` on the deployment/build environment. Do not upload `node_modules`, local `.env` files, or database WAL/SHM files.

## Current deployed API/frontend values in render.yaml
- Frontend: https://dev-daam-dekho-web.onrender.com
- API: https://dev-daam-dekho.onrender.com/api

Replace these with final custom production domains before the public launch if you are moving off the `dev-` Render names.
