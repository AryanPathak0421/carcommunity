import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, ImagePlus, Loader2, ShieldCheck } from 'lucide-react'
import { CarCommunityLogo } from '../../components/brand/CarCommunityLogo.jsx'
import { LabourKycVideoRecorder } from '../../components/labour/kyc/LabourKycVideoRecorder.jsx'
import { submitLabourKycDocuments } from '../../api/userKycApi.js'
import { assetUrlFromUpload, uploadDocument, uploadMedia } from '../../api/uploadApi.js'
import { ApiError } from '../../api/http.js'
import { UPLOAD_FOLDERS } from '../../constants/uploadFolders.js'
import { KYC_STATUS } from '../../constants/userRoles.js'
import { useAuth } from '../../hooks/useAuth.js'
import { setUser } from '../../store/slices/authSlice.js'
import {
  alnumUpper,
  digitsOnly,
  isFutureDate,
  isValidAadhaar,
  isValidDrivingLicence,
  isValidMobile,
  isValidPan,
  isValidPincode,
  isValidVehicleReg,
} from '../../lib/kycValidators.js'

const STEPS = [
  { id: 'work', label: 'Work details' },
  { id: 'identity', label: 'ID documents' },
  { id: 'photo', label: 'Selfie & video' },
  { id: 'review', label: 'Review' },
]

const DRAFT_KEY = 'lc-mechanic-onboarding-draft'

const EMPTY_FORM = {
  experienceYears: '',
  workshopName: '',
  serviceCity: '',
  servicePincode: '',
  serviceAddress: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  ownVehicleType: 'none',
  ownVehicleRegNo: '',
  aadhaar: '',
  pan: '',
  drivingLicence: '',
  drivingLicenceExpiry: '',
}

// Identity numbers are never written to the draft.
const SENSITIVE_FIELDS = ['aadhaar', 'pan', 'drivingLicence']

function readDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null') || {}
  } catch {
    return {}
  }
}

const inputClass =
  'w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-3.5 py-3 text-[15px] font-semibold text-slate-900 outline-none transition-colors placeholder:font-medium placeholder:text-slate-400 focus:border-brand focus:bg-white'

function Field({ id, label, hint, error, optional, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-bold text-slate-500">
        {label} {optional ? <span className="font-medium text-slate-400">(optional)</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-[11px] font-semibold text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] font-medium text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
}

/** Camera / gallery picker that uploads straight away and remembers the returned URL. */
function PhotoUpload({ label, hint, state, onFile, capture }) {
  const inputId = `photo-${label.replace(/\W+/g, '-').toLowerCase()}`
  const done = Boolean(state?.url) || state?.onFile
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl ${
            done ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-slate-400'
          }`}
        >
          {state?.preview ? (
            <img src={state.preview} alt="" className="h-full w-full object-cover" />
          ) : done ? (
            <CheckCircle2 className="h-6 w-6" aria-hidden />
          ) : (
            <ImagePlus className="h-6 w-6" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold text-slate-900">{label}</p>
          <p className="text-[11px] font-medium text-slate-500">
            {state?.uploading
              ? 'Uploading…'
              : state?.error
                ? state.error
                : state?.url
                  ? 'Uploaded'
                  : state?.onFile
                    ? 'Already on file — upload again only to replace'
                    : hint}
          </p>
        </div>
        <label
          htmlFor={inputId}
          className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-extrabold ${
            done ? 'bg-white text-slate-700 ring-1 ring-slate-200' : 'bg-brand text-white'
          }`}
        >
          {state?.uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Camera className="h-4 w-4" aria-hidden />
          )}
          {done ? 'Replace' : 'Add'}
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture={capture}
          className="sr-only"
          disabled={state?.uploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) onFile(file)
          }}
        />
      </div>
    </div>
  )
}

