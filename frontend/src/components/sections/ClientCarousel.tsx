import React, { useEffect, useMemo, useState } from 'react'
import clientData from '../../data/clients.json'
import TechNovaLogo from '@/assets/logos/technova.svg'
import VivaLogLogo from '@/assets/logos/vivalog.svg'
import SolarisLogo from '@/assets/logos/solaris.svg'
import NebulaLogo from '@/assets/logos/nebula.svg'
import GreenWaveLogo from '@/assets/logos/greenwave.svg'
import AeroSmartLogo from '@/assets/logos/aerosmart.svg'
import TechBridgeLogo from '@/assets/logos/techbridge.svg'
import CidadeTechLogo from '@/assets/logos/cidadetech.svg'
import PulseSoftLogo from '@/assets/logos/pulsesoft.svg'

type Cliente = {
  name: string
  color: string
}

type Slide = {
  items: { name: string; color: string }[]
}

// Load client slides from external JSON
const slides: Slide[] = (clientData as { slides?: Slide[] }).slides ?? []

// Map logo identifiers to actual imported assets
const logos: Record<string, string> = {
  technova: TechNovaLogo,
  vivalog: VivaLogLogo,
  solaris: SolarisLogo,
  nebula: NebulaLogo,
  greenwave: GreenWaveLogo,
  aerosmart: AeroSmartLogo,
  techbridge: TechBridgeLogo,
  cidadetech: CidadeTechLogo,
  pulsesoft: PulseSoftLogo,
}

export const ClientCarousel: React.FC = () => {
  const [index, setIndex] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, 2500)
    return () => clearInterval(t)
  }, [])

  const current = useMemo(() => slides[index], [index])

  return (
    <section className="py-12 bg-gradient-to-b from-white/60 to-white/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-6">
        <h3 className={`text-2xl font-semibold ${mounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-700`}>Clientes que merecem</h3>
        <p className={`text-sm text-gray-600 ${mounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-700`}>O reconhecimento que mantém sua base de clientes satisfeita</p>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-center items-center space-x-8 overflow-hidden py-6">
          {current.items.map((c, i) => {
            const LogoSrc = logos[c.name ? (c.name.toLowerCase().replace(/\s+/g, '')).slice(0, 12) : ''] // placeholder, not used
            const logoKey = c as any
            // Prefer explicit logo field if available in JSON
            // If not, fallback to color circle
            const logoPath = (logos as any)[(c as any).logo]
            return (
              <div key={i} className="flex flex-col items-center">
                {logoPath ? (
                  <img src={logoPath} alt={c.name} className="w-20 h-20 object-contain" />
                ) : (
                  <div className="w-20 h-20 rounded-full shadow-md" style={{ background: c.color }} />
                )}
                <span className="mt-2 text-sm font-semibold text-gray-700">{c.name}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex justify-center mt-2 space-x-2">
        {slides.map((_, i) => (
          <span key={i} className={`h-2 w-4 rounded-full ${i === index ? 'bg-blue-600' : 'bg-gray-300'}`} />
        ))}
      </div>
    </section>
  )
}

export default ClientCarousel
