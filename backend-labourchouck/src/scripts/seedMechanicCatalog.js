/**
 * Seeds the car & bike mechanic service catalog.
 *
 * Shape (same tree the app/admin already use):
 *   LabourCategoryGroup (optional grouping)
 *     - LabourCategory  (the top-level "group" in GET /labour-categories/grouped)
 *         - LabourSubcategory
 *             - LabourService (basePrice in INR)
 *
 * - Idempotent: everything is upserted by slug (groups, categories) or by
 *   (parent, name) (subcategories, services). Re-running never duplicates rows
 *   and never overwrites a price / active flag an admin changed later
 *   ($setOnInsert for basePrice, sortOrder, isActive).
 * - No Cloudinary or image files needed: imageUrl / iconUrl are left empty.
 * - Existing catalog data is NOT touched unless you pass:
 *     --reset           deactivate (isActive=false) every group / category /
 *                       subcategory / service that is not part of this seed
 *     --reset --purge   delete them instead of deactivating
 *
 * Usage: npm run seed:mechanic-catalog [-- --reset [--purge]]
 */
import '../config/env.js'
import mongoose from 'mongoose'
import { connectDb } from '../config/db.js'
import { LabourCategoryGroup, LABOUR_GROUP_KIND } from '../models/LabourCategoryGroup.js'
import { LabourCategory } from '../models/LabourCategory.js'
import { LabourSubcategory } from '../models/LabourSubcategory.js'
import { LabourService } from '../models/LabourService.js'
import { slugify } from '../utils/slugify.js'

const s = (name, basePrice, description = '', estimatedDurationMins = 60) => ({
  name,
  basePrice,
  description,
  estimatedDurationMins,
})

