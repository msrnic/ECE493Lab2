import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './src/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startServer(options = {}) {
  const port = Number(options.port ?? process.env.PORT ?? 3000);
  const { app } = createApp(options);

  app.use('/assets', express.static(path.join(__dirname, 'src/assets')));
  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'src/index.html'));
  });

  return app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
