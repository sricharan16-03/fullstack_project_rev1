let currentDeleteId = null;
let ticketsChart, revenueChart, seatChart;
let revenueData = [];

document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    if (!user) { window.location.href = 'login.html'; return; }
    if (user.role !== 'admin') { window.location.href = 'index.html'; return; }
    document.getElementById('navUserName').textContent = user.name;
    loadStats();
    loadEvents();
});

function switchTab(tab) {
    document.querySelectorAll('.admin-tab-btn').forEach((btn, i) => {
        btn.classList.toggle('active', ['events', 'analytics', 'bookings'][i] === tab);
    });
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    const panels = { events: 'panelEvents', analytics: 'panelAnalytics', bookings: 'panelBookings' };
    document.getElementById(panels[tab]).classList.add('active');
    if (tab === 'analytics') loadAnalytics();
    if (tab === 'bookings') loadAllBookings();
}

async function loadStats() {
    try {
        const s = await apiFetch('/api/admin/stats');
        document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card">
        <span class="stat-icon">📅</span>
        <div class="stat-value">${s.total_events}</div>
        <div class="stat-label">Total Events</div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">🎟️</span>
        <div class="stat-value">${s.total_tickets}</div>
        <div class="stat-label">Tickets Sold</div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">💰</span>
        <div class="stat-value">${fmtCurrency(s.total_revenue)}</div>
        <div class="stat-label">Total Revenue</div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">📋</span>
        <div class="stat-value">${s.total_bookings}</div>
        <div class="stat-label">Total Bookings</div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">👥</span>
        <div class="stat-value">${s.total_users}</div>
        <div class="stat-label">Registered Users</div>
      </div>`;
    } catch (err) {
        document.getElementById('statsGrid').innerHTML =
            `<p style="color:var(--danger);">Failed to load stats: ${err.message}</p>`;
    }
}

async function loadEvents() {
    try {
        const events = await apiFetch('/api/events');
        const tbody = document.getElementById('eventsTableBody');
        if (!events.length) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);">No events yet. Create one!</td></tr>`;
            return;
        }
        tbody.innerHTML = events.map(e => `
      <tr>
        <td style="font-weight:600;max-width:200px;">${e.title}</td>
        <td style="white-space:nowrap;">${fmtDate(e.event_date)}</td>
        <td style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.venue}</td>
        <td>${fmtCurrency(e.ticket_price)}</td>
        <td>${e.total_seats}</td>
        <td><span style="color:${e.available_seats === 0 ? 'var(--danger)' : 'var(--success)'};">${e.available_seats}</span></td>
        <td>${statusBadge(e.status)}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-outline btn-sm" onclick="openEditModal(${JSON.stringify(e).replace(/"/g, '&quot;')})">✏️ Edit</button>
            <button class="btn btn-danger btn-sm"  onclick="confirmDelete(${e.event_id})">🗑️</button>
          </div>
        </td>
      </tr>`).join('');
    } catch (err) {
        document.getElementById('eventsTableBody').innerHTML =
            `<tr><td colspan="8" style="color:var(--danger);padding:20px;">${err.message}</td></tr>`;
    }
}

function openCreateModal() {
    document.getElementById('modalTitle').textContent = 'Create Event';
    document.getElementById('eventSubmitBtn').textContent = 'Create Event';
    document.getElementById('editEventId').value = '';
    document.getElementById('evTitle').value = '';
    document.getElementById('evDesc').value = '';
    document.getElementById('evDate').value = '';
    document.getElementById('evVenue').value = '';
    document.getElementById('evPrice').value = '';
    document.getElementById('evSeats').value = '';
    document.getElementById('statusGroup').style.display = 'none';
    document.getElementById('eventModal').style.display = 'flex';
}

function openEditModal(e) {
    document.getElementById('modalTitle').textContent = 'Edit Event';
    document.getElementById('eventSubmitBtn').textContent = 'Save Changes';
    document.getElementById('editEventId').value = e.event_id;
    document.getElementById('evTitle').value = e.title;
    document.getElementById('evDesc').value = e.description || '';
    document.getElementById('evDate').value = toDatetimeLocal(e.event_date);
    document.getElementById('evVenue').value = e.venue;
    document.getElementById('evPrice').value = e.ticket_price;
    document.getElementById('evSeats').value = e.total_seats;
    document.getElementById('evStatus').value = e.status;
    document.getElementById('statusGroup').style.display = 'block';
    document.getElementById('eventModal').style.display = 'flex';
}

