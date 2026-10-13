/** Marketing copy & structured content for the CarCommunity landing page */

export const SITE = {
  name: 'CarCommunity',
  tagline: 'Book a trusted car or bike mechanic in minutes',
  url: 'https://carcommunity.com',
  contactEmail: 'hello@carcommunity.com',
  phone: '+91 98765 43210',
}

export const trustBadges = [
  { id: 'verified', label: 'Verified Mechanics', icon: 'shield' },
  { id: 'booking', label: 'Instant Booking', icon: 'zap' },
  { id: 'pay', label: 'Safe Payments', icon: 'wallet' },
  { id: 'aadhaar', label: 'Aadhaar Verified', icon: 'fingerprint' },
]

export const howItWorksUsers = [
  {
    step: 1,
    title: 'Choose your service',
    description: 'Pick a car or bike service: general service, repair, battery, tyres or a quick check-up.',
    icon: 'layers',
  },
  {
    step: 2,
    title: 'Set location & time',
    description: 'Share where your vehicle is, choose a slot, and add any notes for the mechanic.',
    icon: 'map-pin',
  },
  {
    step: 3,
    title: 'Confirm booking',
    description: 'Review the estimate upfront and confirm. A nearby verified mechanic accepts your job.',
    icon: 'check-circle',
  },
  {
    step: 4,
    title: 'Mechanic arrives',
    description: 'Track your mechanic on the way and share the start OTP when they arrive.',
    icon: 'truck',
  },
]

export const howItWorksMechanics = [
  {
    step: 1,
    title: 'Register profile',
    description: 'Create your free profile with your skills, experience and preferred service radius.',
    icon: 'user-plus',
  },
  {
    step: 2,
    title: 'Upload Aadhaar / KYC',
    description: 'Complete quick verification to unlock more jobs and build customer trust.',
    icon: 'id-card',
  },
  {
    step: 3,
    title: 'Receive nearby jobs',
    description: 'Get matched to car and bike owners around you and accept the jobs you want.',
    icon: 'bell',
  },
  {
    step: 4,
    title: 'Get paid securely',
    description: 'Finish the job with an OTP and receive payouts with clear earnings records.',
    icon: 'banknote',
  },
]

/** Fallback list shown if the live catalogue has not loaded yet. */
export const services = [
  {
    id: 'car-service',
    title: 'Car General Service',
    description: 'Periodic servicing, oil and filter change, and a complete health check for your car.',
    priceFrom: 1200,
    availability: 'Same day',
    icon: 'hammer',
  },
  {
    id: 'bike-service',
    title: 'Bike General Service',
    description: 'Engine oil, chain, brakes and full tune-up for two-wheelers.',
    priceFrom: 450,
    availability: 'Same day',
    icon: 'hammer',
  },
  {
    id: 'battery',
    title: 'Battery & Jump Start',
    description: 'Battery testing, jump start and replacement at your location.',
    priceFrom: 300,
    availability: 'High demand',
    icon: 'zap',
  },
  {
    id: 'brakes',
    title: 'Brake Repair',
    description: 'Brake pad, disc and fluid checks and replacement for cars and bikes.',
    priceFrom: 500,
    availability: 'Available',
    icon: 'shield-check',
  },
  {
    id: 'tyres',
    title: 'Tyre & Puncture',
    description: 'Puncture repair, tyre change, balancing and alignment support.',
    priceFrom: 150,
    availability: 'Available',
    icon: 'truck',
  },
  {
    id: 'ac',
    title: 'Car AC Repair',
    description: 'AC gas refill, cooling check and compressor diagnostics.',
    priceFrom: 900,
    availability: 'Book ahead',
    icon: 'droplets',
  },
]

