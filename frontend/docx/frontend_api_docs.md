# Frontend API Docs for Booking Flow & System Settings

This document outlines the API endpoints that frontend developers need to use for the booking flow and admin system settings.

## Admin System Settings APIs

### 1. Update GST Percentage
Allows the admin to configure the GST tax percentage applied to bookings.
- **Endpoint:** `PATCH /api/v1/admin/settings/gst`
- **Auth:** `Admin` (Bearer Token)
- **Request Body:**
  ```json
  {
    "gstPercentage": 18
  }
  ```
- **Response:** See `frontend_api_responses.json` (`update_gst_response`)

### 2. Update Cancellation Penalty
Allows the admin to configure the fixed penalty amount charged to labourers if they cancel an accepted broadcast.
- **Endpoint:** `PATCH /api/v1/admin/settings/penalty`
- **Auth:** `Admin` (Bearer Token)
- **Request Body:**
  ```json
  {
    "cancellationPenalty": 50
  }
  ```
- **Response:** See `frontend_api_responses.json` (`update_penalty_response`)

## Admin Category & Services APIs

### 2a. Admin Labour Services CRUD
Allows the admin to manage services nested under a specific subcategory.
- **Create Service Endpoint:** `POST /api/v1/admin/labour-services`
- **Auth:** `Admin` (Bearer Token)
- **Request Body:**
  ```json
  {
    "subcategoryId": "64d0f...",
    "name": "Plumbing Leak Repair",
    "description": "Fix minor pipe leaks",
    "basePrice": 500,
    "estimatedDurationMins": 120,
    "iconUrl": "https://res.cloudinary.com/..."
  }
  ```
- **Update Service Endpoint:** `PATCH /api/v1/admin/labour-services/:id`
- **Request Body:** Same fields as above, all optional.

### 2b. Admin Hard Delete APIs
Allows the admin to permanently delete records from the database.
- **Delete Category:** `DELETE /api/v1/admin/labour-categories/:id`
- **Delete Subcategory:** `DELETE /api/v1/admin/labour-subcategories/:id`
- **Delete Service:** `DELETE /api/v1/admin/labour-services/:id`
- **Auth:** `Admin` (Bearer Token)

### 2c. Admin Services Search / Pagination
Fetches services with search and pagination capabilities.
- **Endpoint:** `GET /api/v1/admin/labour-services/search?q=plumber&page=1&limit=10`
- **Auth:** `Admin` (Bearer Token)
- **Response Format:** Returns a list of `services` matching the query and `pagination` object (total, page, limit, pages).

### 2b. Public Category & Services List
Fetches the entire category catalogue, now with nested `services` arrays.
- **Endpoint:** `GET /api/v1/labour-categories/grouped`
- **Response Format:**
  - `groups` > `categories` > `subcategories` > `services`
  - Each service contains `_id`, `name`, `description`, `basePrice`, `estimatedDurationMins`, `iconUrl`.

## User Booking APIs

### 3. Calculate Bill
Calculates the breakdown of a booking before creation. It now dynamically applies the platform fee and the admin-configured GST percentage.
- **Endpoint:** `POST /api/v1/bookings/calculate`
- **Auth:** `User` (Bearer Token)
- **Request Body:**
  ```json
  {
    "serviceId": "64d0f...",
    "durationDays": 1
  }
  ```
- **Response Data Fields Updated:**
  The response now includes a `taxes` field in the calculation.
  - `basePrice`: Price of service
  - `platformFee`: Flat or percentage fee of platform
  - `taxes`: Calculated from `(basePrice + platformFee) * gstPercentage / 100`
  - `totalAmount`: Final amount payable by customer (`basePrice + platformFee + taxes`)
- **Response:** See `frontend_api_responses.json` (`calculate_bill_response`)

### 4. Create Booking
Creates a new booking, applies GST automatically, and triggers the broadcast sequence.
- **Endpoint:** `POST /api/v1/bookings`
- **Auth:** `User` (Bearer Token)
- **Request Body:**
  ```json
  {
    "serviceId": "64d0f...",
    "type": "SCHEDULED",
    "locationText": "Sector 14, Gurugram",
    "lat": 28.4595,
    "lng": 77.0266,
    "paymentMethod": "CASH",
    "notes": "Pani ki pipe leak ho rahi hai",
    "durationKind": "few_hours",
    "durationDays": 1,
    "timeSlot": "9:00 AM – 12:00 PM",
    "imageNames": [
      "https://res.cloudinary.com/mappto/image/upload/v12345/job-posters/abcd.jpg"
    ]
  }
  ```
