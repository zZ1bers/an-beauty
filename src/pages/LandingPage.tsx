import { Hero } from '../components/Hero'
import { AboutSalon } from '../components/AboutSalon'
import { VisitRitual } from '../components/VisitRitual'
import { ServicesShowcase } from '../components/ServicesShowcase'
import { MastersStrip } from '../components/MastersStrip'
import { StudioSpace } from '../components/StudioSpace'
import { GuestVoices } from '../components/GuestVoices'
import { Atmosphere } from '../components/Atmosphere'
import { Footer } from '../components/Footer'

export function LandingPage() {
  return (
    <main className="page-enter page-shell">
      <div className="page-shell__main page-shell__main--top">
        <Hero />
        <AboutSalon />
        <VisitRitual />
        <ServicesShowcase />
        <MastersStrip />
        <StudioSpace />
        <GuestVoices />
        <Atmosphere />
      </div>
      <Footer />
    </main>
  )
}