export function MechanicOnboardingPage() {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { user } = useAuth()
  const profile = user?.labourProfile
  const onboarding = profile?.onboarding
  const uploaded = profile?.kycDocsUploaded || {}

  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState(() => {
    const draft = readDraft()
    return {
      ...EMPTY_FORM,
      experienceYears: onboarding?.experienceYears != null ? String(onboarding.experienceYears) : '',
      workshopName: onboarding?.workshopName || '',
      serviceCity: onboarding?.serviceCity || '',
      servicePincode: onboarding?.servicePincode || '',
      serviceAddress: onboarding?.serviceAddress || '',
      emergencyContactName: onboarding?.emergencyContactName || '',
      emergencyContactPhone: onboarding?.emergencyContactPhone || '',
      ownVehicleType: onboarding?.ownVehicleType || 'none',
      ownVehicleRegNo: onboarding?.ownVehicleRegNo || '',
      drivingLicenceExpiry: profile?.dlExpiry ? String(profile.dlExpiry).slice(0, 10) : '',
      ...draft.form,
    }
  })
  const [docs, setDocs] = useState(() => readDraft().docs || {})
  const [touched, setTouched] = useState(false)
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState(null)

  // Persist everything except identity numbers and local previews.
  useEffect(() => {
    const safeForm = { ...form }
    for (const key of SENSITIVE_FIELDS) delete safeForm[key]
    const safeDocs = Object.fromEntries(
      Object.entries(docs)
        .filter(([, v]) => v?.url)
        .map(([k, v]) => [k, { url: v.url }]),
    )
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ form: safeForm, docs: safeDocs }))
    } catch {
      /* storage unavailable — draft is optional */
    }
  }, [form, docs])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [stepIndex])

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    }
  }, [videoPreviewUrl])

  const set = (key) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  const docState = (key) => ({ ...docs[key], onFile: Boolean(uploaded[key]) })
  const hasDoc = (key) => Boolean(docs[key]?.url || uploaded[key])

  async function handleDocFile(key, file, kind = 'document') {
    if (file.size > 8 * 1024 * 1024) {
      setDocs((d) => ({ ...d, [key]: { ...d[key], error: 'Photo must be under 8MB' } }))
      return
    }
    const preview = URL.createObjectURL(file)
    setDocs((d) => ({ ...d, [key]: { preview, uploading: true } }))
    try {
      const res =
        kind === 'selfie'
          ? await uploadMedia(file, UPLOAD_FOLDERS.PROFILES)
          : await uploadDocument(file, UPLOAD_FOLDERS.KYC_DOCUMENTS)
      const url = assetUrlFromUpload(res)
      if (!url) throw new ApiError('Upload failed — no URL returned')
      setDocs((d) => ({ ...d, [key]: { preview, url } }))
    } catch (e) {
      setDocs((d) => ({
        ...d,
        [key]: { error: e instanceof ApiError ? e.message : 'Upload failed. Try again.' },
      }))
    }
  }

  const errors = useMemo(() => {
    const e = {}
    const years = Number(form.experienceYears)
    if (form.experienceYears === '' || !Number.isInteger(years) || years < 0 || years > 60) {
      e.experienceYears = 'Enter your experience in whole years (0–60)'
    }
    if (!form.serviceCity.trim()) e.serviceCity = 'Enter the city you work in'
    if (!isValidPincode(form.servicePincode)) e.servicePincode = 'Enter a valid 6-digit pincode'
    if (form.serviceAddress.trim().length < 10) e.serviceAddress = 'Enter your workshop or home address'
    if (!form.emergencyContactName.trim()) e.emergencyContactName = 'Enter a contact name'
    if (!isValidMobile(form.emergencyContactPhone)) {
      e.emergencyContactPhone = 'Enter a valid 10-digit mobile number'
    } else if (form.emergencyContactPhone === user?.phone) {
      e.emergencyContactPhone = 'Must be different from your own number'
    }
    if (form.ownVehicleType !== 'none' && !isValidVehicleReg(alnumUpper(form.ownVehicleRegNo, 11))) {
      e.ownVehicleRegNo = 'Enter your vehicle registration number'
    }

    if (form.aadhaar ? !isValidAadhaar(form.aadhaar) : !profile?.aadhaarMasked) {
      e.aadhaar = form.aadhaar ? 'Enter a valid 12-digit Aadhaar number' : 'Aadhaar number is required'
    }
    if (form.pan ? !isValidPan(form.pan) : !profile?.panMasked) {
      e.pan = form.pan ? 'Enter a valid PAN (e.g. ABCDE1234F)' : 'PAN number is required'
    }
    if (form.drivingLicence ? !isValidDrivingLicence(form.drivingLicence) : !profile?.dlNumberMasked) {
      e.drivingLicence = form.drivingLicence
        ? 'Enter a valid licence number (e.g. MH1420110062821)'
        : 'Driving licence number is required'
    }
    if (!isFutureDate(form.drivingLicenceExpiry)) e.drivingLicenceExpiry = 'Enter a licence expiry date in the future'
    for (const [key, label] of [
      ['aadhaarFrontUrl', 'Aadhaar front'],
      ['aadhaarBackUrl', 'Aadhaar back'],
      ['panImageUrl', 'PAN card'],
      ['dlFrontUrl', 'Driving licence'],
    ]) {
      if (!hasDoc(key)) e[key] = `${label} photo is required`
    }
    if (!hasDoc('selfieUrl')) e.selfieUrl = 'A selfie is required'
    if (!videoFile && !videoPreviewUrl) e.video = 'Record the KYC video'
    return e
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, docs, uploaded, profile, user?.phone, videoFile, videoPreviewUrl])

  const stepFields = [
    ['experienceYears', 'serviceCity', 'servicePincode', 'serviceAddress', 'emergencyContactName', 'emergencyContactPhone', 'ownVehicleRegNo'],
    ['aadhaar', 'pan', 'drivingLicence', 'drivingLicenceExpiry', 'aadhaarFrontUrl', 'aadhaarBackUrl', 'panImageUrl', 'dlFrontUrl'],
    ['selfieUrl', 'video'],
    [],
  ]
  const stepValid = (i) => stepFields[i].every((f) => !errors[f])
  const uploading = Object.values(docs).some((d) => d?.uploading)
  const allValid = [0, 1, 2].every(stepValid)
  const show = (field) => (touched ? errors[field] : undefined)

  function next() {
    setBanner(null)
    if (!stepValid(stepIndex)) {
      setTouched(true)
      return
    }
    setTouched(false)
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
  }

  function back() {
    setBanner(null)
    setTouched(false)
    setStepIndex((i) => Math.max(i - 1, 0))
  }

  async function handleSubmit() {
    setBanner(null)
    if (!allValid) {
      setTouched(true)
      const firstBad = [0, 1, 2].find((i) => !stepValid(i))
      setStepIndex(firstBad)
      setBanner({ variant: 'error', message: 'Some details are missing — please fix them to continue.' })
      return
    }
    setBusy(true)
    try {
      let file = videoFile
      if (!file && videoPreviewUrl) {
        const blob = await (await fetch(videoPreviewUrl)).blob()
        const type = (blob.type || 'video/webm').split(';')[0]
        file = new File([blob], `kyc-video-${Date.now()}.${type.includes('mp4') ? 'mp4' : 'webm'}`, { type })
      }
      const uploadedVideo = await uploadMedia(file, UPLOAD_FOLDERS.KYC_VIDEOS)
      const videoUrl = assetUrlFromUpload(uploadedVideo)
      if (!videoUrl) throw new ApiError('Video upload failed — no URL returned')

      const payload = {
        videoUrl,
        videoMeta: uploadedVideo.data?.asset,
        onboarding: {
          experienceYears: Number(form.experienceYears),
          workshopName: form.workshopName.trim(),
          serviceCity: form.serviceCity.trim(),
          servicePincode: form.servicePincode,
          serviceAddress: form.serviceAddress.trim(),
          emergencyContactName: form.emergencyContactName.trim(),
          emergencyContactPhone: form.emergencyContactPhone,
          ownVehicleType: form.ownVehicleType,
          ownVehicleRegNo: form.ownVehicleType === 'none' ? '' : alnumUpper(form.ownVehicleRegNo, 11),
        },
        drivingLicenceExpiry: form.drivingLicenceExpiry,
        docs: Object.fromEntries(
          Object.entries(docs)
            .filter(([, v]) => v?.url)
            .map(([k, v]) => [k, v.url]),
        ),
      }
      if (form.aadhaar) payload.aadhaar = form.aadhaar
      if (form.pan) payload.pan = form.pan
      if (form.drivingLicence) payload.drivingLicence = form.drivingLicence

      const res = await submitLabourKycDocuments(payload)
      if (res.data?.user) dispatch(setUser(res.data.user))
      try {
        sessionStorage.removeItem(DRAFT_KEY)
      } catch {
        /* ignore */
      }
      navigate('/app/kyc', { replace: true })
    } catch (e) {
      setBanner({
        variant: 'error',
        message: e instanceof ApiError ? e.message : 'Submission failed. Check your connection and try again.',
      })
    } finally {
      setBusy(false)
    }
  }

  // Already submitted (or approved): nothing left to do here.
  const kyc = profile?.kycStatus || KYC_STATUS.PENDING
  if (kyc === KYC_STATUS.VERIFIED) return <Navigate to="/app" replace />
  if (kyc === KYC_STATUS.PENDING && profile?.kycSubmittedAt) return <Navigate to="/app/kyc" replace />

  const step = STEPS[stepIndex]
  const isLast = stepIndex === STEPS.length - 1

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-white shadow-[0_0_60px_-30px_rgba(15,23,42,0.35)]">
        <header className="bg-linear-to-br from-navy via-slate-800 to-slate-900 px-6 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
          <div className="flex items-center justify-between">
            <CarCommunityLogo variant="light" size="md" tagline={false} />
            <span className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Mechanic onboarding
            </span>
          </div>
          <h1 className="mt-5 text-[24px] font-black leading-tight tracking-tight">{step.label}</h1>
          <p className="mt-1 text-[12px] font-semibold text-white/80">
            Step {stepIndex + 1} of {STEPS.length} · every detail is checked by our team before you can accept jobs
          </p>
          <div className="mt-4 grid grid-cols-4 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={stepIndex + 1}>
            {STEPS.map((s, i) => (
              <span key={s.id} className={`h-1.5 rounded-full ${i <= stepIndex ? 'bg-brand' : 'bg-white/25'}`} />
            ))}
          </div>
        </header>

        <main className="flex-1 px-6 pb-8 pt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {step.id === 'work' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field id="exp" label="Experience (years)" error={show('experienceYears')}>
                      <input id="exp" inputMode="numeric" className={inputClass} placeholder="e.g. 5" value={form.experienceYears}
                        onChange={(e) => setForm((f) => ({ ...f, experienceYears: digitsOnly(e.target.value, 2) }))} />
                    </Field>
                    <Field id="shop" label="Workshop name" optional>
                      <input id="shop" className={inputClass} placeholder="Your garage" maxLength={120} value={form.workshopName} onChange={set('workshopName')} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field id="city" label="City" error={show('serviceCity')}>
                      <input id="city" className={inputClass} placeholder="City" maxLength={80} value={form.serviceCity} onChange={set('serviceCity')} />
                    </Field>
                    <Field id="pin" label="Pincode" error={show('servicePincode')}>
                      <input id="pin" inputMode="numeric" className={inputClass} placeholder="6 digits" value={form.servicePincode}
                        onChange={(e) => setForm((f) => ({ ...f, servicePincode: digitsOnly(e.target.value, 6) }))} />
                    </Field>
                  </div>
                  <Field id="addr" label="Workshop / service address" error={show('serviceAddress')}>
                    <textarea id="addr" rows={3} maxLength={300} className={`${inputClass} resize-none`} placeholder="House / shop no., street, area" value={form.serviceAddress} onChange={set('serviceAddress')} />
                  </Field>

                  <div>
                    <p className="mb-1.5 text-[12px] font-bold text-slate-500">Vehicle you travel to jobs with</p>
                    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Own vehicle">
                      {[['none', 'None'], ['bike', 'Bike'], ['car', 'Car']].map(([value, label]) => (
                        <button key={value} type="button" role="radio" aria-checked={form.ownVehicleType === value}
                          onClick={() => setForm((f) => ({ ...f, ownVehicleType: value }))}
                          className={`rounded-xl border-2 py-2.5 text-[13px] font-extrabold transition ${form.ownVehicleType === value ? 'border-brand bg-orange-50 text-navy' : 'border-slate-200 text-slate-500'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    {form.ownVehicleType !== 'none' ? (
                      <div className="mt-3">
                        <Field id="reg" label="Vehicle registration number" error={show('ownVehicleRegNo')}>
                          <input id="reg" className={`${inputClass} uppercase tracking-wider`} placeholder="MH12AB1234" value={form.ownVehicleRegNo}
                            onChange={(e) => setForm((f) => ({ ...f, ownVehicleRegNo: alnumUpper(e.target.value, 11) }))} />
                        </Field>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3.5">
                    <p className="mb-3 text-[12px] font-extrabold text-navy">Emergency contact</p>
                    <div className="space-y-3">
                      <Field id="ecn" label="Contact name" error={show('emergencyContactName')}>
                        <input id="ecn" className={inputClass} placeholder="Family member or friend" maxLength={80} value={form.emergencyContactName} onChange={set('emergencyContactName')} />
                      </Field>
                      <Field id="ecp" label="Contact mobile number" error={show('emergencyContactPhone')}>
                        <input id="ecp" type="tel" inputMode="numeric" className={inputClass} placeholder="10-digit number" value={form.emergencyContactPhone}
                          onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: digitsOnly(e.target.value, 10) }))} />
                      </Field>
                    </div>
                  </div>
                </>
              ) : null}

              {step.id === 'identity' ? (
                <>
                  <section className="space-y-3 rounded-2xl border border-slate-200 p-3.5">
                    <h2 className="text-[13px] font-black text-navy">Aadhaar card</h2>
                    <Field id="aadhaar" label="Aadhaar number" error={show('aadhaar')}
                      hint={profile?.aadhaarMasked ? `On file: ${profile.aadhaarMasked} — enter again only to change` : undefined}>
                      <input id="aadhaar" inputMode="numeric" autoComplete="off" className={`${inputClass} font-mono tracking-[0.18em]`} placeholder="XXXX XXXX XXXX" value={form.aadhaar}
                        onChange={(e) => setForm((f) => ({ ...f, aadhaar: digitsOnly(e.target.value, 12) }))} />
                    </Field>
                    <PhotoUpload label="Aadhaar front" hint="Clear photo, all corners visible" state={docState('aadhaarFrontUrl')} onFile={(f) => handleDocFile('aadhaarFrontUrl', f)} />
                    {show('aadhaarFrontUrl') ? <p className="text-[11px] font-semibold text-rose-600">{show('aadhaarFrontUrl')}</p> : null}
                    <PhotoUpload label="Aadhaar back" hint="Photo of the address side" state={docState('aadhaarBackUrl')} onFile={(f) => handleDocFile('aadhaarBackUrl', f)} />
                    {show('aadhaarBackUrl') ? <p className="text-[11px] font-semibold text-rose-600">{show('aadhaarBackUrl')}</p> : null}
                  </section>

                  <section className="space-y-3 rounded-2xl border border-slate-200 p-3.5">
                    <h2 className="text-[13px] font-black text-navy">PAN card</h2>
                    <Field id="pan" label="PAN number" error={show('pan')}
                      hint={profile?.panMasked ? `On file: ${profile.panMasked} — enter again only to change` : undefined}>
                      <input id="pan" autoComplete="off" className={`${inputClass} font-mono uppercase tracking-[0.15em]`} placeholder="ABCDE1234F" value={form.pan}
                        onChange={(e) => setForm((f) => ({ ...f, pan: alnumUpper(e.target.value, 10) }))} />
                    </Field>
                    <PhotoUpload label="PAN card photo" hint="Front of the card" state={docState('panImageUrl')} onFile={(f) => handleDocFile('panImageUrl', f)} />
                    {show('panImageUrl') ? <p className="text-[11px] font-semibold text-rose-600">{show('panImageUrl')}</p> : null}
                  </section>

                  <section className="space-y-3 rounded-2xl border border-slate-200 p-3.5">
                    <h2 className="text-[13px] font-black text-navy">Driving licence</h2>
                    <Field id="dl" label="Licence number" error={show('drivingLicence')}
                      hint={profile?.dlNumberMasked ? `On file: ${profile.dlNumberMasked} — enter again only to change` : 'State code + RTO + year + serial, e.g. MH1420110062821'}>
                      <input id="dl" autoComplete="off" className={`${inputClass} font-mono uppercase tracking-[0.1em]`} placeholder="MH1420110062821" value={form.drivingLicence}
                        onChange={(e) => setForm((f) => ({ ...f, drivingLicence: alnumUpper(e.target.value, 15) }))} />
                    </Field>
                    <Field id="dlx" label="Valid until" error={show('drivingLicenceExpiry')}>
                      <input id="dlx" type="date" className={inputClass} value={form.drivingLicenceExpiry} onChange={set('drivingLicenceExpiry')} />
                    </Field>
                    <PhotoUpload label="Licence front" hint="Photo with your picture visible" state={docState('dlFrontUrl')} onFile={(f) => handleDocFile('dlFrontUrl', f)} />
                    {show('dlFrontUrl') ? <p className="text-[11px] font-semibold text-rose-600">{show('dlFrontUrl')}</p> : null}
                    <PhotoUpload label="Licence back" hint="Optional" state={docState('dlBackUrl')} onFile={(f) => handleDocFile('dlBackUrl', f)} />
                  </section>
                </>
              ) : null}

              {step.id === 'photo' ? (
                <>
                  <section className="space-y-2">
                    <h2 className="text-[13px] font-black text-navy">Your selfie</h2>
                    <p className="text-[12px] font-medium text-slate-500">A clear, front-facing photo. We match it with your ID photos.</p>
                    <PhotoUpload label="Selfie" hint="Face clearly visible, good light" capture="user" state={docState('selfieUrl')}
                      onFile={(f) => handleDocFile('selfieUrl', f, 'selfie')} />
                    {show('selfieUrl') ? <p className="text-[11px] font-semibold text-rose-600">{show('selfieUrl')}</p> : null}
                  </section>
                  <section className="space-y-2">
                    <h2 className="text-[13px] font-black text-navy">Live document video</h2>
                    <p className="text-[12px] font-medium text-slate-500">
                      Record one short video showing the front and back of your Aadhaar, PAN and driving licence, then say your name.
                    </p>
                    <LabourKycVideoRecorder
                      previewUrl={videoPreviewUrl}
                      disabled={busy}
                      onRecorded={(file, url) => {
                        setBanner(null)
                        setVideoFile(file)
                        setVideoPreviewUrl((prev) => {
                          if (prev) URL.revokeObjectURL(prev)
                          return url
                        })
                      }}
                      onClear={() => {
                        setVideoFile(null)
                        setVideoPreviewUrl((prev) => {
                          if (prev) URL.revokeObjectURL(prev)
                          return ''
                        })
                      }}
                    />
                    {show('video') ? <p className="text-[11px] font-semibold text-rose-600">{show('video')}</p> : null}
                  </section>
                </>
              ) : null}

              {step.id === 'review' ? (
                <>
                  <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 text-[13px]">
                    {[
                      ['Experience', `${form.experienceYears} years${form.workshopName ? ` · ${form.workshopName}` : ''}`],
                      ['Service area', `${form.serviceCity} ${form.servicePincode}`],
                      ['Travel vehicle', form.ownVehicleType === 'none' ? 'None' : `${form.ownVehicleType} · ${form.ownVehicleRegNo}`],
                      ['Emergency contact', `${form.emergencyContactName} · ${form.emergencyContactPhone}`],
                      ['Aadhaar', form.aadhaar ? `XXXX XXXX ${form.aadhaar.slice(-4)}` : profile?.aadhaarMasked],
                      ['PAN', form.pan ? `${form.pan.slice(0, 5)} XXXX ${form.pan.slice(-1)}` : profile?.panMasked],
                      ['Driving licence', form.drivingLicence ? `${form.drivingLicence.slice(0, 4)} XXXXXXX ${form.drivingLicence.slice(-4)}` : profile?.dlNumberMasked],
                      ['Licence valid until', form.drivingLicenceExpiry],
                      ['Photos', `${['aadhaarFrontUrl', 'aadhaarBackUrl', 'panImageUrl', 'dlFrontUrl', 'selfieUrl'].filter(hasDoc).length} of 5 required uploaded`],
                      ['KYC video', videoFile || videoPreviewUrl ? 'Recorded' : 'Missing'],
                    ].map(([k, v]) => (
                      <li key={k} className="flex justify-between gap-3 px-3.5 py-2.5">
                        <span className="font-semibold text-slate-500">{k}</span>
                        <span className="text-right font-extrabold text-slate-900">{v}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="rounded-xl bg-orange-50 px-3 py-2.5 text-[12px] font-semibold leading-relaxed text-slate-600 ring-1 ring-brand/15">
                    Our team will check your documents, photos and video — usually within 1–2 business days. You can start taking jobs once you are approved.
                  </p>
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>

          {banner ? (
            <p role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
              {banner.message}
            </p>
          ) : null}

          <div className="mt-6 flex gap-3">
            {stepIndex > 0 ? (
              <button type="button" onClick={back} disabled={busy}
                className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-slate-200 px-5 py-4 text-sm font-extrabold text-slate-700 disabled:opacity-60">
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy || uploading}
              onClick={isLast ? handleSubmit : next}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-base font-black text-white shadow-lg shadow-brand/30 transition active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? (
                <><Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Submitting…</>
              ) : uploading ? (
                <><Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Uploading…</>
              ) : isLast ? (
                <><ShieldCheck className="h-5 w-5" aria-hidden /> Submit for verification</>
              ) : (
                <>Continue <ArrowRight className="h-5 w-5" aria-hidden /></>
              )}
            </button>
          </div>

          <p className="mt-6 text-center text-[12px] text-slate-400">
            <Link to="/app" className="font-bold hover:underline">Do this later</Link>
            {' '}· you cannot accept jobs until verification is complete
          </p>
        </main>
      </div>
    </div>
  )
}
