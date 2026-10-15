import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ImagePlus, Loader2, X } from 'lucide-react'
import { accessoriesApi, uploadAccessoryPhoto } from '../../../api/accessoriesApi.js'
import { CarImage } from '../cars/CarsMarketplacePage.jsx'

const MAX_PHOTOS = 6
const EMPTY = {
  name: '', categoryId: '', brand: '', description: '', price: '', mrp: '', stock: '1',
  condition: 'NEW', compatibility: 'Universal', warranty: '',
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

/** Mechanic panel: add or edit a product. Every create / content edit goes through admin approval. */
export function AccessoryFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(0)
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const num = (key, max) => (e) => setForm((f) => ({ ...f, [key]: e.target.value.replace(/[^\d]/g, '').slice(0, max) }))

  useEffect(() => {
    let alive = true
    accessoriesApi
      .categories()
      .then((res) => alive && setCategories(res.data?.categories || []))
      .catch((e) => alive && setError(e.message || 'Could not load categories'))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!editing) return undefined
    let alive = true
    accessoriesApi
      .get(id)
      .then((res) => {
        if (!alive) return
        const p = res.data?.product
        if (!p || !res.data?.isOwner) {
          setError('Product not found')
          return
        }
        setForm({
          name: p.name, categoryId: p.category?._id || '', brand: p.brand || '', description: p.description || '',
          price: String(p.price), mrp: p.mrp ? String(p.mrp) : '', stock: String(p.stock),
          condition: p.condition || 'NEW', compatibility: p.compatibility || 'Universal', warranty: p.warranty || '',
        })
        setPhotos(p.images || [])
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [editing, id])

  const addFiles = async (fileList) => {
    const files = [...fileList].slice(0, MAX_PHOTOS - photos.length)
    if (files.length === 0) return
    setError('')
    setUploading((n) => n + files.length)
    for (const file of files) {
      try {
        const url = await uploadAccessoryPhoto(file)
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
    const problem =
      (!form.name.trim() && 'Enter the product name') ||
      (!form.categoryId && 'Select a category') ||
      (!form.price && 'Enter the selling price') ||
      (form.stock === '' && 'Enter the stock quantity') ||
      (photos.length === 0 && 'Add at least one photo') ||
      (form.mrp && Number(form.mrp) < Number(form.price) && 'MRP cannot be lower than the selling price')
    if (problem) return setError(problem)

    const payload = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      brand: form.brand.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      mrp: form.mrp ? Number(form.mrp) : null,
      stock: Number(form.stock),
      condition: form.condition,
      compatibility: form.compatibility.trim() || 'Universal',
      warranty: form.warranty.trim(),
      images: photos,
    }
    try {
      setSaving(true)
      const res = editing ? await accessoriesApi.update(id, payload) : await accessoriesApi.create(payload)
      setDone(res.message || 'Saved')
    } catch (err) {
      setError(err.message || 'Could not save the product')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="space-y-4 pt-10 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" aria-hidden />
        <h1 className="text-xl font-black text-navy">{editing ? 'Product updated' : 'Product submitted'}</h1>
        <p className="mx-auto max-w-xs text-sm font-medium text-slate-600">
          Our team will review it. Once approved it is shown to customers and you will get a notification.
        </p>
        <button
          type="button"
          onClick={() => navigate('/app/accessories/mine', { replace: true })}
          className="mx-auto block w-full max-w-xs rounded-2xl bg-brand py-3.5 text-base font-black text-white shadow-lg shadow-brand/30 active:scale-[0.98]"
        >
          View my products
        </button>
      </div>
    )
  }

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
          <h1 className="text-lg font-black leading-tight text-navy">{editing ? 'Edit product' : 'Add product'}</h1>
          <p className="text-xs font-semibold text-slate-500">Shown to customers after admin approval</p>
        </div>
      </div>

      {loading ? <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" aria-busy="true" /> : null}

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-black text-navy">
          Photos <span className="text-xs font-semibold text-slate-400">({photos.length}/{MAX_PHOTOS})</span>
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {photos.map((src, i) => (
            <div key={src + i} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
              <CarImage src={src} className="h-full w-full object-cover" />
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

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-black text-navy">Product details</p>
        <Field label="Product name">
          <input value={form.name} onChange={set('name')} maxLength={120} placeholder="e.g. Leather seat cover set (5 seater)" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select value={form.categoryId} onChange={set('categoryId')} className={inputCls}>
              <option value="">Select</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Condition">
            <select value={form.condition} onChange={set('condition')} className={inputCls}>
              <option value="NEW">New</option>
              <option value="USED">Used</option>
            </select>
          </Field>
          <Field label="Brand" hint="optional">
            <input value={form.brand} onChange={set('brand')} maxLength={60} placeholder="Brand" className={inputCls} />
          </Field>
          <Field label="Warranty" hint="optional">
            <input value={form.warranty} onChange={set('warranty')} maxLength={80} placeholder="6 months" className={inputCls} />
          </Field>
        </div>
        <Field label="Fits cars" hint="or Universal">
          <input value={form.compatibility} onChange={set('compatibility')} maxLength={200} placeholder="Maruti Swift, Hyundai i20" className={inputCls} />
        </Field>
        <Field label="Description" hint="optional">
          <textarea rows={4} maxLength={2000} value={form.description} onChange={set('description')} placeholder="Material, size, what is in the box…" className={`${inputCls} resize-none`} />
        </Field>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-black text-navy">Price &amp; stock</p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Price (₹)">
            <input inputMode="numeric" value={form.price} onChange={num('price', 8)} placeholder="2499" className={inputCls} />
          </Field>
          <Field label="MRP (₹)" hint="opt.">
            <input inputMode="numeric" value={form.mrp} onChange={num('mrp', 8)} placeholder="3999" className={inputCls} />
          </Field>
          <Field label="Stock">
            <input inputMode="numeric" value={form.stock} onChange={num('stock', 6)} placeholder="10" className={inputCls} />
          </Field>
        </div>
      </section>

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700">{error}</p> : null}

      <button
        type="submit"
        disabled={saving || uploading > 0 || loading}
        className="w-full rounded-2xl bg-brand py-4 text-base font-black text-white shadow-lg shadow-brand/30 transition active:scale-[0.98] disabled:opacity-60"
      >
        {saving ? 'Submitting…' : uploading > 0 ? 'Uploading photos…' : editing ? 'Save changes' : 'Submit for approval'}
      </button>
      <p className="text-center text-[11px] font-semibold text-slate-400">
        Changing only price or stock of a live product does not need a new review.
      </p>
    </form>
  )
}
