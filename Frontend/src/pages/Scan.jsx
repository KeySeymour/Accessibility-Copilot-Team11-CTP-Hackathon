import Upload from '../components/Upload'

export default function Scan({ onFile, onBack }) {
  return <main className="scan-page"><button className="back-button" onClick={onBack}>← Back home</button><div className="scan-content"><p className="eyebrow">Step 01 / upload</p><h1>Bring a screen<br /><span>into focus.</span></h1><p className="scan-copy">Upload a screenshot of your product and we will map the moments that could work better for everyone.</p><Upload onFile={onFile} /><div className="scan-note"><span>◌</span><p><strong>Your work stays yours.</strong><br />Screenshots are used only for this analysis.</p></div></div></main>
}
