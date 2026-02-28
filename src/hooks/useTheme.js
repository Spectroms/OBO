import { useState, useEffect } from 'react'

const THEME_KEY = 'obo_theme'

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(THEME_KEY) || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '')
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const setTheme = (value) => {
    setThemeState(value === 'dark' ? 'dark' : 'light')
  }

  return [theme, setTheme]
}
