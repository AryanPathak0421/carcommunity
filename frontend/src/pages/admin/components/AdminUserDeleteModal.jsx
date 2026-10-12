import { useState } from 'react'
import { X, Trash2, Loader2, AlertTriangle } from 'lucide-react'

export function AdminUserDeleteModal({ user, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)
    try {
      await onConfirm(user._id)
    } catch (err) {
      setError(err.message || 'Failed to delete user')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between p-6">
          <div className="flex gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Delete User</h2>
              <p className="mt-1 text-sm text-slate-500">
                Are you sure you want to delete <strong>{user.fullName}</strong>? This action cannot be undone and will permanently remove this user from the system.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-600">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 bg-slate-50 p-6 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Delete User
          </button>
        </div>
      </div>
    </div>
  )
}
