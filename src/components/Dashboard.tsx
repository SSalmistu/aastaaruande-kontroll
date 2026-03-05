import { useState, useRef } from 'react'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import OpenAI from 'openai'
import { supabase } from '../lib/supabase'
import systemPrompt from '../prompts/system-prompt.txt?raw'

// pdfjs-dist worker setup for Vite
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
})

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent({})
    const pageText = textContent.items
      .map((item) => ('str' in item ? (item as { str: string }).str : ''))
      .join(' ')
    fullText += pageText + '\n'
  }
  return fullText.trim()
}

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    setMessage(null)
    setAnalysis(null)
    if (selected) {
      if (selected.type !== 'application/pdf') {
        setMessage({ type: 'error', text: 'Palun vali PDF-fail.' })
        setFile(null)
        return
      }
      setFile(selected)
    } else {
      setFile(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setLoading(true)
    setMessage(null)
    setAnalysis(null)

    try {
      const fileName = `${Date.now()}_${file.name}`
      const { error } = await supabase.storage
        .from('reports')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error

      setMessage({ type: 'success', text: 'Fail edukalt üles laaditud! Analüüsin...' })

      const pdfText = await extractTextFromPdf(file)
      if (!pdfText) {
        setMessage({ type: 'error', text: 'PDF-st ei õnnestunud teksti välja lugeda.' })
        return
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Aruande sisu (PDF-st välja loetud tekst):\n\n${pdfText}` },
        ],
      })

      const aiResponse = completion.choices[0]?.message?.content ?? null
      if (aiResponse) {
        setAnalysis(aiResponse)
      } else {
        setMessage({ type: 'error', text: 'AI ei saanud vastust.' })
      }

      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Viga üleslaadimisel või analüüsimisel.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800">Aastaaruande kontrollija</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Logi välja
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Laadi aruanne üles</h2>
          <p className="text-gray-600 text-sm mb-6">
            Vali PDF-fail ja laadi see üles kontrollimiseks.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
              >
                {loading ? 'Laen üles...' : 'Laadi üles'}
              </button>
            </div>

            {file && (
              <p className="text-sm text-gray-600">
                Valitud fail: <span className="font-medium">{file.name}</span>
              </p>
            )}

            {message && (
              <div
                className={`p-3 text-sm rounded-md ${
                  message.type === 'success'
                    ? 'text-green-700 bg-green-50'
                    : 'text-red-700 bg-red-50'
                }`}
              >
                {message.text}
              </div>
            )}
          </div>

          {analysis && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Analüüsi tulemus</h3>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm leading-relaxed">
                {analysis}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
