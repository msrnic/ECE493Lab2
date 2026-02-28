import { describe, expect, it } from 'vitest';
import { createAppController } from '../../../src/controllers/AppController.js';

describe('AppController', () => {
  it('emits and unsubscribes event listeners', () => {
    const eventBus = new EventTarget();
    const controller = createAppController({ eventBus });
    const events = [];
    const off = controller.on('assignment:confirmed', (event) => {
      events.push(event.detail);
    });

    controller.emit('assignment:confirmed', { attemptId: 'attempt-1' });
    off();
    controller.emit('assignment:confirmed', { attemptId: 'attempt-2' });

    expect(events).toEqual([{ attemptId: 'attempt-1' }]);
  });
});
