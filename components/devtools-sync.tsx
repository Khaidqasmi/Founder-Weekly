'use client'

import { useEffect } from 'react'

const THEME_KEY = 'fw-theme'

// Phrases to remove from the N preferences panel
const BLOCKED_SECTIONS = ['Disable Dev Tools', 'Hide Dev Tools for this session']

export function DevToolsSync() {
  useEffect(() => {
    // On mount, restore saved theme immediately before anything renders
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')

    function applyTheme(dark: boolean) {
      if (dark) {
        document.documentElement.classList.add('dark')
        localStorage.setItem(THEME_KEY, 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem(THEME_KEY, 'light')
      }
    }

    function cleanPanel(shadowRoot: ShadowRoot) {
      const walker = document.createTreeWalker(shadowRoot, NodeFilter.SHOW_TEXT)
      let node: Text | null
      while ((node = walker.nextNode() as Text | null)) {
        const text = node.textContent ?? ''
        if (BLOCKED_SECTIONS.some((phrase) => text.includes(phrase))) {
          let el: HTMLElement | null = node.parentElement
          while (el && !el.classList.contains('preference-section')) {
            el = el.parentElement
          }
          if (el) el.remove()
        }
      }
    }

    // Run every 150ms — aggressively removes sections before user can click them
    const interval = setInterval(() => {
      const portal = document.querySelector('nextjs-portal') as HTMLElement | null
      if (!portal) return
      // Sync theme from portal class
      applyTheme(portal.classList.contains('dark'))
      // Remove blocked sections
      if (portal.shadowRoot) cleanPanel(portal.shadowRoot)
    }, 150)

    // Also watch portal class for immediate theme response
    let themeObserver: MutationObserver | null = null
    const observerSetup = setInterval(() => {
      const portal = document.querySelector('nextjs-portal') as HTMLElement | null
      if (!portal) return
      clearInterval(observerSetup)
      themeObserver = new MutationObserver(() => {
        applyTheme(portal.classList.contains('dark'))
      })
      themeObserver.observe(portal, { attributes: true, attributeFilter: ['class'] })
    }, 300)

    return () => {
      clearInterval(interval)
      clearInterval(observerSetup)
      themeObserver?.disconnect()
    }
  }, [])

  return null
}
