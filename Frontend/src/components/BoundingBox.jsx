export default function BoundingBox({ issue, active, onSelect }) {
  return (
    <button
      className={`bounding-box ${active ? 'active' : ''} severity-${issue.severity}`}
      style={{ left: `${issue.x}%`, top: `${issue.y}%`, width: `${issue.width}%`, height: `${issue.height}%` }}
      onClick={() => onSelect(issue.id)}
      aria-label={`View issue: ${issue.title}`}
    >
      <span>{issue.number}</span>
    </button>
  )
}
