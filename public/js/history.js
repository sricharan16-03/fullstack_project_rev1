async function loadHistory() {
  const user = getUser();
  if (!user) { window.location.href = 'login.html'; return; }
  if (user.role === 'admin') { window.location.href = 'admin.html'; return; }

  document.getElementById('navUserName').textContent = user.name;

  try {
    const bookings = await apiFetch('/api/bookings/my');
    renderStats(bookings);
    renderHistory(bookings);
  } catch (err) {
    document.getElementById('historyList').innerHTML =
      `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    document.getElementById('bookingStats').innerHTML = '';
  }
}

function renderStats(bookings) {
  const totalTickets = bookings.reduce((s, b) => s + b.tickets_booked, 0);
  const totalSpent = bookings.reduce((s, b) => s + parseFloat(b.total_amount), 0);
  const upcoming = bookings.filter(b => b.status === 'upcoming').length;

  document.getElementById('bookingStats').innerHTML = `
    <div class="stat-card">
      <span class="stat-icon">🎟️</span>
      <div class="stat-value">${bookings.length}</div>
      <div class="stat-label">Total Bookings</div>
    </div>
    <div class="stat-card">
      <span class="stat-icon">🪑</span>
      <div class="stat-value">${totalTickets}</div>
      <div class="stat-label">Tickets Booked</div>
    </div>
    <div class="stat-card">
      <span class="stat-icon">💰</span>
      <div class="stat-value">${fmtCurrency(totalSpent)}</div>
      <div class="stat-label">Total Spent</div>
    </div>
    <div class="stat-card">
      <span class="stat-icon">📅</span>
      <div class="stat-value">${upcoming}</div>
      <div class="stat-label">Upcoming Events</div>
    </div>`;
}

function renderHistory(bookings) {
  const container = document.getElementById('historyList');
  if (!bookings.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎭</div>
        <h3>No bookings yet</h3>
        <p>You haven't booked any tickets yet. Explore upcoming events!</p>
        <a href="events.html" class="btn btn-primary">Browse Events →</a>
      </div>`;
    return;
  }

  container.innerHTML = bookings.map(b => `
    <div class="booking-history-card">
      <div class="booking-history-header">
        <div>
          <div style="font-family:'Space Grotesk',sans-serif;font-size:1.05rem;font-weight:700;">${b.title}</div>
          <div style="color:var(--text-muted);font-size:0.82rem;margin-top:4px;">📍 ${b.venue}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          ${statusBadge(b.status)}
          <span style="font-size:0.75rem;color:var(--text-muted);">Booking #${b.booking_id}</span>
        </div>
      </div>
      <div class="booking-history-body">
        <div class="booking-history-item">
          <label>Event Date</label>
          <p>${fmtDate(b.event_date)}</p>
        </div>
        <div class="booking-history-item">
          <label>Tickets</label>
          <p>${b.tickets_booked}</p>
        </div>
        <div class="booking-history-item">
          <label>Amount Paid</label>
          <p style="color:var(--amber-deep);">${fmtCurrency(b.total_amount)}</p>
        </div>
        <div class="booking-history-item">
          <label>Booked On</label>
          <p>${fmtDate(b.booking_date)}</p>
        </div>
      </div>
    </div>`).join('');
}

document.addEventListener('DOMContentLoaded', loadHistory);

