import { useEffect, useState } from 'react'

/**
 * Hash routing: "#/thermal?L=100&Lu=mm". Works on any static host (D-002).
 * `navigationKey` changes only on real navigations (hashchange), not when a
 * page rewrites its own query with replaceQuery(), so pages can remount
 * from a pasted link without resetting while the user types.
 */
export interface HashRoute {
  path: string
  query: URLSearchParams
  navigationKey: number
}

function parseHash(hash: string): Omit<HashRoute, 'navigationKey'> {
  const raw = hash.replace(/^#/, '')
  const [path = '', query = ''] = raw.split('?', 2)
  return { path: path === '' ? '/' : path, query: new URLSearchParams(query) }
}

export function useHashRoute(): HashRoute {
  const [route, setRoute] = useState<HashRoute>(() => ({ ...parseHash(window.location.hash), navigationKey: 0 }))
  useEffect(() => {
    const onChange = () => setRoute((prev) => ({ ...parseHash(window.location.hash), navigationKey: prev.navigationKey + 1 }))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

/** Rewrite the current page's query without adding history entries or remounting. */
export function replaceQuery(path: string, params: URLSearchParams): void {
  const query = params.toString()
  window.history.replaceState(window.history.state, '', `#${path}${query ? `?${query}` : ''}`)
}

/** Absolute URL for the current route, for copy-link and records. */
export function currentUrl(): string {
  return window.location.href
}
