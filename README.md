# UrbanSight Smart City Dashboard

UrbanSight is a role-based smart city water utility platform connecting citizens with utility staff across request intake, review, field workflow, payment verification, and administration.

## Stack

- Frontend: React, TypeScript, Vite, TailwindCSS, shadcn/ui, Framer Motion
- Backend: Node.js, Express, MongoDB, Mongoose, JWT, Cloudinary
- Integrations: Google Maps, Cloudinary uploads

## Roles

- `citizen`
- `director`
- `coordinator`
- `surveyor`
- `technician`
- `finance`
- `admin`

## Features

- Citizen registration and login
- Staff login with seeded accounts
- JWT authentication with httpOnly cookie support
- Role-based protected routes
- New water connection request submission
- Ethiopian phone number validation
- Google Maps location picking
- Cloudinary file upload flow
- Citizen request tracking with timeline
- Director review and approval workflow
- Coordinator assignment workflow
- Surveyor inspection submission
- Technician progress updates
- Finance payment verification
- Admin staff account creation and user management

## Project Structure

```text
src/           Frontend application
server/src/    Express API, models, routes, middleware
```

## Environment Setup

Copy `.env.example` to `.env` and fill in the required values.

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_MAPS_API_KEY=

PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/urbansight
JWT_SECRET=change-this-secret
JWT_EXPIRES_IN=1d
CLIENT_ORIGIN=http://localhost:8080
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Install

```bash
npm install
```

## Run

Frontend only:

```bash
npm run dev
```

Backend only:

```bash
npm run dev:server
```

Frontend and backend together:

```bash
npm run dev:full
```

Production build:

```bash
npm run build
```

## Seeded Staff Accounts

The backend seeds default staff users on startup.

- Admin: `admin@urbansight.local` / `admin123`
- Director: `director@urbansight.local` / `director123`
- Coordinator: `coordinator@urbansight.local` / `coord123`
- Surveyor: `surveyor@urbansight.local` / `survey123`
- Technician: `technician@urbansight.local` / `tech1234`
- Finance: `finance@urbansight.local` / `finance123`

Citizens register from the `/register` page.

## Workflow

1. Citizen submits a new connection request.
2. Request starts with status `submitted`.
3. Director moves request to `under_review`, then approves or rejects.
4. Coordinator assigns staff.
5. Surveyor submits inspection details.
6. Technician updates execution progress.
7. Finance verifies payment and completes the request.

## Current Notes

- Google Maps requires `VITE_GOOGLE_MAPS_API_KEY`.
- Cloudinary uploads require the three Cloudinary backend environment variables.
- The frontend build currently succeeds.
- Vite reports a large bundle warning; if needed, that can be addressed later with route-level code splitting.