function toDatetimeLocal(d) {
    const dt = new Date(d);
    const pad = n => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

async function handleEventSubmit(ev) {
    ev.preventDefault();
    const btn = document.getElementById('eventSubmitBtn');
    const id = document.getElementById('editEventId').value;
    const payload = {
        title: document.getElementById('evTitle').value.trim(),
        description: document.getElementById('evDesc').value.trim(),
        event_date: document.getElementById('evDate').value,
        venue: document.getElementById('evVenue').value.trim(),
        ticket_price: parseFloat(document.getElementById('evPrice').value),
        total_seats: parseInt(document.getElementById('evSeats').value),
    };
    if (id) payload.status = document.getElementById('evStatus').value;

    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/events/${id}` : '/api/events';
        await apiFetch(url, { method, body: JSON.stringify(payload) });
        showToast(id ? 'Event updated successfully!' : 'Event created successfully!', 'success');
        closeModal('eventModal');
        loadEvents();
        loadStats();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = id ? 'Save Changes' : 'Create Event';
    }
}

function confirmDelete(id) {
    currentDeleteId = id;
    document.getElementById('deleteModal').style.display = 'flex';
    document.getElementById('confirmDeleteBtn').onclick = async () => {
        try {
            await apiFetch(`/api/events/${currentDeleteId}`, { method: 'DELETE' });
            showToast('Event deleted.', 'success');
            closeModal('deleteModal');
            loadEvents();
            loadStats();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };
}


async function loadAnalytics() {
    try {
        revenueData = await apiFetch('/api/admin/revenue');
        renderCharts(revenueData);
    } catch (err) {
        showToast('Failed to load analytics: ' + err.message, 'error');
    }
}

const CHART_COLORS = [
    'rgba(212,175,55,0.8)', 'rgba(52,152,219,0.8)', 'rgba(46,204,113,0.8)',
    'rgba(231,76,60,0.8)', 'rgba(155,89,182,0.8)', 'rgba(241,196,15,0.8)',
    'rgba(26,188,156,0.8)', 'rgba(230,126,34,0.8)'
];

const CHART_DEFAULTS = {
    color: '#3A2E20',
    font: { family: 'Inter' }
};

function chartGlobalDefaults() {
    Chart.defaults.color = CHART_DEFAULTS.color;
    Chart.defaults.font.family = CHART_DEFAULTS.font.family;
}

function renderCharts(data) {
    chartGlobalDefaults();
    const labels = data.map(d => d.title);
    const tickets = data.map(d => d.tickets_sold);
    const revenues = data.map(d => parseFloat(d.revenue));
    const utilPct = data.map(d => d.total_seats > 0
        ? Math.round((d.tickets_sold / d.total_seats) * 100) : 0);

    const gridColor = 'rgba(196,136,60,0.12)';
    const axisColor = '#6A5840';

    const scaleOpts = {
        grid: { color: gridColor },
        ticks: { color: axisColor }
    };

    if (ticketsChart) ticketsChart.destroy();
    ticketsChart = new Chart(document.getElementById('ticketsChart'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Tickets Sold',
                data: tickets,
                backgroundColor: CHART_COLORS,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { x: scaleOpts, y: { ...scaleOpts, beginAtZero: true } }
        }
    });

    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(document.getElementById('revenueChart'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: revenues,
                backgroundColor: CHART_COLORS,
                borderColor: '#000',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#3A2E20', padding: 12 } },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ₹${ctx.parsed.toLocaleString('en-IN')}`
                    }
                }
            }
        }
    });

    if (seatChart) seatChart.destroy();
    seatChart = new Chart(document.getElementById('seatChart'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Utilisation %',
                data: utilPct,
                backgroundColor: utilPct.map(p =>
                    p >= 80 ? 'rgba(231,76,60,0.8)' :
                        p >= 50 ? 'rgba(241,196,15,0.8)' :
                            'rgba(46,204,113,0.8)'),
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { ...scaleOpts, max: 100, ticks: { ...scaleOpts.ticks, callback: v => v + '%' } },
                y: scaleOpts
            }
        }
    });
}


async function loadAllBookings() {
    try {
        const bookings = await apiFetch('/api/admin/bookings');
        const tbody = document.getElementById('bookingsTableBody');
        if (!bookings.length) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">No bookings yet.</td></tr>`;
            return;
        }
        tbody.innerHTML = bookings.map(b => `
      <tr>
        <td style="color:var(--amber);font-weight:600;">#${b.booking_id}</td>
        <td>${b.user_name}</td>
        <td style="color:var(--text-muted);font-size:0.85rem;">${b.email}</td>
        <td style="font-weight:500;">${b.event_title}</td>
        <td>${b.tickets_booked}</td>
        <td style="color:var(--amber-deep);font-weight:600;">${fmtCurrency(b.total_amount)}</td>
        <td style="color:var(--text-muted);font-size:0.85rem;">${fmtDate(b.booking_date)}</td>
      </tr>`).join('');
    } catch (err) {
        document.getElementById('bookingsTableBody').innerHTML =
            `<tr><td colspan="7" style="color:var(--danger);padding:20px;">${err.message}</td></tr>`;
    }
}

function logout() {
    apiFetch('/api/auth/logout', { method: 'POST' })
        .catch(() => { })
        .finally(() => {
            clearUser();
            window.location.href = 'login.html';
        });
}

