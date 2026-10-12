import { createSlice } from '@reduxjs/toolkit'

const STORAGE_KEY = 'lc_active_booking'

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { bookingId: null, status: null }
  } catch {
    return { bookingId: null, status: null }
  }
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      bookingId: state.bookingId,
      status: state.status,
    }))
  } catch {
    /* ignore */
  }
}

const activeBookingSlice = createSlice({
  name: 'activeBooking',
  initialState: readStored(),
  reducers: {
    setActiveBooking(state, action) {
      const { bookingId, status } = action.payload
      state.bookingId = bookingId
      state.status = status || 'CREATED'
      persist(state)
    },
    updateBookingStatus(state, action) {
      state.status = action.payload
      persist(state)
    },
    clearActiveBooking(state) {
      state.bookingId = null
      state.status = null
      localStorage.removeItem(STORAGE_KEY)
    },
  },
})

export const { setActiveBooking, updateBookingStatus, clearActiveBooking } = activeBookingSlice.actions
export const activeBookingReducer = activeBookingSlice.reducer
