import { baseApi } from './baseApi.js'

function unwrap(response) {
  return response?.data ?? response
}

export const adminBookingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminBookings: build.query({
      query: (params) => ({ url: '/admin/bookings', params }),
      transformResponse: unwrap,
      providesTags: (result) =>
        result?.bookings
          ? [
              ...result.bookings.map(({ _id }) => ({ type: 'AdminBookings', id: _id })),
              { type: 'AdminBookings', id: 'LIST' },
            ]
          : [{ type: 'AdminBookings', id: 'LIST' }],
    }),
    getAdminBookingById: build.query({
      query: (id) => `/admin/bookings/${id}`,
      transformResponse: unwrap,
      providesTags: (_r, _e, id) => [{ type: 'AdminBookings', id }],
    }),
    createAdminBooking: build.mutation({
      query: (body) => ({ url: '/admin/bookings', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: [{ type: 'AdminBookings', id: 'LIST' }],
    }),
    updateAdminBooking: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/admin/bookings/${id}`,
        method: 'PUT',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminBookings', (_r, _e, { id }) => ({ type: 'AdminBookings', id })],
    }),
    patchAdminBookingStatus: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/admin/bookings/${id}/status`,
        method: 'PATCH',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminBookings', (_r, _e, { id }) => ({ type: 'AdminBookings', id })],
    }),
    assignAdminBooking: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/admin/bookings/${id}/assign`,
        method: 'PATCH',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminBookings', (_r, _e, { id }) => ({ type: 'AdminBookings', id })],
    }),
    deleteAdminBooking: build.mutation({
      query: (id) => ({
        url: `/admin/bookings/${id}`,
        method: 'DELETE',
      }),
      transformResponse: unwrap,
      invalidatesTags: (result, error, id) => [{ type: 'AdminBookings', id }, { type: 'AdminBookings', id: 'LIST' }],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        // Optimistic update for ALL possible status filters
        const statuses = ['ALL', 'CREATED', 'ASSIGNED', 'STARTED', 'COMPLETED', 'CANCELLED', 'FAILED', '']
        
        const patchResults = statuses.map((status) =>
          dispatch(
            adminBookingApi.util.updateQueryData('getAdminBookings', { status }, (draft) => {
              if (draft?.bookings) {
                draft.bookings = draft.bookings.filter((b) => b._id !== id)
              }
            })
          )
        )

        try {
          await queryFulfilled
        } catch {
          patchResults.forEach((patch) => patch.undo())
        }
      },
    }),
  }),
})

export const {
  useGetAdminBookingsQuery,
  useGetAdminBookingByIdQuery,
  useCreateAdminBookingMutation,
  useUpdateAdminBookingMutation,
  usePatchAdminBookingStatusMutation,
  useAssignAdminBookingMutation,
  useDeleteAdminBookingMutation,
} = adminBookingApi
