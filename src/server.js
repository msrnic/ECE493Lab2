import { createApp } from './app.js';

const PORT = Number(process.env.PORT ?? 3000);
const app = createApp();

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Registration service listening on port ${PORT}`);
  });
}

export default app;
