# Mappto Frontend Developer Guide (Deep Dive)

Welcome to the frontend development phase of Mappto! The backend architecture is fully complete, and the API wrapper functions have already been generated for you in `src/api/`. 

This guide details **what** React components need to be built, **how** they should behave, **which APIs** they consume, and provides **code snippets & state management strategies**.

---

## 1. Global Setup & State Management

### 1.1 WebSockets (`src/context/SocketContext.jsx`)
Both Customers and Laborers need real-time matching. 

**Implementation Details:**
1. Install `socket.io-client` (`npm i socket.io-client`).
2. Create a global React Context that initializes the socket connection only when a user is authenticated.
3. Store the active socket instance in the context so components can use `useSocket()` to listen to events.

**Code Snippet:**
```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux'; // Assuming Redux for auth state

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token } = useSelector((state) => state.auth);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (token) {
      const newSocket = io(import.meta.env.VITE_API_URL.replace('/api/v1', ''), {
        auth: { token }
      });
      setSocket(newSocket);
      return () => newSocket.close();
    }
  }, [token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
```

### 1.2 Global State (Redux / Context)
* **Auth State:** Should store `token`, `role` (`USER` or `LABOUR`), and `_id`.
* **Active Job State:** Create an `activeJobSlice` to store `currentBookingId` and `currentBookingStatus`. This prevents losing the job tracking screen if the user refreshes the page.

---

## 2. Customer App Flows (`src/panels/user/` or `src/pages/app/`)

### 2.1 Service Catalog & Checkout
1. **Catalog View (`src/pages/app/ServiceCatalog.jsx`):** 
   * Fetch categories via `labourCategoriesApi`. 
   * **Important:** Subcategories are now nested inside the category object (`category.subcategories`). Render these as selectable cards.
2. **Checkout Screen (`src/pages/app/Checkout.jsx`):** 
   * **State:** Hold `subcategoryId`, `address`, and `paymentMethod`.
   * **Effect:** When `subcategoryId` is set, call `bookingsApi.calculateBill({ subcategoryId })` and display `basePrice`, `platformFee`, and `totalAmount`.
   * **Submit:** Call `bookingsApi.createBooking(...)`. If `paymentMethod === 'CASH'`, redirect immediately to `JobTracking.jsx`. If `ONLINE`, trigger Razorpay.

### 2.2 Payment Integration (Razorpay)
When the user clicks "Pay Online" in `Checkout.jsx`:
1. Dynamically load the Razorpay script:
```javascript
const loadRazorpay = () => new Promise((resolve) => {
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  document.body.appendChild(script);
});
```
2. Call `paymentsApi.initPayment({ amount, purpose: 'BOOKING', bookingId })`.
3. Configure the Razorpay options:
```javascript
const options = {
  key: import.meta.env.VITE_RAZORPAY_KEY_ID,
  amount: order.amount,
  currency: "INR",
  order_id: order.id,
  handler: async function (response) {
    // Verify payment on backend
    await paymentsApi.verifyPayment({
      razorpayOrderId: response.razorpay_order_id,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature
    });
    // Redirect to tracking
    navigate(`/tracking/${bookingId}`);
  }
};
const rzp = new window.Razorpay(options);
rzp.open();
```

### 2.3 Job Tracking & Reviews (`src/pages/app/JobTracking.jsx`)
* **Mount:** Call `bookingsApi.getBookingStatus(id)` to load Laborer details (Name, Phone, Profile Pic).
* **Socket Listeners:**
  * `socket.on('BOOKING_ACCEPTED', (data) => fetchLaborDetails(data.laborId))`
  * `socket.on('BOOKING_STATUS_UPDATE', (data) => setStatus(data.status))`
