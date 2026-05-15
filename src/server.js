import express from 'express';
import path from 'path';
import { PORT } from './config/env.js';
import { createUploadMiddleware } from './http/multer.js';
import { createApiRouter } from './routes/api.js';
import { publicDir } from './utils/paths.js';
import { ensureHistoryDir } from './utils/history.js';

ensureHistoryDir();

const app = express();
const upload = createUploadMiddleware();

app.use(express.json({ limit: '50mb' }));
app.use(express.static(publicDir));

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/generator', (_req, res) => {
  res.sendFile(path.join(publicDir, 'generator.html'));
});

app.get('/agent', (_req, res) => {
  res.sendFile(path.join(publicDir, 'agent.html'));
});

app.get('/workflows', (_req, res) => {
  res.sendFile(path.join(publicDir, 'workflows.html'));
});

app.get('/history', (_req, res) => {
  res.sendFile(path.join(publicDir, 'history.html'));
});

app.use('/api', createApiRouter(upload));

const server = app.listen(PORT, () => {
  console.log(`\nQA Workbench - http://localhost:${PORT}\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\nPort ${PORT} is already in use (another app or an old node server).\n`,
    );
    console.error(
      'Fix: stop that process, or set a different port in .env, e.g. PORT=3848\n',
    );
    console.error(
      'PowerShell (find PID): Get-NetTCPConnection -LocalPort ' +
        PORT +
        ' -ErrorAction SilentlyContinue | Format-Table OwningProcess\n',
    );
    console.error('Then: Stop-Process -Id <PID> -Force\n');
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
