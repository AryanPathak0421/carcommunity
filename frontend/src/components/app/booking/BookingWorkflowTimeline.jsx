import { CheckCircle2 } from 'lucide-react'
import { INDIVIDUAL_BOOKING_WORKFLOW, bookingWorkflowStepIndex } from '../../../lib/individualBookings.js'

/**
 * Individual booking lifecycle — request → admin review → assign → work → payment.
 */
export function BookingWorkflowTimeline({ status, compact = false }) {
  const activeIdx = bookingWorkflowStepIndex(status)
  const cancelled = String(status).toLowerCase() === 'cancelled'

  return (
    <ol className={compact ? 'flex flex-col gap-2' : 'space-y-0'}>
      {INDIVIDUAL_BOOKING_WORKFLOW.map((step, i) => {
        const done = i < activeIdx || (i === 4 && activeIdx === 4)
        const active = i === activeIdx && !cancelled
        const upcoming = i > activeIdx

        return (
          <li
            key={step.id}
            className={`relative flex gap-3 ${compact ? '' : 'pb-3 last:pb-0'}`}
          >
            {!compact && i < INDIVIDUAL_BOOKING_WORKFLOW.length - 1 ? (
              <span
                className={`absolute left-[0.65rem] top-7 h-[calc(100%-0.5rem)] w-px ${
                  done ? 'bg-brand' : 'bg-slate-200'
                }`}
                aria-hidden
              />
            ) : null}
            <span
              className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                done
                  ? 'bg-brand text-white'
                  : active
                    ? 'bg-brand text-white ring-2 ring-brand ring-offset-2'
                    : 'bg-slate-100 text-slate-400'
              }`}
            >
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <span className="text-[10px] font-bold">{i + 1}</span>
              )}
            </span>
            <div
              className={`min-w-0 flex-1 rounded-xl px-3 py-2 ${
                active ? 'bg-brand/10' : done ? 'bg-white' : 'bg-slate-50'
              }`}
            >
              <p className={`text-xs font-bold ${upcoming ? 'text-slate-500' : 'text-slate-900'}`}>{step.label}</p>
              {active ? (
                <p className="mt-0.5 text-[10px] font-medium text-brand">Current</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
