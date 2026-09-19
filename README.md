# university-football-management

## Backend

The project includes a dependency-free Node.js backend in `backend/`. It serves the frontend and exposes a JSON API backed by `backend/data.json`.

```powershell
cd backend
npm start
```

The application is available at `http://localhost:3000`.

API resources are available at `/api/competitions`, `/api/teams`, `/api/players`, `/api/fixtures`, `/api/results`, and `/api/news`. Use `GET` to list records, `POST` to create, `PATCH /api/<resource>/<id>` to update, and `DELETE /api/<resource>/<id>` to remove a record. The health check is `/api/health`.