/**
 * API Router
 * Main entry point for all HTTP API endpoints
 */

import * as admin from 'firebase-admin';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { onRequest } from 'firebase-functions/v2/https';
import { v4 as uuidv4 } from 'uuid';

import businessRouter from './business';
import customersRouter from './customers';
import documentsRouter from './documents';
import documentsV1Router from './documentsV1';
import { lineLinkRouter } from './lineLink';
import reportsRouter from './reports';
import subscriptionRouter from './subscription';
import autoflowRouter from './autoflow';
import expensesRouter from './expenses';
import verifyRouter from './verify';
import { LINE_CHANNEL_ACCESS_TOKEN_SECRET } from '../shared/secrets';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

// Create Express app
const app = express();

// Disable ETag globally for API responses (avoid 304s for auth-dependent endpoints)
app.disable('etag');

// --- CORS configuration ---
// Allowlist for production and local dev. Adjust as needed or drive from env.
const allowedOrigins = [
    'https://ezboq.com',
    'https://www.ezboq.com',
    'https://doc.ezboq.com',
    'https://ezdoc-v1-th.web.app',
    'https://ezdoc-v1-th.firebaseapp.com',
    'http://localhost:3000',
    'http://localhost:5173',
];

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., curl, server-to-server)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Deny other origins
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With', 'Accept'],
    maxAge: 86400,
    optionsSuccessStatus: 204,
};

// Register CORS middleware BEFORE any auth middleware/routes
app.use(cors(corsOptions));
// Ensure body parsing after CORS so OPTIONS won't be blocked
app.use(express.json({ limit: '50kb' }));

// Ensure every response has basic CORS + security headers (covers error responses too)
app.use((req: Request, res: Response, next: express.NextFunction) => {
    const origin = req.headers.origin as string | undefined;

    // CORS: echo caller origin only when it is explicitly allowlisted.
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With, Accept');
    res.header('Access-Control-Max-Age', '86400');

    // Baseline response hardening for API endpoints.
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('Referrer-Policy', 'no-referrer');
    res.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.header(
        'Content-Security-Policy',
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    );

    // Set HSTS only when traffic is HTTPS (avoid issues in local HTTP development).
    const xForwardedProto = req.get('x-forwarded-proto');
    if (req.secure || xForwardedProto === 'https') {
        res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
});

// Reply to preflight explicitly
app.options('*', cors(corsOptions), (_req: Request, res: Response) => res.sendStatus(204));

// Request ID & Logger Middleware
app.use((req: Request, res: Response, next: express.NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);

    // Initial log
    console.log(JSON.stringify({
        severity: 'INFO',
        message: `Incoming ${req.method} ${req.originalUrl}`,
        requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent'),
    }));

    // Wrap end to log response
    const originalEnd = res.end;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.end = function (...args: any[]): Response {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (originalEnd as any).apply(res, args);

        console.log(JSON.stringify({
            severity: res.statusCode >= 500 ? 'ERROR' : 'INFO',
            message: `Response ${res.statusCode} ${req.method} ${req.originalUrl}`,
            requestId,
            statusCode: res.statusCode,
        }));
        return res;
    };

    next();
});

// Health check - minimal response to avoid information leakage
app.get('/v1/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
});

// Mount routers
app.use('/v1', verifyRouter);
app.use('/v1', businessRouter);
app.use('/v1', customersRouter);
app.use('/v1', documentsV1Router); // Service-to-service endpoints
app.use('/v1', documentsRouter);
app.use('/v1/auth/line-link', lineLinkRouter);
app.use('/v1', reportsRouter);
app.use('/v1', subscriptionRouter);
app.use('/v1', autoflowRouter);
app.use('/v1/expenses', expensesRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, _next: express.NextFunction) => {
    const requestId = req.headers['x-request-id'];
    console.error(JSON.stringify({
        severity: 'ERROR',
        message: `Unhandled Error: ${err.message}`,
        requestId,
    }));
    res.status(500).json({ error: 'Internal server error', requestId });
});

// Export as Cloud Function
export const api = onRequest(
    {
        region: 'asia-southeast1',
        timeoutSeconds: 60,
        memory: '256MiB',
        secrets: [LINE_CHANNEL_ACCESS_TOKEN_SECRET],
    },
    app
);
