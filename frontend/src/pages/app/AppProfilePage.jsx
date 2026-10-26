import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  BookMarked,
  CalendarClock,
  ChevronRight,
  ClipboardX,
  Coins,
  FileText,
  Fingerprint,
  HardHat,
  HelpCircle,
  Headset,
  Phone,
  Info,
  Car,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  Pencil,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Wallet,
  Wrench,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'
import { KYC_STATUS, USER_ROLES } from '../../constants/userRoles.js'
import { adminInitials } from '../../lib/formatAdminLastLogin.js'
import { assetUrlFromUpload, uploadMedia } from '../../api/uploadApi.js'
import { UPLOAD_FOLDERS } from '../../constants/uploadFolders.js'
import { AppModal } from '../../components/app-ui/feedback/AppModal.jsx'
import { AppTextInput } from '../../components/app-ui/inputs/AppTextInput.jsx'
import { AppButton } from '../../components/app-ui/buttons/AppButton.jsx'
import { patchCurrentUser, deleteCurrentUser } from '../../api/userProfileApi.js'
import { referralsApi } from '../../api/referralsApi.js'
import { carsApi } from '../../api/carsApi.js'
import { ApiError } from '../../api/http.js'
import { setUser } from '../../store/slices/authSlice.js'

function openAppDrawer() {
  window.dispatchEvent(new Event('lc-open-app-drawer'))
}

function formatInr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

function MenuRow({ icon: Icon, label, sub, badge, count, to, onClick, tone = 'default' }) {
  const labelCls = tone === 'danger' ? 'text-rose-700' : 'text-slate-800'
  const iconCls = tone === 'danger' ? 'text-rose-500' : 'text-slate-500'
  const body = (
    <>
      <Icon className={`h-[18px] w-[18px] shrink-0 ${iconCls}`} strokeWidth={1.9} aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="flex min-w-0 items-center gap-2">
          <span className={`truncate text-[15px] font-semibold ${labelCls}`}>{label}</span>
          {badge ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
              <Coins className="h-3 w-3" aria-hidden />
              {badge}
            </span>
          ) : null}
          {count > 0 ? (
            <span className="inline-flex shrink-0 items-center rounded-full bg-brand px-2 py-0.5 text-[11px] font-black text-white">
              {count} new
            </span>
          ) : null}
        </span>
        {sub ? <span className="mt-0.5 truncate text-xs font-medium text-slate-500">{sub}</span> : null}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
    </>
  )
  const cls =
    'flex w-full items-center gap-3.5 px-4 py-3.5 transition hover:bg-slate-50 active:bg-slate-100'
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  )
}

function MenuGroup({ children }) {
  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_-16px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/60">
      {children}
    </div>
  )
}

