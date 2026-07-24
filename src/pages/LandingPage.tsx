import { Hero } from '../components/Hero'
import { AboutSalon } from '../components/AboutSalon'
import { ServicesShowcase } from '../components/ServicesShowcase'
import { MastersStrip } from '../components/MastersStrip'
import { Atmosphere } from '../components/Atmosphere'
import { Footer } from '../components/Footer'

export function LandingPage() {
  return (
    <main className="page-enter page-shell">
      <div className="page-shell__main page-shell__main--top">
        <Hero />
        <AboutSalon />
        <ServicesShowcase />
        <MastersStrip />
        <Atmosphere />
      </div>
      <Footer />
    </main>
  )
}
