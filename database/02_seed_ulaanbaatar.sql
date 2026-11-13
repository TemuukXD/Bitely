-- Remove any old random-UUID rows from earlier manual DBeaver seeds so IDs stay consistent
DELETE FROM venues
WHERE slug IN (
    'the-bull-hotpot-shangri-la',
    'modern-nomads-amar-st',
    'veranda-mediterranean',
    'hutong-shangri-la',
    'route-22-wine-lounge',
    'bds-mongolian-barbeque-seoul-st',
    'sakura-japanese-peace-ave',
    'asiana-central-olympic-st',
    'seoul-restaurant-park',
    'hill-lounge-zaisan',
    'rosewood-kitchen-enoteca',
    'arig-ramen-peace-ave'
)
AND id NOT IN (
    '22222222-2222-4222-8222-222222222201',
    '22222222-2222-4222-8222-222222222202',
    '22222222-2222-4222-8222-222222222203',
    '22222222-2222-4222-8222-222222222204',
    '22222222-2222-4222-8222-222222222205',
    '22222222-2222-4222-8222-222222222206',
    '22222222-2222-4222-8222-222222222207',
    '22222222-2222-4222-8222-222222222208',
    '22222222-2222-4222-8222-222222222209',
    '22222222-2222-4222-8222-222222222210',
    '22222222-2222-4222-8222-222222222211',
    '22222222-2222-4222-8222-222222222212'
);

