# CampusOS frontend

The React dashboard uses the `/api/v1` contract and defaults to Vite's proxy for
local development. The included mock API loads the repository's seed data once,
then persists edits to the ignored `mock/.state.json` file.

## Run locally

Open two terminals in `FrontEnd`:

```powershell
npm install
npm run mock
```

```powershell
npm run dev
```

Open `http://localhost:5173`. To restore the original fixture state, stop the mock
server and run `npm run mock:reset`. To use the real backend instead, set
`VITE_API_URL` to its `/api/v1` URL; no component changes are required.

## Verification

```powershell
npm test
npm run build
```

The mock suite covers seed reads, trusted identity, CRUD mutation envelopes, room
conflicts, and agent clarification. The TypeScript production build checks the
typed API client and all dashboard routes.
