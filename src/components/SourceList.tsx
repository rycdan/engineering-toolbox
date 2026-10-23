import { getSource } from '../data/sources'

export function SourceList({ ids }: { ids: readonly string[] }) {
  return (
    <ol className="source-list">
      {ids.map((id) => {
        const s = getSource(id)
        return (
          <li key={id}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.title}
            </a>
            <span className="source-meta">
              {' '}
              — {s.publisher}
              {s.edition ? `, ${s.edition}` : ''}. Used: {s.locator}. Retrieved {s.retrieved}.
            </span>
            {s.notes && <span className="source-note"> {s.notes}</span>}
          </li>
        )
      })}
    </ol>
  )
}
