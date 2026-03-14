import { Request, Response } from 'express';
import { z } from 'zod';
import { ServiceModel } from '../models/service.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// ─── Validation Schemas ────────────────────────────────────────────────────

const createServiceSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  url: z.string().url(),
  description: z.string().max(500).optional(),
  tags: z.array(z.string().trim()).max(10).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateServiceSchema = createServiceSchema.partial();

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().optional(),
});

// ─── Controllers ──────────────────────────────────────────────────────────

export async function listServices(req: Request, res: Response): Promise<void> {
  const query = paginationSchema.safeParse(req.query);
  if (!query.success) throw new ValidationError('Invalid query parameters');

  const { page, limit, sort, order, search } = query.data;
  const skip = (page - 1) * limit;

  const filter = search
    ? { $or: [{ name: new RegExp(search, 'i') }, { description: new RegExp(search, 'i') }] }
    : {};

  const [services, total] = await Promise.all([
    ServiceModel.find(filter)
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ServiceModel.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: services,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

export async function getService(req: Request, res: Response): Promise<void> {
  const service = await ServiceModel.findById(req.params['id']).lean();
  if (!service) throw new NotFoundError('Service');

  res.json({ success: true, data: service });
}

export async function createService(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = createServiceSchema.safeParse(req.body);
  if (!parsed.success)
    throw new ValidationError(parsed.error.errors[0]?.message ?? 'Invalid body');

  const service = await ServiceModel.create(parsed.data);
  logger.info('Service registered', {
    requestId: req.requestId,
    serviceId: service._id,
    name: service.name,
  });

  res.status(201).json({ success: true, data: service });
}

export async function updateService(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = updateServiceSchema.safeParse(req.body);
  if (!parsed.success)
    throw new ValidationError(parsed.error.errors[0]?.message ?? 'Invalid body');

  const service = await ServiceModel.findByIdAndUpdate(
    req.params['id'],
    { $set: parsed.data },
    { new: true, runValidators: true },
  ).lean();

  if (!service) throw new NotFoundError('Service');

  logger.info('Service updated', {
    requestId: req.requestId,
    serviceId: req.params['id'],
  });

  res.json({ success: true, data: service });
}

export async function deleteService(
  req: Request,
  res: Response,
): Promise<void> {
  const service = await ServiceModel.findByIdAndDelete(req.params['id']);
  if (!service) throw new NotFoundError('Service');

  logger.info('Service deleted', {
    requestId: req.requestId,
    serviceId: req.params['id'],
  });

  res.status(204).send();
}
