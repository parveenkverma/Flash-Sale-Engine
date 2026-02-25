const app = require("../app");
const http = require("http");
const mongoose = require("mongoose");
require("dotenv").config();

// Models are already loaded when app is required
const { Order, Product } = require("../models").default;

let server;
let baseUrl;

// Helper to make HTTP requests
const makeRequest = (method, path, body = null, headers = {}) => {
    return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            headers: { "Content-Type": "application/json", ...headers },
        };
        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        req.on("error", reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

beforeAll(async () => {
    // App already connects to MongoDB via models/index.js
    // Just start a test server on a random port
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
});

afterEach(async () => {
    await Product.deleteMany({});
    await Order.deleteMany({});
});

afterAll(async () => {
    await mongoose.disconnect();
    server.close();
});

// TEST 1 — CONCURRENCY BARRIER
describe("Concurrency Barrier", () => {
    test("10 concurrent requests for 5 stock — no overselling", async () => {
        const product = await Product.create({
            name: "Limited Edition Keyboard",
            category: "Electronics",
            price: 200,
            stock: 5,
            saleStartTime: new Date(),
        });

        // Fire 10 concurrent purchase requests
        const requests = Array.from({ length: 10 }, (_, i) =>
            makeRequest(
                "POST",
                "/api/order",
                { product_id: product._id.toString(), quantity: 1 },
                { "idempotency-key": `conc-key-${i}` }
            )
        );

        const results = await Promise.all(requests);

        const successes = results.filter((r) => r.status === 201);

        // NO OVERSELLING — at most 5 can succeed
        expect(successes.length).toBeLessThanOrEqual(5);
        expect(successes.length).toBeGreaterThan(0);

        // Stock must never go negative
        const updated = await Product.findById(product._id);
        expect(updated.stock).toBeGreaterThanOrEqual(0);

        // Orders in DB must match stock decremented (data integrity)
        const orderCount = await Order.countDocuments();
        expect(orderCount).toBe(5 - updated.stock);
        expect(orderCount).toBe(successes.length);
    });
});

// TEST 2 — IDEMPOTENCY
describe("Idempotency", () => {
    test("duplicate idempotency key returns same order without decrementing stock twice", async () => {
        const product = await Product.create({
            name: "Wireless Mouse",
            category: "Electronics",
            price: 50,
            stock: 10,
            saleStartTime: new Date(),
        });

        const body = { product_id: product._id.toString(), quantity: 1 };
        const headers = { "idempotency-key": "same-key-123" };

        // First request — creates order
        const first = await makeRequest("POST", "/api/order", body, headers);
        expect(first.status).toBe(201);

        // Second request — same key, should return existing order
        const second = await makeRequest("POST", "/api/order", body, headers);
        expect(second.status).toBe(200);
        expect(second.body.data._id).toBe(first.body.data._id);

        // Stock should only be decremented once
        const updated = await Product.findById(product._id);
        expect(updated.stock).toBe(9);

        // Only 1 order in DB
        const orderCount = await Order.countDocuments();
        expect(orderCount).toBe(1);
    });
});