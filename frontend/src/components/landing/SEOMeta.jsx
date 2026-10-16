import { Helmet } from 'react-helmet-async'
import { SITE } from '../../data/landingContent'

const description =
  'Book Aadhaar-verified car and bike mechanics in minutes: instant booking, transparent pricing, and secure digital payments across Indian cities. Register as a mechanic to get nearby jobs.'

const schema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE.name,
  url: SITE.url,
  description,
  logo: `${SITE.url}/icon-512.png`,
  sameAs: [
    'https://www.linkedin.com/company/carcommunity',
    'https://twitter.com/carcommunity',
    'https://www.instagram.com/carcommunity',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: SITE.phone,
    contactType: 'customer support',
    areaServed: 'IN',
    availableLanguage: ['English', 'Hindi'],
  },
}

const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: `${SITE.name} On-demand Car & Bike Mechanics`,
  provider: { '@type': 'Organization', name: SITE.name, url: SITE.url },
  areaServed: { '@type': 'Country', name: 'India' },
  serviceType: 'Car and bike mechanic booking',
  description,
}

export function SEOMeta() {
  return (
    <Helmet>
      <html lang="en" />
      <title>CarCommunity — Book a Trusted Car & Bike Mechanic in Minutes</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={SITE.url} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:title" content="CarCommunity — Book a Trusted Car & Bike Mechanic in Minutes" />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={SITE.url} />
      <meta property="og:image" content={`${SITE.url}/og-carcommunity.png`} />
      <meta property="og:locale" content="en_IN" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="CarCommunity — Verified car & bike mechanics, on demand" />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${SITE.url}/og-carcommunity.png`} />

      <script type="application/ld+json">{JSON.stringify(schema)}</script>
      <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
    </Helmet>
  )
}
