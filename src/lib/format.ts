/** Formats a dollar amount in thousands, e.g. 93000 -> "93K". No currency symbol, keeps map popups MathJax-safe. */
export function formatK(value: number): string {
  return `${Math.round(value / 1000).toLocaleString('en-US')}K`
}

export function formatCurrency(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—'
  return `$${Math.round(value).toLocaleString('en-US')}`
}

export function formatPercent(value: number | null, fractionDigits = 1): string {
  if (value === null || Number.isNaN(value)) return '—'
  return `${(value * 100).toFixed(fractionDigits)}%`
}

export function formatInteger(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—'
  return Math.round(value).toLocaleString('en-US')
}
