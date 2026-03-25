

CREATE DATABASE IF NOT EXISTS event_ticketing;
USE event_ticketing;


CREATE TABLE IF NOT EXISTS users (
    user_id     INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100)        NOT NULL,
    email       VARCHAR(150)        NOT NULL UNIQUE,
    password    VARCHAR(255)        NOT NULL,
    role        ENUM('admin','user') DEFAULT 'user',
    created_at  TIMESTAMP           DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS events (
    event_id         INT AUTO_INCREMENT PRIMARY KEY,
    title            VARCHAR(200)    NOT NULL,
    description      TEXT,
    event_date       DATETIME        NOT NULL,
    venue            VARCHAR(255)    NOT NULL,
    ticket_price     DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    total_seats      INT             NOT NULL DEFAULT 0,
    available_seats  INT             NOT NULL DEFAULT 0,
    status           ENUM('upcoming','ongoing','completed') DEFAULT 'upcoming',
    created_by       INT,
    created_at       TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS bookings (
    booking_id      INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT             NOT NULL,
    event_id        INT             NOT NULL,
    tickets_booked  INT             NOT NULL DEFAULT 1,
    total_amount    DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    booking_date    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)  REFERENCES users(user_id)  ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

INSERT IGNORE INTO users (name, email, password, role) VALUES (
    'Admin',
    'admin@events.com',
    '$2a$10$nQ6uizrndMoFGUCbyE/P89drsSFLAYZDh3Z8kpARJTNm9bkBm9',
    'admin'
);

INSERT IGNORE INTO events (title, description, event_date, venue, ticket_price, total_seats, available_seats, status, created_by) VALUES
('Tech Summit 2026',     'Annual technology and innovation conference.',                '2026-05-15 10:00:00', 'Hyderabad Convention Centre', 999.00,  500, 500, 'upcoming', 1),
('Jazz Night Live',      'An enchanting evening of live jazz performances.',            '2026-04-20 19:30:00', 'Taj Falaknuma Palace, Hyderabad', 1499.00, 200, 200, 'upcoming', 1),
('Startup Expo 2026',    'Meet the most innovative startups from across India.',        '2026-06-01 09:00:00', 'HITEX Exhibition Centre, Hyderabad', 499.00,  1000,1000,'upcoming', 1),
('Classical Music Gala', 'An evening of classical Carnatic and Hindustani music.',     '2026-03-25 18:00:00', 'Ravindra Bharathi, Hyderabad',      799.00,  300, 300, 'upcoming', 1),
('Food Fest 2026',       'Taste of Hyderabad — 200+ food stalls, live cooking shows.', '2026-04-05 12:00:00', 'Necklace Road Grounds, Hyderabad', 299.00,  2000,2000,'upcoming', 1);

