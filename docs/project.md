

## 1. Core Features Overview

This section provides an exhaustive breakdown of all the features, their intended behavior, and the technical approach for implementing each.

| #  | Feature                            | Description                                            | Implementation Summary                                                                                                                                                      |
| -- | ---------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | **Meeting Scheduling**             | Create, update, and manage scheduled meetings.         | Implemented via `/api/meetings` with Prisma models. Meetings include `title`, `description`, `startTime`, `endTime`, `passwordHash`, `isPublic`. LiveKit room auto-created. |
| 2  | **Instant Meeting**                | Create on-demand meetings that start immediately.      | API `/api/meetings/instant` generates a random room name and password, stores entry in DB, and returns `joinUrl`. Host can share instantly.                                 |
| 3  | **Public Meetings**                | Meetings accessible by anyone with password and link.  | `isPublic = true` flag in DB. Password validation required, but email whitelist not enforced.                                                                               |
| 4  | **Private Meetings**               | Meetings limited to predefined participant emails.     | `isPublic = false`, participant validation via `Participant` table. Email must match one in meeting participant list.                                                       |
| 5  | **Meeting Lifecycle**              | Automatic start and end based on schedule.             | Scheduler service runs every 30s. Marks meeting `ACTIVE` or `ENDED`. Ends rooms using LiveKit `roomService.deleteRoom()`.                                                   |
| 6  | **Password Protection**            | All meetings require a password.                       | Passwords hashed with bcrypt before storing. Validated before LiveKit token issuance.                                                                                       |
| 7  | **Participant Validation**         | Verify participant’s email before join.                | For private meetings, match email in participant list. Public meetings skip check but still require password.                                                               |
| 8  | **Join Link Generation**           | Each meeting has a unique shareable link.              | Generated on creation: `https://meet.example.com/join/{roomName}?password={pwd}`. Stored in DB for reuse.                                                                   |
| 9  | **Embeddable Meeting Rooms**       | Allow embedding meetings into external apps.           | Frontend `/join` page rendered in iframe-safe layout. `allow="camera; microphone; fullscreen"` headers.                                                                     |
| 10 | **LiveKit Video & Audio**          | Real-time video, audio, and screen sharing.            | Implemented using `@livekit/components-react` with `<LiveKitRoom>` and `<VideoConference />`.                                                                               |
| 11 | **In-Meeting Chat**                | Real-time chat messages with optional persistence.     | Chat via LiveKit data channels. Optionally persisted to `/api/messages`.                                                                                                    |
| 12 | **Participant List**               | Show who is in the room and track joins/leaves.        | `useParticipants()` hook from LiveKit SDK. Display list with names and mute status.                                                                                         |
| 13 | **Host Controls**                  | Special permissions for meeting creator.               | Host tokens include `roomAdmin` grant, allowing kick/mute actions.                                                                                                          |
| 14 | **Meeting UI/UX**                  | Intuitive interface for joining and managing meetings. | Built with TailwindCSS and LiveKit React SDK. Includes JoinForm, ControlsBar, ChatPanel, and Video grid.                                                                    |
| 15 | **JWT Authentication**             | Secure, signed LiveKit access tokens.                  | Tokens issued server-side using `@livekit/server-sdk` with `LIVEKIT_API_SECRET`. TTL: 15 minutes.                                                                           |
| 16 | **Swagger API Docs**               | Interactive API documentation.                         | Swagger UI generated from `/api/docs` route using OpenAPI 3.1 spec.                                                                                                         |
| 17 | **Meeting Dashboard**              | Web dashboard to view, edit, and delete meetings.      | Implemented via `app/meetings/page.tsx`. Lists meetings from API.                                                                                                           |
| 18 | **Responsive Design**              | Works across devices (desktop, tablet, mobile).        | Tailwind responsive classes + LiveKit adaptive grid layout.                                                                                                                 |
| 19 | **Email Verification (Future)**    | Optional email validation before joining.              | Placeholder in `/api/meetings/:id/token`, to integrate SMTP or magic-link email check.                                                                                      |
| 20 | **Recording & Analytics (Future)** | Record and summarize meeting activity.                 | Future use of LiveKit Egress API and meeting summary endpoint.                                                                                                              |

---

## 2. Implementation Details

### 2.1 Backend (Next.js API Routes)

#### **a. Meeting Creation**

* **Route:** `POST /api/meetings`
* **Logic:**

  * Validate input via Zod schema.
  * Hash password using bcrypt.
  * Create DB record in Prisma.
  * Generate unique `roomName` (slug + short ID).
  * If `instant: true`, mark status as ACTIVE and return join link immediately.
  * Otherwise, mark as `SCHEDULED` and add to lifecycle scheduler.

