import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Plus, Trash2, CheckCircle2, Loader2, AlertCircle, GripVertical } from 'lucide-react'
import { adminSettingsApi } from '../../api/adminSettingsApi.js'
import { ApiError } from '../../api/http.js'

const DEFAULT_SLOTS = ['08:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM']

function parseToMinutes(slot) {
  const m = slot.match(/(\d+):(\d+) (AM|PM)/)
  if (!m) return 0
  let [, h, min, ampm] = m
  h = parseInt(h, 10)
  min = parseInt(min, 10)
  if (ampm === 'PM' && h < 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return h * 60 + min
}

function minutesToSlot(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const ampm = h < 12 ? 'AM' : 'PM'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
}

export function AdminTimeSlotsPage() {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [newSlotTime, setNewSlotTime] = useState('09:00')

  useEffect(() => {
    let cancelled = false
    adminSettingsApi.getSettings()
      .then((res) => {
        if (!cancelled) {
          const s = res.data?.settings?.timeSlots
          setSlots(Array.isArray(s) && s.length > 0 ? s : DEFAULT_SLOTS)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlots(DEFAULT_SLOTS)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  const addSlot = useCallback(() => {
    const [h, m] = newSlotTime.split(':').map(Number)
    const slot = minutesToSlot(h * 60 + m)
    if (slots.includes(slot)) return
    setSlots((prev) =>
      [...prev, slot].sort((a, b) => parseToMinutes(a) - parseToMinutes(b))
    )
  }, [newSlotTime, slots])

  const removeSlot = useCallback((slot) => {
    setSlots((prev) => prev.filter((s) => s !== slot))
  }, [])

  const handleSave = useCallback(async () => {
    if (slots.length === 0) {
      setError('At least one time slot is required')
      return
    }
    setError('')
    setSaving(true)
    setSaved(false)
    try {
      await adminSettingsApi.updateTimeSlots({ timeSlots: slots })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save time slots')
    } finally {
      setSaving(false)
    }
  }, [slots])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Manage Time Slots</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure available booking time slots shown to customers during checkout.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-white p-16 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
      ) : (
        <>
          {/* Current Slots */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand" />
              <h2 className="text-base font-bold text-slate-900">Active Time Slots</h2>
              <span className="ml-auto rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand">
                {slots.length} slots
              </span>
            </div>

            <AnimatePresence mode="popLayout">
              {slots.length === 0 ? (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-8 text-center text-sm font-medium text-slate-400"
                >
                  No time slots configured. Add at least one slot below.
                </motion.p>
              ) : (
                <motion.div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {slots.map((slot) => (
                    <motion.div
                      key={slot}
                      layout
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.75, transition: { duration: 0.15 } }}
                      className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-rose-200 hover:bg-rose-50"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm font-bold text-slate-800">{slot}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSlot(slot)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:text-rose-600"
                        aria-label={`Remove ${slot}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Add New Slot */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-slate-900">Add New Slot</h2>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={newSlotTime}
                onChange={(e) => setNewSlotTime(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <button
                type="button"
                onClick={addSlot}
                className="flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand/90 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                Add Slot
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Slots are automatically sorted by time after adding.
            </p>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-brand px-8 py-3.5 text-sm font-extrabold text-white shadow-md shadow-brand/20 transition hover:bg-brand/90 active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : 'Save Time Slots'}
            </button>
            <AnimatePresence>
              {saved && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Time slots saved successfully!
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  )
}
