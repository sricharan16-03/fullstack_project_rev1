let allEvents = [];
let searchTimeout;

async function loadEvents() {
    try {
        const status = document.getElementById('statusFilter').value;
        const search = document.getElementById('searchInput').value.trim();
        let url = '/api/events?';
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (status) url += `status=${status}`;
        allEvents = await apiFetch(url);
        renderEvents(allEvents);
    } catch (err) {
        document.getElementById('eventsGrid').innerHTML =
            `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
}

function renderEvents(events) {
    const grid = document.getElementById('eventsGrid');
    const count = document.getElementById('resultsCount');
    if (!events.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">🎭</div>
      <h3>No events found</h3>
      <p>Try a different search or check back later.</p>
      <a href="events.html" class="btn btn-outline btn-sm">Clear Filters</a>
    </div>`;
        if (count) count.textContent = 'No results';
        return;
    }
    if (count) count.textContent = `Showing ${events.length} event${events.length !== 1 ? 's' : ''}`;
    grid.innerHTML = events.map(e => eventCardHTML(e)).join('');
}

function onSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadEvents, 350);
}

document.addEventListener('DOMContentLoaded', () => {
    loadEvents();
});

