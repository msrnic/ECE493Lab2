import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

async function loadModule() {
  vi.resetModules();
  return import('../../../src/assets/js/payment-view.js');
}

function buildDom() {
  return new JSDOM(`
    <form data-payment-form>
      <input name="cardNumber" value="4111111111111111" />
      <input name="expiry" value="12/2027" />
      <input name="securityNumber" value="123" />
      <button type="submit">Pay</button>
    </form>
    <p data-payment-status></p>
    <p data-payment-error="cardNumber" hidden></p>
    <p data-payment-error="expiry" hidden></p>
    <p data-payment-error="securityNumber" hidden></p>
  `);
}

describe('payment-view', () => {
  it('validates card number, expiry, and security number branches', async () => {
    const { validatePaymentFields } = await loadModule();

    expect(validatePaymentFields({
      cardNumber: '4111 1111 1111 1111',
      expiry: '01/30',
      securityNumber: '123'
    }).valid).toBe(true);

    expect(validatePaymentFields({
      cardNumber: '123',
      expiry: '01/2030',
      securityNumber: '123'
    }).errors.cardNumber).toContain('16 digits');

    expect(validatePaymentFields({
      cardNumber: '4111111111111111',
      expiry: '13/2030',
      securityNumber: '123'
    }).errors.expiry).toContain('MM/YYYY');

    expect(validatePaymentFields({
      cardNumber: '4111111111111111',
      expiry: '11/2030',
      securityNumber: '12'
    }).errors.securityNumber).toContain('3 digits');

    const malformed = validatePaymentFields({
      cardNumber: undefined,
      expiry: 'not-an-expiry',
      securityNumber: undefined
    });
    expect(malformed.valid).toBe(false);
    expect(malformed.errors.expiry).toContain('MM/YYYY');

    const missingExpiry = validatePaymentFields({
      cardNumber: '4111111111111111',
      expiry: undefined,
      securityNumber: '123'
    });
    expect(missingExpiry.errors.expiry).toContain('MM/YYYY');
  });

  it('returns noop detach when form is missing', async () => {
    const { bindPaymentView } = await loadModule();
    const handle = bindPaymentView({ form: null });
    expect(typeof handle.detach).toBe('function');
    handle.detach();
  });

  it('uses formdata fallback when ownerDocument defaultView is unavailable', async () => {
    const { bindPaymentView } = await loadModule();
    const listeners = new Map();
    const fakeForm = {
      ownerDocument: null,
      addEventListener(event, handler) {
        listeners.set(event, handler);
      },
      removeEventListener(event) {
        listeners.delete(event);
      }
    };
    const handle = bindPaymentView({ form: fakeForm });
    expect(listeners.has('submit')).toBe(true);
    handle.detach();
    expect(listeners.has('submit')).toBe(false);
  });

  it('shows field-specific errors and failure status for invalid submissions', async () => {
    const { bindPaymentView } = await loadModule();
    const dom = buildDom();
    const form = dom.window.document.querySelector('[data-payment-form]');
    form.querySelector('[name="cardNumber"]').value = 'bad';
    form.querySelector('[name="expiry"]').value = '00/2020';
    form.querySelector('[name="securityNumber"]').value = '1';

    bindPaymentView({
      form,
      statusNode: dom.window.document.querySelector('[data-payment-status]'),
      cardNumberErrorNode: dom.window.document.querySelector('[data-payment-error="cardNumber"]'),
      expiryErrorNode: dom.window.document.querySelector('[data-payment-error="expiry"]'),
      securityNumberErrorNode: dom.window.document.querySelector('[data-payment-error="securityNumber"]')
    });

    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.querySelector('[data-payment-status]').textContent).toContain('Payment failed');
    expect(dom.window.document.querySelector('[data-payment-error="cardNumber"]').hidden).toBe(false);
    expect(dom.window.document.querySelector('[data-payment-error="expiry"]').hidden).toBe(false);
    expect(dom.window.document.querySelector('[data-payment-error="securityNumber"]').hidden).toBe(false);
  });

  it('shows success status and clears prior errors for valid submissions', async () => {
    const { bindPaymentView } = await loadModule();
    const dom = buildDom();
    const form = dom.window.document.querySelector('[data-payment-form]');
    const statusNode = dom.window.document.querySelector('[data-payment-status]');
    const cardError = dom.window.document.querySelector('[data-payment-error="cardNumber"]');
    const expiryError = dom.window.document.querySelector('[data-payment-error="expiry"]');
    const cvvError = dom.window.document.querySelector('[data-payment-error="securityNumber"]');

    cardError.hidden = false;
    cardError.textContent = 'old';
    expiryError.hidden = false;
    expiryError.textContent = 'old';
    cvvError.hidden = false;
    cvvError.textContent = 'old';

    bindPaymentView({
      form,
      statusNode,
      cardNumberErrorNode: cardError,
      expiryErrorNode: expiryError,
      securityNumberErrorNode: cvvError
    });

    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(statusNode.textContent).toContain('Payment success');
    expect(cardError.hidden).toBe(true);
    expect(expiryError.hidden).toBe(true);
    expect(cvvError.hidden).toBe(true);
  });

  it('supports running without status and error nodes', async () => {
    const { bindPaymentView } = await loadModule();
    const dom = new JSDOM(`
      <form data-payment-form>
        <input name="cardNumber" value="1111" />
        <input name="expiry" value="00/0000" />
        <input name="securityNumber" value="0" />
      </form>
    `);
    const form = dom.window.document.querySelector('[data-payment-form]');
    bindPaymentView({
      form,
      statusNode: null,
      cardNumberErrorNode: null,
      expiryErrorNode: null,
      securityNumberErrorNode: null
    });

    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('auto-binds on module load in browser-like globals', async () => {
    const dom = buildDom();
    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;

    try {
      await loadModule();
    } finally {
      globalThis.window = previousWindow;
      globalThis.document = previousDocument;
    }
  });
});
