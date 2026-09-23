import { describe, it, expect, vi } from 'vitest';
import * as casesService from './cases.service';

vi.mock('./case.model', () => ({ Case: { create: vi.fn(), findOne: vi.fn(), find: vi.fn(), countDocuments: vi.fn() } }));
vi.mock('../content/content.model', () => ({ Content: { findOne: vi.fn() } }));
vi.mock('./moderation-decision.model', () => ({ ModerationDecision: { create: vi.fn() } }));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('../../utils/socket', () => ({ emitCaseEvent: vi.fn() }));
vi.mock('../integrations/integrations.service', () => ({ deliverEvent: vi.fn().mockResolvedValue(undefined) }));

describe('CasesService', () => {
  it('exports createCase function', () => {
    expect(typeof casesService.createCase).toBe('function');
  });

  it('exports listCases function', () => {
    expect(typeof casesService.listCases).toBe('function');
  });

  it('exports resolveCase function', () => {
    expect(typeof casesService.resolveCase).toBe('function');
  });
});