export function AppProfilePage() {
  const { user, logout, isGuest } = useAuth()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const reduce = useReducedMotion()
  const photoInputRef = useRef(null)

  const [photoSaving, setPhotoSaving] = useState(false)
  const [photoErr, setPhotoErr] = useState('')
  const [localPreview, setLocalPreview] = useState(null)

  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [editNameValue, setEditNameValue] = useState('')
  const [editPhoneValue, setEditPhoneValue] = useState('')
  const [editEmailValue, setEditEmailValue] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileErr, setProfileErr] = useState('')

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteErr, setDeleteErr] = useState('')

  const [referralBadge, setReferralBadge] = useState('')
  const [carEnquiries, setCarEnquiries] = useState({ received: 0, newReceived: 0, sent: 0 })

  const isLabour = user?.role === USER_ROLES.MECHANIC
  const canRefer = user?.role === USER_ROLES.INDIVIDUAL || isLabour
  const isCustomer = user?.role === USER_ROLES.INDIVIDUAL && !isGuest
  const labourKyc = user?.labourProfile?.kycStatus
  const initials = adminInitials(user)

  const savedPhoto = user?.profileImageUrl?.trim() || ''
  const displayPhoto = localPreview || savedPhoto

  useEffect(() => {
    if (!canRefer) return
    let cancelled = false
    referralsApi
      .getMyReferrals()
      .then((res) => {
        if (cancelled) return
        const cfg = res?.data?.config
        if (!cfg?.isActive || !cfg.referrerReward) return
        const cap = Number(cfg.maxRewardsPerReferrer || 0)
        setReferralBadge(
          cap > 0
            ? `Earn upto ${formatInr(cfg.referrerReward * cap)}`
            : `Earn ${formatInr(cfg.referrerReward)} per friend`,
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [canRefer])

  // car enquiry counters for the "Car enquiries" section (customers only)
  useEffect(() => {
    if (!isCustomer) return undefined
    let cancelled = false
    Promise.all([carsApi.received(), carsApi.sent()])
      .then(([r, s]) => {
        if (cancelled) return
        const received = r.data?.inquiries || []
        setCarEnquiries({
          received: received.length,
          newReceived: received.filter((i) => i.status === 'NEW').length,
          sent: (s.data?.inquiries || []).length,
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isCustomer])

  const saveProfilePhoto = useCallback(
    async (imageUrl) => {
      setPhotoErr('')
      setPhotoSaving(true)
      try {
        const res = await patchCurrentUser({ profileImageUrl: imageUrl })
        dispatch(setUser(res.data.user))
        setLocalPreview(null)
      } catch (e) {
        setPhotoErr(e instanceof ApiError ? e.message : 'Could not save profile photo')
        setLocalPreview(null)
      } finally {
        setPhotoSaving(false)
      }
    },
    [dispatch],
  )

  const onPickPhoto = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      setPhotoErr('')
      if (!file) return
      if (!file.type.startsWith('image/')) {
        setPhotoErr('Please choose a photo (JPG, PNG, or WebP) from your device.')
        return
      }
      const previewUrl = URL.createObjectURL(file)
      setLocalPreview(previewUrl)
      try {
        const uploaded = await uploadMedia(file, UPLOAD_FOLDERS.PROFILES)
        const url = assetUrlFromUpload(uploaded)
        if (!url) {
          setPhotoErr('Upload failed — no URL returned.')
          setLocalPreview(null)
          return
        }
        await saveProfilePhoto(url)
      } catch (err) {
        setPhotoErr(err instanceof ApiError ? err.message : 'Could not upload photo.')
        setLocalPreview(null)
      } finally {
        URL.revokeObjectURL(previewUrl)
      }
    },
    [saveProfilePhoto],
  )

  const handleEditProfileOpen = useCallback(() => {
    setEditNameValue(user?.fullName || '')
    setEditPhoneValue(user?.phone || '')
    setEditEmailValue(user?.email || '')
    setProfileErr('')
    setEditProfileOpen(true)
  }, [user])

  const handleSaveProfile = useCallback(
    async (e) => {
      e.preventDefault()
      const trimmedName = editNameValue.trim()
      const trimmedPhone = editPhoneValue.trim()
      const trimmedEmail = editEmailValue.trim()

      if (!trimmedName) {
        setProfileErr('Name cannot be empty')
        return
      }
      if (trimmedPhone && !/^\d{10}$/.test(trimmedPhone)) {
        setProfileErr('Enter a valid 10-digit phone number')
        return
      }

      setSavingProfile(true)
      setProfileErr('')
      try {
        const res = await patchCurrentUser({
          fullName: trimmedName,
          phone: trimmedPhone || undefined,
          email: trimmedEmail || undefined,
        })
        dispatch(setUser(res.data.user))
        setEditProfileOpen(false)
      } catch (err) {
        setProfileErr(err instanceof ApiError ? err.message : 'Could not save profile')
      } finally {
        setSavingProfile(false)
      }
    },
    [editNameValue, editPhoneValue, editEmailValue, dispatch],
  )

  const handleSignOut = async () => {
    await logout()
    navigate('/b2c/auth', { replace: true })
  }

  const handleDeleteAccount = useCallback(async () => {
    setDeletingAccount(true)
    setDeleteErr('')
    try {
      await deleteCurrentUser()
      await logout()
      navigate('/b2c/auth', { replace: true })
    } catch (err) {
      setDeleteErr(err instanceof ApiError ? err.message : 'Could not delete account')
      setDeletingAccount(false)
    }
  }, [logout, navigate])

  const kycSub =
    labourKyc === KYC_STATUS.VERIFIED
      ? 'Verified'
      : labourKyc === KYC_STATUS.FAILED
        ? 'Needs resubmission'
        : user?.labourProfile?.kycSubmittedAt
          ? 'Under review'
          : 'Submit documents to get jobs'

  return (
    <motion.div
      className="-mx-4 -mt-2 pb-4"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className="relative bg-linear-to-br from-brand to-emerald-800 px-5 pb-8 pt-[max(1rem,0px)] text-white">
        <button
          type="button"
          onClick={openAppDrawer}
          className="absolute right-4 top-[max(0.75rem,0px)] flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/15"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={photoSaving}
            className="group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-70"
            aria-label="Change profile photo"
          >
            <span className="relative block h-[4.5rem] w-[4.5rem] overflow-hidden rounded-full bg-white text-xl font-black text-brand ring-2 ring-white/70">
              {displayPhoto ? (
                <img src={displayPhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center">{initials}</span>
              )}
              {photoSaving ? (
                <span className="absolute inset-0 flex items-center justify-center bg-slate-900/45">
                  <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden />
                </span>
              ) : null}
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-brand shadow ring-2 ring-brand">
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </span>
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            className="sr-only"
            onChange={(e) => void onPickPhoto(e)}
          />

          <div className="min-w-0 flex-1 pr-8">
            <p className="truncate text-xl font-black tracking-tight">{user?.fullName || 'Your profile'}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-white/80">
              {user?.phone ? `+91 ${user.phone}` : 'No phone on file'}
              {user?.isPhoneVerified ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" aria-hidden /> : null}
            </p>
            <button
              type="button"
              onClick={handleEditProfileOpen}
              className="mt-1.5 inline-flex items-center gap-0.5 text-sm font-bold text-emerald-300 transition hover:text-emerald-200"
            >
              Edit profile
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
        {photoErr ? <p className="mt-3 text-xs font-medium text-rose-200">{photoErr}</p> : null}
      </header>

      <div className="space-y-3.5 bg-slate-50 px-4 pb-6 pt-4">
        <MenuGroup>
          {isLabour ? (
            <>
              <MenuRow icon={HardHat} label="Jobs & assignments" to="/app/jobs" />
              <MenuRow icon={CalendarClock} label="Your bookings" to="/app/my-bookings" />
              <MenuRow icon={Coins} label="Earnings & payouts" to="/app/earnings" />
            </>
          ) : (
            <>
              <MenuRow icon={CalendarClock} label="Your bookings" to="/app/bookings" />
              <MenuRow icon={BookMarked} label="Address book" to="/app/addresses" />
            </>
          )}
          {canRefer ? <MenuRow icon={Wallet} label="My wallet" to="/app/wallet" /> : null}
        </MenuGroup>

        {isCustomer ? (
          <section aria-label="Car enquiries">
            <h2 className="mb-1.5 px-1 text-xs font-extrabold uppercase tracking-wide text-slate-500">Car enquiries</h2>
            <MenuGroup>
              <MenuRow
                icon={MessageSquare}
                label="Enquiries received"
                sub={
                  carEnquiries.received
                    ? `${carEnquiries.received} buyer${carEnquiries.received === 1 ? '' : 's'} interested in your cars`
                    : 'Buyers interested in your cars'
                }
                count={carEnquiries.newReceived}
                to="/app/cars/enquiries"
              />
              <MenuRow
                icon={MessageSquare}
                label="Enquiries sent"
                sub={carEnquiries.sent ? `${carEnquiries.sent} car${carEnquiries.sent === 1 ? '' : 's'} you contacted` : 'Cars you contacted'}
                to="/app/cars/enquiries?tab=sent"
              />
              <MenuRow icon={Car} label="My car ads" sub="Cars you are selling" to="/app/cars/my" />
              <MenuRow icon={ShoppingBag} label="Accessory requests" sub="Products you asked sellers for" to="/app/accessories/requests" />
            </MenuGroup>
          </section>
        ) : null}

        {canRefer ? (
          <MenuGroup>
            <MenuRow icon={Share2} label="Refer & Earn" badge={referralBadge} to="/app/refer" />
          </MenuGroup>
        ) : null}

        {isLabour ? (
          <MenuGroup>
            <MenuRow icon={Fingerprint} label="Aadhaar KYC" sub={kycSub} to="/app/kyc" />
            <MenuRow icon={Wrench} label="Work types" to="/app/work-categories" />
            <MenuRow icon={ShoppingBag} label="My products" sub="Sell car accessories" to="/app/accessories/mine" />
            <MenuRow icon={MessageSquare} label="Customer requests" sub="Who wants your products" to="/app/accessories/leads" />
          </MenuGroup>
        ) : null}

        <MenuGroup>
          <MenuRow icon={Info} label="About us" to="/app/about" />
          <MenuRow icon={FileText} label="Terms & conditions" to="/app/terms" />
          <MenuRow icon={ShieldCheck} label="Privacy policy" to="/app/privacy-policy" />
          <MenuRow icon={HelpCircle} label="FAQs" to="/app/faq" />
          <MenuRow icon={Headset} label="Help & support" to="/app/support" />
          <MenuRow icon={Phone} label="Contact us" to={isLabour ? '/mechanic/contact' : '/contact'} />
          <MenuRow icon={ClipboardX} label="Request account deletion" onClick={() => setDeleteOpen(true)} />
          <MenuRow icon={LogOut} label="Log out" onClick={handleSignOut} />
        </MenuGroup>
      </div>

      <AppModal
        open={editProfileOpen}
        onClose={() => !savingProfile && setEditProfileOpen(false)}
        title="Edit Profile"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label htmlFor="edit-full-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
              Full Name
            </label>
            <AppTextInput
              id="edit-full-name"
              placeholder="e.g. Rahul Kumar"
              value={editNameValue}
              onChange={(e) => setEditNameValue(e.target.value)}
              disabled={savingProfile}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="edit-phone" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
              Mobile Number
            </label>
            <AppTextInput
              id="edit-phone"
              type="tel"
              placeholder="10-digit number"
              value={editPhoneValue}
              onChange={(e) => setEditPhoneValue(e.target.value.replace(/\D/g, '').slice(0, 10))}
              disabled={savingProfile}
            />
          </div>
          <div>
            <label htmlFor="edit-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
              Email Address
            </label>
            <AppTextInput
              id="edit-email"
              type="email"
              placeholder="e.g. rahul@example.com"
              value={editEmailValue}
              onChange={(e) => setEditEmailValue(e.target.value)}
              disabled={savingProfile}
            />
          </div>

          {profileErr ? <p className="mt-1.5 text-xs font-medium text-rose-600">{profileErr}</p> : null}

          <div className="flex gap-3 pt-2">
            <AppButton
              type="button"
              variant="secondary"
              onClick={() => setEditProfileOpen(false)}
              disabled={savingProfile}
            >
              Cancel
            </AppButton>
            <AppButton type="submit" loading={savingProfile}>
              Save
            </AppButton>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={deleteOpen}
        onClose={() => !deletingAccount && setDeleteOpen(false)}
        title="Delete Account"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle className="size-5" />
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete your account? This action cannot be undone and will permanently remove your data, verified documents, and access.
            </p>
          </div>
          {deleteErr ? <p className="mt-1.5 text-xs font-medium text-rose-600">{deleteErr}</p> : null}
          <div className="flex gap-3 pt-2">
            <AppButton
              type="button"
              variant="secondary"
              onClick={() => setDeleteOpen(false)}
              disabled={deletingAccount}
            >
              Cancel
            </AppButton>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
            >
              {deletingAccount ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete
            </button>
          </div>
        </div>
      </AppModal>
    </motion.div>
  )
}
