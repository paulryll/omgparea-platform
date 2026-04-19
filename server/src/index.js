// server/src/index.js
// -----------------------------------------------------------
// Express app. In development, the Vite client runs on a
// separate port and proxies /api here. In production (Railway),
// the client build is served as static files from this server.
// -----------------------------------------------------------

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import authRoutes     from './routes/auth.js';
import studentRoutes  from './routes/students.js';
import adminRoutes    from './routes/admin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check (Railway/Render probes this)
app.get('/api/health', (_req, res) => res.json({ ok: true, version: '0.1.0' }));

// API routes
app.use('/api/auth',     authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admin',    adminRoutes);

// Serve the built React client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  // SPA fallback — anything not /api/* returns index.html
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global error handler (last)
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`OMG PAREA API listening on :${PORT}`);
});
