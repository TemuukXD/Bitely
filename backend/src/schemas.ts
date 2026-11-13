import { z } from 'zod';

export const DiscoverQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).default(47.9187),
  lng: z.coerce.number().min(-180).max(180).default(106.9176),
  radius_m: z.coerce.number().min(100).max(50000).default(10000),
  cuisine: z.string().optional(),
  max_price_band: z.coerce.number().int().min(1).max(4).optional(),
  open_now: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  q: z.string().trim().optional(),
  sort: z
    .enum(['smart_rank', 'rating', 'distance', 'price_asc'])
    .default('smart_rank'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const CreateReviewSchema = z.object({
  user_handle: z.string().min(2).max(64).default('temuulen_ub'),
  user_display_name: z.string().min(2).max(120).default('Temuulen B.'),
  score_taste: z.number().int().min(1).max(5),
  score_environment: z.number().int().min(1).max(5),
  score_service: z.number().int().min(1).max(5),
  score_value: z.number().int().min(1).max(5),
  spend_per_person_mnt: z.number().int().min(0).max(2000000).default(45000),
  content: z.string().min(5).max(2000),
  recommended_dishes: z.array(z.string()).default([]),
  photo_urls: z.array(z.string()).default([]),
  exif_lat: z.number().min(-90).max(90).optional(),
  exif_lng: z.number().min(-180).max(180).optional(),
});

export const CreatePostSchema = z.object({
  user_handle: z.string().min(2).max(64).default('temuulen_ub'),
  user_display_name: z.string().min(2).max(120).default('Temuulen B.'),
  title: z.string().min(3).max(200),
  body: z.string().min(5).max(3000),
  primary_venue_id: z.string().uuid().optional().nullable(),
  lat: z.number().min(-90).max(90).default(47.9187),
  lng: z.number().min(-180).max(180).default(106.9176),
  location_label: z.string().max(160).default('Ulaanbaatar'),
  media_urls: z.array(z.string()).default([]),
  dish_tags: z
    .array(
      z.object({
        dish_name: z.string(),
        venue_id: z.string().optional(),
        price_mnt: z.number().int().nonnegative().optional(),
      })
    )
    .default([]),
  hashtags: z.array(z.string()).default([]),
});
