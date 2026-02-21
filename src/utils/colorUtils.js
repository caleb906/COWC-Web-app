/**
 * Color utilities — all gradients and derived tints are driven by the PRIMARY color only.
 * The other 4 colors in the palette are used for backgrounds, cards, and accents,
 * but they never pollute the main gradient.
 */

/** Convert a #rrggbb hex string to { h (0-360), s (0-100), l (0-100) } */
export function hexToHsl(hex) {
  if (!hex || typeof hex !== 'string') return { h: 28, s: 45, l: 63 }

  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/**
 * Generate a beautiful monochromatic gradient driven solely by the primary color.
 * Creates three stops: deep-dark → mid-dark → primary.
 * Works for any hue — warm, cool, neutral.
 *
 * direction defaults to '160deg' (diagonally down-right)
 */
export function primaryGradient(primaryHex, direction = '160deg') {
  if (!primaryHex) {
    return `linear-gradient(${direction}, #1a1814, #2d2520, #d4a574)`
  }

  const { h, s, l } = hexToHsl(primaryHex)

  // For very light primaries (l > 70) we need to darken a LOT to get a readable header.
  // For dark primaries (l < 40) we need a more subtle range.
  const darkL  = Math.max(6,  l - 58)   // very deep dark stop
  const midL   = Math.max(18, l - 38)   // mid-tone stop
  // Saturate slightly when darkened so it feels rich, not muddy
  const darkS  = Math.min(65, Math.max(s, s + 12))
  const midS   = Math.min(55, Math.max(s, s + 6))

  const stop1 = `hsl(${h}, ${darkS}%, ${darkL}%)`
  const stop2 = `hsl(${h}, ${midS}%, ${midL}%)`
  const stop3 = primaryHex

  return `linear-gradient(${direction}, ${stop1} 0%, ${stop2} 50%, ${stop3} 100%)`
}

/**
 * Returns a very subtle tint of the primary color suitable for page backgrounds.
 * Always stays in the 94–97% lightness range — barely there.
 */
export function primaryPageBg(primaryHex) {
  if (!primaryHex) return '#faf9f7'
  const { h, s } = hexToHsl(primaryHex)
  return `hsl(${h}, ${Math.max(12, Math.round(s * 0.4))}%, 96%)`
}

/**
 * Returns a card background color — slightly warmer than pure white, tinted by primary.
 */
export function primaryCardBg(primaryHex) {
  if (!primaryHex) return '#ffffff'
  const { h, s } = hexToHsl(primaryHex)
  return `hsl(${h}, ${Math.max(8, Math.round(s * 0.25))}%, 99%)`
}

/**
 * Returns a button/accent color.
 * If the primary is very light (unsuitable for a button label in white text),
 * automatically darkens to a readable mid-tone.
 */
export function primaryAccent(primaryHex) {
  if (!primaryHex) return '#d4a574'
  const { h, s, l } = hexToHsl(primaryHex)
  if (l > 72) {
    // Primary is too light — return a rich mid-tone from the same hue
    return `hsl(${h}, ${Math.min(65, s + 20)}%, 38%)`
  }
  return primaryHex
}

/**
 * Returns primary color with opacity for overlays / borders.
 * @param {string} primaryHex
 * @param {number} opacity  0–1
 */
export function primaryAlpha(primaryHex, opacity = 0.2) {
  if (!primaryHex) return `rgba(212, 165, 116, ${opacity})`
  const clean = (primaryHex || '').replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) || 0
  const g = parseInt(clean.slice(2, 4), 16) || 0
  const b = parseInt(clean.slice(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/**
 * Decide whether text on a given background should be white or dark.
 * Returns 'white' or '#1a1814'.
 */
export function contrastColor(backgroundHex) {
  if (!backgroundHex) return 'white'
  const { l } = hexToHsl(backgroundHex)
  return l < 55 ? 'white' : '#1a1814'
}
