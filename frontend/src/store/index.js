import { configureStore } from '@reduxjs/toolkit'
import { authReducer } from './slices/authSlice.js'
import { activeBookingReducer } from './slices/activeBookingSlice.js'
import { baseApi } from './api/baseApi.js'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    activeBooking: activeBookingReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
})

