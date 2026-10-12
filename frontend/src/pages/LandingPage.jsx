import { useEffect, useMemo, useState } from 'react'
import { AppShowcaseSequence } from '../components/landing/AppShowcaseSequence'
import { EcosystemSection } from '../components/landing/EcosystemSection'
import { FAQSection } from '../components/landing/FAQSection'
import { FeaturesSection } from '../components/landing/FeaturesSection'
import { FinalCTA } from '../components/landing/FinalCTA'
import { Footer } from '../components/landing/Footer'
import { Hero } from '../components/landing/Hero'
import { HowItWorks } from '../components/landing/HowItWorks'
import { LabourCategoriesSection } from '../components/landing/LabourCategoriesSection'
import { Navbar } from '../components/landing/Navbar'
import { ScrollProgress } from '../components/landing/ScrollProgress'
import { SEOMeta } from '../components/landing/SEOMeta'
import { StatsSection } from '../components/landing/StatsSection'
import { TestimonialsSection } from '../components/landing/TestimonialsSection'
import { PageSkeleton } from '../components/ui/PageSkeleton'
import { useLandingData } from '../hooks/useLandingData.js'
import { captureReferralCodeFromUrl } from '../lib/referralCapture.js'

export function LandingPage() {
  const [boot, setBoot] = useState(true)
  const { loading, groups } = useLandingData()

  useEffect(() => {
    const t = window.setTimeout(() => setBoot(false), 700)
    return () => window.clearTimeout(t)
  }, [])

  // Refer & Earn links land here as /?ref=CODE. Park the code so it survives
  // the walk to the signup screen.
  useEffect(() => {
    captureReferralCodeFromUrl()
  }, [])

  const catalogueStats = useMemo(
    () => ({
      groups: groups.length,
      services: groups.reduce((a, g) => a + g.serviceCount, 0),
    }),
    [groups],
  )

  return (
    <>
      <SEOMeta />
      <PageSkeleton visible={boot} />
      <ScrollProgress />
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main-content">
        <Hero groups={groups} stats={catalogueStats} />
        <EcosystemSection groups={groups} />
        <LabourCategoriesSection groups={groups} loading={loading} />
        <AppShowcaseSequence />
        <HowItWorks />
        <FeaturesSection />
        <StatsSection />
        <TestimonialsSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
