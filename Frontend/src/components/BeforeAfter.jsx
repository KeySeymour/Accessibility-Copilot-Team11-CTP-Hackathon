export default function BeforeAfter({ image, issue, fixed }) {
  return (
    <div className="before-after">
      <div className="comparison-card">
        <div className="comparison-label"><span className="status-dot fail" /> Before</div>
        <div className="comparison-preview">
          {image ? <img src={image} alt="Original uploaded interface" /> : <MockScreen muted />}
          <span className="comparison-marker">{issue.number}</span>
        </div>
        <strong>{issue.before}</strong>
        <span className="comparison-caption">Current experience</span>
      </div>
      <div className="comparison-card after-card">
        <div className="comparison-label"><span className="status-dot pass" /> Suggested fix</div>
        <div className="comparison-preview fixed-preview">
          {image ? <img src={image} alt="Preview of the suggested accessible interface" /> : <MockScreen />}
          <span className="comparison-check">&#10003;</span>
        </div>
        <strong>{fixed ? issue.after : 'Preview ready'}</strong>
        <span className="comparison-caption">Candidate improvement</span>
      </div>
    </div>
  )
}

function MockScreen({ muted = false }) {
  return <div className={`mock-screen ${muted ? 'muted' : ''}`}><i /><b /><em /><span /><span /><span /></div>
}