- **New Payload Fields Explained:**
  - `lat`, `lng`: Exact coordinates of the customer (Required for zone broadcast).
  - `notes`: (Optional) Text description of the job.
  - `durationKind`: `few_hours`, `full_day`, or `multi_day`.
  - `durationDays`: Number of days (defaults to 1). Multiplies the base price.
  - `timeSlot`: Required if `type` is `SCHEDULED` (e.g., "9:00 AM – 12:00 PM").
  - `imageNames`: Array of Cloudinary image URLs uploaded via the Media API.
- **Response:** See `frontend_api_responses.json` (`create_booking_response`)

## Zone Management & Flash Broadcast APIs

### 5. Admin Zone Settings
Allows the admin to configure the geographical radius (in kilometers) for broadcasting bookings to labourers.
- **Endpoint:** `GET /api/v1/admin/zones/settings` | `PUT /api/v1/admin/zones/settings`
- **Auth:** `Admin` (Bearer Token)
- **PUT Request Body:**
  ```json
  {
    "bookingBroadcastRadius": 10
  }
  ```

### 6. Admin Zone Statistics
Retrieves analytics for the broadcast system, including average broadcast radius and eligible labourer counts.
- **Endpoint:** `GET /api/v1/admin/zones/statistics`
- **Auth:** `Admin` (Bearer Token)
- **Response:**
  ```json
  {
    "data": {
      "totalBookings": 150,
      "totalEligibleLabourers": 450,
      "bookingsWithNoLabourers": 5,
      "avgRadius": 12.5,
      "broadcastSuccessRate": 96.67,
      "activeLabourCount": 320
    }
  }
  ```

### 7. Labour Location & Status Sync
Allows the labourer app to sync their current GPS coordinates for zone matching, and toggle their online availability.
- **Endpoint 1 (Coordinates):** `POST /api/v1/labour/location/update`
  - **Body:** `{ "latitude": 22.7196, "longitude": 75.8577 }`
- **Endpoint 2 (Online Toggle):** `POST /api/v1/labour/location/status`
  - **Body:** `{ "availabilityStatus": "offline" }` (Options: `available`, `busy`, `offline`)
- **Auth:** `Labour` / `Contractor` (Bearer Token)

### 8. Accept Broadcast (FCFS)
Allows a labourer to accept a flash broadcast. The system uses First-Come, First-Serve.
- **Endpoint:** `POST /api/v1/broadcasts/:bookingId/accept`
- **Auth:** `Labour` / `Contractor` (Bearer Token)
- **Response:** Success if first, `409 Conflict` if another labourer already accepted it.

---

## Technical Notes for Frontend Developers:
1. **Cloudinary Uploads:** Before calling `createBooking`, if the user has photos, upload them as `multipart/form-data` to `POST /api/v1/uploads/media?folder=job-posters`. Extract the `data.asset.url` from the response and pass them as an array to `imageNames` in `createBooking`.
2. **GST Calculation:** The GST is calculated dynamically on the backend as `(basePrice * durationDays + platformFee) * gstPercentage / 100`. You just need to display the `taxes` field returned by the `/calculate-bill` endpoint. 
3. **Online Payment Fulfillment:** The backend automatically credits the labourer's self-wallet when a job is marked `COMPLETED` and the `paymentMethod` was `ONLINE`. You don't need to manually trigger any wallet endpoints for this.
4. **Flash Broadcast:** Broadcasts are now fired to ALL eligible labourers within the configured radius simultaneously. The first one to call the accept API gets the job.

### 9. Update Booking Status (Labour Only)
Labourers use this API to progress the job status.
- **Endpoint:** `PUT /api/v1/bookings/:id/status`
- **Auth:** `Labour` (Bearer Token)
- **Body for EN_ROUTE or CANCELLED:**
  ```json
  { "status": "EN_ROUTE" }
  ```
- **Body for STARTED (Requires Start OTP from Customer):**
  ```json
  { "status": "STARTED", "otp": "4921" }
  ```
- **Body for COMPLETED (Requires Completion OTP from Customer):**
  ```json
  { "status": "COMPLETED", "otp": "8390" }
  ```
- **Note:** Customers can see the `startOtp` and `completionOtp` in their `GET /api/v1/bookings/:id` API response. Labourers cannot see the OTP via the API; they must physically ask the customer.

## Review & Rating APIs

### 10. Submit a Review
Customers can submit a review and rating for a labourer after a job is completed.
- **Endpoint:** `POST /api/v1/reviews`
- **Auth:** `User` (Bearer Token)
- **Request Body:**
  ```json
  {
    "bookingId": "64d...",
    "rating": 5,
    "comment": "Very good work!"
  }
  ```

