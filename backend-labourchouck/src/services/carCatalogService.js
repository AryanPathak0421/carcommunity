import { CarMake, CarOptions } from '../models/CarCatalog.js'
import { slugify } from '../utils/slugify.js'

const DEFAULT_MAKES = {
  'Maruti Suzuki': ['Alto', 'Swift', 'Baleno', 'Dzire', 'WagonR', 'Ertiga', 'Brezza', 'Celerio', 'Ciaz', 'Grand Vitara'],
  Hyundai: ['i10', 'i20', 'Creta', 'Verna', 'Venue', 'Santro', 'Aura', 'Alcazar'],
  Tata: ['Nexon', 'Punch', 'Harrier', 'Safari', 'Tiago', 'Tigor', 'Altroz'],
  Mahindra: ['XUV300', 'XUV500', 'XUV700', 'Scorpio', 'Thar', 'Bolero', 'KUV100'],
  Honda: ['City', 'Amaze', 'Jazz', 'WR-V', 'Civic', 'Elevate'],
  Toyota: ['Innova Crysta', 'Fortuner', 'Glanza', 'Urban Cruiser', 'Etios', 'Camry'],
  Kia: ['Seltos', 'Sonet', 'Carens'],
  Renault: ['Kwid', 'Triber', 'Kiger', 'Duster'],
  Volkswagen: ['Polo', 'Vento', 'Virtus', 'Taigun'],
  Skoda: ['Rapid', 'Slavia', 'Kushaq', 'Octavia'],
  Ford: ['EcoSport', 'Figo', 'Endeavour', 'Aspire'],
  Nissan: ['Magnite', 'Kicks', 'Micra', 'Sunny'],
  MG: ['Hector', 'Astor', 'ZS EV'],
  Jeep: ['Compass', 'Meridian'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'GLA', 'GLC'],
  BMW: ['3 Series', '5 Series', 'X1', 'X3'],
  Audi: ['A4', 'A6', 'Q3', 'Q5'],
}

const DEFAULT_OPTIONS = {
  fuelTypes: [
    { value: 'PETROL', label: 'Petrol' },
    { value: 'DIESEL', label: 'Diesel' },
    { value: 'CNG', label: 'CNG' },
    { value: 'ELECTRIC', label: 'Electric' },
    { value: 'HYBRID', label: 'Hybrid' },
    { value: 'LPG', label: 'LPG' },
  ],
  transmissions: [
    { value: 'MANUAL', label: 'Manual' },
    { value: 'AUTOMATIC', label: 'Automatic' },
  ],
  cities: ['Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Indore', 'Bhopal'],
}

let seeding = null

/** First use only: give admins a sensible starting catalogue to edit. Never overwrites later edits. */
export async function ensureCarCatalog() {
  if (seeding) return seeding
  seeding = (async () => {
    if ((await CarMake.estimatedDocumentCount()) === 0) {
      const docs = Object.entries(DEFAULT_MAKES).map(([name, models], i) => ({
        name,
        slug: slugify(name),
        sortOrder: i,
        models: models.map((m) => ({ name: m, variants: [] })),
      }))
      try {
        await CarMake.insertMany(docs, { ordered: false })
      } catch {
        /* concurrent seed: unique slug protects us */
      }
    }
    await CarOptions.updateOne({ key: 'default' }, { $setOnInsert: { key: 'default', ...DEFAULT_OPTIONS } }, { upsert: true })
  })().finally(() => {
    seeding = null
  })
  return seeding
}

export async function getCarOptions() {
  await ensureCarCatalog()
  const doc = await CarOptions.findOne({ key: 'default' }).lean()
  return doc || { ...DEFAULT_OPTIONS, ownerOptions: [1, 2, 3, 4, 5], maxPhotos: 8 }
}

export async function getCarMakes({ includeInactive = false } = {}) {
  await ensureCarCatalog()
  return CarMake.find(includeInactive ? {} : { isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean()
}

/** Public shape consumed by the sell form and the browse filters. */
export async function getPublicCatalog() {
  const [makes, options] = await Promise.all([getCarMakes(), getCarOptions()])
  const active = (list) => list.filter((o) => o.isActive !== false).map(({ value, label }) => ({ value, label }))
  return {
    makes: makes.map((m) => ({ name: m.name, models: m.models.map((x) => ({ name: x.name, variants: x.variants || [] })) })),
    fuelTypes: active(options.fuelTypes),
    transmissions: active(options.transmissions),
    cities: options.cities,
    ownerOptions: options.ownerOptions,
    maxPhotos: options.maxPhotos,
  }
}
