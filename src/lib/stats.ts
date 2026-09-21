export function average(values: number[]): number | null {
  if (values.length === 0) return null
  let sum = 0
  for (const v of values) sum += v
  return sum / values.length
}

export function shareOf(part: number, total: number): number | null {
  return total > 0 ? part / total : null
}
