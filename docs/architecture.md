# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier: keep API calls in the shared client and rendering/state in React components. Each view handles loading, empty, success, and accessible error states; it does not calculate business results or access MongoDB.
- Logic tier: keep routes thin: translate HTTP input and output, delegate behavior to services, and return deliberate 4xx responses for invalid or unknown resources. Keep business validation and calculations in services. Do not add authentication in this exercise.
- Data tier: use Mongoose models for required fields, references, and persisted record shapes. Keep seed data representative and idempotent, and preserve unrelated records when seeding.
- Activity tracking: accept `userId`, `teamId`, `type`, and `minutes`; validate the IDs and confirm both references exist before writing. Store the corresponding user and team references, calculate positive points in the service, and set `occurredAt` on creation. Invalid input or references must produce a 4xx, not a Mongoose cast error surfaced as a 500.
- Team management: require a name, retain the submitted name and mascot, and persist the supplied members through valid user references. Listing and creation use the same team representation.
- Leaderboard: aggregate activity points by team, sort totals highest-first, and return `teamName`, `totalPoints`, and sequential 1-based ranks.
- Workout suggestions: find the user by email, use their fitness goal and recent activities to choose a relevant available workout, and include a concise reason. Return a deliberate 4xx when no user matches.

## Test plan

- Run the focused tier tests after each change, then run both builds before considering the implementation complete.
- Data tier: `npm run test:data --prefix octofit-tracker/backend` checks required model fields, defaults, references, and idempotent seed behavior. A model assertion failure points to schema constraints or defaults; a seed assertion failure points to fixture creation, linking, preservation, or repeatability. Baseline: 4 failed, 1 passed; the idempotent seed test passed.
- Logic/API tier: `npm run test:api --prefix octofit-tracker/backend` checks request validation, status codes, persisted activity/team data, leaderboard totals/ranks, and user-specific suggestions. Failures indicate a service behavior or HTTP contract mismatch. Baseline: 4 failed, including activity/team creation returning `501`, an empty leaderboard, and a suggestion without the required reason.
- Presentation tier: `npm test --prefix octofit-tracker/frontend` checks API-backed rendering, the requested workout user, and loading, empty, and accessible error states on each view. Failures indicate missing API integration or a UI state/contract mismatch. Baseline: 15 failed; the views still report implementation pending.
- Backend build: `npm run build --prefix octofit-tracker/backend` checks TypeScript compilation. A failure indicates a backend type or compile error. Not run for the baseline.
- Frontend build: `npm run build --prefix octofit-tracker/frontend` checks TypeScript compilation and the Vite production bundle. A failure indicates a frontend type, import, or bundling error. Not run for the baseline.
