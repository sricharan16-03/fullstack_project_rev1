const API_BASE = '';

function getToken() { return localStorage.getItem('token'); }
function setToken(t) { localStorage.setItem('token', t); }
function clearToken() { localStorage.removeItem('token'); }

function getUser() {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}
function setUser(u) { localStorage.setItem('user', JSON.stringify(u)); }
function clearUser() { clearToken(); localStorage.removeItem('user'); }

async function apiFetch(url, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(API_BASE + url, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

function showToast(msg, type = 'info') {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3500);
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none';
    }
});


function logout() {
    apiFetch('/api/auth/logout', { method: 'POST' })
        .catch(() => { })
        .finally(() => {
            clearUser();
            window.location.href = '/index.html';
        });
}

function toggleMenu() {
    document.getElementById('navLinks')?.classList.toggle('open');
}

function setupNav() {
    const user = getUser();
    const navLogin = document.getElementById('navLogin');
    const navLogout = document.getElementById('navLogout');
    const navHistory = document.getElementById('navHistory');
    const navAdmin = document.getElementById('navAdmin');
    const navUserName = document.getElementById('navUserName');

    if (user) {
        if (navLogin) navLogin.style.display = 'none';
        if (navLogout) navLogout.style.display = 'block';
        if (navUserName) navUserName.textContent = user.name;
        if (user.role === 'admin') {
            if (navAdmin) navAdmin.style.display = 'block';
        } else {
            if (navHistory) navHistory.style.display = 'block';
        }
    }
}

function fmtDate(d) {
    return new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function fmtCurrency(n) {
    return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

function statusBadge(status) {
    const labels = { upcoming: 'Upcoming', ongoing: 'Ongoing', completed: 'Completed' };
    return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
}

const EVENT_EMOJIS = ['🎸', '🎯', '🎤', '🎭', '🏆', '🎨', '🎵', '🎪', '🌟', '💫'];

function eventCardHTML(e) {
    const emoji = EVENT_EMOJIS[e.event_id % EVENT_EMOJIS.length];
    const soldPct = Math.round(((e.total_seats - e.available_seats) / e.total_seats) * 100);
    return `
    <div class="event-card" onclick="window.location.href='event-details.html?id=${e.event_id}'">
      <div class="event-card-img">${emoji}</div>
      <div class="event-card-body">
        ${statusBadge(e.status)}
        <div class="event-card-title" style="margin-top:10px;">${e.title}</div>
        <div class="event-card-meta">
          <span>📅 ${fmtDate(e.event_date)}</span>
          <span>📍 ${e.venue}</span>
          <span>🪑 ${e.available_seats} / ${e.total_seats} seats left</span>
        </div>
        <div class="seat-progress-bar">
          <div class="seat-progress-fill" style="width:${soldPct}%"></div>
        </div>
      </div>
      <div class="event-card-footer">
        <span class="event-price">${fmtCurrency(e.ticket_price)}</span>
        <button class="btn btn-primary btn-sm">Book Now →</button>
      </div>
    </div>`;
}


document.addEventListener('DOMContentLoaded', setupNav);

