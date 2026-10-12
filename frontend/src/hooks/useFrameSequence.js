import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Loads an image sequence and draws it onto a canvas, one frame per scroll
 * position. Frames download progressively (coarse pass first) and only once
 * `active` turns true, so a sequence far below the fold costs nothing on load.
 *
 * @param {{ frameSrc: (i: number) => string, frameCount: number, active?: boolean }} options
 */
export function useFrameSequence({ frameSrc, frameCount, active = true }) {
  const canvasRef = useRef(null)
  const framesRef = useRef([])
  const lastDrawn = useRef(-1)
  const [loaded, setLoaded] = useState(0)

  useEffect(() => {
    if (!active || framesRef.current.length) return undefined
    let alive = true
    const imgs = new Array(frameCount)
    let done = 0

    // Coarse-to-fine order: every 8th frame first so scrubbing works almost
    // immediately, then the gaps get filled in.
    const order = []
    const seen = new Set()
    for (const step of [8, 4, 2, 1]) {
      for (let i = 0; i < frameCount; i += step) {
        if (!seen.has(i)) {
          seen.add(i)
          order.push(i)
        }
      }
    }

    order.forEach((i) => {
      const img = new Image()
      img.decoding = 'async'
      img.src = frameSrc(i)
      img.onload = () => {
        if (!alive) return
        done += 1
        if (done % 5 === 0 || done === frameCount) setLoaded(done)
      }
      imgs[i] = img
    })

    framesRef.current = imgs
    return () => {
      alive = false
    }
  }, [active, frameCount, frameSrc])

  /** Draw frame `idx`, falling back to the nearest already-decoded frame. */
  const draw = useCallback(
    (idx) => {
      const canvas = canvasRef.current
      const frames = framesRef.current
      if (!canvas || !frames.length) return
      const target = Math.max(0, Math.min(frameCount - 1, Math.round(idx)))

      let i = target
      let img = frames[i]
      const usable = (c) => c && c.complete && c.naturalWidth > 0
      for (let probe = 1; !usable(img) && probe < frameCount; probe += 1) {
        if (usable(frames[i - probe])) {
          img = frames[i - probe]
          i -= probe
          break
        }
        if (usable(frames[i + probe])) {
          img = frames[i + probe]
          i += probe
          break
        }
      }
      if (!usable(img) || lastDrawn.current === i) return

      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      lastDrawn.current = i
    },
    [frameCount],
  )

  return { canvasRef, draw, loaded, hasDrawn: () => lastDrawn.current >= 0 }
}

/**
 * True once `ref`'s element comes within `margin` of the viewport — used to
 * defer heavy frame downloads until the section is actually approaching.
 */
export function useNearViewport(ref, margin = '600px') {
  // Browsers without IntersectionObserver just load straight away.
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true)
          io.disconnect()
        }
      },
      { rootMargin: `${margin} 0px ${margin} 0px` },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, margin])

  return near
}
