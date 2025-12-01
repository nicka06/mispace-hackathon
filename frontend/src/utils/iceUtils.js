// Shared ice visualization utilities

// Normalize raw concentration to [0, 100]
export function clampIce(concentration) {
  if (concentration === null || concentration === undefined || Number.isNaN(concentration)) {
    return null
  }
  return Math.max(0, Math.min(100, concentration))
}

// Decide if this cell should be visually treated as ice
// This MUST match the overlay + hover behavior exactly.
export function isVisibleIce(concentration) {
  const value = clampIce(concentration)
  if (value === null) return false

  // Threshold: anything below 1% is treated as visually "no ice"
  return value >= 1
}

// Convert concentration (0–100) to RGBA color used in the blue overlay
export function getIceColor(concentration) {
  const value = clampIce(concentration)
  if (value === null) return null

  if (!isVisibleIce(value)) {
    return null
  }

  const v = value / 100

  // Color gradient: light blue → dark blue
  const r = Math.floor(200 * (1 - v))
  const g = Math.floor(220 - 170 * v)
  const b = Math.floor(255 - 55 * v)
  const opacity = 0.4 + v * 0.6

  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}


