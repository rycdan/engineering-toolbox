import type { Destination } from '../app/destinations'

const ROADMAP_URL = 'https://github.com/rycdan/engineering-toolbox/blob/main/docs/ROADMAP.md'

/** Scope-only placeholder: no inputs, no numbers (D-010). */
export function PlannedTool({ destination }: { destination: Destination }) {
  return (
    <section className="page" aria-labelledby="planned-title">
      <header className="page-header">
        <h1 id="planned-title">
          <span className="nav-number">{destination.number}</span> {destination.title}
        </h1>
        <span className="badge badge-planned">Planned · iteration {destination.iteration}</span>
      </header>
      <p className="lede">{destination.summary}</p>
      <div className="notice notice-info" role="note">
        <strong>Not yet available.</strong> This tool shows no calculations or reference values until its source
        data and methods are verified against benchmarks.
      </div>
      <h2>Planned scope</h2>
      <ul className="scope-list">
        {destination.plannedScope.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {destination.prerequisites.length > 0 && (
        <>
          <h2>Needed before values can be shown</h2>
          <ul className="scope-list">
            {destination.prerequisites.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
      <p>
        <a href={ROADMAP_URL} target="_blank" rel="noreferrer">
          Full roadmap
        </a>
      </p>
    </section>
  )
}
