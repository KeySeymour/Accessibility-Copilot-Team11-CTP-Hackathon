import { useRef, useState } from 'react'

export default function Upload({ onFile }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file) {
    if (file?.type?.startsWith('image/')) onFile(file)
  }

  return (
    <div
      className={`upload-zone ${dragging ? 'is-dragging' : ''}`}
      onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); handleFile(event.dataTransfer.files[0]) }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex="0"
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click() }}
    >
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => handleFile(event.target.files[0])} />
      <div className="upload-icon">+</div>
      <strong>Drop a screenshot here</strong>
      <span>or click to browse from your computer</span>
      <small>PNG, JPG, or WEBP up to 10 MB</small>
    </div>
  )
}
