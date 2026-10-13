import { z } from 'zod';

export const moodNames = ['cheerful', 'professional', 'calm', 'earthy', 'elegant', 'playful', 'soft', 'dramatic'];
export const preferencesSchema = z.object({
  intent: z.string().max(4000).default(''),
  moods: z.array(z.enum(moodNames)).max(8).optional(),
  intensity: z.enum(['subtle', 'moderate', 'vivid']).optional(),
  warmth: z.enum(['warm', 'cool', 'balanced']).optional(),
  avoid: z.array(z.string().min(1).max(80)).max(30).optional(),
  prefer: z.array(z.string().min(1).max(80)).max(30).optional(),
  appearance: z.enum(['light', 'dark']).optional(),
  mode: z.enum(['faithful', 'adapted']).default('faithful'),
  limit: z.number().int().min(1).max(20).default(3),
}).strict();
export const themeOptionsSchema = z.object({
  paletteId: z.number().int().min(1).max(348),
  appearance: z.enum(['light', 'dark']).default('light'),
  mode: z.enum(['faithful', 'adapted']).default('faithful'),
  primaryColor: z.string().regex(/^#[\da-f]{6}$/i).optional(),
}).strict();
export const checkSchema = z.object({
  tokens: z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/), z.string().regex(/^#[\da-f]{6}$/i)),
  pairs: z.array(z.object({ foreground: z.string().min(1), background: z.string().min(1),
    minimum: z.number().min(1).max(21).default(4.5) }).strict()).min(1).max(100).optional(),
}).strict();
