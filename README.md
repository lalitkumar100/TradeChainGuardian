<img width="254" height="254" alt="background-removed-background-removed (1)" src="https://github.com/user-attachments/assets/0633bc37-3bdf-4713-bdef-fdeba071c6da" />


# TradeChainGuardian
# 🚀 TradeChainGuardian

A secure B2B transaction platform for retailers and wholesalers with built-in encryption and blockchain-based audit logging.

---

## 📌 Overview

TradeLedger is a backend system built using **Node.js, Express.js, and PostgreSQL** that enables businesses to digitally manage:

* Purchase requests (Retailer → Wholesaler)
* Invoice generation (Wholesaler → R
etailer)
* Transaction confirmation
* Tamper-proof record storage using blockchain principles

The system is designed to replace manual paper-based billing workflows with a secure, scalable, and verifiable digital process.

---

## 🎯 Core Features

* 🔐 User authentication with JWT
* 🔑 Public/Private key cryptography support
* 📩 JSON-based purchase requests
* 🧾 JSON-based invoice system
* ✅ Invoice acceptance workflow
* ⛓️ Blockchain-style immutable transaction logging
* 🗂️ Flexible schema using JSONB (PostgreSQL)
* ⚡ Clean architecture with centralized error handling

---

## 🧱 Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL
* **Authentication:** JWT
* **Encryption:** Node.js Crypto
* **Architecture:** MVC + Services pattern

---

## 📂 Project Structure

```
src/
│
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── requestController.js
│   ├── transactionController.js
│   ├── blockchainController.js
│
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── requestRoutes.js
│   ├── transactionRoutes.js
│
├── middleware/
│   ├── authMiddleware.js
│   ├── errorMiddleware.js
│
├── utils/
│   ├── asyncHandler.js
│   ├── ApiError.js
│
├── services/
│   ├── cryptoService.js
│   ├── blockchainService.js
│
├── config/
│   ├── db.js
│   ├── schema.sql
│
└── app.js
```

---

## 🗄️ Database Design

The system uses a **minimal relational structure with JSONB storage** for flexibility.

### Key Tables:

* `users`
* `user_details`
* `requests`
* `transactions`
* `blockchain`

👉 Full schema is available in:

```
config/schema.sql
```

---

## 🔄 System Workflow

### 1. Retailer creates request

```
POST /requests
```

### 2. Wholesaler reviews request

```
PATCH /requests/:id/review
```

### 3. Wholesaler creates invoice

```
POST /transactions/from-request/:request_id
```

### 4. Retailer accepts invoice

```
PATCH /transactions/:id/accept
```

### 5. Blockchain entry is created automatically

---

## 🔐 Security Design

### 1. Password Security

* Passwords are hashed using secure algorithms

### 2. Key Management

* Each user has:

  * Public key (stored)
  * Encrypted private key (stored securely)

⚠️ Private keys are **never stored in plain text**

---

## ⛓️ Blockchain Design

This project uses a **centralized blockchain model**:

* Each accepted transaction becomes a block
* Each block contains:

  * Previous hash
  * Current hash
  * Transaction data

This ensures:

* Tamper detection
* Immutable history
* Auditability

---

## ⚙️ Installation

```bash
git clone <repo-url>
cd tradeledger
npm install
```

---

## 🔑 Environment Variables

Create a `.env` file:

```
PORT=5000
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_secret_key
```

---

## ▶️ Running the Server

```bash
npm run dev
```

or

```bash
node src/app.js
```

---

## 📡 API Modules

### 🔐 Auth

* POST `/auth/register`
* POST `/auth/login`
* GET `/auth/me`

---

### 👤 Users

* GET `/users/:id`
* GET `/users/:id/public-key`
* POST `/users/details`
* GET `/users/details`

---

### 📩 Requests

* POST `/requests`
* GET `/requests/sent`
* GET `/requests/received`
* GET `/requests/:id`
* PATCH `/requests/:id/review`

---

### 🧾 Transactions

* POST `/transactions/from-request/:request_id`
* GET `/transactions/sent`
* GET `/transactions/received`
* GET `/transactions/:id`
* PATCH `/transactions/:id/accept`
* PATCH `/transactions/:id/reject`

---

## ⚠️ Important Design Decisions

* No item table → All data stored as JSON
* Minimal status flags → Boolean-based flow
* Blockchain is centralized (not distributed)
* Backend validates JSON before storing

---

## 🚀 Future Improvements

* Real-time notifications (WebSocket)
* Digital signatures for invoices
* Multi-user business accounts
* File attachments (PDF invoices)
* Advanced audit dashboard<img width="1254" height="1254" alt="background-removed-background-removed (1)" src="https://github.com/user-attachments/assets/a0f28e3e-b757-4831-bb28-1a913f90e6c7" />


---

## 🧠 Philosophy

> Build simple → Make it work → Secure it → Then scale

---

## 👨‍💻 Author

Lalitkumar Choudhary

---

## 📜 License

MIT License
