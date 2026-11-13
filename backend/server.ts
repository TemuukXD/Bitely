import Fastify from 'fastify';
import cors from '@fastify/cors';
import { db, ensureDatabaseReady } from './src/db.js';
import {
  DiscoverQuerySchema,
  CreateReviewSchema,
  CreatePostSchema,
} from './src/schemas.js';

const fastify = Fastify({ logger: true });

// Global error handler for clean JSON error responses
fastify.setErrorHandler((error: any, _request, reply) => {
  fastify.log.error(error);
  reply.status(error?.statusCode || 400).send({
    error: error?.name || 'BadRequest',
    message: error?.message || 'Invalid request parameters',
  });
});

// 1. Health & Database Status Check
fastify.get('/health', async () => {
  const { rows } = await db.query('SELECT COUNT(*)::int AS venue_count FROM venues');
  return {
    status: 'ok',
    region: 'Ulaanbaatar, Mongolia (ULN)',
    seeded_venues: rows[0]?.venue_count ?? 0,
    timestamp: new Date().toISOString(),
  };
});

// 2. Geospatial & Bayesian Venue Discovery Endpoint
fastify.get('/api/v1/venues/discover', async (request) => {
  const query = DiscoverQuerySchema.parse(request.query);

  const orderClause =
    query.sort === 'rating'
      ? 'computed_bayesian_score DESC, cv.review_count DESC'
      : query.sort === 'distance'
      ? 'cv.distance_meters ASC'
      : query.sort === 'price_asc'
      ? 'cv.avg_spend_mnt ASC, computed_bayesian_score DESC'
      : 'composite_rank_score DESC, cv.review_count DESC';

  const sql = `
    WITH search_params AS (
      SELECT
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS user_point,
        $3::double precision AS max_radius_m,
        25.0::numeric AS prior_c,
        4.35::numeric AS global_mean_m,
        1500.0::double precision AS decay_lambda
    ),
    candidate_venues AS (
      SELECT
        v.id,
        v.name,
        v.slug,
        COALESCE(v.cover_image_url, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80') AS cover_image_url,
        v.cuisine_tags,
        COALESCE(v.signature_dishes, '{}') AS signature_dishes,
        v.price_band,
        COALESCE(NULLIF(v.avg_spend_mnt, 0), 45000) AS avg_spend_mnt,
        v.review_count,
        v.verified_review_count,
        v.raw_avg_rating::float AS raw_avg_rating,
        v.avg_taste::float AS avg_taste,
        v.avg_environment::float AS avg_environment,
        v.avg_service::float AS avg_service,
        v.avg_value::float AS avg_value,
        COALESCE(v.phone, '+976 7711-0000') AS phone,
        vl.address_line,
        vl.sub_district,
        vl.floor_level,
        vl.geohash_7,
        ST_Y(vl.coordinates::geometry)::float AS lat,
        ST_X(vl.coordinates::geometry)::float AS lng,
        ROUND(ST_Distance(vl.coordinates, sp.user_point)::numeric, 0)::float AS distance_meters,
        (
          (sp.prior_c * sp.global_mean_m + GREATEST(v.weighted_rating_sum, v.review_count * v.raw_avg_rating)) /
          (sp.prior_c + GREATEST(v.weighted_vote_sum, v.review_count))
        )::numeric(5,4)::float AS computed_bayesian_score,
        sp.decay_lambda,
        EXISTS (
          SELECT 1 FROM venue_open_hours o
          WHERE o.venue_id = v.id
            AND o.day_of_week = EXTRACT(DOW FROM (NOW() AT TIME ZONE v.timezone))::smallint
            AND (NOW() AT TIME ZONE v.timezone)::time BETWEEN o.open_time AND o.close_time
        ) AS is_open_now
      FROM venues v
      JOIN venue_locations vl ON vl.venue_id = v.id
      CROSS JOIN search_params sp
      WHERE v.status = 'ACTIVE'
        AND ST_DWithin(vl.coordinates, sp.user_point, sp.max_radius_m)
        AND ($4::text IS NULL OR $4 = ANY(v.cuisine_tags))
        AND ($5::smallint IS NULL OR v.price_band <= $5)
        AND (
          $6::text IS NULL
          OR v.name ILIKE '%' || $6 || '%'
          OR vl.sub_district ILIKE '%' || $6 || '%'
          OR EXISTS (SELECT 1 FROM unnest(v.cuisine_tags) t WHERE t ILIKE '%' || $6 || '%')
          OR EXISTS (SELECT 1 FROM unnest(v.signature_dishes) d WHERE d ILIKE '%' || $6 || '%')
        )
    )
    SELECT
      cv.*,
      ROUND(cv.computed_bayesian_score::numeric, 2)::float AS bayesian_score,
      ROUND(
        (
          0.70 * (cv.computed_bayesian_score / 5.0) +
          0.30 * EXP(-cv.distance_meters / cv.decay_lambda)
        )::numeric,
        4
      )::float AS composite_rank_score
    FROM candidate_venues cv
    WHERE ($7::boolean IS FALSE OR cv.is_open_now = TRUE)
    ORDER BY ${orderClause}
    LIMIT $8;
  `;

  const result = await db.query(sql, [
    query.lng,
    query.lat,
    query.radius_m,
    query.cuisine || null,
    query.max_price_band || null,
    query.q || null,
    Boolean(query.open_now),
    query.limit,
  ]);

  return {
    meta: {
      center: { lat: query.lat, lng: query.lng },
      radius_m: query.radius_m,
      sort: query.sort,
      count: result.rows.length,
    },
    venues: result.rows,
  };
});

