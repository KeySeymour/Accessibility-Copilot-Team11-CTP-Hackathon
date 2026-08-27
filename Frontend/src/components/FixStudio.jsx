import { useState } from 'react'
import BoundingBox from './BoundingBox'
import IssuePanel from './IssuePanel'
import BeforeAfter from './BeforeAfter'

export default function FixStudio({ image, issues, onBack }) {
  const [selectedId, setSelectedId] = useState(issues[0].id)
  const [fixed, setFixed] = useState(false)
  const issue = issues.find((item) => item.id === selectedId) || issues[0]

  return <main className="studio-shell">
    <div className="studio-head"><div><button className="back-button" onClick={onBack}>← New scan</button><p className="eyebrow">Analysis complete</p><h1>Fix Studio <span>/ review findings</span></h1></div><div className="score-summary"><span>Accessibility score</span><strong>{fixed ? 78 : 58}<small>/100</small></strong><i className={fixed ? 'score-up' : ''}>+{fixed ? 20 : 0} pts</i></div></div>
    <div className="studio-grid">
      <section className="screen-stage"><div className="stage-toolbar"><span><b className="live-dot" /> Uploaded screen</span><span>{issues.length} findings</span></div><div className="image-wrap">{image ? <img src={image} alt="Uploaded interface with accessibility findings" /> : <DemoInterface />}{issues.map((item) => <BoundingBox key={item.id} issue={item} active={item.id === issue.id} onSelect={setSelectedId} />)}</div><div className="stage-legend"><span><i className="legend-high" /> High impact</span><span><i className="legend-medium" /> Needs attention</span><span>Click a marker to inspect</span></div></section>
      <IssuePanel issue={issue} onFix={() => setFixed(true)} fixed={fixed} />
    </div>
    <section className="verification"><div className="verification-head"><div><p className="eyebrow">Candidate validation</p><h2>See the improvement</h2></div><span className="verified-pill">✓ Verified preview</span></div><BeforeAfter image={image} issue={issue} fixed={fixed} /></section>
  </main>
}

function DemoInterface() { return <div className="demo-interface"><div className="demo-nav"><b>FIELDNOTE</b><span>Workspaces</span><span>Reports</span><span>Team</span><i /></div><div className="demo-copy"><small>MONDAY, APRIL 22</small><h2>Make space<br />for good work.</h2><p>A calmer way to plan, share, and move ideas forward.</p><button>Explore workspace <span>→</span></button></div><div className="demo-card"><b>Weekly focus</b><span>Shape the next release</span><em>72%</em></div></div> }
