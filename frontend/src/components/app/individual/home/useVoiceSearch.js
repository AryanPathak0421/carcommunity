import { useCallback, useEffect, useRef, useState } from 'react'

const SpeechRecognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

/**
 * Browser speech-to-text for a single search phrase. Calls `onResult` with the
 * final transcript; `supported` is false where the Web Speech API is missing.
 */
export function useVoiceSearch(onResult) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)
  const onResultRef = useRef(onResult)

  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  useEffect(() => () => recognitionRef.current?.abort(), [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const start = useCallback(() => {
    if (!SpeechRecognition) return
    if (recognitionRef.current && listening) {
      stop()
      return
    }
    setError('')
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = 'en-IN'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = (event) => {
      setListening(false)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Allow microphone access to search by voice')
      } else if (event.error === 'no-speech') {
        setError('Didn’t catch that — try again')
      }
    }
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0]?.transcript || '')
        .join(' ')
        .trim()
      if (transcript) onResultRef.current?.(transcript)
    }

    try {
      recognition.start()
    } catch {
      setListening(false)
    }
  }, [listening, stop])

  return { supported: Boolean(SpeechRecognition), listening, error, start, stop }
}