export const features = [
  {
    title: 'Aadhaar Verified Mechanics',
    description: 'KYC-backed profiles so you know exactly who is working on your vehicle.',
    icon: 'fingerprint',
  },
  {
    title: 'Live Tracking',
    description: 'Know when your mechanic is on the way and when they arrive.',
    icon: 'map-pinned',
  },
  {
    title: 'Instant Booking',
    description: 'From urgent breakdowns to planned servicing, book a slot without endless calls.',
    icon: 'calendar-clock',
  },
  {
    title: 'Transparent Pricing',
    description: 'See starting rates and estimates before you confirm.',
    icon: 'indian-rupee',
  },
  {
    title: 'Emergency Help',
    description: 'Priority matching for breakdowns, flat batteries and roadside issues.',
    icon: 'siren',
  },
  {
    title: 'Cars & Bikes',
    description: 'Specialists for hatchbacks, sedans, SUVs, scooters and motorcycles.',
    icon: 'users',
  },
  {
    title: 'Multi-language Support',
    description: 'Hindi, English and more, so mechanics and customers stay aligned.',
    icon: 'languages',
  },
  {
    title: 'Ratings & Reviews',
    description: 'Post-job feedback builds reputation for mechanics and trust for customers.',
    icon: 'star',
  },
  {
    title: 'Secure Payments',
    description: 'Digital payments with clear job records and dispute assistance.',
    icon: 'shield-check',
  },
  {
    title: '24/7 Support',
    description: 'Round-the-clock help for payments, rescheduling and safety escalations.',
    icon: 'headphones',
  },
]

export const stats = [
  { label: 'Verified mechanics on platform', value: 12500, suffix: '+' },
  { label: 'Cities covered', value: 38, suffix: '+' },
  { label: 'Jobs completed', value: 240000, suffix: '+' },
  { label: 'Happy vehicle owners', value: 49000, suffix: '+' },
]

export const testimonials = [
  {
    name: 'Ananya Sharma',
    role: 'Car owner, Gurugram',
    quote:
      'My car needed a service before a long trip. Booking on CarCommunity took minutes and the mechanic showed up on time with everything needed.',
    rating: 5,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya',
  },
  {
    name: 'Rahul Kulkarni',
    role: 'Bike owner, Pune',
    quote:
      'Transparent rates and verified mechanics. The OTP start and finish gave me confidence that the work was done properly.',
    rating: 5,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul',
  },
  {
    name: 'Imran Sheikh',
    role: 'Mechanic, Hyderabad',
    quote:
      'Digital payments mean less cash handling. I get steady jobs from customers nearby and can plan my day.',
    rating: 4,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Imran',
  },
  {
    name: 'Lakshmi Devi',
    role: 'Scooter owner, Bengaluru',
    quote:
      'My scooter broke down near home. A mechanic reached within the hour and the payment was simple and clear.',
    rating: 5,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lakshmi',
  },
]

export const faqs = [
  {
    q: 'How do I book a mechanic?',
    a: 'Choose your service, share your vehicle location, pick a date and slot, and confirm. You will see starting rates before you pay.',
  },
  {
    q: 'Are mechanics verified?',
    a: 'Yes. Mechanic profiles include Aadhaar-linked KYC, skill tags and ratings from past jobs.',
  },
  {
    q: 'What payment methods are supported?',
    a: 'UPI, popular cards and net banking where enabled, plus wallet balance and cash on completion where available.',
  },
  {
    q: 'Can I get help urgently?',
    a: 'Book an instant slot and nearby mechanics are alerted right away. Availability depends on your city, and we show a realistic ETA before confirmation.',
  },
  {
    q: 'How do mechanics register?',
    a: 'Download the app, create a profile, upload Aadhaar/KYC and choose your skills and work radius. Once verified, you will start receiving nearby job alerts.',
  },
  {
    q: 'What if the mechanic does not show up?',
    a: 'Report it in-app. Our support team helps with a replacement and, where applicable, refunds or credits per policy.',
  },
]

export const footerLinks = {
  product: [
    { label: 'Book a Mechanic', href: '#labour' },
    { label: 'Become a Mechanic', href: '#ecosystem' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'FAQ', href: '#faq' },
  ],
  company: [
    { label: 'About', href: '#ecosystem' },
    { label: 'Careers', href: '#footer' },
    { label: 'Press', href: '#footer' },
  ],
  legal: [
    { label: 'Terms', href: '/terms' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Grievance', href: '/privacy#grievance' },
  ],
}