// 3. Single Venue Detail + Reviews + Tagged Social Notes
fastify.get('/api/v1/venues/:id', async (request, reply) => {
  const { id } = request.params as { id: string };

  const venueRes = await db.query(
    `SELECT
       v.id, v.name, v.slug,
       COALESCE(v.cover_image_url, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80') AS cover_image_url,
       v.cuisine_tags,
       COALESCE(v.signature_dishes, '{}') AS signature_dishes,
       v.price_band,
       COALESCE(NULLIF(v.avg_spend_mnt, 0), 45000) AS avg_spend_mnt,
       v.review_count,
       v.verified_review_count,
       v.raw_avg_rating::float AS raw_avg_rating,
       v.avg_taste::float AS avg_taste,
       v.avg_environment::float AS avg_environment,
       v.avg_service::float AS avg_service,
       v.avg_value::float AS avg_value,
       v.bayesian_score::float AS bayesian_score,
       COALESCE(v.phone, '+976 7711-0000') AS phone,
       vl.address_line, vl.sub_district, vl.floor_level,
       ST_Y(vl.coordinates::geometry)::float AS lat,
       ST_X(vl.coordinates::geometry)::float AS lng
     FROM venues v
     JOIN venue_locations vl ON vl.venue_id = v.id
     WHERE v.id = $1`,
    [id]
  );

  if (venueRes.rows.length === 0) {
    return reply.status(404).send({ error: 'NotFound', message: 'Venue not found' });
  }

  const reviewsRes = await db.query(
    `SELECT
       r.id, r.overall_rating, r.score_taste, r.score_environment, r.score_service, r.score_value,
       COALESCE(r.spend_per_person_mnt, 45000) AS spend_per_person_mnt,
       r.content, r.recommended_dishes, COALESCE(r.photo_urls, '{}') AS photo_urls,
       r.is_exif_verified, r.exif_distance_meters::float AS exif_distance_meters,
       r.credibility_weight::float AS credibility_weight, r.helpful_count, r.created_at,
       u.handle AS user_handle, u.display_name AS user_display_name, u.avatar_url AS user_avatar
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     WHERE r.venue_id = $1 AND r.status = 'PUBLISHED'
     ORDER BY r.is_exif_verified DESC, r.created_at DESC
     LIMIT 30`,
    [id]
  );

  return {
    venue: venueRes.rows[0],
    reviews: reviewsRes.rows,
  };
});