### 11. Get Reviews for a Labourer
Fetches all reviews and ratings for a specific labourer.
- **Endpoint:** `GET /api/v1/reviews/user/:userId`
- **Auth:** `User` / `Labour` (Bearer Token)
- **Response Format:** Returns an array of review objects containing `rating`, `comment`, and the reviewer's details.

## Wallet & Withdrawal APIs

### 12. Request Wallet Withdrawal (Labour)
Allows a labourer to withdraw their earnings to their bank account.
- **Endpoint:** `POST /api/v1/wallets/withdraw`
- **Auth:** `Labour` (Bearer Token)
- **Request Body:**
  ```json
  {
    "amount": 500,
    "bankDetails": {
      "accountNumber": "1234567890",
      "ifscCode": "HDFC0001234",
      "accountHolderName": "Raju",
      "bankName": "HDFC Bank"
    }
  }
  ```

### 13. Get My Withdrawal History (Labour)
Fetches the history and status (PENDING, APPROVED, REJECTED) of withdrawal requests.
- **Endpoint:** `GET /api/v1/wallets/withdrawals`
- **Auth:** `Labour` (Bearer Token)

### 14. Admin: Process Withdrawal (Admin)
Allows the admin to approve or reject a withdrawal request.
- **Endpoint:** `PATCH /api/v1/admin/wallets/withdrawals/:id`
- **Auth:** `Admin` (Bearer Token)
- **Request Body:**
  ```json
  {
    "status": "APPROVED",
    "adminRemarks": "Processed via NEFT"
  }
  ```

## Complaint Management APIs

### 15. Submit a Complaint (Customer / Labour)
Allows users to file a complaint against each other.
- **Endpoint:** `POST /api/v1/complaints`
- **Auth:** `User` / `Labour` (Bearer Token)
- **Request Body:**
  ```json
  {
    "complaineeId": "64d...",
    "bookingId": "64d...",
    "title": "Unprofessional Behavior",
    "description": "The worker arrived very late and left early."
  }
  ```

### 16. Get My Complaints (Customer / Labour)
Fetches all complaints submitted by the logged-in user.
- **Endpoint:** `GET /api/v1/complaints/my`
- **Auth:** `User` / `Labour` (Bearer Token)

### 17. Admin: Get All Complaints
Fetches complaints for the admin dashboard (can filter by status).
- **Endpoint:** `GET /api/v1/admin/complaints?status=OPEN`
- **Auth:** `Admin` (Bearer Token)

### 18. Admin: Process Complaint
Allows the admin to update the status of a complaint and add remarks.
- **Endpoint:** `PATCH /api/v1/admin/complaints/:id`
- **Auth:** `Admin` (Bearer Token)
- **Request Body:**
  ```json
  {
    "status": "RESOLVED",
    "adminRemarks": "Warned the worker. Issue settled."
  }
  ```

## Dashboard APIs

### 19. Admin: Get Dashboard Statistics
Fetches aggregated data for the admin dashboard, including revenue, user counts, bookings, and pending actions (withdrawals/complaints).
- **Endpoint:** `GET /api/v1/admin/dashboard/stats`
- **Auth:** `Admin` (Bearer Token)
- **Response Format:**
  ```json
  {
    "data": {
      "revenue": {
        "platformEarnings": 1500,
        "taxesCollected": 270,
        "grossTransactionVolume": 10500
      },
      "users": {
        "customers": 120,
        "labourers": 45,
        "contractors": 5
      },
      "actionable": {
        "pendingWithdrawals": 2,
        "openComplaints": 1
      },
      "bookings": {
        "active": 3,
        "completed": 42,
        "total": 50
      }
    }
  }
  ```

## Banner Management APIs

> [!IMPORTANT]
> **Frontend Integration Note:** The app currently uses dummy static images for banners in the Customer/User Panel. You must remove the dummy logic and use the new dynamic API `GET /api/v1/banners` to fetch and render the active banners.

### 20. Admin: Manage Banners (CRUD)
Allows the admin to add, update, list, and delete promotional banners.
- **Get All Banners (Admin):** `GET /api/v1/admin/banners`
- **Create Banner:** `POST /api/v1/admin/banners`
  - **Content-Type:** `multipart/form-data`
  - Body: `file` (the image file), `targetUrl` (string), `isActive` (boolean), `sortOrder` (number)
- **Update Banner:** `PATCH /api/v1/admin/banners/:id`
  - **Content-Type:** `multipart/form-data`
  - Body: `file` (optional new image), `targetUrl`, `isActive`, `sortOrder`
