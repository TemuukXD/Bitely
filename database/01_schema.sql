-- Bitely Core PostgreSQL + PostGIS Schema (Zero internal blank lines for DBeaver compatibility)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handle VARCHAR(64) UNIQUE NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    avatar_url TEXT,
    trust_weight NUMERIC(3,2) NOT NULL DEFAULT 1.00 CHECK (trust_weight BETWEEN 0.10 AND 3.00),
    follower_count INTEGER NOT NULL DEFAULT 0,
    following_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Venues Table (Core POI Metadata & Aggregated Scores)
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    cover_image_url TEXT,
    cuisine_tags TEXT[] NOT NULL DEFAULT '{}',
    signature_dishes TEXT[] NOT NULL DEFAULT '{}',
    price_band SMALLINT NOT NULL CHECK (price_band BETWEEN 1 AND 4),
    avg_spend_mnt INTEGER NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    verified_review_count INTEGER NOT NULL DEFAULT 0,
    weighted_vote_sum NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    weighted_rating_sum NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    raw_avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    avg_taste NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    avg_environment NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    avg_service NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    avg_value NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    bayesian_score NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Ulaanbaatar',
    phone VARCHAR(64),
    status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'TEMP_CLOSED', 'PERMANENTLY_CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venues_cuisine_tags ON venues USING GIN (cuisine_tags);
CREATE INDEX IF NOT EXISTS idx_venues_filter_sort ON venues (status, price_band, bayesian_score DESC);

-- 3. Venue Locations Table (Geospatial Indexing & Hierarchy)
CREATE TABLE IF NOT EXISTS venue_locations (
    venue_id UUID PRIMARY KEY REFERENCES venues(id) ON DELETE CASCADE,
    address_line VARCHAR(500) NOT NULL,
    city_code VARCHAR(32) NOT NULL DEFAULT 'ULN',
    sub_district VARCHAR(128) NOT NULL,
    mall_poi_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    floor_level VARCHAR(32),
    coordinates GEOGRAPHY(POINT, 4326) NOT NULL,
    geofence_boundary GEOGRAPHY(POLYGON, 4326),
    geohash_7 VARCHAR(7) GENERATED ALWAYS AS (ST_GeoHash(coordinates::geometry, 7)) STORED
);

CREATE INDEX IF NOT EXISTS idx_venue_locations_coords ON venue_locations USING GIST (coordinates);
CREATE INDEX IF NOT EXISTS idx_venue_locations_geofence ON venue_locations USING GIST (geofence_boundary);
CREATE INDEX IF NOT EXISTS idx_venue_locations_geohash ON venue_locations (city_code, geohash_7);

-- 4. Venue Operating Hours
CREATE TABLE IF NOT EXISTS venue_open_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    spans_midnight BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_venue_open_hours_lookup ON venue_open_hours (day_of_week, open_time, close_time, venue_id);

-- 5. Structured Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    overall_rating SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    score_taste SMALLINT NOT NULL CHECK (score_taste BETWEEN 1 AND 5),
    score_environment SMALLINT NOT NULL CHECK (score_environment BETWEEN 1 AND 5),
    score_service SMALLINT NOT NULL CHECK (score_service BETWEEN 1 AND 5),
    score_value SMALLINT NOT NULL CHECK (score_value BETWEEN 1 AND 5),
    spend_per_person_mnt INTEGER CHECK (spend_per_person_mnt >= 0),
    content TEXT NOT NULL,
    recommended_dishes TEXT[] NOT NULL DEFAULT '{}',
    photo_urls TEXT[] NOT NULL DEFAULT '{}',
    exif_distance_meters NUMERIC(8,2),
    is_exif_verified BOOLEAN NOT NULL DEFAULT FALSE,
    credibility_weight NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(24) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PENDING_MODERATION', 'PUBLISHED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_venue_created ON reviews (venue_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews (user_id, created_at DESC);

-- 6. Community Social Feed Posts ("Notes" / Moments)
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    primary_venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    publish_coordinates GEOGRAPHY(POINT, 4326),
    location_label VARCHAR(160),
    media_urls TEXT[] NOT NULL DEFAULT '{}',
    dish_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    mentioned_user_ids UUID[] NOT NULL DEFAULT '{}',
    hashtags TEXT[] NOT NULL DEFAULT '{}',
    like_count INTEGER NOT NULL DEFAULT 0,
    bookmark_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    share_count INTEGER NOT NULL DEFAULT 0,
    visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE')),
    status VARCHAR(24) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PROCESSING', 'PUBLISHED', 'HIDDEN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts (author_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_venue ON posts (primary_venue_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_coords ON posts USING GIST (publish_coordinates);
CREATE INDEX IF NOT EXISTS idx_posts_dish_tags ON posts USING GIN (dish_tags);
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON posts USING GIN (hashtags);

-- 7. Media Attachments Table (Polymorphic across Reviews and Posts)
CREATE TABLE IF NOT EXISTS media_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(16) NOT NULL CHECK (entity_type IN ('REVIEW', 'POST', 'VENUE_HEADER')),
    entity_id UUID NOT NULL,
    display_order SMALLINT NOT NULL DEFAULT 0,
    media_type VARCHAR(16) NOT NULL CHECK (media_type IN ('IMAGE', 'VIDEO')),
    object_key VARCHAR(512) UNIQUE NOT NULL,
    cdn_variants JSONB NOT NULL DEFAULT '{}'::jsonb,
    blurhash VARCHAR(64),
    width_px INTEGER,
    height_px INTEGER,
    duration_ms INTEGER,
    exif_coordinates GEOGRAPHY(POINT, 4326),
    exif_captured_at TIMESTAMPTZ,
    exif_distance_to_venue_m NUMERIC(8,2),
    is_geo_verified BOOLEAN NOT NULL DEFAULT FALSE,
    processing_status VARCHAR(24) NOT NULL DEFAULT 'UPLOADED' CHECK (processing_status IN ('UPLOADED', 'VERIFIED', 'PROCESSED', 'FAILED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_entity_lookup ON media_attachments (entity_type, entity_id, display_order);
