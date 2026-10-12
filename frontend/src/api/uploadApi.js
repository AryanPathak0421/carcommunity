import { apiClient } from './http.js'
import { ApiError } from './http.js'

function unwrapUploadResponse(res) {
  const json = res.data
  if (!json?.success) {
    throw new ApiError(json?.message || 'Upload failed', {
      status: res.status,
      code: json?.code,
    })
  }
  return json
}

async function wrapUploadCall(requestFn) {
  try {
    const res = await requestFn()
    return unwrapUploadResponse(res)
  } catch (e) {
    if (e.isAxiosError) {
      const json = e.response?.data ?? {}
      const message = typeof json.message === 'string' ? json.message : e.message || 'Upload failed'
      throw new ApiError(message, {
        status: e.response?.status,
        code: json.code,
      })
    }
    throw e
  }
}

/**
 * POST /uploads/media — images & videos (profile, categories, job poster, KYC video).
 * @param {File} file
 * @param {string} folder — e.g. UPLOAD_FOLDERS.PROFILES
 */
export function uploadMedia(file, folder) {
  return wrapUploadCall(async () => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', folder)
    return apiClient.post('/uploads/media', fd)
  })
}

/**
 * POST /uploads/document — Aadhaar / PAN scans, PDFs.
 * @param {File} file
 * @param {string} folder — e.g. UPLOAD_FOLDERS.KYC_DOCUMENTS
 */
export function uploadDocument(file, folder) {
  return wrapUploadCall(async () => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', folder)
    return apiClient.post('/uploads/document', fd)
  })
}

/** GET /uploads/config */
export function fetchUploadConfig() {
  return apiClient.get('/uploads/config')
}

/** @param {{ data?: { asset?: { url?: string } } }} envelope — api success body */
export function assetUrlFromUpload(envelope) {
  return envelope?.data?.asset?.url ?? ''
}
