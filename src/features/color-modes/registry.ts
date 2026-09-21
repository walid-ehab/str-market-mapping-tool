import { bedroomColorMode } from './bedroomMode'
import { revenueTierColorMode } from './revenueTierMode'
import type { ColorMode } from './types'

/** The full set of "color the map by X" modes. Add/remove a mode by editing this array only. */
export const colorModes: ColorMode[] = [revenueTierColorMode, bedroomColorMode]

export const defaultColorModeId: string = revenueTierColorMode.id

export function getColorMode(id: string): ColorMode {
  return colorModes.find((mode) => mode.id === id) ?? colorModes[0]
}
