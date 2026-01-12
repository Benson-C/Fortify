import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  name: z.string().min(1, 'Name is required'),
  phone_number: z.string().optional(),
  id_number: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  date_time: z.string().datetime('Invalid date/time'),
  duration: z.number().int().positive('Duration must be a positive number'),
  max_capacity: z.number().int().positive('Max capacity must be a positive number'),
  event_type: z.enum(['cardio', 'strength', 'yoga', 'pilates', 'crossfit', 'other']),
  location: z.string().optional(),
  instructor_name: z.string().optional(),
});

export const healthMetricSchema = z.object({
  recorded_date: z.string().datetime('Invalid date/time').optional(),
  grip_strength: z.number().nonnegative('Grip strength must be non-negative').optional(),
  bone_density: z.number().nonnegative('Bone density must be non-negative').optional(),
  pushup_count: z.number().int().nonnegative('Pushup count must be a non-negative integer').optional(),
  heart_rate: z.number().int().positive('Heart rate must be a positive number').optional(),
  body_fat: z.number().min(0).max(100, 'Body fat percentage must be between 0 and 100').optional(),
  notes: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type HealthMetricInput = z.infer<typeof healthMetricSchema>;
