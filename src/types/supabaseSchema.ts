/**
 * Row shapes for the Supabase tables defined in supabase/schema.sql.
 * Deliberately snake_case and un-mapped — the app's camelCase Listing/ProjectRecord
 * types are a separate concern from what the database actually stores.
 */

export interface ListingRow {
  id: string
  state_code: string
  title: string | null
  property_type: string | null
  property_host_type: string | null
  city_name: string | null
  neighborhood_name: string | null
  latitude: number
  longitude: number
  bedrooms: number | null
  bathrooms: number | null
  accommodates: number | null
  average_daily_rate_ltm: number | null
  revenue_ltm: number | null
  revenue_potential_ltm: number | null
  occupancy_rate_ltm: number | null
  listing_url: string | null
  superhost: boolean
  imported_at: string
}

export interface StateProjectRow {
  state_code: string
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