-- 1. Seed Users
INSERT INTO users (id, handle, display_name, avatar_url, trust_weight, follower_count, following_count)
VALUES
('11111111-1111-4111-8111-111111111101', 'temuulen_ub', 'Temuulen B.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80', 1.40, 1280, 310),
('11111111-1111-4111-8111-111111111102', 'nomadic_foodie', 'Anuujin M.', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80', 1.65, 4520, 195),
('11111111-1111-4111-8111-111111111103', 'bilguun_eats', 'Bilguun O.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80', 1.25, 640, 220),
('11111111-1111-4111-8111-111111111104', 'khulan_reviews', 'Khulan T.', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80', 1.50, 2890, 410)
ON CONFLICT (handle) DO NOTHING;

-- 2. Seed Ulaanbaatar Venues
INSERT INTO venues (
    id, name, slug, cover_image_url, cuisine_tags, signature_dishes, price_band, avg_spend_mnt,
    review_count, verified_review_count, weighted_vote_sum, weighted_rating_sum,
    raw_avg_rating, avg_taste, avg_environment, avg_service, avg_value, bayesian_score, timezone, phone
)
VALUES
('22222222-2222-4222-8222-222222222201', 'The Bull Hotpot (Shangri-La)', 'the-bull-hotpot-shangri-la', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80', ARRAY['Hotpot', 'Asian', 'Beef & Lamb'], ARRAY['Prime Sliced Lamb Shoulder', 'Bone Marrow Broth', 'Handmade Prawn Paste'], 3, 68000, 312, 214, 365.00, 1752.00, 4.80, 4.92, 4.82, 4.76, 4.65, 4.7391, 'Asia/Ulaanbaatar', '+976 7711-8899'),
('22222222-2222-4222-8222-222222222202', 'Modern Nomads (Amar Street)', 'modern-nomads-amar-st', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80', ARRAY['Mongolian', 'Traditional', 'Buuz'], ARRAY['Khorkhog Stone BBQ Lamb', 'Steamed Mutton Buuz', 'Airag Sea Buckthorn Tea'], 2, 42000, 480, 310, 540.00, 2511.00, 4.65, 4.74, 4.62, 4.55, 4.68, 4.6146, 'Asia/Ulaanbaatar', '+976 11-318744'),
('22222222-2222-4222-8222-222222222203', 'Veranda Mediterranean Restaurant', 'veranda-mediterranean', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80', ARRAY['Italian', 'European', 'Wine'], ARRAY['Truffle Burrata Pizza', 'Osso Buco Risotto', 'Warm Tiramisu'], 3, 75000, 240, 168, 282.00, 1339.50, 4.75, 4.82, 4.90, 4.68, 4.56, 4.6767, 'Asia/Ulaanbaatar', '+976 11-330818'),
('22222222-2222-4222-8222-222222222204', 'Hutong (Shangri-La Hotel)', 'hutong-shangri-la', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80', ARRAY['Chinese', 'Peking Duck', 'Fine Dining'], ARRAY['Roasted Peking Duck', 'Sichuan Crispy Lamb Ribs', 'XO Scallop Dumplings'], 4, 145000, 115, 88, 138.00, 669.30, 4.85, 4.92, 4.96, 4.88, 4.45, 4.6966, 'Asia/Ulaanbaatar', '+976 7702-9999'),
('22222222-2222-4222-8222-222222222205', 'Route 22 Restaurant & Wine Lounge', 'route-22-wine-lounge', 'https://images.unsplash.com/photo-1558030006-450675393462?w=800&auto=format&fit=crop&q=80', ARRAY['Steakhouse', 'European', 'Wine'], ARRAY['Dry-Aged Ribeye 400g', 'Roasted Bone Marrow', 'Malbec Wine Flight'], 3, 92000, 185, 118, 212.00, 996.40, 4.70, 4.78, 4.85, 4.62, 4.48, 4.6103, 'Asia/Ulaanbaatar', '+976 11-328222'),
('22222222-2222-4222-8222-222222222206', 'BD''s Mongolian Barbeque', 'bds-mongolian-barbeque-seoul-st', 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&auto=format&fit=crop&q=80', ARRAY['Mongolian BBQ', 'Grill', 'Casual'], ARRAY['Custom Flat-Top Stir Fry Bowl', 'Garlic Herb Flatbread', 'Spiced Beef Skewers'], 2, 45000, 290, 175, 325.00, 1430.00, 4.40, 4.52, 4.30, 4.42, 4.55, 4.3607, 'Asia/Ulaanbaatar', '+976 11-318545'),
('22222222-2222-4222-8222-222222222207', 'Sakura Japanese Restaurant', 'sakura-japanese-peace-ave', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&auto=format&fit=crop&q=80', ARRAY['Japanese', 'Ramen', 'Sushi'], ARRAY['Tonkotsu Black Garlic Ramen', 'Salmon Belly Aburi Nigiri', 'Matcha Mille Crepe'], 2, 34000, 360, 232, 410.00, 1886.00, 4.60, 4.72, 4.45, 4.52, 4.75, 4.5569, 'Asia/Ulaanbaatar', '+976 7011-2233'),
('22222222-2222-4222-8222-222222222208', 'Asiana Central Restaurant', 'asiana-central-olympic-st', 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&auto=format&fit=crop&q=80', ARRAY['Asian Fusion', 'Sushi', 'Mongolian'], ARRAY['Crispy Duck Bao', 'Wagyu Tataki Roll', 'Sea Buckthorn Sorbet'], 3, 64000, 195, 130, 224.00, 1019.20, 4.55, 4.60, 4.72, 4.50, 4.42, 4.4797, 'Asia/Ulaanbaatar', '+976 7710-1010'),
('22222222-2222-4222-8222-222222222209', 'Seoul Restaurant (National Park)', 'seoul-restaurant-park', 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&auto=format&fit=crop&q=80', ARRAY['Korean', 'BBQ', 'Royal Cuisine'], ARRAY['Charcoal Hanwoo Galbi', 'Seafood Sundubu Jjigae', 'Crispy Haemul Pajeon'], 3, 76000, 145, 95, 168.00, 756.00, 4.50, 4.62, 4.75, 4.45, 4.32, 4.4158, 'Asia/Ulaanbaatar', '+976 11-329709'),
('22222222-2222-4222-8222-222222222210', 'Hill Lounge & Grill (Zaisan Hill)', 'hill-lounge-zaisan', 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&auto=format&fit=crop&q=80', ARRAY['Lounge', 'Steakhouse', 'Skyline View'], ARRAY['Tomahawk Steak for Two', 'Smoked Rosemary Old Fashioned', 'Baked Alaska'], 4, 98000, 210, 142, 245.00, 1127.00, 4.60, 4.55, 4.95, 4.48, 4.35, 4.5306, 'Asia/Ulaanbaatar', '+976 7700-5566'),
('22222222-2222-4222-8222-222222222211', 'Rosewood Kitchen + Enoteca', 'rosewood-kitchen-enoteca', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop&q=80', ARRAY['European', 'Bistro', 'Brunch'], ARRAY['House-Cured Pastrami Reuben', 'Handmade Pappardelle Ragu', 'Sourdough Focaccia'], 3, 62000, 275, 190, 318.00, 1516.86, 4.77, 4.86, 4.78, 4.74, 4.66, 4.7029, 'Asia/Ulaanbaatar', '+976 7000-7799'),
('22222222-2222-4222-8222-222222222212', 'Arig Ramen & Izakaya (Peace Ave)', 'arig-ramen-peace-ave', 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=800&auto=format&fit=crop&q=80', ARRAY['Japanese', 'Ramen', 'Izakaya'], ARRAY['Spicy Miso Beef Ramen', 'Crispy Chicken Karaage', 'Yuzu Highball'], 1, 24000, 420, 285, 478.00, 2222.70, 4.65, 4.76, 4.52, 4.60, 4.84, 4.6102, 'Asia/Ulaanbaatar', '+976 7733-4455')
ON CONFLICT (slug) DO UPDATE SET
    cover_image_url = EXCLUDED.cover_image_url,
    signature_dishes = EXCLUDED.signature_dishes,
    avg_spend_mnt = EXCLUDED.avg_spend_mnt,
    phone = EXCLUDED.phone;

-- 3. Seed Venue Locations
INSERT INTO venue_locations (venue_id, address_line, city_code, sub_district, floor_level, coordinates)
VALUES
('22222222-2222-4222-8222-222222222201', 'Olympic Street 19A, Sukhbaatar District', 'ULN', 'Shangri-La Mall', '3F', ST_SetSRID(ST_MakePoint(106.9205, 47.9142), 4326)::geography),
('22222222-2222-4222-8222-222222222202', 'Amar Street, Sukhbaatar District (North of Square)', 'ULN', 'Sukhbaatar Square', '1F', ST_SetSRID(ST_MakePoint(106.9180, 47.9225), 4326)::geography),
('22222222-2222-4222-8222-222222222203', 'Jamyan Gun Street 5/1, Sukhbaatar District', 'ULN', 'Choijin Lama Temple', '2F', ST_SetSRID(ST_MakePoint(106.9189, 47.9158), 4326)::geography),
('22222222-2222-4222-8222-222222222204', 'Shangri-La Hotel, Olympic Street 19, Sukhbaatar', 'ULN', 'Shangri-La Hotel', '28F', ST_SetSRID(ST_MakePoint(106.9202, 47.9140), 4326)::geography),
('22222222-2222-4222-8222-222222222205', 'UNESCO Street, Sukhbaatar District', 'ULN', 'Embassy District', '1F', ST_SetSRID(ST_MakePoint(106.9168, 47.9135), 4326)::geography),
('22222222-2222-4222-8222-222222222206', 'Seoul Street 45, Sukhbaatar District', 'ULN', 'Seoul Street', '1F', ST_SetSRID(ST_MakePoint(106.9085, 47.9128), 4326)::geography),
('22222222-2222-4222-8222-222222222207', 'Peace Avenue, Near State Department Store', 'ULN', 'State Dept Store', '1F', ST_SetSRID(ST_MakePoint(106.9062, 47.9167), 4326)::geography),
('22222222-2222-4222-8222-222222222208', 'Olympic Street, North of Embassy of Japan', 'ULN', 'Olympic Street', '2F', ST_SetSRID(ST_MakePoint(106.9230, 47.9130), 4326)::geography),
('22222222-2222-4222-8222-222222222209', 'National Amusement Park, Sukhbaatar District', 'ULN', 'Central Park', '1F', ST_SetSRID(ST_MakePoint(106.9215, 47.9110), 4326)::geography),
('22222222-2222-4222-8222-222222222210', 'Zaisan Hill Complex, Khan-Uul District', 'ULN', 'Zaisan Hill', '7F', ST_SetSRID(ST_MakePoint(106.9135, 47.8860), 4326)::geography),
('22222222-2222-4222-8222-222222222211', 'Seoul Street 21, Central Tower Annex, Sukhbaatar', 'ULN', 'Sukhbaatar Square', '1F', ST_SetSRID(ST_MakePoint(106.9154, 47.9169), 4326)::geography),
('22222222-2222-4222-8222-222222222212', 'Peace Avenue 15, Ulaanbaatar', 'ULN', 'Peace Avenue', 'B1', ST_SetSRID(ST_MakePoint(106.9122, 47.9178), 4326)::geography)
ON CONFLICT (venue_id) DO NOTHING;

-- 4. Populate 7-day operating hours (10:00 to 23:30)
INSERT INTO venue_open_hours (venue_id, day_of_week, open_time, close_time, spans_midnight)
SELECT v.id, d.dow, '10:00'::time, '23:30'::time, FALSE
FROM venues v
CROSS JOIN generate_series(0, 6) AS d(dow)
WHERE NOT EXISTS (SELECT 1 FROM venue_open_hours o WHERE o.venue_id = v.id);

-- 5. Seed Initial EXIF-Verified Reviews (with corrected 8222 UUID)
INSERT INTO reviews (
    id, venue_id, user_id, overall_rating, score_taste, score_environment, score_service, score_value,
    spend_per_person_mnt, content, recommended_dishes, photo_urls, exif_distance_meters, is_exif_verified, credibility_weight, helpful_count
)
VALUES
('33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111102', 5, 5, 5, 5, 4, 65000, 'Best hotpot in Ulaanbaatar during -25C winter nights. The bone marrow and spicy Szechuan dual broth is rich, and the hand-sliced Dornod lamb melts in seconds.', ARRAY['Prime Sliced Lamb Shoulder', 'Handmade Prawn Paste'], ARRAY['https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80'], 24.5, TRUE, 2.06, 48),
('33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111101', 5, 5, 5, 4, 5, 38000, 'Took visiting friends here right after walking across Sukhbaatar Square. The Khorkhog stone-cooked lamb and hand-pinched mutton buuz are super authentic.', ARRAY['Khorkhog Stone BBQ Lamb', 'Steamed Mutton Buuz'], ARRAY['https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80'], 42.0, TRUE, 1.75, 35),
('33333333-3333-4333-8333-333333333303', '22222222-2222-4222-8222-222222222211', '11111111-1111-4111-8111-111111111104', 5, 5, 5, 5, 5, 58000, 'Rosewood never misses. Their house-made sourdough focaccia and beef short-rib pappardelle are easily top tier in downtown UB.', ARRAY['Handmade Pappardelle Ragu', 'Sourdough Focaccia'], ARRAY['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=80'], 18.2, TRUE, 1.88, 29)
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Community Social Feed Posts ("Notes" / Moments)
INSERT INTO posts (
    id, author_id, title, body, primary_venue_id, publish_coordinates, location_label,
    media_urls, dish_tags, hashtags, like_count, bookmark_count, comment_count
)
VALUES
(
    '44444444-4444-4444-8444-444444444401',
    '11111111-1111-4111-8111-111111111102',
    'Winter Survival Guide: Top 3 Broth Spots in Downtown UB',
    'When temperatures drop below -20C in Ulaanbaatar, nothing beats a bubbling pot at The Bull in Shangri-La Mall. Order the half-marrow half-spicy broth and dip the prawn paste for 90 seconds!',
    '22222222-2222-4222-8222-222222222201',
    ST_SetSRID(ST_MakePoint(106.9205, 47.9142), 4326)::geography,
    'Shangri-La Mall, 3F',
    ARRAY['https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80'],
    '[{"dish_name": "Prime Sliced Lamb Shoulder", "venue_id": "22222222-2222-4222-8222-222222222201", "price_mnt": 32000}, {"dish_name": "Handmade Prawn Paste", "venue_id": "22222222-2222-4222-8222-222222222201", "price_mnt": 24000}]'::jsonb,
    ARRAY['UlaanbaatarEats', 'UBHotpot', 'ShangriLaUB'],
    342, 189, 27
),
(
    '44444444-4444-4444-8444-444444444402',
    '11111111-1111-4111-8111-111111111101',
    'Date Night pasta & wine right off Seoul Street',
    'Rosewood Kitchen + Enoteca has the warmest lighting and best open-kitchen energy in Sukhbaatar District. The pappardelle ragu and charcuterie board are mandatory orders.',
    '22222222-2222-4222-8222-222222222211',
    ST_SetSRID(ST_MakePoint(106.9154, 47.9169), 4326)::geography,
    'Seoul Street 21',
    ARRAY['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop&q=80'],
    '[{"dish_name": "Handmade Pappardelle Ragu", "venue_id": "22222222-2222-4222-8222-222222222211", "price_mnt": 38000}]'::jsonb,
    ARRAY['UBDateNight', 'SeoulStreetUB', 'RosewoodUB'],
    218, 140, 19
),
(
    '44444444-4444-4444-8444-444444444403',
    '11111111-1111-4111-8111-111111111104',
    'Late-Night 24,000₮ Ramen Gem on Peace Avenue',
    'Craving rich 12-hour broth after studying? Arig Ramen on Peace Ave serves steaming spicy miso beef ramen with crispy karaage for under 25k MNT.',
    '22222222-2222-4222-8222-222222222212',
    ST_SetSRID(ST_MakePoint(106.9122, 47.9178), 4326)::geography,
    'Peace Avenue 15',
    ARRAY['https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=800&auto=format&fit=crop&q=80'],
    '[{"dish_name": "Spicy Miso Beef Ramen", "venue_id": "22222222-2222-4222-8222-222222222212", "price_mnt": 24000}]'::jsonb,
    ARRAY['PeaceAvenue', 'UBRamen', 'BudgetEatsUB'],
    415, 260, 34
),
(
    '44444444-4444-4444-8444-444444444404',
    '11111111-1111-4111-8111-111111111103',
    'Golden Hour Sunset & Steaks overlooking Ulaanbaatar',
    'Head up to the 7th floor of Zaisan Hill Complex at 6:30 PM for panoramic views of the whole valley while sharing a dry-aged ribeye.',
    '22222222-2222-4222-8222-222222222210',
    ST_SetSRID(ST_MakePoint(106.9135, 47.8860), 4326)::geography,
    'Zaisan Hill Complex, 7F',
    ARRAY['https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&auto=format&fit=crop&q=80'],
    '[{"dish_name": "Tomahawk Steak for Two", "venue_id": "22222222-2222-4222-8222-222222222210", "price_mnt": 165000}]'::jsonb,
    ARRAY['ZaisanHill', 'UBViews', 'SteakhouseUB'],
    289, 175, 22
)
ON CONFLICT (id) DO NOTHING;