// 4. Submit Structured Review with Live EXIF Geo-Verification & Bayesian Update
fastify.post('/api/v1/venues/:id/reviews', async (request, reply) => {
  const { id: venueId } = request.params as { id: string };
  const payload = CreateReviewSchema.parse(request.body);

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Ensure user exists
    const userRes = await client.query(
      `INSERT INTO users (handle, display_name, trust_weight)
       VALUES ($1, $2, 1.25)
       ON CONFLICT (handle) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING id, trust_weight::float AS trust_weight`,
      [payload.user_handle, payload.user_display_name]
    );
    const user = userRes.rows[0]!;

    // Calculate EXIF distance to venue if GPS coordinates were supplied
    let exifDistanceM: number | null = null;
    let isExifVerified = false;

    if (payload.exif_lat !== undefined && payload.exif_lng !== undefined) {
      const distRes = await client.query(
        `SELECT ROUND(
           ST_Distance(
             coordinates,
             ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
           )::numeric, 1
         )::float AS dist_m
         FROM venue_locations WHERE venue_id = $3`,
        [payload.exif_lng, payload.exif_lat, venueId]
      );
      if (distRes.rows.length > 0) {
        exifDistanceM = distRes.rows[0].dist_m;
        isExifVerified = exifDistanceM !== null && exifDistanceM <= 150;
      }
    }

    const overallRating = Math.round(
      (payload.score_taste +
        payload.score_environment +
        payload.score_service +
        payload.score_value) /
        4
    );

    const credibilityWeight = Number(
      (user.trust_weight * (isExifVerified ? 1.25 : 1.0)).toFixed(2)
    );

    const insertReviewRes = await client.query(
      `INSERT INTO reviews (
         venue_id, user_id, overall_rating, score_taste, score_environment, score_service, score_value,
         spend_per_person_mnt, content, recommended_dishes, photo_urls,
         exif_distance_meters, is_exif_verified, credibility_weight
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        venueId,
        user.id,
        overallRating,
        payload.score_taste,
        payload.score_environment,
        payload.score_service,
        payload.score_value,
        payload.spend_per_person_mnt,
        payload.content,
        payload.recommended_dishes,
        payload.photo_urls,
        exifDistanceM,
        isExifVerified,
        credibilityWeight,
      ]
    );

    // Recalculate multi-dimensional averages & Bayesian score atomically
    const updatedVenueRes = await client.query(
      `UPDATE venues v
       SET
         review_count = v.review_count + 1,
         verified_review_count = v.verified_review_count + (CASE WHEN $2::boolean THEN 1 ELSE 0 END),
         weighted_vote_sum = v.weighted_vote_sum + $3,
         weighted_rating_sum = v.weighted_rating_sum + ($3 * $4),
         raw_avg_rating = ROUND(((v.raw_avg_rating * v.review_count + $4) / (v.review_count + 1))::numeric, 2),
         avg_taste = ROUND(((v.avg_taste * v.review_count + $5) / (v.review_count + 1))::numeric, 2),
         avg_environment = ROUND(((v.avg_environment * v.review_count + $6) / (v.review_count + 1))::numeric, 2),
         avg_service = ROUND(((v.avg_service * v.review_count + $7) / (v.review_count + 1))::numeric, 2),
         avg_value = ROUND(((v.avg_value * v.review_count + $8) / (v.review_count + 1))::numeric, 2),
         avg_spend_mnt = ROUND(((COALESCE(NULLIF(v.avg_spend_mnt, 0), $9) * v.review_count + $9) / (v.review_count + 1))::numeric, 0),
         bayesian_score = ROUND(
           (
             (25.0 * 4.35 + (v.weighted_rating_sum + ($3 * $4))) /
             (25.0 + (v.weighted_vote_sum + $3))
           )::numeric,
           4
         ),
         updated_at = NOW()
       WHERE v.id = $1
       RETURNING id, review_count, verified_review_count, bayesian_score::float AS bayesian_score,
                 avg_taste::float AS avg_taste, avg_environment::float AS avg_environment,
                 avg_service::float AS avg_service, avg_value::float AS avg_value, avg_spend_mnt`,
      [
        venueId,
        isExifVerified,
        credibilityWeight,
        overallRating,
        payload.score_taste,
        payload.score_environment,
        payload.score_service,
        payload.score_value,
        payload.spend_per_person_mnt,
      ]
    );

    await client.query('COMMIT');
    return reply.status(201).send({
      review: insertReviewRes.rows[0],
      updated_venue: updatedVenueRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// 5. Community Social Feed ("Notes" / Moments) Stream
fastify.get('/api/v1/posts/feed', async (request) => {
  const { tag } = request.query as { tag?: string };

  const result = await db.query(
    `SELECT
       p.id, p.title, p.body, p.primary_venue_id, p.location_label,
       COALESCE(p.media_urls, '{}') AS media_urls,
       p.dish_tags, p.hashtags,
       p.like_count, p.bookmark_count, p.comment_count, p.created_at,
       u.handle AS author_handle, u.display_name AS author_name, u.avatar_url AS author_avatar,
       v.name AS venue_name, v.bayesian_score::float AS venue_score, v.price_band AS venue_price_band
     FROM posts p
     JOIN users u ON u.id = p.author_id
     LEFT JOIN venues v ON v.id = p.primary_venue_id
     WHERE p.status = 'PUBLISHED'
       AND ($1::text IS NULL OR $1 = ANY(p.hashtags))
     ORDER BY p.created_at DESC
     LIMIT 30`,
    [tag || null]
  );

  return { posts: result.rows };
});

// 6. Create a New Community Note ("Moment")
fastify.post('/api/v1/posts', async (request, reply) => {
  const payload = CreatePostSchema.parse(request.body);

  const userRes = await db.query(
    `INSERT INTO users (handle, display_name)
     VALUES ($1, $2)
     ON CONFLICT (handle) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id, handle, display_name, avatar_url`,
    [payload.user_handle, payload.user_display_name]
  );
  const user = userRes.rows[0]!;

  const postRes = await db.query(
    `INSERT INTO posts (
       author_id, title, body, primary_venue_id, publish_coordinates, location_label,
       media_urls, dish_tags, hashtags
     )
     VALUES (
       $1, $2, $3, $4,
       ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
       $7, $8, $9::jsonb, $10
     )
     RETURNING *`,
    [
      user.id,
      payload.title,
      payload.body,
      payload.primary_venue_id || null,
      payload.lng,
      payload.lat,
      payload.location_label,
      payload.media_urls.length > 0
        ? payload.media_urls
        : ['https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80'],
      JSON.stringify(payload.dish_tags),
      payload.hashtags,
    ]
  );

  return reply.status(201).send({
    post: {
      ...postRes.rows[0],
      author_handle: user.handle,
      author_name: user.display_name,
      author_avatar: user.avatar_url,
    },
  });
});

// 7. Like a Community Note
fastify.post('/api/v1/posts/:id/like', async (request) => {
  const { id } = request.params as { id: string };
  const res = await db.query(
    `UPDATE posts SET like_count = like_count + 1 WHERE id = $1 RETURNING id, like_count`,
    [id]
  );
  return res.rows[0] ?? { id, like_count: 0 };
});

const start = async () => {
  try {
    await fastify.register(cors, { origin: true });
    await ensureDatabaseReady();
    const port = Number(process.env.PORT || 3000);
    const address = await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Bitely Ulaanbaatar API running on ${address}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