* **UI:** Render a Stepper / Progress Bar (`CREATED` -> `ACCEPTED` -> `EN_ROUTE` -> `STARTED` -> `COMPLETED`).
* **Completion (`src/components/ReviewModal.jsx`):** If status becomes `COMPLETED`, auto-open a modal with a 5-star interactive component. On submit, call `reviewsApi.submitReview({ bookingId, rating, comment })`.

---

## 3. Labor App Flows (`src/panels/labor/` or `src/pages/app/`)

### 3.1 Broadcast Acceptance (`src/components/BroadcastPopup.jsx`)
This is the most critical UI for Laborers. It must render globally (e.g., inside `App.jsx` or a high-level layout) so it interrupts them no matter what screen they are on.
* **Listener:** `socket.on('NEW_BROADCAST', (jobData) => setIncomingJob(jobData))`
* **State:** `const [timeLeft, setTimeLeft] = useState(30)`
* **Timer Logic:** Use a `setInterval` that decrements `timeLeft`. If it hits 0, auto-call `broadcastsApi.rejectBroadcast(jobData.logId)` and close the popup.
* **Manual Actions:** 
  * "Accept": `broadcastsApi.acceptBroadcast(logId)` -> Navigate to Active Job Screen.
  * "Reject": `broadcastsApi.rejectBroadcast(logId)` -> Close popup.

### 3.2 Active Job Management (`src/pages/app/ActiveJob.jsx`)
When a Laborer accepts a job, they need to update the customer.
* **Action Buttons (Conditionally Rendered):**
  * If status is `ACCEPTED`: Show "Start Journey" button -> `bookingsApi.updateBookingStatus(id, 'EN_ROUTE')`.
  * If status is `EN_ROUTE`: Show "Start Work" button -> `bookingsApi.updateBookingStatus(id, 'STARTED')`.
  * If status is `STARTED`: Show "Finish Job" button -> `bookingsApi.updateBookingStatus(id, 'COMPLETED')`.
* **Cancellations:** Add a subtle "Cancel Job" button. Show a `window.confirm` warning: *"Are you sure? A ₹50 penalty will be applied to your wallet."* If yes, call `updateBookingStatus(id, 'CANCELLED')`.

### 3.3 Dual-Wallet System (`src/pages/app/LaborWallet.jsx`)
Laborers have two balances:
* **Fetch:** `walletsApi.getMyWallet()`.
* **UI Cards:**
  1. **Earnings (Self Balance):** Money they earned from Online payments. (Green text).
  2. **Dues (Admin Balance):** Money they owe the platform from Cash payments. (Red text).
* **Clear Dues Workflow:**
  * Fetch the `walletLimit` from `adminSettingsApi.getSettings()`.
  * If `adminBalance > walletLimit`, display a warning: *"Your account is blocked from receiving new jobs. Please clear your dues."*
  * "Clear Dues" button triggers `paymentsApi.initPayment({ amount: adminBalance, purpose: 'WALLET_CLEARANCE' })` -> opens Razorpay -> calls `paymentsApi.verifyPayment()`.

---

## 4. Admin Panel Flows (`src/pages/admin/`)

### 4.1 Subcategory Management (`src/pages/admin/Categories.jsx`)
* **UI Update:** Inside the existing Category Accordion/List, add a "+ Add Subcategory" button.
* **Form Fields:** Name, Description, Base Price (₹), Estimated Duration (mins).
* **API:** `adminLabourCategoriesApi` (requires `POST /api/v1/admin/labour-subcategories`).

### 4.2 Global Settings (`src/pages/admin/Settings.jsx`)
* **Mount:** Call `adminSettingsApi.getSettings()` to pre-fill the state.
* **Section 1 (Platform Fee):** A form with a dropdown (`Percentage` or `Fixed`) and an input field for the value. Calls `updatePlatformFees()`.
* **Section 2 (Commission):** An input field for the global percentage the platform takes from laborers. Calls `updateCommission()`.
* **Section 3 (Wallet Limit):** An input field for the max liability a laborer can hold. Calls `updateWalletLimit()`.
