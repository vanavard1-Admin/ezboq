import { getDb } from '../core/firebaseAdmin';
/**
 * Security Fixes Test Suite
 * 
 * Tests for:
 * - Event idempotency (Task A)
 * - Credits ledger (Task B)
 * - Log sanitization (Task C)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Firebase Admin
jest.mock('firebase-admin', () => {
  const apps: Array<{ name: string }> = [];
  const timestamp = {
    now: jest.fn(() => ({ toMillis: () => Date.now() })),
    fromMillis: jest.fn((ms: number) => ({ toMillis: () => ms })),
  };
  const fieldValue = {
    serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
    increment: jest.fn((n: number) => n),
  };
  const firestore = jest.fn(() => ({
    collection: jest.fn(),
    doc: jest.fn(),
    runTransaction: jest.fn(),
  })) as any;

  firestore.Timestamp = timestamp;
  firestore.FieldValue = fieldValue;

  return {
    apps,
    initializeApp: jest.fn(() => {
      if (!apps.length) {
        apps.push({ name: '[DEFAULT]' });
      }
      return apps[0];
    }),
    app: jest.fn(() => apps[0]),
    credential: {
      cert: jest.fn(),
    },
    firestore,
    Timestamp: timestamp,
    FieldValue: fieldValue,
  };
});

describe('Task A: Event Idempotency', () => {
  const { extractEventId } = require('../utils/asyncSafety');

  it('should use event.id when available', () => {
    const event = { id: 'evt_123', type: 'message' };
    const eventId = extractEventId(event);
    expect(eventId).toBe('evt_123');
  });

  it('should use message.id as fallback', () => {
    const event = {
      type: 'message',
      message: { id: 'msg_456', type: 'text' },
    };
    const eventId = extractEventId(event);
    expect(eventId).toBe('msg_msg_456');
  });

  it('should generate stable hash fallback', () => {
    const event = {
      source: { userId: 'U123' },
      timestamp: 1234567890,
      type: 'message',
    };
    const eventId1 = extractEventId(event);
    const eventId2 = extractEventId(event);
    // Same input should produce same hash
    expect(eventId1).toBe(eventId2);
    expect(eventId1).toMatch(/^fallback_/);
  });

  it('should handle missing fields gracefully', () => {
    const event = {};
    const eventId = extractEventId(event);
    expect(eventId).toBeTruthy();
    expect(typeof eventId).toBe('string');
  });
});

describe('Task B: Credits Ledger', () => {
  const db = getDb();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create ledger entry when adding credits', async () => {
    const { addCreditsWithLedger } = require('../services/creditsLedger');

    const subRef = { get: jest.fn(), update: jest.fn() };
    const ledgerRef = { set: jest.fn() };
    const ledgerQuery = {
      _isQuery: true,
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };
    const ledgerCollection = {
      doc: jest.fn(() => ledgerRef),
      where: jest.fn(() => ledgerQuery),
    };
    const subCollection = { doc: jest.fn(() => subRef) };

    (db.collection as jest.Mock).mockImplementation((name: unknown) => {
      const collectionName = String(name);
      if (collectionName === 'subscriptions') return subCollection;
      if (collectionName === 'credits_ledger') return ledgerCollection;
      return { doc: jest.fn(), where: jest.fn(() => ledgerQuery) };
    });

    (db.runTransaction as jest.Mock).mockImplementation(async (callback: any) => {
      const tx = {
        get: jest.fn((ref: any) => {
          if (ref && ref._isQuery) {
            return { empty: true };
          }
          return { exists: true, data: () => ({ creditsRemaining: 50 }) };
        }),
        update: jest.fn(),
        set: jest.fn(),
      };
      await callback(tx);
    });

    await addCreditsWithLedger(
      'user123',
      100,
      'Test payment',
      'purchase_abc'
    );

    // Verify transaction was called
    expect(db.runTransaction).toHaveBeenCalled();
  });

  it('should prevent duplicate referenceId application', async () => {
    const { isReferenceIdApplied, addCreditsWithLedger } = require('../services/creditsLedger');

    const ledgerQuery = {
      _isQuery: true,
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn(() => Promise.resolve({ empty: false })),
    };
    const ledgerRef = { set: jest.fn() };
    const ledgerCollection = {
      doc: jest.fn(() => ledgerRef),
      where: jest.fn(() => ledgerQuery),
    };
    const subRef = { get: jest.fn(), update: jest.fn(), set: jest.fn() };
    const subCollection = { doc: jest.fn(() => subRef) };

    (db.collection as jest.Mock).mockImplementation((name: unknown) => {
      const collectionName = String(name);
      if (collectionName === 'credits_ledger') return ledgerCollection;
      if (collectionName === 'subscriptions') return subCollection;
      return { doc: jest.fn(), where: jest.fn(() => ledgerQuery) };
    });

    (db.runTransaction as jest.Mock).mockImplementation(async (callback: any) => {
      const tx = {
        get: jest.fn((ref: any) => {
          if (ref && ref._isQuery) {
            return { empty: false };
          }
          return { exists: true, data: () => ({ creditsRemaining: 50 }) };
        }),
        update: jest.fn(),
        set: jest.fn(),
      };
      await callback(tx);
    });

    const alreadyApplied = await isReferenceIdApplied('user123', 'purchase_abc');
    expect(alreadyApplied).toBe(true);

    // Should skip if already applied
    await addCreditsWithLedger('user123', 100, 'Test', 'purchase_abc');
    // Should not throw or create duplicate
  });

  it('should throw error for negative credits', async () => {
    const { addCreditsWithLedger } = require('../services/creditsLedger');

    await expect(
      addCreditsWithLedger('user123', -10, 'Test')
    ).rejects.toThrow('credits must be positive');
  });
});

describe('Task C: Log Sanitization', () => {
  const { sanitizeForLogging, sanitizeUrlForLogging } = require('../utils/logSanitization');

  it('should redact phone numbers', () => {
    const input = 'เบอร์โทร: 093-329-9990';
    const output = sanitizeForLogging(input);
    expect(output).toContain('[PHONE_REDACTED]');
    expect(output).not.toContain('093-329-9990');
  });

  it('should redact email addresses', () => {
    const input = 'Email: user@example.com';
    const output = sanitizeForLogging(input);
    expect(output).toContain('[EMAIL_REDACTED]');
    expect(output).not.toContain('user@example.com');
  });

  it('should redact long digit sequences', () => {
    const input = 'Account: 1234567890123456';
    const output = sanitizeForLogging(input);
    expect(output).toContain('[NUMBER_REDACTED]');
  });

  it('should truncate long messages', () => {
    const input = 'A'.repeat(100);
    const output = sanitizeForLogging(input, 50);
    expect(output.length).toBeLessThanOrEqual(53); // 50 + '...'
    expect(output).toContain('...');
  });

  it('should sanitize signed URLs', () => {
    const url = 'https://storage.googleapis.com/bucket/file.pdf?X-Goog-Signature=abc123&Expires=123456';
    const output = sanitizeUrlForLogging(url);
    expect(output).toContain('[SIGNED_URL_REDACTED]');
    expect(output).not.toContain('X-Goog-Signature');
  });

  it('should handle null/undefined', () => {
    expect(sanitizeForLogging(null)).toBe('');
    expect(sanitizeForLogging(undefined)).toBe('');
  });
});
