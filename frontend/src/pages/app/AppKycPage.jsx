import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  HardHat,
  IndianRupee,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import { KYC_STATUS } from '../../constants/userRoles.js'
import { useAuth } from '../../hooks/useAuth.js'
import {
  getKycUiState,
  hasKycDetailsOnFile,
  KYC_BENEFITS,
  KYC_WORKFLOW,
  KYC_WORKFLOW_RESUBMIT,
  kycWorkflowStepIndex,
} from '../../lib/labourKycFlow.js'
import { GlassPanel } from '../../components/ui/GlassPanel.jsx'
import { AppPrimaryButton } from '../../components/app/AppPrimaryButton.jsx'
import { LabourKycHero } from '../../components/labour/kyc/LabourKycHero.jsx'
import { LabourKycWorkflowTimeline } from '../../components/labour/kyc/LabourKycWorkflowTimeline.jsx'

const BENEFIT_ICONS = [HardHat, ShieldCheck, IndianRupee]

export function AppKycPage() {
  const { user } = useAuth()

  const profile = user?.labourProfile
  const submittedAt = profile?.kycSubmittedAt
  const reviewNote = profile?.kycReviewNote
  const ui = getKycUiState(profile)
  const isResubmit = ui.phase === 'failed'
  const workflowStep = kycWorkflowStepIndex({
    kycStatus: profile?.kycStatus || KYC_STATUS.PENDING,
    submittedAt,
    detailsOnFile: hasKycDetailsOnFile(profile),
  })

  const phaseLabels = {
    verified: 'Verified',
    review: 'In review',
    failed: 'Action needed',
    submit: 'Not submitted',
  }

  const showCta = ui.phase === 'submit' || ui.phase === 'failed'

  return (
    <div className="space-y-4 pb-8">
      <LabourKycHero
        title={ui.title}
        subtitle={ui.subtitle}
        phaseLabel={phaseLabels[ui.phase]}
        tone={ui.tone}
        maskedAadhaar={
          ui.phase === 'verified' || ui.phase === 'review' || ui.phase === 'failed' ? profile?.aadhaarMasked : null
        }
        maskedPan={ui.phase === 'verified' || ui.phase === 'review' || ui.phase === 'failed' ? profile?.panMasked : null}
      />

      {ui.phase === 'verified' ? (
        <GlassPanel className="border-emerald-200/80 bg-emerald-50/50 p-5 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" aria-hidden />
          <p className="mt-3 text-sm text-slate-600">You are cleared to accept jobs.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <AppPrimaryButton as={Link} to="/app/jobs" className="py-2.5 text-xs">
              <Briefcase className="h-3.5 w-3.5" aria-hidden />
              My jobs
            </AppPrimaryButton>
            <Link
              to="/app/profile"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800"
            >
              Profile
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </GlassPanel>
      ) : null}

      {ui.phase === 'review' ? (
        <GlassPanel className="border-sky-200/80 bg-sky-50/50 p-4">
          <div className="flex gap-3">
            <Clock className="h-10 w-10 shrink-0 text-sky-600" aria-hidden />
            <div>
              <p className="text-sm font-extrabold text-sky-950">Submitted for review</p>
              <p className="mt-1 text-xs leading-relaxed text-sky-900/90">
                {submittedAt
                  ? new Date(submittedAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : '—'}
                . Usually reviewed within 1–2 business days.
              </p>
            </div>
          </div>
        </GlassPanel>
      ) : null}

      {ui.phase === 'failed' && reviewNote ? (
        <GlassPanel className="border-rose-200/80 bg-rose-50/50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-800">Admin note</p>
          <p className="mt-1 text-sm leading-relaxed text-rose-950">{reviewNote}</p>
        </GlassPanel>
      ) : null}

      {ui.phase !== 'review' ? (
        <>
          <GlassPanel className="border-slate-200/90 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verification journey</p>
            <div className="mt-3">
              <LabourKycWorkflowTimeline
                activeIndex={workflowStep}
                tone={ui.tone}
                steps={isResubmit ? KYC_WORKFLOW_RESUBMIT : KYC_WORKFLOW}
              />
            </div>
          </GlassPanel>

          <GlassPanel className="border-violet-200/50 bg-linear-to-br from-violet-50/80 to-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-800/80">Why verify?</p>
            <ul className="mt-3 space-y-2.5">
              {KYC_BENEFITS.map((b, i) => {
                const Icon = BENEFIT_ICONS[i] || ShieldCheck
                return (
                  <li key={b.title} className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-700">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{b.title}</p>
                      <p className="text-xs text-slate-600">{b.desc}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </GlassPanel>
        </>
      ) : null}

      {showCta ? (
        <GlassPanel className="border-slate-200/90 p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {isResubmit ? 'Fix and resubmit' : 'Mechanic onboarding'}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {isResubmit
              ? 'Details you already gave are saved — update what was flagged, add a new video and submit again.'
              : 'You will need your Aadhaar, PAN and driving licence (number and photo), a selfie, work details, an emergency contact and a short live video. It takes about 5 minutes.'}
          </p>
          <AppPrimaryButton as={Link} to="/mechanic/onboarding" className="mt-4 w-full py-3.5 text-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {isResubmit ? 'Update and resubmit' : 'Start onboarding'}
          </AppPrimaryButton>
        </GlassPanel>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/app/work-categories"
          className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm ring-1 ring-slate-100 transition hover:border-brand/30"
        >
          <Wrench className="h-5 w-5 text-brand" aria-hidden />
          <span className="text-xs font-bold text-slate-900">Update skills</span>
        </Link>
        <Link
          to="/app/profile"
          className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm ring-1 ring-slate-100 transition hover:border-brand/30"
        >
          <ArrowRight className="h-5 w-5 text-slate-400" aria-hidden />
          <span className="text-xs font-bold text-slate-900">Profile</span>
        </Link>
      </div>
    </div>
  )
}
