/**
 * Row shapes for the Supabase tables described in supabase/schema.sql.
 * Deliberately snake_case and un-mapped — the app's camelCase Listing/Cluster types are a
 * separate concern from what the database actually stores.
 *
 * ListingRow mirrors the live `listings` table: a near-verbatim, lowercased load of the
 * Snowflake CSV export. Several fields that look numeric/boolean are typed `string` here
 * because that's how the live table actually stores them — a mapping layer (not yet written)
 * will parse them the same way csv.ts already does for uploaded CSVs.
 */
export interface ListingRow {
  static_combined_property_id: string | null
  title: string | null
  property_type: string | null
  real_estate_type: string | null
  listing_type: string | null
  property_host_type: string | null
  state_name: string | null
  city_name: string | null
  postal_code_name: string | null
  airdna_market: string | null
  airdna_submarket: string | null
  latitude: number | null
  longitude: number | null
  display_exact_location: string | null
  location_type: string | null
  bedrooms: string | null
  bathrooms: string | null
  accommodates: number | null
  minimum_stay: string | null
  average_daily_rate_ltm: number | null
  cleaning_fee: string | null
  cleaning_fee_ltm: number | null
  revenue_ltm: number | null
  revenue_potential_ltm: number | null
  occupancy_rate_ltm: number | null
  active_listing_nights_ltm: number | null
  number_of_reservations_ltm: number | null
  reviews_count: string | null
  /** "True" / "False" as text, not an actual boolean, in the live table. */
  superhost: string | null
  vrbo_listing_url: string | null
  booking_listing_url: string | null
  rating_overall: string | null
  rating_communication: string | null
  rating_accuracy: string | null
  rating_cleanliness: string | null
  rating_checkin: string | null
  rating_location: string | null
  rating_value: string | null
  has_pool: boolean | null
  has_hottub: boolean | null
  has_aircon: boolean | null
  has_gym: boolean | null
  has_pets_allowed: boolean | null
  has_kitchen: boolean | null
  has_parking: boolean | null
  airbnb_listing_url: string | null
}

export interface StateProjectRow {
  state_name: string
  /** Cluster[] (see src/types/cluster.ts), stored as jsonb. */
  clusters: unknown
  revenue_threshold: number
  color_mode_id: string
  hidden_legend_entries: Record<string, string[]>
  filter_values: Record<string, unknown>
  map_style_id: string
  professional_host_types: string[] | null
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      listings: {
        Row: ListingRow
        Insert: ListingRow
        Update: Partial<ListingRow>
      }
      state_projects: {
        Row: StateProjectRow
        Insert: StateProjectRow
        Update: Partial<StateProjectRow>
      }
    }
  }
}
