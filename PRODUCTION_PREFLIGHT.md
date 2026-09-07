# DaamDekho Production Preflight

Production requires `NODE_ENV=production`, a strong `JWT_SECRET`, exact `ALLOWED_ORIGINS`, `PUBLIC_FRONTEND_URL`, and `PUBLIC_API_URL`.

Zero-trust presentation rules: ratings/reviews, images, EMI, bank offers, exchange, cashback, coupons, delivery, seller, and stock are never fabricated when absent from source data. Missing values remain unavailable/N/A.

Frontend production builds must use `VITE_API_URL` and must never silently fall back to localhost. Debug routes are not mounted in production.
