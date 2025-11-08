## LiveKit Meet

LiveKit Meet is a modular Next.js 16 + Prisma application that delivers end-to-end meeting management, LiveKit video conferencing, chat, and administrative tooling. Each module from the project spec has been implemented and wired together for a production-ready experience.

### Core Features

- **Meeting management:** schedule or launch instant meetings, auto-generate room names, enforce passwords.
- **Authentication & token service:** validate credentials and issue short-lived LiveKit tokens.
- **Participant management:** maintain allowlists for private meetings.
- **Scheduler:** background lifecycle automation to activate or end meetings and clean LiveKit rooms.
- **LiveKit UI:** Join flow, in-meeting controls, participant list, and chat (with optional persistence).
- **Chat & persistence:** LiveKit data channel messaging with optional REST persistence.
- **Dashboard:** full meeting overview with scheduling form, instant launch, and copyable join links.
- **API documentation:** Swagger UI exposed at `/api/docs`.
- **Deployment tooling:** Dockerfile and Compose stack with PostgreSQL.

## Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted)
- LiveKit credentials (Cloud or self-hosted): `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables by creating a `.env` file (see `.env.example` once generated) and set:

   - `DATABASE_URL`
   - `LIVEKIT_URL`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`

3. Apply database schema and generate the Prisma client:

   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

- `npm run prisma:migrate` – Run interactive Prisma migrations.
- `npm run prisma:generate` – Regenerate Prisma client after schema updates.
- `npm run dev` – Next.js development server (uses experimental webpack compatible flag for React 19).
- `npm run build` / `npm run start` – Production build and start.
- `npm run lint` – ESLint checks.

## Meeting Dashboard

- Browse to `/meetings` for an overview of all meetings.
- Launch instant meetings or schedule new ones (configure private/public access).
- Copy join links or refresh the table without reloading the page.

## Join Flow

- Share links in the form `https://your-app/join/{roomName}?password=<meeting-password>`.
- Join page validates credentials, requests a LiveKit token, and mounts the in-browser conference with chat, participants, and controls.

## Scheduler Automation

- Endpoint: `POST /api/scheduler` (GET also supported) activates scheduled meetings and ends expired ones.
- Configure your host (cron, GitHub Actions, etc.) to hit this endpoint every 30 seconds for automated lifecycle management.

## API Usage

### Request meeting token

Once a meeting is created, issue a LiveKit access token via:

```bash
curl -X POST http://localhost:3000/api/meetings/<meetingId>/token \
  -H "Content-Type: application/json" \
  -d '{
    "email": "guest@example.com",
    "password": "<meeting password>",
    "name": "Guest User"
  }'
```

Response (200):

```json
{
  "token": "<JWT>",
  "livekitUrl": "wss://example.livekit.cloud",
  "roomName": "team-sync-a1b2",
  "meeting": {
    "id": "<meetingId>",
    "title": "Team Sync",
    "status": "ACTIVE",
    "isPublic": true
  }
}
```

Tokens expire after 15 minutes by default. Refresh as needed when reconnecting sessions.

### Additional Endpoints

- `GET /api/meetings` – List meetings (filters: `roomName`, `status`, `limit`).
- `POST /api/meetings` – Create scheduled meeting.
- `POST /api/meetings/instant` – Create instant meeting.
- `GET/POST/DELETE /api/meetings/{id}/participants` – Manage allowlist.
- `GET/POST /api/messages` – Load or persist chat history.
- `GET/POST /api/scheduler` – Trigger lifecycle automation.
- `GET /api/docs` – Interactive Swagger UI (OpenAPI 3.0.3).

## Docker & Deployment

1. Copy `.env.example` to `.env` and populate LiveKit + database credentials. For Compose, use `postgresql://postgres:postgres@db:5432/meet`.
2. Build and start the stack:

   ```bash
   docker-compose up --build
   ```

3. The app runs on `http://localhost:3000`; PostgreSQL is exposed on `5432`.

The provided Dockerfile performs a multi-stage build (install → build → runtime) and bundles the generated Prisma client. Compose spins up both the Next.js app and PostgreSQL with persistent storage.
