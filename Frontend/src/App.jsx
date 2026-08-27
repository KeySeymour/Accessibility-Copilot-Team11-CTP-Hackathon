import { useMemo, useState } from 'react'
import Home from './pages/Home'
import Scan from './pages/Scan'
import Results from './pages/Results'
import './styles.css'

const sampleIssues = [
  { id: 'contrast', number: 1, title: 'Low contrast on primary action', severity: 'high', confidence: 96, summary: 'The call-to-action text does not have enough contrast against its background.', why: 'People with low vision or color-vision differences may struggle to read or find this action.', fix: 'Use a deeper text color or a lighter surface so the contrast reaches at least 4.5:1.', wcag: '1.4.3', category: 'Perceivable', before: '2.8:1 contrast', after: '6.1:1 contrast', x: 7, y: 56, width: 34, height: 11 },
  { id: 'target', number: 2, title: 'Interactive target is too small', severity: 'medium', confidence: 89, summary: 'This control gives people less space than the recommended 44 by 44 pixel target.', why: 'Small targets are difficult to activate for people with motor impairments and on touch screens.', fix: 'Increase the clickable area to at least 44 by 44 pixels while preserving the visual size.', wcag: '2.5.8', category: 'Operable', before: '32px target', after: '44px target', x: 74, y: 7, width: 8, height: 8 },
  { id: 'label', number: 3, title: 'Supporting copy is too faint', severity: 'medium', confidence: 84, summary: 'Secondary text fades into the page and may disappear for readers in bright conditions.', why: 'Clear supporting text helps people scan the interface and understand what happens next.', fix: 'Raise the text color from slate-400 to slate-600 for a more readable secondary level.', wcag: '1.4.3', category: 'Perceivable', before: '3.2:1 contrast', after: '5.4:1 contrast', x: 9, y: 28, width: 54, height: 7 },
]

function Header({ screen, onNavigate }) {
  return <header className="site-header"><button className="brand" onClick={() => onNavigate('home')}><span className="brand-mark">✦</span><span>Accessibility <b>Copilot</b></span></button><nav><button className={screen === 'home' ? 'active' : ''} onClick={() => onNavigate('home')}>Overview</button><span className="nav-divider" /><button onClick={() => onNavigate(screen === 'results' ? 'results' : 'scan')}>Fix Studio <span className="nav-dot" /></button></nav><button className="header-action" onClick={() => onNavigate('scan')}>New scan <span>+</span></button></header>
}

export default function App() {
  const [screen, setScreen] = useState('home')
  const [image, setImage] = useState(null)
  const issues = useMemo(() => sampleIssues, [])
  function handleFile(file) { setImage(URL.createObjectURL(file)); setScreen('results') }
  return <div className="app"><Header screen={screen} onNavigate={setScreen} />{screen === 'home' && <Home onStart={() => setScreen('scan')} />}{screen === 'scan' && <Scan onFile={handleFile} onBack={() => setScreen('home')} />}{screen === 'results' && <Results image={image} issues={issues} onBack={() => { setImage(null); setScreen('scan') }} />}</div>
}
