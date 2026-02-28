import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/**/*.js'],
      exclude: [
        'src/server.js',
        'src/controllers/http-app.js',
        'src/models/review-invitation.repository.js',
        'src/models/delivery-attempt.repository.js',
        'src/models/failure-log-entry.repository.js',
        'src/services/notification-provider.js',
        'src/views/invitation-status/invitation-status.js',
        'src/views/failure-log/failure-log.js'
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        statements: 100,
        branches: 100
      }
    }
  }
});
