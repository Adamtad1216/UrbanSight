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
MONGO_URI=mongodb://127.0.0.1:27017/urbansight
JWT_SECRET=change-this-secret
CLIENT_ORIGIN=http://localhost:5173
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