#### **b. Instant Meeting**

* **Route:** `POST /api/meetings/instant`
* **Logic:**

  * Generate random room name (e.g., `instant-<uuid>`).
  * Generate 6-character alphanumeric password.
  * Save as `ACTIVE` meeting.
  * Return full join URL with password.

#### **c. Generate Token**

* **Route:** `POST /api/meetings/:id/token`
* **Logic:**

  * Validate email/password.
  * Check participant email if private meeting.
  * Issue LiveKit token:

    ```ts
    const token = new AccessToken(API_KEY, API_SECRET, { identity: email, name });
    token.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });
    ```
  * Return `{ token, livekitUrl, roomName }`.

#### **d. Scheduler**

* **Route:** `/api/scheduler`
* **Logic:**

  * Runs on interval or manually triggered.
  * Query `SCHEDULED` meetings where `startTime <= now()`.
  * Mark as `ACTIVE`.
  * Query `ACTIVE` meetings where `endTime <= now()`.
  * Mark as `ENDED` and call `roomService.deleteRoom(roomName)`.

---

### 2.2 Frontend Implementation

#### **Join Page (app/meetings/[room]/join/page.tsx)**

* Display form for email, name, and password.
* On submit, call `/api/meetings/:id/token`.
* If success → mount `<LiveKitRoom>` with provided token.

#### **Meeting UI (components/MeetingRoom.tsx)**

```tsx
<LiveKitRoom
  token={token}
  serverUrl={livekitUrl}
  data-lk-theme="default"
  style={{ height: '100vh' }}
>
  <VideoConference />
</LiveKitRoom>
```

* Components:

  * `ChatPanel`: uses `useDataChannel` for messages.
  * `ParticipantList`: shows live users with roles.
  * `ControlsBar`: mute/unmute, share screen, leave.

#### **Dashboard (app/meetings/page.tsx)**

* Lists all meetings.
* Button for **Schedule Meeting** and **Start Instant Meeting**.
* Table shows title, status, type (public/private), start/end, join link.

---

### 2.3 Swagger Documentation

* Served from `/api/docs`.
* Uses `swagger-ui-react` + `openapi.yaml` JSON export.
* Covers all endpoints: `/meetings`, `/instant`, `/token`, `/participants`, `/scheduler`.

Example Setup:

```ts
import swaggerUi from 'swagger-ui-react';
import openapiSpec from '@/docs/openapi.json';

export default function ApiDocsPage() {
  return <swaggerUi spec={openapiSpec} />;
}
```

---

## 3. Security & Validation

* **Password Hashing:** bcrypt, 10 rounds.
* **Token Security:** JWTs signed with LiveKit API Secret.
* **Room Access:** Tokens expire in 15 min.
* **Private Meetings:** Participant email check.
* **Input Validation:** Zod schemas for all API inputs.
* **HTTPS Enforcement:** Required for all routes.
* **CORS Policy:** Strict origin check.

---

## 4. Deployment Setup

| Component     | Technology                              |
| ------------- | --------------------------------------- |
| Frontend/API  | Next.js 15 on Vercel / Cloudflare Pages |
| DB            | PostgreSQL (Supabase, Neon, RDS)        |
| Scheduler     | Edge cron or background job             |
| LiveKit       | Cloud or self-hosted cluster            |
| Reverse Proxy | Traefik with TLS & CORS                 |

---

## 5. Example Lifecycle Flow

1. Admin schedules a meeting → saved as `SCHEDULED`.
2. Cron job hits `/api/scheduler` → sets to `ACTIVE` when time reached.
3. Participant uses join link, enters credentials → receives token.
4. Participant joins via LiveKit UI.
5. Scheduler detects `endTime` → closes room, sets `ENDED`.

---

## 6. Future Features Roadmap

| Feature              | Description                                        |
| -------------------- | -------------------------------------------------- |
| Recording & Playback | Integrate LiveKit Egress API for session recording |
| Calendar Integration | Sync with Google & Outlook calendars               |
| Email Invites        | Auto-send meeting invitations                      |
| Analytics Dashboard  | Aggregate meeting durations & user counts          |
| Moderation Tools     | Allow host to mute or remove participants          |
| AI Meeting Summary   | Summarize chat & transcript with Gemini API        |

---

## 7. Acceptance Checklist

* [x] All meetings password-protected.
* [x] Private meetings restrict by email.
* [x] Instant meetings return valid shareable link.
* [x] Swagger docs available at `/api/docs`.
* [x] Automatic lifecycle transitions.
* [x] Full LiveKit UI embedded.

---

**End of Detailed Feature & Implementation Document**
