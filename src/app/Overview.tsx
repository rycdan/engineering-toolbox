import { DESTINATIONS } from './destinations'

export function Overview() {
  return (
    <section className="page">
      <h1>Engineering Toolbox</h1>
      <p className="lede">
        Sourced reference data, transparent calculations, and visual guides for mechanical design, machining, and
        cryogenic engineering. Every result shows its method, source, and limitations. Results are reproducible from the
        inputs, calculation version, and dataset version.
      </p>
      <ul className="tool-grid">
        {DESTINATIONS.map((d) => (
          <li key={d.path} className="tool-card">
            <a href={`#${d.path}`}>
              <span className="tool-card-head">
                <span className="nav-number">{d.number}</span>
                <span className="tool-card-title">{d.title}</span>
              </span>
              <span className="tool-card-summary">{d.summary}</span>
              <span className={`badge ${d.status === 'available' ? 'badge-available' : 'badge-planned'}`}>
                {d.status === 'available' ? 'Available' : `Planned · iteration ${d.iteration}`}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <h2>How values are labeled</h2>
      <dl className="legend">
        <dt>Reference</dt>
        <dd>Transcribed from a cited source, with its condition, range, and retrieval date.</dd>
        <dt>Computed</dt>
        <dd>Calculated by this app from your inputs and a documented method.</dd>
        <dt>Manufacturer guidance</dt>
        <dd>A specific manufacturer’s instruction. Never substituted for a standard or a preset.</dd>
        <dt>Design preset</dt>
        <dd>A configurable rule, such as a CAD chamfer opening of 1.10 × screw OD. It is not a standard requirement.</dd>
      </dl>
    </section>
  )
}
