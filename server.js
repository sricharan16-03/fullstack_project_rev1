
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const JWT_SECRET = 'eventplatform_secret_2026';
const PORT = 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'charan',
    database: 'event_ticketing',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


(async () => {
    try {
        const conn = await pool.getConnection();
        console.log('✅  MySQL connected — event_ticketing database ready.');
        conn.release();
    } catch (err) {
        console.error('❌  MySQL connection failed:', err.message);
        process.exit(1);
    }
})();


function authMiddleware(req, res, next) {
    const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) return res.status(401).json({ error: 'Unauthorized — please login.' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

function adminOnly(req, res, next) {
    authMiddleware(req, res, () => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access only.' });
        next();
    });
}


async function refreshEventStatuses() {
    const now = new Date();
    try {
        await pool.query(
            `UPDATE events SET status = 'completed' WHERE event_date < ? AND status != 'completed'`,
            [now]
        );

        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        await pool.query(
            `UPDATE events SET status = 'ongoing' WHERE event_date >= ? AND event_date <= ? AND status = 'upcoming'`,
            [now, tomorrow]
        );
    } catch (err) {
        console.error('Status refresh error:', err.message);
    }
}




app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, adminKey } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ error: 'All fields are required.' });

    // Determine role based on admin secret key
    let role = 'user';
    if (adminKey) {
        if (adminKey === 'admin2026') {
            role = 'admin';
        } else {
            return res.status(400).json({ error: 'Invalid admin secret key.' });
        }
    }

    try {
        const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
        if (existing.length) return res.status(409).json({ error: 'Email already registered.' });
        const hashed = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashed, role]
        );
        res.json({ message: `${role === 'admin' ? 'Admin account' : 'Registration'} successful!`, user_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});


