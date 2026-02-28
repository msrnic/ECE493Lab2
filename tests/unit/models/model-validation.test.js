import { describe, expect, it } from 'vitest';
import {
  assertArray,
  assertEnum,
  assertInteger,
  assertIsoDateString,
  assertNonEmptyString,
  assertObject,
  cloneRecord,
  normalizeStringArray
} from '../../../src/models/model-validation.js';

describe('model-validation', () => {
  it('validates objects and non-empty strings', () => {
    expect(assertObject({ ok: true }, 'payload')).toEqual({ ok: true });
    expect(() => assertObject([], 'payload')).toThrow(/payload must be an object/);

    expect(assertNonEmptyString('x', 'value')).toBe('x');
    expect(() => assertNonEmptyString(' ', 'value')).toThrow(/non-empty string/);
  });

  it('validates enums, arrays, integers and ISO datetimes', () => {
    expect(assertEnum('a', 'choice', ['a', 'b'])).toBe('a');
    expect(() => assertEnum('c', 'choice', ['a', 'b'])).toThrow(/choice must be one of/);

    expect(assertArray([1], 'items')).toEqual([1]);
    expect(() => assertArray(null, 'items')).toThrow(/items must be an array/);

    expect(assertInteger(5, 'count', { min: 1 })).toBe(5);
    expect(() => assertInteger(1.2, 'count')).toThrow(/integer/);
    expect(() => assertInteger(0, 'count', { min: 1 })).toThrow(/at least 1/);

    const iso = assertIsoDateString('2026-02-08T00:00:00.000Z', 'occurredAt');
    expect(iso).toBe('2026-02-08T00:00:00.000Z');
    expect(assertIsoDateString(undefined, 'optionalAt', { required: false })).toBeNull();
    expect(() => assertIsoDateString(undefined, 'requiredAt')).toThrow(/requiredAt/);
    expect(() => assertIsoDateString('not-date', 'occurredAt')).toThrow(/ISO-8601/);
  });

  it('normalizes string arrays and clones records', () => {
    expect(normalizeStringArray(['reviewer', 'editor'], 'roles')).toEqual(['reviewer', 'editor']);
    expect(() => normalizeStringArray(['ok', ' '], 'roles')).toThrow(/roles\[1\]/);

    const original = { nested: { value: 1 } };
    const cloned = cloneRecord(original);
    cloned.nested.value = 2;
    expect(original.nested.value).toBe(1);
  });
});
