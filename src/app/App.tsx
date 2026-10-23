import { useEffect } from 'react'
import { DESTINATIONS, findDestination } from './destinations'
import { useHashRoute } from './hashRoute'
import { Overview } from './Overview'
import { PlannedTool } from '../components/PlannedTool'
import { ThermalPage } from '../features/thermal/ThermalPage'
import { DATASET_VERSION } from '../data/version'

export function App() {
  const route = useHashRoute()
  const destination = findDestination(route.path)

  useEffect(() => {
    document.title = destination ? `${destination.title} · Engineering Toolbox` : 'Engineering Toolbox'
  }, [destination])

  let page
  if (route.path === '/') {
    page = <Overview />
  } else if (destination?.path === '/thermal') {
    page = <ThermalPage key={route.navigationKey} query={route.query} />
  } else if (destination) {
    page = <PlannedTool destination={destination} />
  } else {
    page = (
      <section className="page">
        <h1>Page not found</h1>
        <p>
          No tool exists at <code>#{route.path}</code>. <a href="#/">Return to the overview.</a>
        </p>
      </section>
    )
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }}>
        Skip to content
      </a>
      <header className="topbar">
        <a className="brand" href="#/">
          Engineering Toolbox
        </a>
        <span className="topbar-meta">Dataset {DATASET_VERSION}</span>
      </header>
      <nav className="sidenav" aria-label="Tools">
        <ol>
          {DESTINATIONS.map((d) => (
            <li key={d.path}>
              <a href={`#${d.path}`} aria-current={d.path === route.path ? 'page' : undefined}>
                <span className="nav-number">{d.number}</span>
                <span className="nav-title">{d.title}</span>
                {d.status === 'planned' && <span className="badge badge-planned">Planned</span>}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <main id="main" tabIndex={-1}>
        {page}
      </main>
    </div>
  )
}
