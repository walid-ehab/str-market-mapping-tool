import { formatCurrency, formatInteger, formatPercent } from '@/lib/format'
import type { ListingFeatureProperties } from './toGeoJson'

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c)
}

/** Builds the hover popup HTML, mirroring the reference notebook's hover_data fields. Escapes all listing-sourced text. */
export function buildPopupHtml(props: ListingFeatureProperties): string {
  const rows: [string, string][] = [
    ['Revenue (LTM Potential)', formatCurrency(props.revenue)],
    ['Avg Daily Rate', formatCurrency(props.adr)],
    ['Occupancy', formatPercent(props.occupancy)],
    ['Bedrooms', formatInteger(props.bedrooms)],
    ['Accommodates', formatInteger(props.accommodates)],
    ['City', `${props.cityName}, ${props.stateName}`],
    ['Professionally Hosted', props.isProfessionallyHosted ? 'Yes' : 'No'],
  ]

  const rowsHtml = rows
    .map(([label, value]) => `<div class="map-popup__row"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`)
    .join('')

  const safeUrl = isSafeHttpUrl(props.listingUrl) ? props.listingUrl : null
  const linkHtml = safeUrl
    ? `<a class="map-popup__link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">View Listing ↗</a>`
    : ''

  return `<div class="map-popup"><div class="map-popup__title">${escapeHtml(props.title)}</div>${rowsHtml}${linkHtml}</div>`
}

/** Only ever render http(s) links — CSV-sourced URLs could otherwise smuggle a javascript: scheme into the popup. */
function isSafeHttpUrl(value: string | null): value is string {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
