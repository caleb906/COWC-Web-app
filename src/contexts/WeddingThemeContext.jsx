import { createContext, useContext, useState } from 'react'

// Default COWC brand theme
export const defaultTheme = {
  primary:   '#d4a574',
  secondary: '#2d3748',
  accent:    '#faf9f7',
  color4:    '#f0e6d3',
  color5:    '#ffffff',
  vibe: null,
  inspiration_photos: [],
  pinterest_boards: [],
}

const WeddingThemeContext = createContext()

export function WeddingThemeProvider({ children }) {
  const [theme, setThemeState] = useState(defaultTheme)
  const [currentWeddingId, setCurrentWeddingId] = useState(null)

  // Called by WeddingDetailPageFull after loading a wedding
  const setWeddingTheme = (weddingIdOrTheme) => {
    // Support legacy call with just an ID (no-op — theme must come from the API)
    if (typeof weddingIdOrTheme === 'string') {
      setCurrentWeddingId(weddingIdOrTheme)
      return
    }
    // Preferred: pass the full theme object from the wedding record
    if (weddingIdOrTheme && typeof weddingIdOrTheme === 'object') {
      setThemeState({
        primary:   weddingIdOrTheme.primary   || defaultTheme.primary,
        secondary: weddingIdOrTheme.secondary || defaultTheme.secondary,
        accent:    weddingIdOrTheme.accent    || defaultTheme.accent,
        color4:    weddingIdOrTheme.color4    || defaultTheme.color4,
        color5:    weddingIdOrTheme.color5    || defaultTheme.color5,
        vibe:      weddingIdOrTheme.vibe      || null,
        inspiration_photos: weddingIdOrTheme.inspiration_photos || [],
        pinterest_boards:   weddingIdOrTheme.pinterest_boards   || [],
      })
    }
  }

  const resetTheme = () => {
    setCurrentWeddingId(null)
    setThemeState(defaultTheme)
  }

  return (
    <WeddingThemeContext.Provider value={{ theme, setWeddingTheme, resetTheme, currentWeddingId }}>
      {children}
    </WeddingThemeContext.Provider>
  )
}

export function useWeddingTheme() {
  const context = useContext(WeddingThemeContext)
  if (!context) throw new Error('useWeddingTheme must be used within WeddingThemeProvider')
  return context
}
