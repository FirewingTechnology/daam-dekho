import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import hpp from 'hpp';
import xss from 'xss-clean';
import { connectDB } from './utils/db.js';
import apiRoutes from './routes/index.js';


// BUG-08 FIX: Fail fast if JWT_SECRET is not set in production
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET environment variable is not set. Aborting.');
  process.exit(1);
}

const app = express();

// Connect to Database (Only if not in test mode)
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["*", "data:", "blob:"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// BUG-09 FIX: Restrict CORS to known origins instead of wildcard
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true
}));

app.use(xss());
app.use(hpp());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// SEO Endpoints
app.get('/sitemap.xml', async (req, res) => {
  try {
    const { getSitemapXml } = await import('./services/productService.js');
    const xml = await getSitemapXml('http://localhost:5173');
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (e) {
    res.status(500).send('Error generating sitemap');
  }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send("User-agent: *\nAllow: /\nSitemap: http://localhost:8001/sitemap.xml\n");
});

// Routes
app.use('/api', apiRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Root
app.get('/', (req, res) => {
  res.json({ message: 'DaamDekho Production API', version: '3.0.0' });
});

// BUG-05 FIX: Removed dead ghost redirect for /api/products/125 — it was
// registered AFTER the router and could never fire. Handle missing products
// with the standard 404 from the product route instead.

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;
