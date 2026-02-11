import { Response } from 'express';
import { Category } from '../models/index.js';
import { AuthRequest } from '../middlewares/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  parent: z.string().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  parent: z.string().optional(),
  isActive: z.boolean().optional(),
  order: z.number().optional(),
});

export const createCategory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, description, color, icon, parent } = createCategorySchema.parse(req.body);
    const user = req.user!;

    const existingCategory = await Category.findOne({
      name,
      tenant: user.tenant._id,
    });

    if (existingCategory) {
      throw new AppError('Category already exists', 400);
    }

    const category = await Category.create({
      name,
      description,
      color: color || '#6B7280',
      icon,
      parent: parent || undefined,
      tenant: user.tenant._id,
    });

    res.status(201).json({ message: 'Category created', category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    throw error;
  }
};

export const getCategories = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;

  const categories = await Category.find({
    tenant: user.tenant._id,
    isActive: true,
  })
    .populate('parent', 'name color')
    .sort({ order: 1, name: 1 });

  res.json({ categories });
};

export const updateCategory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;
  const updates = updateCategorySchema.parse(req.body);

  const category = await Category.findOne({
    _id: id,
    tenant: user.tenant._id,
  });

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  Object.assign(category, updates);
  await category.save();

  res.json({ message: 'Category updated', category });
};

export const deleteCategory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const user = req.user!;
  const { id } = req.params;

  const category = await Category.findOneAndDelete({
    _id: id,
    tenant: user.tenant._id,
  });

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  res.json({ message: 'Category deleted' });
};
