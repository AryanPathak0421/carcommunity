import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ImagePlus, Loader2, X } from 'lucide-react'
import { carsApi, uploadCarPhoto } from '../../../api/carsApi.js'
import { useAuth } from '../../../hooks/useAuth.js'
import { CarImage } from './CarsMarketplacePage.jsx'

const OTHER = '__other__'

const EMPTY = {
  title: '', make: '', model: '', variant: '', year: '', fuelType: '', transmission: '',
  kmDriven: '', owners: '1', price: '', negotiable: true, city: '', locationText: '', description: '',
}

const inputCls =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20'

function Field({ label, hint, children }) {
  return (
    <label className="block text-xs font-bold text-slate-600">
      {label} {hint ? <span className="font-medium text-slate-400">({hint})</span> : null}
      {children}
    </label>
  )
}

export function SellCarPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const location = useLocation()
  const { isGuest, user } = useAuth()
  const fileRef = useRef(null)

  const [catalog, setCatalog] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [otherMake, setOtherMake] = useState(false)
  const [otherModel, setOtherModel] = useState(false)
  const [otherCity, setOtherCity] = useState(false)
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(0)
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  const MAX_PHOTOS = catalog?.maxPhotos || 8

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const num = (key, max) => (e) => setForm((f) => ({ ...f, [key]: e.target.value.replace(/[^\d]/g, '').slice(0, max) }))

  useEffect(() => {
    if (isGuest || (user && user.role !== 'individual')) {
      navigate('/b2c/auth', { replace: true, state: { from: location.pathname } })
    }
  }, [isGuest, user, navigate, location.pathname])

  // admin-managed dropdown values
  useEffect(() => {
    let alive = true
    carsApi
      .catalog()
      .then((res) => {
        if (!alive) return
        const c = res.data
        setCatalog(c)
        // sensible defaults for a brand-new ad
        setForm((f) => ({
          ...f,
          fuelType: f.fuelType || c.fuelTypes?.[0]?.value || '',
          transmission: f.transmission || c.transmissions?.[0]?.value || '',
        }))
      })
      .catch((e) => alive && setError(e.message || 'Could not load the form options'))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!editing) return undefined
    let alive = true
    carsApi
      .get(id)
      .then((res) => {
        if (!alive) return
        const l = res.data?.listing
        if (!l || !res.data?.isOwner) {
          setError('Listing not found')
          return
        }
        setForm({
          title: l.title, make: l.make, model: l.model, variant: l.variant || '', year: String(l.year),
          fuelType: l.fuelType, transmission: l.transmission, kmDriven: String(l.kmDriven), owners: String(l.owners),
          price: String(l.price), negotiable: l.negotiable !== false, city: l.city, locationText: l.locationText || '',
          description: l.description || '',
        })
        setPhotos(l.images || [])
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [editing, id])

  const makes = useMemo(() => catalog?.makes || [], [catalog])
  const makeKnown = makes.find((m) => m.name === form.make)
  const makeSel = otherMake || (form.make && !makeKnown && catalog) ? OTHER : form.make
  const models = makeKnown?.models || []
  const modelKnown = models.find((m) => m.name === form.model)
  const modelSel = otherModel || (form.model && !modelKnown && makeKnown) ? OTHER : form.model
  const variants = modelKnown?.variants || []
  const cities = catalog?.cities || []
  const citySel = otherCity || (form.city && !cities.includes(form.city) && catalog) ? OTHER : form.city

  const addFiles = async (fileList) => {
    const files = [...fileList].slice(0, MAX_PHOTOS - photos.length)
    if (files.length === 0) return
    setError('')
    setUploading((n) => n + files.length)
    for (const file of files) {
      try {
        const url = await uploadCarPhoto(file)
        setPhotos((p) => (p.length >= MAX_PHOTOS ? p : [...p, url]))
      } catch (e) {
        setError(e.message || 'A photo could not be uploaded')
      } finally {
        setUploading((n) => n - 1)
      }
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const need = (v, msg) => (String(v).trim() ? null : msg)
    const problem =
      need(form.make, 'Select the make') ||
      need(form.model, 'Select the model') ||
      need(form.year, 'Enter the registration year') ||
      need(form.kmDriven, 'Enter the kilometres driven') ||
      need(form.price, 'Enter your asking price') ||
      need(form.city, 'Select the city') ||
      (photos.length === 0 ? 'Add at least one photo' : null)
    if (problem) return setError(problem)
    const year = Number(form.year)
    if (year < 1980 || year > new Date().getFullYear() + 1) return setError('Enter a valid year')
    if (Number(form.price) < 1000) return setError('Enter a valid price')

    const payload = {
      title: form.title.trim() || [form.year, form.make, form.model, form.variant].filter(Boolean).join(' '),
      make: form.make.trim(),
      model: form.model.trim(),
      variant: form.variant.trim(),
      year,
      fuelType: form.fuelType,
      transmission: form.transmission,
      kmDriven: Number(form.kmDriven),
      owners: Number(form.owners) || 1,
      price: Number(form.price),
      negotiable: form.negotiable,
      city: form.city.trim(),
      locationText: form.locationText.trim(),
      description: form.description.trim(),
      images: photos,
    }
    try {
      setSaving(true)
      const res = editing ? await carsApi.update(id, payload) : await carsApi.create(payload)
      setDone(res.data?.listing || {})
    } catch (err) {
      setError(err.message || 'Could not save your listing')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="space-y-4 pt-10 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" aria-hidden />
        <h1 className="text-xl font-black text-navy">{editing ? 'Listing updated' : 'Listing submitted'}</h1>
        <p className="mx-auto max-w-xs text-sm font-medium text-slate-600">
          Our team will review it shortly. Once approved it goes live for buyers, and we will notify you.
        </p>
        <div className="grid gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/app/cars/my', { replace: true })}
            className="rounded-2xl bg-brand py-3.5 text-base font-black text-white shadow-lg shadow-brand/30 active:scale-[0.98]"
          >
            View my cars
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/cars', { replace: true })}
            className="rounded-2xl bg-white py-3.5 text-base font-extrabold text-navy ring-1 ring-slate-200 active:scale-[0.98]"
          >
            Browse cars
          </button>
        </div>
      </div>
    )
  }

  const notReady = loading || !catalog

  return (
    <form onSubmit={submit} className="space-y-4 pb-6">
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-navy shadow-sm ring-1 ring-slate-200"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-black leading-tight text-navy">{editing ? 'Edit your car' : 'Sell your car'}</h1>
          <p className="text-xs font-semibold text-slate-500">Free listing · reviewed before it goes live</p>
        </div>
      </div>

      {!editing ? (
        <div className="relative flex min-h-[7.5rem] items-center overflow-hidden rounded-2xl bg-linear-to-br from-orange-50 to-amber-100 p-4 ring-1 ring-orange-100">
          <div className="relative z-10 max-w-[48%]">
            <p className="text-[15px] font-black leading-tight text-navy">Sell your car faster</p>
            <p className="mt-1 text-[11px] font-semibold text-slate-600">Add clear photos and an honest price. Free to list.</p>
          </div>
          <img
            src="/assets/images/sell-car.webp"
            alt=""
            decoding="async"
            className="pointer-events-none absolute -right-2 bottom-0 w-[50%] max-w-[10.5rem] object-contain drop-shadow-[0_6px_6px_rgba(15,23,42,0.18)]"
          />
        </div>
      ) : null}

      {notReady ? <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" aria-busy="true" /> : null}

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-black text-navy">
          Photos <span className="text-xs font-semibold text-slate-400">({photos.length}/{MAX_PHOTOS})</span>
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {photos.map((src, i) => (
            <div key={src + i} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
              <CarImage src={src} className="h-full w-full object-cover" />
              {i === 0 ? (
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[9px] font-bold text-white">Cover</span>
              ) : null}
              <button
                type="button"
                onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`u${i}`} className="flex aspect-square items-center justify-center rounded-xl bg-slate-100">
              <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden />
            </div>
          ))}
          {photos.length + uploading < MAX_PHOTOS ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand/40 bg-orange-50 text-brand active:scale-95"
            >
              <ImagePlus className="h-5 w-5" aria-hidden />
              <span className="text-[10px] font-extrabold">Add</span>
            </button>
          ) : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </section>

      {catalog ? (
        <>
          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-black text-navy">Car details</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Make">
                <select
                  value={makeSel}
                  onChange={(e) => {
                    const v = e.target.value
                    setOtherModel(false)
                    if (v === OTHER) {
                      setOtherMake(true)
                      setForm((f) => ({ ...f, make: '', model: '', variant: '' }))
                    } else {
                      setOtherMake(false)
                      setForm((f) => ({ ...f, make: v, model: '', variant: '' }))
                    }
                  }}
                  className={inputCls}
                >
                  <option value="">Select make</option>
                  {makes.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                  <option value={OTHER}>Other…</option>
                </select>
              </Field>
              <Field label="Model">
                {makeSel === OTHER || (makeKnown && models.length === 0) ? (
                  <input value={form.model} onChange={set('model')} maxLength={60} placeholder="Model" className={inputCls} />
                ) : (
                  <select
                    value={modelSel}
                    disabled={!makeKnown}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === OTHER) {
                        setOtherModel(true)
                        setForm((f) => ({ ...f, model: '', variant: '' }))
                      } else {
                        setOtherModel(false)
                        setForm((f) => ({ ...f, model: v, variant: '' }))
                      }
                    }}
                    className={inputCls}
                  >
                    <option value="">{makeKnown ? 'Select model' : 'Select make first'}</option>
                    {models.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                    <option value={OTHER}>Other…</option>
                  </select>
                )}
              </Field>
              {makeSel === OTHER ? (
                <div className="col-span-2">
                  <Field label="Make name">
                    <input value={form.make} onChange={set('make')} maxLength={60} placeholder="Type the make" className={inputCls} />
                  </Field>
                </div>
              ) : null}
              {modelSel === OTHER && makeKnown ? (
                <div className="col-span-2">
                  <Field label="Model name">
                    <input value={form.model} onChange={set('model')} maxLength={60} placeholder="Type the model" className={inputCls} />
                  </Field>
                </div>
              ) : null}
              <Field label="Variant" hint="optional">
                {variants.length > 0 ? (
                  <select value={form.variant} onChange={set('variant')} className={inputCls}>
                    <option value="">Select variant</option>
                    {variants.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input value={form.variant} onChange={set('variant')} maxLength={80} placeholder="e.g. VXi" className={inputCls} />
                )}
              </Field>
              <Field label="Year">
                <input inputMode="numeric" value={form.year} onChange={num('year', 4)} placeholder="2019" className={inputCls} />
              </Field>
              <Field label="Fuel">
                <select value={form.fuelType} onChange={set('fuelType')} className={inputCls}>
                  {catalog.fuelTypes.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Transmission">
                <select value={form.transmission} onChange={set('transmission')} className={inputCls}>
                  {catalog.transmissions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Km driven">
                <input inputMode="numeric" value={form.kmDriven} onChange={num('kmDriven', 7)} placeholder="42000" className={inputCls} />
              </Field>
              <Field label="Owners">
                <select value={form.owners} onChange={set('owners')} className={inputCls}>
                  {(catalog.ownerOptions?.length ? catalog.ownerOptions : [1, 2, 3, 4, 5]).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Title" hint="optional, auto-filled from make & model">
              <input value={form.title} onChange={set('title')} maxLength={120} placeholder="2019 Maruti Swift VXi" className={inputCls} />
            </Field>
          </section>

          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-black text-navy">Price &amp; location</p>
            <Field label="Asking price (₹)">
              <input inputMode="numeric" value={form.price} onChange={num('price', 9)} placeholder="450000" className={inputCls} />
            </Field>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.negotiable}
                onChange={(e) => setForm((f) => ({ ...f, negotiable: e.target.checked }))}
                className="h-4 w-4 accent-orange-500"
              />
              Price is negotiable
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City">
                {cities.length > 0 ? (
                  <select
                    value={citySel}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === OTHER) {
                        setOtherCity(true)
                        setForm((f) => ({ ...f, city: '' }))
                      } else {
                        setOtherCity(false)
                        setForm((f) => ({ ...f, city: v }))
                      }
                    }}
                    className={inputCls}
                  >
                    <option value="">Select city</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value={OTHER}>Other…</option>
                  </select>
                ) : (
                  <input value={form.city} onChange={set('city')} maxLength={80} placeholder="Delhi" className={inputCls} />
                )}
              </Field>
              <Field label="Area" hint="optional">
                <input value={form.locationText} onChange={set('locationText')} maxLength={240} placeholder="Anand Vihar" className={inputCls} />
              </Field>
              {citySel === OTHER ? (
                <div className="col-span-2">
                  <Field label="City name">
                    <input value={form.city} onChange={set('city')} maxLength={80} placeholder="Type your city" className={inputCls} />
                  </Field>
                </div>
              ) : null}
            </div>
            <Field label="Description" hint="optional">
              <textarea
                rows={4}
                maxLength={2000}
                value={form.description}
                onChange={set('description')}
                placeholder="Service history, accidents, modifications, insurance validity…"
                className={`${inputCls} resize-none`}
              />
            </Field>
          </section>
        </>
      ) : null}

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700">{error}</p> : null}

      <button
        type="submit"
        disabled={saving || uploading > 0 || notReady}
        className="w-full rounded-2xl bg-brand py-4 text-base font-black text-white shadow-lg shadow-brand/30 transition active:scale-[0.98] disabled:opacity-60"
      >
        {saving ? 'Submitting…' : uploading > 0 ? 'Uploading photos…' : editing ? 'Save & resubmit' : 'Submit for review'}
      </button>
      <p className="text-center text-[11px] font-semibold text-slate-400">
        Your phone number stays private until a buyer sends an enquiry.
      </p>
    </form>
  )
}
