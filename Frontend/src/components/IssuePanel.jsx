const severityLabel = { high: 'High impact', medium: 'Needs attention', low: 'Low impact' }

export default function IssuePanel({ issue, onFix, fixed }) {
  return (
    <aside className="issue-panel">
      <div className="panel-kicker"><span className={`severity-dot ${issue.severity}`} /> {severityLabel[issue.severity]} <span className="confidence">{issue.confidence}% confidence</span></div>
      <h2>{issue.title}</h2>
      <p className="issue-summary">{issue.summary}</p>
      <div className="detail-block"><h3>Why this matters</h3><p>{issue.why}</p></div>
      <div className="detail-block"><h3>Recommended fix</h3><div className="recommendation"><span className="spark">✦</span><p>{issue.fix}</p></div></div>
      <div className="wcag-row"><span>WCAG {issue.wcag}</span><span>{issue.category}</span></div>
      <button className={`fix-button ${fixed ? 'is-fixed' : ''}`} onClick={onFix}>{fixed ? 'Fix applied to preview' : 'Apply suggested fix'} <span>{fixed ? '✓' : '→'}</span></button>
    </aside>
  )
}
