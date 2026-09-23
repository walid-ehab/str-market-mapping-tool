/**
 * Loop-based min/max instead of Math.min(...values) — spreading a large array into a
 * function call can blow the call stack once a dataset gets into the hundreds of thousands
 * of rows, which this app is expected to handle.
 */
export function minMax(values: number[]): { min: number; max: number } | null {
  if (values.length === 0) return null
  let min = values[0]
  let max = values[0]
  for (let i = 1; i < values.length; i++) {
    const v = values[i]
    if (v < min) min = v
    if (v > max) max = v
  }
  return { min, max }
}

/** Linear-interpolation quantile, matching numpy/pandas' default 'linear' method. `sortedValues` must already be sorted ascending. */
export function quantile(sortedValues: number[], q: number): number {
  if (sortedValues.length === 0) return 0
  const pos = (sortedValues.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  const next = sortedValues[base + 1]
  return next === undefined ? sortedValues[base] : sortedValues[base] + rest * (next - sortedValues[base])
}
