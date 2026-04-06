# UrbanFlow Connect

UrbanFlow Connect is a role-based water utility workflow platform that connects citizens and utility staff from application intake to final service completion.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- Backend: Node.js, Express, MongoDB, Mongoose, JWT
- Integrations: Cloudinary (file uploads), SMTP (email), Google OAuth (optional)

## Roles

- citizen
- director
- coordinator
- surveyor
- technician
- meter_reader
- finance
- admin

## Core Capabilities

- Citizen new connection applications and issue reports
- Full request workflow with role-based approvals, assignment, and completion
- Adjustment-request loop (staff can request correction, citizen can edit and resubmit)
- Configurable notifications by channel (in-app push/email)
- Configurable notification templates per workflow step
- Account creation notifications (push + email)
- Reject flow with mandatory reason capture
- Cross-account uniqueness checks for email/phone
- Single active citizen application rule across request/issue flows

## Project Layout

```text
backend/                Backend workspace
backend/server/src/     API controllers, models, services, routes
frontend/src/           React application
```

## Package Manager

This repository is configured for npm.

- Keep: package-lock.json
- Remove: bun.lock / bun.lockb / yarn.lock / pnpm-lock.yaml

If VS Code still warns about multiple lockfiles, set npm.packageManager to npm instead of auto.

## Environment Setup

The backend reads environment values from backend/.env first, then falls back to root .env.

1. Copy backend/.env.example to backend/.env
2. Fill required values

Minimum required:

```env
PORT=5000
DB_MODE=local
DB_NAME=urbansight
MONGO_URI=mongodb://127.0.0.1:27017/urbansight
JWT_SECRET=change-this-secret
CLIENT_ORIGIN=http://localhost:5173
```

Recommended local production-safe DB settings:

```env
MONGO_HOST=127.0.0.1
MONGO_PORT=27017
MONGO_DB_USER=urbansight_app
MONGO_DB_PASSWORD=change-this-password
MONGO_AUTH_SOURCE=admin

MONGO_RETRY_ATTEMPTS=8
MONGO_RETRY_INITIAL_DELAY_MS=1000
MONGO_RETRY_MAX_DELAY_MS=30000
MONGO_MAX_POOL_SIZE=50
MONGO_MIN_POOL_SIZE=5
MONGO_SOCKET_TIMEOUT_MS=30000
MONGO_CONNECT_TIMEOUT_MS=10000
MONGO_SERVER_SELECTION_TIMEOUT_MS=5000
SYNC_INDEXES_ON_STARTUP=false

LOG_LEVEL=info
BACKUP_DIR=./backups
MONGODUMP_PATH=mongodump
MONGORESTORE_PATH=mongorestore
```

Common optional integrations:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=UrbanSight <no-reply@urbansight.local>

OAUTH_GOOGLE_CLIENT_ID=
OAUTH_GOOGLE_CLIENT_SECRET=
OAUTH_GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

Frontend optional env:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## Install

```bash
npm install
```

## Run Locally

Start backend + citizen frontend:

```bash
npm run dev
```

Start backend + citizen frontend (explicit):

```bash
npm run dev:citizen
```

Start backend + backoffice frontend:

```bash
npm run dev:backoffice
```

Backend only:

```bash
npm run start
```

## Local MongoDB Production Notes

1. Install MongoDB Community Server and MongoDB Database Tools (includes mongodump/mongorestore).
2. Start MongoDB service locally.
3. Create an application database user (run in mongosh):

```javascript
use admin
db.createUser({
	user: "urbansight_app",
	pwd: "change-this-password",
	roles: [{ role: "readWrite", db: "urbansight" }],
})
```

4. Set DB auth variables in backend/.env and keep secrets out of source control.
5. In production, set a strong JWT secret and restrict CLIENT_ORIGIN/CLIENT_ORIGINS to trusted domains.

The API exposes health checks at /health and /api/health. They return 503 when the database is unavailable.

## Backup and Restore

Create a backup:

```bash
npm run backup
```

Restore a backup:

```bash
npm run restore -- backups/urbansight-YYYYMMDD-HHMMSS
```

To run daily automatic backups, schedule npm run backup via your OS scheduler:

- Windows Task Scheduler: run once per day (for example 02:00)
- Linux cron example: 0 2 \* \* \* cd /path/to/project && npm run backup

If your local database has legacy duplicate values, keep SYNC_INDEXES_ON_STARTUP=false in development for clean startup logs. After data cleanup, set it to true (especially in production) to enforce schema indexes at boot.

## Build

```bash
npm run build
npm run build:citizen
npm run build:backoffice
```

## Testing and Quality

```bash
npm run lint
npm run test:backend
npm run test
```

## Notification Template Placeholders

Workflow templates support placeholders like:

- {{customerName}}
- {{statusLabel}}
- {{reason}}
- {{waterConnectionCode}}
- {{customerCode}}

Account creation templates support:

- {{name}}
- {{role}}
- {{email}}

## Notes

- Notification channel toggles and template management are available from the configuration page.
- Citizens can edit request fields (including docs) when status is adjustment_requested and then resubmit.
- Adjust the CORS origin list via CLIENT_ORIGIN or CLIENT_ORIGINS.
