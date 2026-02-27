import { Router } from 'express';

export function createAuthRoutes({ authController }) {
  const router = Router();

  router.post('/login', authController.login);
  router.post('/logout', authController.logout);
  router.get('/session', authController.getSession);

  return router;
}
