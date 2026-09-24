import { describe, it, expect, vi } from 'vitest';
import { validate, validateBody, validateQuery, validateParams } from './validate';
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

describe('validate middleware', () => {
  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  it('should call next() when body passes schema validation', async () => {
    const schema = z.object({
      name: z.string().min(2),
      age: z.number().int().positive(),
    });

    const req = {
      body: { name: 'Alice', age: 30 },
      params: {},
      query: {},
    } as unknown as Request;

    const res = mockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const middleware = validateBody(schema);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 400 with field details when body is invalid', async () => {
    const schema = z.object({
      email: z.string().email(),
      count: z.number().min(5),
    });

    const req = {
      body: { email: 'not-an-email', count: 2 },
      params: {},
      query: {},
    } as unknown as Request;

    const res = mockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const middleware = validateBody(schema);
    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation Error',
        code: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
          expect.objectContaining({ field: 'count' }),
        ]),
      })
    );
  });

  it('should validate and coerce query parameters', async () => {
    const querySchema = z.object({
      page: z.coerce.number().int().positive(),
    });

    const req = {
      body: {},
      params: {},
      query: { page: '3' },
    } as unknown as Request;

    const res = mockResponse();
    const next = vi.fn() as unknown as NextFunction;

    const middleware = validateQuery(querySchema);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query.page).toBe(3);
  });
});