- **Delete Banner:** `DELETE /api/v1/admin/banners/:id`
- **Auth:** `Admin` (Bearer Token)

### 21. User: Get Active Banners
Fetches the list of active banners to be displayed dynamically in the user panel.
- **Endpoint:** `GET /api/v1/banners`
- **Auth:** Public / `User` (Bearer Token optional depending on route setup)
- **Response Format:** Returns an array of banner objects sorted by `sortOrder`.

---

## WebSocket (Socket.io) Events

The frontend must connect to the backend WebSocket server and listen for real-time events. Ensure you pass the user's JWT token during connection:
```javascript
const socket = io(BACKEND_URL, { auth: { token: 'YOUR_JWT_TOKEN' } })
```

### 1. Events for Customers (`Role: USER`)
- **`BOOKING_BROADCAST_STARTED`**
  - **Description:** Fired when the system finds eligible labourers and starts broadcasting.
  - **Payload:** `{ bookingId: "...", radiusKm: 10, eligibleCount: 5 }`
- **`BOOKING_ACCEPTED`**
  - **Description:** Fired when a labourer accepts the broadcast.
  - **Payload:** `{ bookingId: "...", laborId: "..." }`
  - **Action:** Fetch labourer details and update UI.
- **`BOOKING_STATUS_UPDATE`**
  - **Description:** Fired when the labourer updates the booking status (e.g., `EN_ROUTE`, `STARTED`, `COMPLETED`).
  - **Payload:** `{ bookingId: "...", status: "..." }`
  - **Action:** Update the job tracking progress bar.

### 2. Events for Labourers (`Role: LABOUR`)
- **`BOOKING_RECEIVED`**
  - **Description:** Fired when a flash broadcast falls within the labourer's radius and they are matched.
  - **Payload:** 
    ```json
    {
      "bookingId": "...",
      "basePrice": 800,
      "laborShare": 723.24,
      "address": { "locationText": "Sector 14...", "coordinates": [75.8, 22.7] },
      "type": "INSTANT",
      "timeoutMs": 60000
    }
    ```
  - **Action:** Show the "Accept/Reject" popup screen. The labourer has `timeoutMs` to respond using `POST /api/v1/broadcasts/:bookingId/accept`.
- **`BOOKING_EXPIRED`**
  - **Description:** Fired when another labourer accepted the job first, or the broadcast timed out.
  - **Payload:** `{ bookingId: "..." }`
  - **Action:** Remove the broadcast popup from the screen immediately.


# Frontend Integration Plan: Individual Booking Flow

This plan outlines the steps to replace the dummy local storage logic in `IndividualBookingFlowPage.jsx` with the fully operational real-time backend API and WebSockets we just built.

## Proposed Changes

### 1. New API Endpoints Integration (`bookingsApi.js`)
We will create or update RTK Query endpoints (or Axios calls) in `bookingsApi.js` for:
- `calculateBill`: `POST /api/v1/bookings/calculate`
- `createBooking`: `POST /api/v1/bookings`
- `getBookingStatus`: `GET /api/v1/bookings/:id` (for fetching OTPs and live status)

### 2. Remove Dummy Data (`IndividualBookingFlowPage.jsx`)
#### [MODIFY] `src/pages/app/booking/IndividualBookingFlowPage.jsx`
- Completely remove `simulateAccept()`, `loadIndividualBookings`, `saveIndividualBookings`, and `createIndividualBookingRecord` imports.
- Stop using the old `/workforce/requests` API mutation.

### 3. Step 3: Summary / Bill Calculation
#### [MODIFY] `src/pages/app/booking/IndividualBookingFlowPage.jsx`
- When the user reaches the "Summary" step, we will call the new `/api/v1/bookings/calculate` API to fetch the exact `taxes`, `platformFee`, and `totalAmount` calculated dynamically by the backend, rather than estimating it on the frontend.

### 4. Step 4: Booking Creation & Searching
#### [MODIFY] `src/pages/app/booking/IndividualBookingFlowPage.jsx`
- **Confirm Booking:** When the user clicks "Confirm Booking", call `POST /api/v1/bookings` with `paymentMethod`, `subcategoryId`, `type`, and `locationText`.
- **Searching State:** After creation, the frontend transitions to the `searching` step and connects to the **Socket.io** server.

