const EVENT_EMOJIS2 = ['🎸', '🎯', '🎤', '🎭', '🏆', '🎨', '🎵', '🎪', '🌟', '💫'];

async function loadEventDetail() {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get('id');
  if (!eventId) { window.location.href = 'events.html'; return; }

  try {
    const e = await apiFetch(`/api/events/${eventId}`);
    renderEvent(e);
  } catch (err) {
    document.getElementById('eventContent').innerHTML =
      `<div class="empty-state" style="min-height:100vh;padding-top:160px;">
        <div class="empty-icon">⚠️</div><h3>Event Not Found</h3>
        <p>${err.message}</p>
        <a href="events.html" class="btn btn-primary">Browse Events</a>
      </div>`;
  }
}

function renderEvent(e) {
  const emoji = EVENT_EMOJIS2[e.event_id % EVENT_EMOJIS2.length];
  const soldPct = e.total_seats > 0
    ? Math.round(((e.total_seats - e.available_seats) / e.total_seats) * 100)
    : 0;
  const user = getUser();
  const canBook = user && user.role !== 'admin' && e.status !== 'completed' && e.available_seats > 0;

  document.title = `${e.title} — EventX`;

  let bookingSection = '';
  if (!user) {
    bookingSection = `
      <p style="color:var(--text-muted);text-align:center;margin-bottom:16px;font-size:0.9rem;">
        Please login to book tickets
      </p>
      <a href="login.html" class="btn btn-primary btn-full">Login to Book →</a>`;
  } else if (user.role === 'admin') {
    bookingSection = `
      <div style="background:var(--surface);border-radius:var(--r-md);padding:14px;text-align:center;color:var(--text-muted);font-size:0.88rem;border:1px solid var(--border);">
        🔑 Admins cannot book tickets
      </div>`;
  } else if (e.status === 'completed') {
    bookingSection = `
      <div style="background:var(--surface);border-radius:var(--r-md);padding:14px;text-align:center;color:var(--text-muted);font-size:0.88rem;border:1px solid var(--border);">
        ✅ This event has ended
      </div>`;
  } else if (e.available_seats === 0) {
    bookingSection = `
      <div style="background:rgba(220,50,50,0.08);border:1px solid rgba(220,50,50,0.25);border-radius:var(--r-md);padding:14px;text-align:center;color:#c0392b;font-size:0.88rem;">
        🚫 Sold Out
      </div>`;
  } else {
    bookingSection = `
      <div class="form-group" style="margin-bottom:16px;">
        <label for="ticketQty" style="color:var(--text-muted);font-size:0.82rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">Number of Tickets</label>
        <input type="number" id="ticketQty" class="form-control" value="1" min="1" max="${e.available_seats}"
          oninput="updateTotal(${e.ticket_price})" style="margin-top:6px;"/>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding:12px;background:var(--surface);border-radius:var(--r-md);border:1px solid var(--border);">
        <span style="color:var(--text-muted);font-size:0.88rem;">Total Amount</span>
        <span id="totalAmount" style="font-family:'Space Grotesk',sans-serif;font-size:1.4rem;color:var(--amber-deep);font-weight:700;">
          ${fmtCurrency(e.ticket_price)}
        </span>
      </div>
      <button class="btn btn-primary btn-full pulse" id="bookBtn" onclick="bookTickets(${e.event_id}, ${e.ticket_price})">
        🎟️ Confirm Booking
      </button>`;
  }

  document.getElementById('eventContent').innerHTML = `
    <div class="event-detail-hero">
      <div class="container">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <a href="events.html" style="color:var(--text-muted);font-size:0.85rem;text-decoration:none;">← Back to Events</a>
        </div>
        <div style="font-size:4rem;margin-bottom:16px;">${emoji}</div>
        ${statusBadge(e.status)}
        <h1 style="font-size:clamp(2rem,5vw,3.5rem);margin-top:12px;margin-bottom:8px;">${e.title}</h1>
        <p style="color:var(--text-muted);font-size:1rem;max-width:600px;">${e.description || 'No description available.'}</p>
      </div>
    </div>

    <div class="container">
      <div class="event-detail-grid">
        <!-- Left: details -->
        <div>
          <h2 style="font-size:1.4rem;margin-bottom:20px;">Event Details</h2>
          <div class="event-detail-meta">
            <div class="detail-meta-item">
              <span class="detail-meta-icon">📅</span>
              <div>
                <div class="detail-meta-label">Date &amp; Time</div>
                <div class="detail-meta-value">${fmtDate(e.event_date)}</div>
              </div>
            </div>
            <div class="detail-meta-item">
              <span class="detail-meta-icon">📍</span>
              <div>
                <div class="detail-meta-label">Venue</div>
                <div class="detail-meta-value">${e.venue}</div>
              </div>
            </div>
            <div class="detail-meta-item">
              <span class="detail-meta-icon">🪑</span>
              <div>
                <div class="detail-meta-label">Seat Availability</div>
                <div class="detail-meta-value">${e.available_seats} of ${e.total_seats} seats remaining</div>
              </div>
            </div>
          </div>
          <div class="seat-progress-bar" style="margin-top:4px;">
            <div class="seat-progress-fill" style="width:${soldPct}%"></div>
          </div>
          <p style="font-size:0.78rem;color:var(--text-muted);margin-top:6px;">${soldPct}% seats filled</p>

          ${e.description ? `
          <div style="margin-top:32px;">
            <h3 style="font-size:1.1rem;margin-bottom:12px;">About This Event</h3>
            <p style="color:var(--text-muted);line-height:1.8;">${e.description}</p>
          </div>` : ''}
        </div>

        <!-- Right: booking card -->
        <div>
          <div class="event-booking-card">
            <div class="event-booking-price">${fmtCurrency(e.ticket_price)}</div>
            <p style="color:var(--text-muted);font-size:0.82rem;margin-bottom:20px;">per ticket</p>
            <hr style="border-color:var(--border);margin-bottom:20px;"/>
            ${bookingSection}
          </div>
        </div>
      </div>
    </div>`;
}

function updateTotal(price) {
  const qty = parseInt(document.getElementById('ticketQty')?.value) || 1;
  const el = document.getElementById('totalAmount');
  if (el) el.textContent = fmtCurrency(price * qty);
}

async function bookTickets(eventId, price) {
  const user = getUser();
  if (!user) { window.location.href = 'login.html'; return; }

  const qty = parseInt(document.getElementById('ticketQty')?.value) || 1;
  const btn = document.getElementById('bookBtn');
  btn.disabled = true;
  btn.textContent = 'Processing…';

  try {
    const data = await apiFetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ event_id: eventId, tickets_booked: qty })
    });

    document.getElementById('confirmMsg').textContent =
      `Your booking for "${data.event_title}" is confirmed!`;
    document.getElementById('confirmDetails').innerHTML = `
      <div style="display:grid;gap:10px;">
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-muted);">Booking ID</span><strong>#${data.booking_id}</strong></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-muted);">Tickets</span><strong>${data.tickets_booked}</strong></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-muted);">Total Paid</span><strong style="color:var(--amber-deep);">${fmtCurrency(data.total_amount)}</strong></div>
      </div>`;
    document.getElementById('confirmModal').style.display = 'flex';

  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = '🎟️ Confirm Booking';
  }
}

document.addEventListener('DOMContentLoaded', loadEventDetail);