export const MECHANIC_CATALOG = [
  {
    group: { name: 'Car Services', description: 'Repair, service and care for your car.' },
    categories: [
      {
        name: 'Car Repair',
        subtitle: 'Engine, brakes, suspension, clutch and transmission',
        imageUrl: '/assets/images/car-repair.webp',
        subcategories: [
          {
            name: 'Engine',
            description: 'Engine diagnostics, tuning and repair.',
            services: [
              s('Engine Diagnostics & Scanning', 499, 'Computerised fault scan and inspection.', 45),
              s('Engine Tuning', 1499, 'Idle, fuel mixture and performance tuning.', 90),
              s('Engine Oil Leak Repair', 1299, 'Locate and fix oil leaks.', 120),
              s('Timing Belt Replacement', 2499, 'Timing belt replacement (labour).', 180),
            ],
          },
          {
            name: 'Brakes',
            description: 'Brake pads, discs and brake fluid.',
            services: [
              s('Brake Pad Replacement', 899, 'Front or rear brake pad replacement (labour).', 60),
              s('Brake Disc Replacement', 1799, 'Brake disc / rotor replacement (labour).', 90),
              s('Brake Fluid Change', 599, 'Brake fluid flush and refill.', 45),
            ],
          },
          {
            name: 'Suspension',
            description: 'Shock absorbers, bushes and bearings.',
            services: [
              s('Shock Absorber Replacement', 1999, 'Replace shock absorbers (labour, per axle).', 120),
              s('Suspension Bush Replacement', 1199, 'Replace worn suspension bushes.', 90),
              s('Wheel Bearing Replacement', 1499, 'Wheel bearing replacement (labour, per wheel).', 90),
            ],
          },
          {
            name: 'Clutch',
            description: 'Clutch plate, pressure plate and cable work.',
            services: [
              s('Clutch Plate Replacement', 3499, 'Clutch set replacement (labour).', 240),
              s('Clutch Adjustment', 499, 'Clutch cable / pedal free-play adjustment.', 30),
            ],
          },
          {
            name: 'Transmission',
            description: 'Gearbox service and repair.',
            services: [
              s('Gearbox Oil Change', 799, 'Transmission oil drain and refill.', 45),
              s('Gearbox Diagnosis & Repair', 1499, 'Inspection and minor gearbox repair.', 120),
            ],
          },
        ],
      },
      {
        name: 'Car AC & Electrical',
        subtitle: 'AC service, battery, alternator and lights',
        imageUrl: '/assets/images/car-ac-electrical.webp',
        subcategories: [
          {
            name: 'AC Service',
            description: 'Car air-conditioning service and repair.',
            services: [
              s('AC Gas Refill', 1499, 'Refrigerant top-up with leak check.', 60),
              s('AC General Service', 999, 'Cleaning, filter and cooling check.', 60),
              s('AC Compressor Repair', 3999, 'Compressor diagnosis and repair.', 180),
            ],
          },
          {
            name: 'Battery',
            description: 'Car battery testing and replacement.',
            iconUrl: '/assets/images/car-ac-electrical.webp',
            services: [
              s('Battery Replacement', 299, 'Battery fitting charge (battery cost extra).', 30),
              s('Battery Testing & Terminal Cleaning', 199, 'Health check and terminal cleaning.', 20),
            ],
          },
          {
            name: 'Alternator & Starter',
            description: 'Charging and starting system repair.',
            services: [
              s('Alternator Repair / Replacement', 1299, 'Alternator repair or replacement (labour).', 90),
              s('Starter Motor Repair', 1199, 'Starter motor repair or replacement (labour).', 90),
            ],
          },
          {
            name: 'Lights & Wiring',
            description: 'Headlights, indicators and wiring faults.',
            services: [
              s('Headlight / Bulb Replacement', 399, 'Headlight or bulb replacement (labour).', 30),
              s('Wiring Fault Diagnosis', 699, 'Trace and fix electrical faults.', 90),
            ],
          },
        ],
      },
      {
        name: 'Tyres & Wheels',
        subtitle: 'Puncture, alignment, balancing and replacement',
        imageUrl: '/assets/images/tyres-wheels.webp',
        subcategories: [
          {
            name: 'Puncture',
            description: 'Puncture repair at your location.',
            services: [
              s('Tubeless Puncture Repair', 150, 'Tubeless tyre puncture repair.', 20),
              s('Tube-type Puncture Repair', 100, 'Tube tyre puncture repair.', 20),
            ],
          },
          {
            name: 'Alignment & Balancing',
            description: 'Wheel alignment and balancing.',
            services: [
              s('Wheel Alignment', 699, 'Four-wheel alignment.', 60),
              s('Wheel Balancing', 499, 'Four-wheel balancing.', 45),
            ],
          },
          {
            name: 'Tyre Replacement',
            description: 'Tyre fitting and spare wheel change.',
            services: [
              s('Tyre Replacement', 299, 'Tyre fitting charge per tyre (tyre cost extra).', 30),
              s('Spare Wheel Fitting', 199, 'Swap in the spare wheel.', 20),
            ],
          },
        ],
      },
      {
        name: 'Denting & Painting',
        subtitle: 'Dent removal, painting and polish',
        subcategories: [
          {
            name: 'Dent Repair',
            description: 'Dent and bumper repair.',
            services: [
              s('Dent Removal (per panel)', 1499, 'Panel dent removal.', 180),
              s('Bumper Repair', 1999, 'Bumper crack / dent repair.', 180),
            ],
          },
          {
            name: 'Painting & Polish',
            description: 'Panel paint, scratch removal and polish.',
            services: [
              s('Panel Painting (per panel)', 2499, 'Panel repaint with colour match.', 240),
              s('Scratch Removal', 999, 'Scratch removal and touch-up.', 90),
              s('Full Car Polish', 3499, 'Complete exterior polish.', 240),
            ],
          },
        ],
      },
      {
        name: 'Periodic Service',
        subtitle: 'Oil change and general service',
        subcategories: [
          {
            name: 'Oil Change',
            description: 'Engine oil and filter change.',
            services: [s('Engine Oil & Filter Change', 899, 'Oil and oil filter change (oil cost extra).', 45)],
          },
          {
            name: 'General Service',
            description: 'Scheduled car servicing.',
            services: [
              s('Basic Car Service', 1999, 'Oil change, filter check and basic inspection.', 120),
              s('Comprehensive Car Service', 3999, 'Full service with multi-point inspection.', 240),
              s('Air Filter & Spark Plug Replacement', 599, 'Air filter and spark plug replacement (labour).', 45),
            ],
          },
        ],
      },
      {
        name: 'Car Wash & Detailing',
        subtitle: 'Doorstep wash, interior and exterior detailing',
        subcategories: [
          {
            // Packages are priced per car size. The customer car-wash screen groups services named
            // "<Package> - <Hatchback|Sedan|SUV>", so admins add a package by adding those services.
            name: 'Car Wash',
            description: 'Doorstep car wash packages for hatchbacks, sedans and SUVs.',
            services: [
              s('Exterior Wash - Hatchback', 299, 'Exterior hand wash, wheels and tyres cleaned, windows wiped.', 40),
              s('Exterior Wash - Sedan', 349, 'Exterior hand wash, wheels and tyres cleaned, windows wiped.', 45),
              s('Exterior Wash - SUV', 449, 'Exterior hand wash, wheels and tyres cleaned, windows wiped.', 55),
              s('Foam Wash - Hatchback', 449, 'Snow-foam pre-wash, exterior wash, tyre dressing, dashboard wipe.', 50),
              s('Foam Wash - Sedan', 549, 'Snow-foam pre-wash, exterior wash, tyre dressing, dashboard wipe.', 60),
              s('Foam Wash - SUV', 649, 'Snow-foam pre-wash, exterior wash, tyre dressing, dashboard wipe.', 70),
              s('Interior Cleaning - Hatchback', 449, 'Seats and mats vacuum, carpet clean, dashboard and door-pad polish.', 60),
              s('Interior Cleaning - Sedan', 549, 'Seats and mats vacuum, carpet clean, dashboard and door-pad polish.', 70),
              s('Interior Cleaning - SUV', 699, 'Seats and mats vacuum, carpet clean, dashboard and door-pad polish.', 80),
              s('Complete Wash - Hatchback', 699, 'Foam wash, full interior vacuum, dashboard polish, tyre dressing.', 80),
              s('Complete Wash - Sedan', 849, 'Foam wash, full interior vacuum, dashboard polish, tyre dressing.', 90),
              s('Complete Wash - SUV', 999, 'Foam wash, full interior vacuum, dashboard polish, tyre dressing.', 105),
              s('Premium Wash & Wax - Hatchback', 999, 'Complete wash with hand wax polish and tyre and trim dressing.', 110),
              s('Premium Wash & Wax - Sedan', 1199, 'Complete wash with hand wax polish and tyre and trim dressing.', 120),
              s('Premium Wash & Wax - SUV', 1449, 'Complete wash with hand wax polish and tyre and trim dressing.', 140),
            ],
          },
          {
            name: 'Detailing',
            description: 'Interior and exterior detailing.',
            services: [
              s('Interior Deep Cleaning', 1999, 'Seats, carpet, dashboard and roof deep clean.', 180),
              s('Exterior Detailing & Wax', 1499, 'Clay, polish and wax finish.', 150),
              s('Engine Bay Cleaning', 699, 'Engine bay degrease and dressing.', 45),
            ],
          },
        ],
      },
      {
        name: 'Car Coating',
        subtitle: 'Ceramic, PPF and Teflon coating for long-lasting shine',
        subcategories: [
          {
            name: 'Ceramic Coating',
            description: 'Hydrophobic ceramic coating for paint protection and gloss.',
            services: [
              s('Ceramic Coating - Hatchback', 9999, 'Full-body ceramic coating after paint prep (hatchback).', 360),
              s('Ceramic Coating - Sedan', 12999, 'Full-body ceramic coating after paint prep (sedan).', 420),
              s('Ceramic Coating - SUV', 15999, 'Full-body ceramic coating after paint prep (SUV).', 480),
            ],
          },
          {
            name: 'Graphene Coating',
            description: 'Graphene coating: higher hardness, heat resistance and long-lasting gloss.',
            services: [
              s('Graphene Coating - Hatchback', 14999, 'Full-body graphene coating after paint prep (hatchback).', 420),
              s('Graphene Coating - Sedan', 17999, 'Full-body graphene coating after paint prep (sedan).', 480),
              s('Graphene Coating - SUV', 21999, 'Full-body graphene coating after paint prep (SUV).', 540),
            ],
          },
          {
            name: 'PPF Coating',
            description: 'Paint Protection Film against stone chips, scratches and fading.',
            services: [
              s('PPF - Front Bumper & Bonnet', 14999, 'Paint protection film on bonnet, bumper and fenders.', 300),
              s('PPF - Full Body', 59999, 'Full-body paint protection film installation.', 1200),
            ],
          },
          {
            name: 'Teflon Coating',
            description: 'Teflon (PTFE) coating for gloss and easy cleaning.',
            services: [
              s('Teflon Coating - Hatchback', 3499, 'Teflon paint protection coating (hatchback).', 180),
              s('Teflon Coating - Sedan / SUV', 4499, 'Teflon paint protection coating (sedan / SUV).', 210),
            ],
          },
        ],
      },
    ],
  },
  {
    group: { name: 'Bike Services', description: 'Service and repair for your motorcycle or scooter.' },
    categories: [
      {
        name: 'Bike Mechanic',
        subtitle: 'Service, puncture, chain, clutch and battery',
        subcategories: [
          {
            name: 'Bike Service',
            description: 'Periodic bike servicing.',
            iconUrl: '/assets/images/bike-service.webp',
            services: [
              s('Basic Bike Service', 499, 'Basic service and check-up.', 60),
              s('Full Bike Service', 899, 'Full service with wash and tune-up.', 120),
              s('Bike Oil Change', 349, 'Engine oil change (oil cost extra).', 30),
            ],
          },
          {
            name: 'Bike Puncture & Tyres',
            description: 'Puncture repair and tyre change.',
            iconUrl: '/assets/images/bike-puncture-tyres.webp',
            services: [
              s('Bike Puncture Repair', 80, 'Tube or tubeless puncture repair.', 20),
              s('Bike Tyre Replacement', 199, 'Tyre fitting charge (tyre cost extra).', 30),
            ],
          },
          {
            name: 'Chain & Clutch',
            description: 'Chain, sprocket and clutch work.',
            services: [
              s('Chain Cleaning & Lubrication', 149, 'Chain clean, lube and tension.', 20),
              s('Chain Sprocket Kit Replacement', 599, 'Chain sprocket kit replacement (labour).', 60),
              s('Bike Clutch Plate Replacement', 799, 'Clutch plate replacement (labour).', 90),
            ],
          },
          {
            name: 'Bike Brakes',
            description: 'Brake pad and shoe replacement.',
            iconUrl: '/assets/images/bike-brakes.webp',
            services: [s('Bike Brake Pad / Shoe Replacement', 299, 'Brake pad or shoe replacement (labour).', 30)],
          },
          {
            name: 'Bike Battery & Electrical',
            description: 'Battery, starter and lights.',
            iconUrl: '/assets/images/bike-battery-electrical.png',
            services: [
              s('Bike Battery Replacement', 199, 'Battery fitting charge (battery cost extra).', 20),
              s('Bike Starter Repair', 499, 'Self-start / starter motor repair.', 60),
              s('Headlight / Indicator Repair', 249, 'Headlight or indicator repair.', 30),
            ],
          },
        ],
      },
    ],
  },
  {
    group: { name: 'Roadside Assistance', description: 'Help when you are stuck on the road.' },
    categories: [
      {
        name: 'Roadside Assistance',
        subtitle: 'Jump start, towing, fuel delivery and lockout',
        imageUrl: '/assets/images/roadside-assistance.webp',
        subcategories: [
          {
            name: 'Jump Start',
            description: 'Dead battery jump start.',
            services: [s('Battery Jump Start', 299, 'On-the-spot jump start.', 30)],
          },
          {
            name: 'Towing',
            description: 'Vehicle towing.',
            services: [
              s('Car Towing (up to 10 km)', 999, 'Flatbed or hook towing for cars.', 60),
              s('Bike Towing (up to 10 km)', 599, 'Towing for two-wheelers.', 60),
            ],
          },
          {
            name: 'Fuel Delivery',
            description: 'Emergency fuel at your location.',
            services: [s('Emergency Fuel Delivery (up to 5 L)', 349, 'Service charge (fuel cost extra).', 30)],
          },
          {
            name: 'Lockout & Flat Tyre',
            description: 'Locked keys and flat tyre help.',
            services: [
              s('Car Lockout Assistance', 599, 'Unlock a car with keys locked inside.', 45),
              s('Flat Tyre Assistance', 249, 'Change a flat tyre with your spare.', 30),
            ],
          },
        ],
      },
    ],
  },
]

