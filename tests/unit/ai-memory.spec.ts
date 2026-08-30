import { expect, test } from '@playwright/test';
import { AI_PREMADE_MEMORY, findPremadeAnswer } from '@/lib/ai-premade-memory';

test('contains more than one thousand pre-made questions', () => {
  expect(AI_PREMADE_MEMORY.length).toBeGreaterThanOrEqual(1000);
});

test('returns an exact common answer without an AI provider', () => {
  const result = findPremadeAnswer('How can I become a seller?');
  expect(result?.answer).toContain('/seller/apply');
  expect(result?.confidence).toBe(1);
});

test('matches a close troubleshooting question', () => {
  const result = findPremadeAnswer('seller invite link says invalid');
  expect(result?.answer).toContain('/help/seller-invitation-link');
  expect(result?.confidence).toBeGreaterThanOrEqual(0.74);
});

test('does not answer unrelated questions with a low-confidence FAQ', () => {
  expect(findPremadeAnswer('Tell me a joke about the moon')).toBeNull();
});
