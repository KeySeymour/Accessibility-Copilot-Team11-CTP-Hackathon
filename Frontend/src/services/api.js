const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function analyzeScreenshot(file) {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(`${API_URL}/analysis`, { method: 'POST', body: form })
  if (!response.ok) throw new Error('Analysis failed')
  return response.json()
}
