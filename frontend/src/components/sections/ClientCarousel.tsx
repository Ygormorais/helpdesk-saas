import React, { useEffect, useMemo, useState } from 'react'
import clientData from '../../data/clients.json'

type Slide = {
  items: { name: string; color: string; logo?: string }[]
}

// Load client slides from external JSON
const slides: Slide[] = (clientData as { slides?: Slide[] }).slides ?? []

// Map logo identifiers to actual asset paths
const logos: Record<string, string> = {
  technova: '/assets/logos/technova.svg',
  vivalog: '/assets/logos/vivalog.svg',
  solaris: '/assets/logos/solaris.svg',
  nebula: '/assets/logos/nebula.svg',
  greenwave: '/assets/logos/greenwave.svg',
  aerosmart: '/assets/logos/aerosmart.svg',
  techbridge: '/assets/logos/techbridge.svg',
  cidadetech: '/assets/logos/cidadetech.svg',
  pulsesoft: '/assets/logos/pulsesoft.svg',
}

export const ClientCarousel: React.FC = () => {
  const [index, setIndex] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (slides.length <= 1) return
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, 2800)
    return () => clearInterval(t)
  }, [slides.length])

  const safeIndex = slides.length > 0 ? index % slides.length : 0
  const current = useMemo(() => slides[safeIndex], [safeIndex])

  if (!current || slides.length === 0) {
    return null
  }

  return (
    <section aria-label="Clientes" className="mt-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border bg-background/70 backdrop-blur-sm shadow-sm">
          <div className="px-6 py-5 text-center">
            <h3
              className={`text-xl sm:text-2xl font-semibold font-display ${
                mounted ? 'opacity-100' : 'opacity-0'
              } transition-opacity duration-700`}
            >
              Clientes que confiam
            </h3>
            <p
              className={`text-sm text-muted-foreground ${
                mounted ? 'opacity-100' : 'opacity-0'
              } transition-opacity duration-700`}
            >
              Marcas que usam o DeskFlow para atender melhor.
            </p>
          </div>

          <div className="px-6 pb-6">
            <div
              key={safeIndex}
              className={`flex flex-wrap items-center justify-center gap-x-10 gap-y-6 py-2 ${
                mounted ? 'opacity-100 translate-y-0 motion-safe:animate-rise' : 'opacity-0 translate-y-2'
              }`}
            >
              {current.items.map((c, i) => {
                const logoPath = c.logo ? logos[c.logo] : null
                return (
                  <div key={i} className="flex flex-col items-center">
                    {logoPath ? (
                      <img
                        src={logoPath}
                        alt={c.name}
                        loading="lazy"
                        decoding="async"
                        className="h-12 w-auto max-w-[120px] object-contain opacity-90"
                      />
                    ) : (
                      <div
                        className="h-12 w-12 rounded-2xl shadow-sm border"
                        style={{ background: c.color }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="mt-2 text-sm font-semibold text-foreground/80">{c.name}</span>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 flex justify-center gap-2" aria-label="Slides">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Ir para slide ${i + 1}`}
                  aria-current={i === safeIndex}
                  className={`h-2.5 w-6 rounded-full transition-colors ${
                    i === safeIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ClientCarousel