app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password are required.' });
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (!rows.length) return res.status(401).json({ error: 'Invalid credentials.' });
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid credentials.' });
        const token = jwt.sign(
            { user_id: user.user_id, name: user.name, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.cookie('token', token, { httpOnly: true, maxAge: 86400000 });
        res.json({ message: 'Login successful!', token, user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully.' });
});


app.get('/api/auth/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});


app.get('/api/events', async (req, res) => {
    await refreshEventStatuses();
    const { search, status } = req.query;
    let query = 'SELECT * FROM events WHERE 1=1';
    const params = [];
    if (search) {
        query += ' AND (title LIKE ? OR venue LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }
    query += ' ORDER BY event_date ASC';
    try {
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch events.' });
    }
});

app.get('/api/events/:id', async (req, res) => {
    await refreshEventStatuses();
    try {
        const [rows] = await pool.query('SELECT * FROM events WHERE event_id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Event not found.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch event.' });
    }
});


app.post('/api/events', adminOnly, async (req, res) => {
    const { title, description, event_date, venue, ticket_price, total_seats } = req.body;
    if (!title || !event_date || !venue || !ticket_price || !total_seats)
        return res.status(400).json({ error: 'All required fields must be provided.' });
    try {
        const [result] = await pool.query(
            `INSERT INTO events (title, description, event_date, venue, ticket_price, total_seats, available_seats, status, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'upcoming', ?)`,
            [title, description, event_date, venue, ticket_price, total_seats, total_seats, req.user.user_id]
        );
        res.json({ message: 'Event created successfully!', event_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create event.' });
    }
});


app.put('/api/events/:id', adminOnly, async (req, res) => {
    const { title, description, event_date, venue, ticket_price, total_seats, status } = req.body;
    try {
        const [current] = await pool.query('SELECT * FROM events WHERE event_id = ?', [req.params.id]);
        if (!current.length) return res.status(404).json({ error: 'Event not found.' });
        const ev = current[0];
        const seatDiff = (total_seats || ev.total_seats) - ev.total_seats;
        const newAvailable = Math.max(0, ev.available_seats + seatDiff);
        await pool.query(
            `UPDATE events SET title=?, description=?, event_date=?, venue=?, ticket_price=?, total_seats=?, available_seats=?, status=?
             WHERE event_id=?`,
            [
                title || ev.title,
                description ?? ev.description,
                event_date || ev.event_date,
                venue || ev.venue,
                ticket_price || ev.ticket_price,
                total_seats || ev.total_seats,
                newAvailable,
                status || ev.status,
                req.params.id
            ]
        );
        res.json({ message: 'Event updated successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update event.' });
    }
});

app.delete('/api/events/:id', adminOnly, async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM events WHERE event_id = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Event not found.' });
        res.json({ message: 'Event deleted successfully!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete event.' });
    }
});

app.post('/api/bookings', authMiddleware, async (req, res) => {
    if (req.user.role === 'admin') return res.status(403).json({ error: 'Admins cannot book tickets.' });
    const { event_id, tickets_booked } = req.body;
    if (!event_id || !tickets_booked || tickets_booked < 1)
        return res.status(400).json({ error: 'Invalid booking data.' });
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [rows] = await conn.query('SELECT * FROM events WHERE event_id = ? FOR UPDATE', [event_id]);
        if (!rows.length) { await conn.rollback(); return res.status(404).json({ error: 'Event not found.' }); }
        const event = rows[0];
        if (event.status === 'completed') { await conn.rollback(); return res.status(400).json({ error: 'This event has already completed.' }); }
        if (event.available_seats < tickets_booked) { await conn.rollback(); return res.status(400).json({ error: `Only ${event.available_seats} seats available.` }); }
        const total_amount = event.ticket_price * tickets_booked;
        const [bookingResult] = await conn.query(
            'INSERT INTO bookings (user_id, event_id, tickets_booked, total_amount) VALUES (?, ?, ?, ?)',
            [req.user.user_id, event_id, tickets_booked, total_amount]
        );
        await conn.query(
            'UPDATE events SET available_seats = available_seats - ? WHERE event_id = ?',
            [tickets_booked, event_id]
        );
        await conn.commit();
        res.json({
            message: 'Booking confirmed!',
            booking_id: bookingResult.insertId,
            tickets_booked,
            total_amount,
            event_title: event.title
        });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Booking failed. Please try again.' });
    } finally {
        conn.release();
    }
});

app.get('/api/bookings/my', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT b.booking_id, b.tickets_booked, b.total_amount, b.booking_date,
                    e.title, e.event_date, e.venue, e.status
             FROM bookings b
             JOIN events e ON b.event_id = e.event_id
             WHERE b.user_id = ?
             ORDER BY b.booking_date DESC`,
            [req.user.user_id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch booking history.' });
    }
});




app.get('/api/admin/stats', adminOnly, async (req, res) => {
    try {
        const [[{ total_events }]] = await pool.query('SELECT COUNT(*) AS total_events FROM events');
        const [[{ total_bookings }]] = await pool.query('SELECT COUNT(*) AS total_bookings FROM bookings');
        const [[{ total_tickets }]] = await pool.query('SELECT COALESCE(SUM(tickets_booked),0) AS total_tickets FROM bookings');
        const [[{ total_revenue }]] = await pool.query('SELECT COALESCE(SUM(total_amount),0) AS total_revenue FROM bookings');
        const [[{ total_users }]] = await pool.query('SELECT COUNT(*) AS total_users FROM users WHERE role="user"');
        res.json({ total_events, total_bookings, total_tickets, total_revenue, total_users });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

app.get('/api/admin/revenue', adminOnly, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT e.title, e.event_date, e.status, e.total_seats, e.available_seats,
                    COALESCE(SUM(b.tickets_booked),0) AS tickets_sold,
                    COALESCE(SUM(b.total_amount),0)   AS revenue
             FROM events e
             LEFT JOIN bookings b ON e.event_id = b.event_id
             GROUP BY e.event_id
             ORDER BY e.event_date DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch revenue data.' });
    }
});


app.get('/api/admin/bookings', adminOnly, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT b.booking_id, u.name AS user_name, u.email, e.title AS event_title,
                    b.tickets_booked, b.total_amount, b.booking_date
             FROM bookings b
             JOIN users  u ON b.user_id  = u.user_id
             JOIN events e ON b.event_id = e.event_id
             ORDER BY b.booking_date DESC
             LIMIT 100`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch bookings.' });
    }
});


app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.listen(PORT, () => {
    console.log(`🚀  Event Ticketing Platform running → http://localhost:3000`);

});

