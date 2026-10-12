import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { openBannerTarget } from './home/homeBooking.js'

export function IndividualHomeHeroCarousel({ banners = [], loading = false }) {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % banners.length)
    }, 5000)
    return () => window.clearInterval(id)
  }, [banners.length])

  if (loading) {
    return (
      <section className="mb-1 animate-pulse">
        <article className="lc-home-hero-slide bg-slate-200 !min-h-0 aspect-[3/1]" />
      </section>
    )
  }

  if (banners.length === 0) {
    return null
  }

  const target = String(banners[index]?.targetUrl || '').trim()
  const handleClick = target ? () => openBannerTarget(navigate, target) : undefined

  return (
    <section aria-label="Offers" className="mb-1">
      <article
        className={`lc-home-hero-slide !min-h-0 !bg-slate-100 aspect-[3/1] relative overflow-hidden rounded-[1.25rem] ${
          handleClick ? 'cursor-pointer' : ''
        }`}
        onClick={handleClick}
        role={handleClick ? 'link' : undefined}
      >
        {banners.map((b, i) => (
          <img
            key={b._id}
            src={b.imageUrl}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
            decoding="async"
            aria-hidden={i !== index}
          />
        ))}
      </article>

      {banners.length > 1 && (
        <div className="lc-home-hero-dots" role="tablist" aria-label="Promo slides">
          {banners.map((s, i) => (
            <button
              key={s._id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Slide ${i + 1}`}
              className="lc-home-hero-dot"
              data-active={i === index ? 'true' : 'false'}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
