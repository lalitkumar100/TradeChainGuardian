-- USERS
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone_primary VARCHAR(20),
    public_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    password_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    email_verification_token TEXT,
    reset_password_token TEXT,
    reset_password_expires TIMESTAMP
);

-- USER DETAILS
CREATE TABLE user_details (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    address TEXT,
    phone VARCHAR(20),
    gst_number VARCHAR(50)
);

-- REQUESTS
CREATE TABLE requests (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(100) UNIQUE NOT NULL,
    sender_id INT REFERENCES users(id),
    receiver_id INT REFERENCES users(id),
    request_data JSONB NOT NULL,
    is_reviewed BOOLEAN DEFAULT FALSE,
    reviewed_at TIMESTAMP,
    is_converted_to_invoice BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TRANSACTIONS (INVOICES)
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(100) UNIQUE NOT NULL,
    sender_id INT REFERENCES users(id),
    receiver_id INT REFERENCES users(id),
    request_id VARCHAR(100),
    invoice_data JSONB NOT NULL,
    is_seen BOOLEAN DEFAULT FALSE,
    seen_at TIMESTAMP,
    is_accepted BOOLEAN DEFAULT FALSE,
    accepted_at TIMESTAMP,
    is_on_blockchain BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BLOCKCHAIN
CREATE TABLE blockchain (
    id SERIAL PRIMARY KEY,
    transaction_id INT REFERENCES transactions(id),
    previous_hash TEXT,
    current_hash TEXT,
    block_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);