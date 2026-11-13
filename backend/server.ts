import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Pool } from 'pg';

const fastify = Fastify({ logger: true });

const db = new Pool({
  connectionString: 'postgresql://devuser:devpassword@localhost:5432/food_discovery',
});

// Health check
fastify.get('/health', async () => ({ status: 'ok' }));

// Nearby venues discovery endpoint
fastify.get('/api/v1/venues/discover', async (request, reply) => {
  const { lat = 31.2243, lng = 121.4455, radius_m = 5000 } = request.query as any;

  const result = await db.query(
    `SELECT v.id, v.name, v.cuisine_tags, v.price_band, v.bayesian_score,
            ST_Y(vl.coordinates::geometry) AS lat,
            ST_X(vl.coordinates::geometry) AS lng,
            ROUND(ST_Distance(
              vl.coordinates,
              ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
            )::numeric, 1) AS distance_meters
     FROM venues v
     JOIN venue_locations vl ON vl.venue_id = v.id
     WHERE ST_DWithin(
       vl.coordinates,
       ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
       $3
     )
     ORDER BY v.bayesian_score DESC
     LIMIT 20`,
    [Number(lng), Number(lat), Number(radius_m)]
  );

  return { venues: result.rows };
});

const start = async () => {
  try {
    await fastify.register(cors, { origin: true });
    const address = await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log(`Server listening on ${address}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();