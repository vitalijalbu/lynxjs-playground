/**
 * API contract, mirrored from the web app (www/app/types/marketplace.ts) and
 * the Laravel resources (ListingResource, DealerResource). Laravel is the
 * source of truth: keep field names snake_case and identical to the JSON.
 */

export type ListingType = 'vehicle' | 'part';
export type ListingCondition = 'new' | 'used' | 'damaged';

export interface ListingImage {
  id: number;
  url: string;
  thumb?: string;
  preview?: string;
  type?: 'image' | 'video';
}

export interface CategoryRef {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  listing_type: ListingType;
  vehicle_kind?: string;
  uses_mileage?: boolean;
  parent_id?: number | null;
  children?: CategoryRef[];
}

export interface MakeRef {
  id: number;
  name: string;
  slug: string;
  logo_path?: string | null;
  is_featured?: boolean;
  models_count?: number;
  listings_count?: number;
}

export interface VehicleModelRef {
  id: number;
  name: string;
  slug: string;
  parent_id?: number | null;
  variants?: VehicleModelRef[];
}

export interface MakeWithModels extends MakeRef {
  models: VehicleModelRef[];
}

export interface CityRef {
  id: number;
  name: string;
  slug: string;
  region_id?: number;
}

export interface NamedRef {
  id: number;
  name: string;
}

export interface LookupItem {
  id: number;
  key: string;
  name: string;
}

export interface Lookups {
  fuel_types: LookupItem[];
  transmissions: LookupItem[];
  colors: (LookupItem & { hex: string | null })[];
  features: (LookupItem & { group: string | null })[];
}

export interface ListingSeller {
  type: 'dealer' | 'private';
  id?: number | string | null;
  name: string | null;
  slug?: string | null;
  verified?: boolean;
  rating_avg?: number | null;
  rating_count?: number | null;
  dealer_since?: string | null;
}

export interface PriceDrop {
  previous_price: number;
  price: number;
  delta: number;
  changed_at: string;
}

export interface ListingSpecs {
  registration_month: number | null;
  owners_count: number | null;
  accident_free: boolean | null;
  imported: boolean | null;
  steering: string | null;
  cylinders: number | null;
  gears_count: number | null;
  euro_norm: string | null;
  co2_g_km: number | null;
  exterior_color: string | null;
  interior_color: string | null;
  interior_material: string | null;
  battery_kwh: number | null;
  ev_range_km: number | null;
  top_speed_kmh: number | null;
  acceleration_s: number | null;
  fuel_tank_l: number | null;
  trunk_l: number | null;
  weight_kg: number | null;
  service_book: boolean | null;
  warranty: boolean | null;
}

export interface ListingFeature {
  id: number;
  key: string;
  group: string | null;
  name: string;
}

export interface ListingAttributeValue {
  attribute_id: number;
  key: string | null;
  name: string | null;
  option: string | null;
  value: string | number | boolean | null;
}

export interface Listing {
  id: number;
  listing_type: ListingType;
  title: string;
  slug: string;
  price: number;
  price_negotiable: boolean;
  condition: ListingCondition;
  year: number | null;
  mileage: number | null;
  power_kw: number | null;
  is_featured: boolean;
  is_spotlight: boolean;
  is_highlight?: boolean;
  is_parts?: boolean;
  is_dealer?: boolean;
  is_favorited?: boolean;
  status: string;
  views_count: number;
  published_at?: string | null;
  images_count?: number;
  price_drop?: PriceDrop | null;
  seller?: ListingSeller;
  category?: CategoryRef;
  make?: MakeRef;
  model?: NamedRef | null;
  city?: CityRef;
  fuel_type?: NamedRef | null;
  transmission?: NamedRef | null;
  color?: NamedRef | null;
  images?: ListingImage[];

  // Detail payload only.
  description?: string | null;
  price_approx?: Record<'USD' | 'MDL', number> | null;
  engine_capacity_cc?: number | null;
  power_hp?: number | null;
  body_type?: string | null;
  doors?: number | null;
  seats?: number | null;
  drive_type?: string | null;
  gearbox?: string | null;
  vin?: string | null;
  specs?: ListingSpecs | null;
  highlights?: string[] | null;
  features?: ListingFeature[];
  attributes?: ListingAttributeValue[];
  defect_images?: ListingImage[];
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
  video_url?: string | null;
}

export type PriceRatingLevel = 'great' | 'good' | 'fair' | 'high' | 'overpriced' | 'unknown';

export interface PriceRating {
  rating: PriceRatingLevel;
  price?: number;
  average?: number;
  min?: number;
  max?: number;
  sample_size: number;
  delta_percent?: number;
}

export interface DealerReviewSummary {
  total: number;
  average: number;
  counts: Record<string, number>;
}

export interface Dealer {
  id: number;
  name: string;
  slug: string;
  status: 'active' | 'pending' | 'suspended';
  description?: string | null;
  logo_path?: string | null;
  cover_path?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: CityRef;
  working_hours?: Record<string, string> | null;
  facebook_username?: string | null;
  instagram_username?: string | null;
  tiktok_username?: string | null;
  whatsapp_phone?: string | null;
  verified: boolean;
  dealer_since?: string | null;
  rating_avg: number;
  rating_count: number;
  reviews_summary?: DealerReviewSummary;
  listings_count?: number;
  listings?: Listing[];
}

export interface DealerReview {
  id: number;
  dealer_id: number;
  rating: number;
  comment?: string | null;
  reply_text?: string | null;
  replied_at?: string | null;
  author?: { id?: number | null; name?: string | null };
  created_at: string;
}

export interface SellerProfile {
  seller: {
    id: number;
    name: string;
    type: string;
    member_since: string | null;
    listings_count: number;
  };
  listings: Listing[];
}

export interface FacetCount {
  value: string;
  count: number;
}

export interface SearchFacets {
  facets: Record<string, FacetCount[]>;
  ranges: Record<string, { min: number | null; max: number | null }>;
}

export interface HomePayload {
  stats?: { total: number; new_today: number };
  spotlight: Listing[];
  featured: Listing[];
  latest: Listing[];
  top_dealers: Dealer[];
  latest_dealers: Dealer[];
  makes: MakeRef[];
  featured_makes?: MakeRef[];
}
