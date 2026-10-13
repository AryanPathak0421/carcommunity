/**
 * Source of truth for the Terms of Service and Privacy Policy shown on the website
 * (/terms, /privacy) and inside the app. Each section's `content` is a list of
 * blocks: a string is a paragraph, an array of strings is a bullet list.
 *
 * NOTE: draft prepared from the company details supplied by the business. It should be
 * reviewed by qualified legal counsel before it is relied on.
 */

export const COMPANY = {
  brand: 'CarCommunity',
  legalName: 'Virat Regal Group Private Limited',
  cin: 'U78200UP2026PTC248313',
  roc: 'Registrar of Companies, Uttar Pradesh',
  address: ['Tower No. CV-2, Office No. 201,', 'Supertech Capetown, Sector 74,', 'Noida, Uttar Pradesh – 201301, India'],
  supportEmail: 'Viratregalgroup.official@gmail.com',
  grievanceEmail: 'grievance@carcommunity.com',
  privacyEmail: 'privacy@carcommunity.com',
  /** Fill in to publish the Grievance Officer's name (it is hidden while empty). */
  grievanceOfficerName: '',
}

export const LAST_UPDATED = '2 October 2026'

const GRIEVANCE_SECTION = {
  id: 'grievance',
  title: 'Grievance redressal',
  content: [
    'In line with the Information Technology Act, 2000, the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and the Digital Personal Data Protection Act, 2023, you can send any complaint, notice or grievance to our Grievance Officer. We acknowledge complaints within 24 hours and aim to resolve them within 15 days, or sooner where the law requires.',
    'For requests about your personal data — access, correction, deletion or withdrawing consent — write to our privacy contact.',
  ],
}

