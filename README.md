# Flash Sale Engine

A resilient flash sale engine built with **Node.js**, **Express**, and **MongoDB (Mongoose)** designed to handle massive write-volume while preventing over-selling and providing real-time analytics.

---

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
.env
# Edit .env with your PORT and MONGO_URI, NODE_ENV=development

# Start development server
npm run dev

# Run integration tests
npm run jestTest
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `7000` | Server port |
| `MONGO_URI` | - | MongoDB connection string |
| `NODE_ENV` | `development` | Environment mode |

**Note:** MongoDB must be running as a **replica set** for transaction support.

---

## Architecture

```
├── app/
│   └── controller/          # Business logic (Order, Product, Analytics)
├── config/                  # Database config (fallback)
├── helper/                  # Utility functions (isset, formatJoiError)
├── Middleware/
│   ├── errorHandler.js      # Global error handler (4xx/409/5xx)
│   └── validate.js          # Joi schema validation middleware
├── models/                  # Mongoose schemas (Order, Product)
├── routes/                  # Express route definitions
├── tests/                   # Integration tests
└── utils/
    └── validators.js        # Joi validation schemas
```

---

## 1. Concurrency Pattern

### The Problem

In a flash sale, thousands of requests hit the same product simultaneously. A naive read-then-write approach creates a race condition:

```
Thread A: reads stock = 5
Thread B: reads stock = 5
Thread A: writes stock = 4  ✅
Thread B: writes stock = 4  ✅  ← WRONG, should be 3
```
### The Solution

We check stock availability and decrement it in a single atomic operation using `findOneAndUpdate`. Within a transaction, the stock is decremented atomically — if another request arrives concurrently, it sees the already-decremented quantity and fails gracefully instead of overselling.

**Why this works:**
- when ordering the stock is decremented atomically, if fails then it will not decrement the stock
- if another request arrives concurrently, it sees the already-decremented quantity and fails gracefully instead of overselling

### Transaction Wrapping

The stock decrement and order creation are wrapped in a **MongoDB transaction** to ensure atomicity:
---

## 2. Idempotency Strategy

Clients send an `Idempotency-Key` header. Before processing:

1. Check if an order with that key already exists → return it (200)
2. If not, proceed with the purchase
3. The `idempotencyKey` field has a **unique sparse index** to prevent duplicates at the DB level

This handles both application-level retries and race conditions on the same key.

---

## 3. Analytics Pipeline

A single `$facet` aggregation pipeline computes all metrics in one database round-trip:

- **Revenue & Volume** — `$group` with `$sum`
- **Top 3 Categories** — `$lookup` → `$group` → `$sort` → `$limit`
- **Conversion Speed** — Time between `saleStartTime` and first order per product
- **Stock Health** — Products classified as "Critical" (<10) or "Healthy"

---

## 4. Indexing Strategy for 5M+ Records

### Current Indexes

| Collection | Index | Purpose |
|-----------|-------|---------|
| `orders` | `{ productId: 1, created_at: -1 }` | Analytics lookups, conversion speed |
| `orders` | `{ idempotencyKey: 1 }` (unique, sparse) | Idempotency dedup |
| `products` | `{ category: 1 }` | Top categories grouping |
| `products` | `{ stock: 1 }` | Stock health filtering |

### How to Keep the Analytics Query Under 200ms

1. **Compound Index on Orders** — `{ productId: 1, created_at: -1 }` is a **covering index** for the `$lookup` joins and `$sort` operations in the analytics pipeline. MongoDB can resolve the join and sort without scanning the full collection.

2. **$facet Parallelism** — Each facet runs independently. MongoDB can leverage indexes in each facet branch.

3. we can use redis to cache the analytics data

---

## 5. Error Handling Strategy

| Error Type | Status | Example |
|-----------|--------|---------|
| Validation Error | `400` | Missing `product_id`, invalid `quantity` |
| Cast Error | `400` | Invalid ObjectId format |
| Not Found | `404` | Product doesn't exist |
| Out of Stock | `409` | Stock insufficient |
| Mongoose Validation | `400` | Schema constraint violation |
| Server Error | `500` | Returns `"Something went wrong"` — no stack traces leaked |

---

## 6. Replica Set Setup

Transactions require a MongoDB replica set. For local development:

```bash
# Stop MongoDB service (admin PowerShell)
net stop MongoDB

# Edit mongod.cfg — add:
# replication:
#   replSetName: rs0

# Restart MongoDB
net start MongoDB

# Initialize replica set
mongosh
> rs.initiate()
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/order` | Purchase a product (requires `Idempotency-Key` header) |
| `GET` | `/api/getStats` | Analytics dashboard (single pipeline) |
| `POST` | `/api/product` | Create a product |
| `GET` | `/api/product` | List products (paginated, searchable) |
| `GET` | `/api/product/:id` | Get product by ID |

### Example: Place an Order

```bash
curl -X POST http://localhost:7000/api/order \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-001" \
  -d '{"product_id": "<PRODUCT_ID>", "quantity": 1}'
```

---

## Running Tests

```bash
npm run jestTest
```

Tests cover:
- **Concurrency Barrier** — 500 simultaneous requests for 5 stock items
- **Idempotency** — Duplicate key returns same order
- **Validation** — Missing/invalid inputs return 400
