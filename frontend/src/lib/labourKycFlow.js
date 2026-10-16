import { KYC_STATUS } from '../constants/userRoles.js'

export const KYC_WORKFLOW = [
  { id: 'work', label: 'Work details & emergency contact', short: 'Details' },
  { id: 'documents', label: 'Aadhaar, PAN & driving licence', short: 'Documents' },
  { id: 'video', label: 'Selfie & live document video', short: 'Selfie' },
  { id: 'review', label: 'Admin verification', short: 'Review' },
  { id: 'verified', label: 'Verified on platform', short: 'Done' },
]

/** Same steps — shown when a rejected mechanic fixes and resubmits. */
export const KYC_WORKFLOW_RESUBMIT = KYC_WORKFLOW

export function hasKycDetailsOnFile(labourProfile) {
  return (
    Boolean(labourProfile?.aadhaarMasked?.trim()) &&
    Boolean(labourProfile?.panMasked?.trim()) &&
    Boolean(labourProfile?.dlNumberMasked?.trim())
  )
}

export function getKycUiState(labourProfile) {
  const kyc = labourProfile?.kycStatus || KYC_STATUS.PENDING
  const submittedAt = labourProfile?.kycSubmittedAt
  const reviewNote = labourProfile?.kycReviewNote

  if (kyc === KYC_STATUS.VERIFIED) {
    return {
      phase: 'verified',
      title: 'Verified mechanic',
      subtitle: 'You can accept jobs and receive payouts as a verified mechanic.',
      tone: 'emerald',
    }
  }
  if (kyc === KYC_STATUS.PENDING && submittedAt) {
    return {
      phase: 'review',
      title: 'Under admin review',
      subtitle: 'Your documents were submitted and are waiting for manual approval.',
      tone: 'sky',
    }
  }
  if (kyc === KYC_STATUS.FAILED) {
    return {
      phase: 'failed',
      title: 'Verification needs correction',
      subtitle: reviewNote || 'Fix the details your reviewer flagged and submit again.',
      tone: 'rose',
    }
  }
  return {
    phase: 'submit',
    title: 'Complete your KYC',
    subtitle: 'Add your ID documents, selfie and a short video to unlock jobs.',
    tone: 'violet',
  }
}

/** 0–4 workflow step for timeline highlight. */
export function kycWorkflowStepIndex({ kycStatus, submittedAt, detailsOnFile = false }) {
  if (kycStatus === KYC_STATUS.VERIFIED) return 4
  if (kycStatus === KYC_STATUS.PENDING && submittedAt) return 3
  return detailsOnFile ? 2 : 0
}

export const KYC_BENEFITS = [
  { title: 'Accept job offers', desc: 'Required before you can accept shifts on Jobs.' },
  { title: 'Trusted by customers', desc: 'Customers see a verified badge on your profile.' },
  { title: 'Faster payouts', desc: 'Payroll and withdrawals link to your verified identity.' },
]