export const TERMS = {
  kind: 'terms',
  title: 'Terms & Conditions',
  subtitle: 'The rules for using CarCommunity as a customer or a mechanic.',
  intro:
    'Please read these Terms carefully. By creating an account, ticking the acceptance box, or using CarCommunity, you agree to be bound by them.',
  sections: [
    {
      id: 'about',
      title: 'About CarCommunity and these Terms',
      content: [
        'CarCommunity is a technology platform and brand operated by Virat Regal Group Private Limited (“Company”, “we”, “our” or “us”). It is available through our mobile app and website (together, the “Platform”).',
        'These Terms are a binding agreement between you and the Company. They apply together with our Privacy Policy and any booking, cancellation, fee or subscription rules shown to you in the Platform.',
        'If you do not agree with these Terms, please do not use the Platform.',
      ],
    },
    {
      id: 'eligibility',
      title: 'Who can use CarCommunity',
      content: [
        'You must be at least 18 years old and legally able to enter into a contract under the Indian Contract Act, 1872. If you use CarCommunity on behalf of a business, you confirm that you are authorised to bind that business.',
        'There are two kinds of accounts:',
        [
          'Customer — a person who books a mechanic for their car or bike.',
          'Mechanic — a skilled car or bike mechanic who receives job requests.',
        ],
        'You must give accurate and complete information, keep your mobile number and device secure, never share your OTP with anyone, and tell us if you suspect unauthorised use. You are responsible for all activity on your account.',
      ],
    },
    {
      id: 'role',
      title: 'What CarCommunity does — and does not do',
      content: [
        'CarCommunity is an intermediary. We connect customers with independent car and bike mechanics. We do not ourselves perform the repair or service work unless we clearly say so.',
        'Mechanics are independent. They are not our employees, agents or partners. A service is a contract between the customer and the mechanic.',
        'We try to show accurate profiles, prices and availability and we verify mechanics in the ways described in the Platform. Verification is not a guarantee or a background check. We cannot promise the availability, quality, timing or price of any service or part, and prices shown are indicative.',
      ],
    },
    {
      id: 'bookings',
      title: 'Booking services',
      content: [
        'You can book a mechanic instantly (we match an available mechanic near you) or schedule a date and time. A booking is confirmed once a mechanic accepts it or you receive confirmation in the Platform.',
        [
          'Give accurate vehicle and job details, address and contact information, and be present or reachable at the time of service.',
          'The price is made up of the service charge, a platform fee and applicable taxes. The final amount can change if the scope of work, time or spare parts change — any change should be agreed through the Platform.',
          'You may cancel or reschedule as allowed by the rules shown in the Platform. Charges can apply once a mechanic has been assigned or has travelled to you.',
          'Do not ask mechanics to do anything unlawful or unsafe, and provide a safe place to work.',
          'Report any problem through in-app support as soon as possible, ideally within 24 hours of the job.',
        ],
      ],
    },
    {
      id: 'payments',
      title: 'Payments, wallet, subscriptions and taxes',
      content: [
        'Online payments are processed by third-party payment partners such as Razorpay. We do not store your full card, UPI PIN or net-banking credentials.',
        [
          'Wallet: wallet balance can be used only on the Platform. It is not a bank account and does not earn interest. Refunds are made as described in the Platform or as the law requires.',
          'Subscriptions: a plan gives you the benefits and period shown when you buy it. Plan fees are not refundable unless the plan says so or the law requires it.',
          'Refunds: when a refund is due, it is returned to the original payment method or your wallet, usually within 5–7 business days after approval, subject to your bank or payment partner.',
          'Taxes: GST and other taxes apply as per law, and invoices are provided where required.',
          'Failed or duplicate payments: if money is deducted but a booking does not go through, it is returned automatically or on request.',
        ],
      ],
    },
    {
      id: 'mechanics',
      title: 'Terms for mechanics',
      content: [
        'If you join as a mechanic, you also agree that:',
        [
          'You are legally allowed to work in India and the identity, skill and bank/UPI details you give us are true. We may verify them, and may reject or suspend profiles that fail verification.',
          'You work as an independent professional and are responsible for your own taxes, tools and spare parts you supply. Our platform fee or commission is deducted as shown in the Platform, and earnings are paid out as per the settlement schedule.',
          'If you collect cash from a customer, you must follow the in-app cash settlement rules.',
          'You will arrive on time, behave respectfully, follow safety rules, and work only when fit and sober. Child labour is strictly prohibited.',
          'For jobs introduced through CarCommunity, you will not move the payment outside the Platform to avoid fees.',
          'Where job start/finish or tracking is used, it may record your time and location.',
        ],
      ],
    },
    {
      id: 'conduct',
      title: 'Acceptable use',
      content: [
        'You agree not to:',
        [
          'give false information, impersonate someone or create fake accounts, bookings or reviews;',
          'harass, abuse, threaten or discriminate against anyone;',
          'request, offer or carry out unlawful or unsafe work;',
          'misuse referral codes, offers or wallet credits, or try to defraud the Platform or other users;',
          'share, sell or ask for another person’s OTP or login;',
          'scrape, copy, reverse-engineer, disrupt or attempt to break into the Platform;',
          'upload malware, or content that is unlawful, obscene or infringes someone’s rights;',
          'collect or misuse other users’ personal data.',
        ],
      ],
    },
    {
      id: 'referrals',
      title: 'Referrals, rewards and offers',
      content: [
        'Referral rewards, discounts and offers shown in the Platform are subject to their stated conditions. We can change or withdraw them at any time, and we may cancel rewards obtained through misuse or fraud.',
      ],
    },
    {
      id: 'content',
      title: 'Ratings, reviews and your content',
      content: [
        'You own the content you submit (reviews, photos, documents). You give us a non-exclusive, royalty-free licence to host, display and use it to run, secure and improve the Platform. You confirm you have the right to submit it. We may remove content that breaks these Terms or the law.',
      ],
    },
    {
      id: 'ip',
      title: 'Intellectual property',
      content: [
        'The CarCommunity name, logo, app, designs and software belong to the Company or its licensors. We give you a limited, personal, non-transferable licence to use the Platform as permitted by these Terms. You may not copy or use our brand or software for any other purpose without written permission.',
      ],
    },
    {
      id: 'third-party',
      title: 'Third-party services',
      content: [
        'The Platform uses third-party services such as payments, SMS, push notifications, maps and cloud hosting. Their own terms and privacy policies apply to the parts they provide, and we are not responsible for their acts or outages.',
      ],
    },
    {
      id: 'suspension',
      title: 'Suspension and termination',
      content: [
        'We may suspend or end your access if you break these Terms, create risk or harm for others, are involved in fraud, or where the law requires. You can stop using CarCommunity and ask us to delete your account at any time by writing to our privacy contact. Rights and duties that by nature should continue — such as payment dues and liability — remain after termination.',
      ],
    },
    {
      id: 'liability',
      title: 'Disclaimers and limitation of liability',
      content: [
        'The Platform is provided “as is” and “as available”. To the extent the law allows, we do not give any warranty about it, and we are not liable for the acts, omissions, work or products of mechanics or other users, or for indirect, incidental or consequential loss.',
        'Our total liability to you for any claim relating to a booking is limited to the fees paid to the Company for that booking. Nothing in these Terms limits liability that cannot be limited under law, or your rights as a consumer.',
        'You agree to compensate the Company for losses arising from your breach of these Terms or misuse of the Platform.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes to the Platform and these Terms',
      content: [
        'We may modify, suspend or discontinue any feature or service of the Platform in line with applicable law. We may update these Terms from time to time and will show the new “Last updated” date and, for important changes, notify you in the Platform. Continuing to use CarCommunity after a change means you accept the updated Terms.',
      ],
    },
    {
      id: 'law',
      title: 'Governing law and disputes',
      content: [
        'These Terms are governed by the laws of India. Please first contact us so that we can try to resolve a dispute. If it is not resolved, the courts at Noida (Gautam Buddh Nagar), Uttar Pradesh have jurisdiction, without affecting any right you have to approach a consumer forum where you live.',
      ],
    },
    GRIEVANCE_SECTION,
  ],
}

export const PRIVACY = {
  kind: 'privacy',
  title: 'Privacy Policy',
  subtitle: 'What personal data CarCommunity collects, why, and the choices you have.',
  intro:
    'We respect your privacy. This policy explains how Virat Regal Group Private Limited handles personal data when you use CarCommunity.',
  sections: [
    {
      id: 'who',
      title: 'Who we are and what this covers',
      content: [
        'Virat Regal Group Private Limited (“Company”, “we”, “our”, “us”) operates CarCommunity and is the data fiduciary for personal data processed through our app and website (the “Platform”) under the Digital Personal Data Protection Act, 2023.',
        'This policy applies to customers, mechanics and visitors. Please read it together with our Terms & Conditions.',
      ],
    },
    {
      id: 'collect',
      title: 'Personal data we collect',
      content: [
        [
          'Account details — name, mobile number, email (if you give one), role, profile photo and language. Your mobile number is verified with an OTP sent by SMS.',
          'Addresses and location — saved and job addresses, and your device location when you allow it. For mechanics, live location while a job is active or you are online.',
          'Booking and service data — the service you choose, vehicle details, date and time, address, notes, status, ratings and reviews.',
          'Payment data — transaction references, amounts, status and wallet activity. Payments are handled by our payment partner, and we do not store full card numbers, UPI PINs or CVV. Mechanics may give bank or UPI details for payouts.',
          'Mechanic verification (KYC) — government ID details or documents, photo or selfie, skills and experience, and earnings.',
          'Device and usage data — device model, operating system, app version, IP address, crash and log data, screens viewed, and the token used to send push notifications.',
          'Content you upload — photos and documents you attach.',
          'Referral and support data — referral codes, complaints and messages you send to support.',
        ],
      ],
    },
    {
      id: 'use',
      title: 'How we use your data',
      content: [
        [
          'To create your account and verify you.',
          'To match, confirm, track and complete bookings, and to share the details the other side needs.',
          'To process payments, settlements, wallet entries, refunds and invoices.',
          'To verify mechanics, keep the Platform safe and prevent fraud and misuse.',
          'To send service messages by SMS, push notification and in-app, such as OTPs, booking updates and receipts. We send promotional messages only where you have agreed or the law allows.',
          'To provide support and resolve complaints and disputes.',
          'To run referral rewards and offers.',
          'To understand usage, fix problems and improve and personalise the Platform.',
          'To comply with legal obligations.',
        ],
      ],
    },
    {
      id: 'consent',
      title: 'Consent and legal basis',
      content: [
        'We process your personal data with your consent — for example when you create an account, accept our Terms, or allow location access. You can withdraw consent at any time (see “Your rights”); this may stop some features from working.',
        'Where the law permits, we also process data for certain legitimate uses, such as complying with legal obligations, responding to emergencies, and preventing fraud.',
      ],
    },
    {
      id: 'share',
      title: 'Who we share data with',
      content: [
        'We do not sell your personal data. We share it only as needed:',
        [
          'With the other party to a booking — a customer sees the assigned mechanic’s name, photo, rating and contact details, and a mechanic sees the customer’s name, job location and job details.',
          'With service providers who work for us under agreements, such as payment (Razorpay), SMS delivery, push notifications (Google Firebase), media storage (Cloudinary), cloud database and hosting providers, and mapping or location services.',
          'With government authorities, courts or regulators when the law requires it, or to protect rights, safety and security.',
          'With a buyer or successor if the business is reorganised, merged or sold, subject to this policy.',
        ],
      ],
    },
    {
      id: 'location',
      title: 'Location',
      content: [
        'We use your location only with your permission — to find mechanics near you and show tracking. You can turn location off in your device settings, but instant matching and tracking may then not work.',
      ],
    },
    {
      id: 'cookies',
      title: 'Cookies and local storage',
      content: [
        'Our website and app use cookies or local storage that are needed to keep you signed in and remember choices such as your role and location. They are not used to sell your data.',
      ],
    },
    {
      id: 'retention',
      title: 'How long we keep data',
      content: [
        'We keep personal data for as long as your account is active and as needed for the purposes above. Financial and transaction records are kept for the periods required by tax and company laws. When data is no longer needed, we delete or anonymise it, unless the law requires us to keep it.',
      ],
    },
    {
      id: 'security',
      title: 'Security',
      content: [
        'We use reasonable safeguards such as encrypted connections, access controls and secure handling of credentials. No system is completely secure, so we cannot guarantee absolute security. If a personal data breach occurs, we will act and inform you and the authorities as the law requires.',
      ],
    },
    {
      id: 'rights',
      title: 'Your rights',
      content: [
        'Under the Digital Personal Data Protection Act, 2023 you can:',
        [
          'ask for a summary of the personal data we hold about you and how it is used;',
          'ask us to correct, complete or update your data — many details can be edited in your profile;',
          'ask us to erase your data and delete your account;',
          'withdraw your consent at any time;',
          'nominate another person to exercise your rights if you die or cannot do so;',
          'make a complaint about how your data is handled.',
        ],
        'To use these rights, write to the privacy contact below. We may ask you to verify your identity first, and will respond within the time the law requires.',
      ],
    },
    {
      id: 'children',
      title: 'Children',
      content: [
        'CarCommunity is meant for people aged 18 and over. We do not knowingly collect personal data from children. If you think a child has given us data, contact us and we will delete it.',
      ],
    },
    {
      id: 'transfers',
      title: 'Where data is stored',
      content: [
        'Your data is stored on servers and with providers that may be located in or outside India. We use providers that give appropriate safeguards and follow the transfer rules of applicable law.',
      ],
    },
    {
      id: 'links',
      title: 'Third-party links',
      content: [
        'The Platform may link to services we do not control. Their privacy practices are their own, so please read their policies.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      content: [
        'We may update this policy from time to time. The “Last updated” date will change, and we will notify you in the Platform about important changes.',
      ],
    },
    GRIEVANCE_SECTION,
  ],
}

export const LEGAL_DOCS = { terms: TERMS, privacy: PRIVACY }
