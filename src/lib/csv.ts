import Papa from 'papaparse'
import type { Listing } from '@/types/listing'

/** Columns the app cannot function without. Everything else degrades gracefully when missing. */
export const REQUIRED_COLUMNS = [
  'LATITUDE',
  'LONGITUDE',
  'BEDROOMS',
  'REVENUE_POTENTIAL_LTM',
  'PROPERTY_HOST_TYPE',
] as const

export class CsvValidationError extends Error {
  missingColumns: string[]

  constructor(missingColumns: string[]) {
    super(`CSV is missing required columns: ${missingColumns.join(', ')}`)
    this.name = 'CsvValidationError'
    this.missingColumns = missingColumns
  }
}

function toNumberOrNull(raw: string | undefined): number | null {
  if (raw === undefined || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function mergeListingUrl(row: Record<string, string>): string | null {
  return row.AIRBNB_LISTING_URL || row.VRBO_LISTING_URL || row.BOOKING_LISTING_URL || null
}

function rowToListing(row: Record<string, string>, index: number): Listing | null {
  const latitude = toNumberOrNull(row.LATITUDE)
  const longitude = toNumberOrNull(row.LONGITUDE)
  if (latitude === null || longitude === null) return null

  const propertyHostType = row.PROPERTY_HOST_TYPE ?? ''
  return {
    id: row.STATIC_COMBINED_PROPERTY_ID || `row-${index}`,
    title: row.TITLE || 'Untitled listing',
    propertyType: row.PROPERTY_TYPE || '',
    propertyHostType,
    isProfessionallyHosted: propertyHostType !== '' && propertyHostType !== '1 Unit',
    cityName: row.CITY_NAME || '',
    stateName: row.STATE_NAME || '',
    neighborhoodName: row.NEIGHBORHOOD_NAME || '',
    latitude,
    longitude,
    bedrooms: toNumberOrNull(row.BEDROOMS) ?? 0,
    bathrooms: toNumberOrNull(row.BATHROOMS) ?? 0,
    accommodates: toNumberOrNull(row.ACCOMMODATES) ?? 0,
    averageDailyRateLtm: toNumberOrNull(row.AVERAGE_DAILY_RATE_LTM),
    revenueLtm: toNumberOrNull(row.REVENUE_LTM),
    revenuePotentialLtm: toNumberOrNull(row.REVENUE_POTENTIAL_LTM),
    occupancyRateLtm: toNumberOrNull(row.OCCUPANCY_RATE_LTM),
    listingUrl: mergeListingUrl(row),
    superhost: (row.SUPERHOST || '').toUpperCase() === 'TRUE',
  }
}

export interface ParseCsvResult {
  listings: Listing[]
  totalRows: number
  skippedRows: number
}

/**
 * Parses an uploaded CSV into normalized Listings.
 *
 * Deliberately not using PapaParse's `worker: true` mode: it works by loading its own
 * script as a Worker, which breaks once bundled by Vite/Rollup (the worker can't find
 * itself) — reliably in production builds, and intermittently in dev. Parsing runs on the
 * main thread instead; PapaParse's tokenizer is fast enough that this is a brief pause
 * even for large files, not a frozen UI.
 */
export function parseListingsCsv(file: File): Promise<ParseCsvResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fields = results.meta.fields ?? []
        const missing = REQUIRED_COLUMNS.filter((c) => !fields.includes(c))
        if (missing.length > 0) {
          reject(new CsvValidationError(missing))
          return
        }

        const listings: Listing[] = []
        results.data.forEach((row, index) => {
          const listing = rowToListing(row, index)
          if (listing) listings.push(listing)
        })

        resolve({
          listings,
          totalRows: results.data.length,
          skippedRows: results.data.length - listings.length,
        })
      },
      error: (error: Error) => reject(error),
    })
  })
}
