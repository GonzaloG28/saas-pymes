import express       from 'express';
import helmet        from 'helmet';
import cors          from 'cors';
import cookieParser  from 'cookie-parser';
import dotenv        from 'dotenv';

import { connectDB }      from './config/database.js';
import { errorHandler }   from './core/errors/errorHandler.js';
import { tenantResolver } from './core/middleware/tenantResolver.js';
import { rateLimiter }    from './core/middleware/rateLimiter.js';
import moduleLoader       from './core/utils/moduleLoader.js';

dotenv.config();

const app = express();

// ── Seguridad HTTP ────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.ALLOWED_ORIGINS?.split(',') ?? [],
  credentials: true,
}));
app.use(rateLimiter);

// ── Parseo ────────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// ── Resolución de tenant ──────────────────────────────────────────────────────
// /auth/login, /auth/refresh, /auth/onboarding/* y /tenants/register son públicas.
// /webhooks/* nunca lleva JWT de tenant — Mercado Pago no lo envía; el tenant
// se resuelve más adelante leyendo el external_reference dentro del propio payload.
// /superadmin/* usa su propio middleware (requireSuperAdmin, JWT distinto) — no
// debe pasar por tenantResolver o siempre fallaría por falta de header de tenant.
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/onboarding/verify',
  '/auth/onboarding/complete',
  '/tenants/register',
];

app.use('/api/v1', (req, res, next) => {
  // Rutas completamente públicas
  if (PUBLIC_PATHS.includes(req.path)) return next();

  // /tenants/by-slug/:slug también es pública (regex)
  if (/^\/tenants\/by-slug\/[a-z0-9\-]+$/.test(req.path)) return next();

  // Webhooks externos — nunca llevan JWT de tenant, se autentican por firma/lógica propia
  if (req.path.startsWith('/webhooks/')) return next();

  // Superadmin — usa su propio middleware de auth (requireSuperAdmin), no el de tenant
  if (req.path.startsWith('/superadmin/')) return next();

  return tenantResolver(req, res, next);
});

// ── Carga dinámica de módulos ─────────────────────────────────────────────────
await moduleLoader(app);

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', ts: new Date() })
);

// ── Manejador de errores ─────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3000;

await connectDB();
app.listen(PORT, () =>
  console.log(`[server] ✓ Escuchando en :${PORT} · env: ${process.env.NODE_ENV}`)
);

export default app;
