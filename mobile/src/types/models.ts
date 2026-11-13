export type SortOption = 'smart_rank' | 'rating' | 'distance' | 'price_asc';

export interface Venue {
  id: string;
  name: string;
  slug: string;
  cover_image_url: string;
  cuisine_tags: string[];
  signature_dishes: string[];
  price_band: number;
  avg_spend_mnt: number;
  review_count: number;
  verified_review_count: number;
  raw_avg_rating: number;
  avg_taste: number;
  avg_environment: number;
  avg_service: number;
  avg_value: number;
  bayesian_score: number;
  composite_rank_score?: number;
  phone: string;
  address_line: string;
  sub_district: string;
  floor_level?: string | null;
  lat: number;
  lng: number;
  distance_meters: number;
  is_open_now: boolean;
}

export interface Review {
  id: string;
  venue_id?: string;
  overall_rating: number;
  score_taste: number;
  score_environment: number;
  score_service: number;
  score_value: number;
  spend_per_person_mnt: number;
  content: string;
  recommended_dishes: string[];
  photo_urls: string[];
  is_exif_verified: boolean;
  exif_distance_meters?: number | null;
  credibility_weight: number;
  helpful_count: number;
  created_at: string;
  user_handle: string;
  user_display_name: string;
  user_avatar?: string | null;
}

export interface DishTag {
  dish_name: string;
  venue_id?: string;
  price_mnt?: number;
}

export interface SocialPost {
  id: string;
  title: string;
  body: string;
  primary_venue_id?: string | null;
  location_label: string;
  media_urls: string[];
  dish_tags: DishTag[];
  hashtags: string[];
  like_count: number;
  bookmark_count: number;
  comment_count: number;
  created_at: string;
  author_handle: string;
  author_name: string;
  author_avatar?: string | null;
  venue_name?: string | null;
  venue_score?: number | null;
  venue_price_band?: number | null;
}