### 5. WebSocket Integration (`useBookingSocket.js`)
#### [NEW] `src/hooks/useBookingSocket.js`
- Create a dedicated hook to listen to socket events.
- **`BOOKING_BROADCAST_STARTED`**: Update UI to show the search is actively scanning X km radius.
- **`BOOKING_ACCEPTED`**: Triggered when a labourer accepts the flash broadcast. Fetch the labourer details and transition the flow to `active`!
- **`BOOKING_STATUS_UPDATE`**: Update the step progress bar (EN_ROUTE, STARTED, COMPLETED) in real-time.

### 6. Job Tracking & OTP Display
#### [MODIFY] `src/pages/app/booking/IndividualBookingFlowPage.jsx` (Active Step)
- In the `active` state screen, we will fetch the booking details using the ID from the URL.
- We will display the `startOtp` and `completionOtp` prominently on the screen so the customer can read them out to the labourer.

## User Review Required
> [!IMPORTANT]
> The current dummy code allows picking a "Smart Match" vs "Manual Pick" of workers. Since our backend uses a purely radius-based **Flash Broadcast** (First-Come, First-Serve), we will remove the "Manual Pick" logic and route all bookings through the flash broadcast engine. Do you approve this UI simplification?
\ n # # #   U p d a t e   M y   L a b o u r   C a t e g o r i e s   ( S e r v i c e   P r i c i n g ) \ n -   * * E n d p o i n t : * *   \ P A T C H   / a p i / v 1 / u s e r s / m e / l a b o u r - c a t e g o r i e s \ \ n -   * * D e s c r i p t i o n : * *   U p d a t e s   t h e   s e l e c t e d   l a b o u r   s u b c a t e g o r i e s   a n d   s p e c i f i c   m i n i m u m   a n d   m a x i m u m   p r i c e   e x p e c t a t i o n s   f o r   e a c h   r o l e . \ n -   * * A u t h   R e q u i r e d : * *   Y e s   ( L a b o u r   R o l e   O n l y ) \ n -   * * B o d y : * * \ n     \ \ \ j s o n \ n     { \ n         \  
 s e r v i c e s \ :   [ \ n             {   \ s u b c a t e g o r y I d \ :   \ 6 0 f . . . \ ,   \ m i n P r i c e \ :   7 0 0 ,   \ m a x P r i c e \ :   9 0 0   } \ n         ] \ n     } \ n     \ \ \ \ n -   * * R e s p o n s e : * *   R e t u r n s   u p d a t e d   u s e r   o b j e c t   w i t h   \ l a b o u r P r o f i l e . s e r v i c e P r i c i n g \   p o p u l a t e d .  
 

## BuildMart APIs

### Admin Lead Management
- **Get Leads:** `GET /api/v1/admin/buildmart/leads` (Supports `?page=1&limit=20&status=new&search=term`)
- **Update Lead Status:** `PATCH /api/v1/admin/buildmart/leads/:id`
  - **Body:** `{ "status": "contacted" }` (Options: new, contacted, quoted, won, lost)

### Admin Catalog Management (CRUD)
- **Categories:** `/api/v1/buildmart/admin/categories` (GET, POST, PUT, DELETE)

### Admin: Manage Products (CRUD)
Allows the admin to add, update, list, and delete BuildMart products.
- **Get All Products:** `GET /api/v1/buildmart/admin/products`
- **Create Product:** `POST /api/v1/buildmart/admin/products`
  - **Body:**
    ```json
    {
      "id": "p1",
      "name": "Cement",
      "brand": "UltraTech",
      "categoryId": "c1",
      "shortDescription": "High quality cement",
      "images": ["https://..."],
      "availability": "in_stock",
      "variants": [
        {
          "id": "v1",
          "label": "50kg Bag",
          "retailPrice": 400,
          "contractorPrice": 380
        }
      ]
    }
    ```
- **Update Product:** `PUT /api/v1/buildmart/admin/products/:id`
  - **Body:** Same as create product (all optional)
- **Delete Product:** `DELETE /api/v1/buildmart/admin/products/:id`

- **Banners:** `/api/v1/buildmart/admin/banners` (GET, POST, PUT, DELETE)

### App Catalog (Read-Only)
- **Categories:** `GET /api/v1/buildmart/app/categories`
- **Products:** `GET /api/v1/buildmart/app/products`
- **Banners:** `GET /api/v1/buildmart/app/banners`

### Submit Quote Request (App)
- **Endpoint:** `POST /api/v1/buildmart/quotes`
- **Auth:** `User` / `Labour` / `Contractor`
- **Body:**
  ```json
  {
    "productId": "p1",
    "productName": "Cement",
    "quantity": 50,
    "siteLocation": "Sector 14",
    "name": "Raju",
    "phone": "9999999999"
  }
  ```