async function run() {
  const reset = process.argv.includes('--reset')
  const purge = process.argv.includes('--purge')
  await connectDb()

  const keepGroupSlugs = []
  const keepCategoryIds = []
  const keepSubcategoryIds = []
  const keepServiceIds = []
  const counts = { groups: 0, categories: 0, subcategories: 0, services: 0, created: 0 }

  let groupSort = 10
  let catSort = 10
  for (const g of MECHANIC_CATALOG) {
    const groupSlug = slugify(g.group.name)
    keepGroupSlugs.push(groupSlug)
    const groupDoc = await LabourCategoryGroup.findOneAndUpdate(
      { slug: groupSlug },
      {
        $set: { name: g.group.name, description: g.group.description || '', kind: LABOUR_GROUP_KIND.TRADE },
        $setOnInsert: { slug: groupSlug, sortOrder: groupSort, isActive: true, helperText: '', imageUrl: '' },
      },
      { upsert: true, new: true },
    )
    groupSort += 10
    counts.groups += 1

    for (const c of g.categories) {
      const catSlug = slugify(c.name)
      const existingCat = await LabourCategory.findOne({ slug: catSlug }).select('_id').lean()
      const catDoc = await LabourCategory.findOneAndUpdate(
        { slug: catSlug },
        {
          $set: { name: c.name, subtitle: c.subtitle || '', group: groupDoc._id },
          $setOnInsert: { slug: catSlug, sortOrder: catSort, isActive: true, imageUrl: c.imageUrl || '' },
        },
        { upsert: true, new: true },
      )
      if (!existingCat) counts.created += 1
      catSort += 10
      counts.categories += 1
      keepCategoryIds.push(catDoc._id)

      for (const sc of c.subcategories) {
        const existingSub = await LabourSubcategory.findOne({ categoryId: catDoc._id, name: sc.name })
          .select('_id')
          .lean()
        const subDoc = await LabourSubcategory.findOneAndUpdate(
          { categoryId: catDoc._id, name: sc.name },
          {
            $set: { description: sc.description || '' },
            $setOnInsert: { categoryId: catDoc._id, name: sc.name, isActive: true, iconUrl: sc.iconUrl || '' },
          },
          { upsert: true, new: true },
        )
        if (!existingSub) counts.created += 1
        counts.subcategories += 1
        keepSubcategoryIds.push(subDoc._id)

        for (const sv of sc.services) {
          const existingSvc = await LabourService.findOne({ subcategoryId: subDoc._id, name: sv.name })
            .select('_id')
            .lean()
          const svcDoc = await LabourService.findOneAndUpdate(
            { subcategoryId: subDoc._id, name: sv.name },
            {
              $set: { description: sv.description || '' },
              $setOnInsert: {
                subcategoryId: subDoc._id,
                name: sv.name,
                basePrice: sv.basePrice,
                estimatedDurationMins: sv.estimatedDurationMins || 60,
                isActive: true,
              },
            },
            { upsert: true, new: true },
          )
          if (!existingSvc) counts.created += 1
          counts.services += 1
          keepServiceIds.push(svcDoc._id)
        }
      }
    }
  }

  console.log(
    `[seed:mechanic-catalog] groups ${counts.groups}, categories ${counts.categories}, ` +
      `subcategories ${counts.subcategories}, services ${counts.services} (new rows this run: ${counts.created})`,
  )

  if (reset) {
    const notKeptGroup = { slug: { $nin: keepGroupSlugs } }
    const notKeptCat = { _id: { $nin: keepCategoryIds } }
    const notKeptSub = { _id: { $nin: keepSubcategoryIds } }
    const notKeptSvc = { _id: { $nin: keepServiceIds } }
    if (purge) {
      const r = await Promise.all([
        LabourService.deleteMany(notKeptSvc),
        LabourSubcategory.deleteMany(notKeptSub),
        LabourCategory.deleteMany(notKeptCat),
        LabourCategoryGroup.deleteMany(notKeptGroup),
      ])
      console.log(
        `[seed:mechanic-catalog] --reset --purge: deleted services ${r[0].deletedCount}, ` +
          `subcategories ${r[1].deletedCount}, categories ${r[2].deletedCount}, groups ${r[3].deletedCount}`,
      )
    } else {
      const off = { $set: { isActive: false } }
      const r = await Promise.all([
        LabourService.updateMany({ ...notKeptSvc, isActive: true }, off),
        LabourSubcategory.updateMany({ ...notKeptSub, isActive: true }, off),
        LabourCategory.updateMany({ ...notKeptCat, isActive: true }, off),
        LabourCategoryGroup.updateMany({ ...notKeptGroup, isActive: true }, off),
      ])
      console.log(
        `[seed:mechanic-catalog] --reset: deactivated services ${r[0].modifiedCount}, ` +
          `subcategories ${r[1].modifiedCount}, categories ${r[2].modifiedCount}, groups ${r[3].modifiedCount}`,
      )
    }
  } else {
    console.log('[seed:mechanic-catalog] existing catalog left untouched (pass --reset to deactivate old entries)')
  }
}

run()
  .catch((err) => {
    console.error('[seed:mechanic-catalog] failed:', err)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
