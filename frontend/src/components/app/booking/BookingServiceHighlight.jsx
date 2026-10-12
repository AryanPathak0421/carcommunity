/** Selected trade / skill — prominent highlight on booking steps. */
export function BookingServiceHighlight({ categoryName, groupName, kicker = 'Booking for' }) {
  if (!categoryName && !groupName) return null

  return (
    <div className="lc-booking-highlight" role="status">
      <p className="lc-booking-highlight-kicker">{kicker}</p>
      {categoryName ? <p className="lc-booking-highlight-title">{categoryName}</p> : null}
      {groupName ? <p className="lc-booking-highlight-sub">{groupName}</p> : null}
    </div>
  )
}
