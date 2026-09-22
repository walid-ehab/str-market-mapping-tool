/** Known PROPERTY_HOST_TYPE buckets, in their natural size order (not alphabetical — "21+" would sort before "6-20"). */
const CANONICAL_HOST_TYPE_ORDER = ['1 Unit', '2-5 Units', '6-20 Units', '21+ Units']

/** Host types counted as "professionally hosted" unless the user overrides it. */
export const DEFAULT_PROFESSIONAL_HOST_TYPES: string[] = ['6-20 Units', '21+ Units']

/** Sorts host-type values by their known bucket size; anything unrecognized falls to the end, alphabetically. */
export function sortHostTypes(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const ai = CANONICAL_HOST_TYPE_ORDER.indexOf(a)
    const bi = CANONICAL_HOST_TYPE_ORDER.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.localeCompare(b)
  })
}
