# FlyRank Report API

A simple Node.js and Express API that accepts report requests quickly and processes the slow report work in the background with Inngest.

## Background Jobs

`POST /reports` creates a pending report and returns HTTP `202 Accepted` immediately. Inngest then runs the slow work in the background. Clients can poll `GET /reports/:id` until the report becomes done or failed.

This demonstrates eventual consistency: the API accepts the request first, and the completed result becomes available later.

## Technologies

- JavaScript
- Node.js
- Express
- Inngest
- In-memory `Map` for report storage

No database, frontend, authentication, Redis, BullMQ, Celery, Python, or node-cron is used.

## Project Structure

```text
.
├── server.js
├── package.json
├── package-lock.json
└── README.md
```

- `server.js`: Express routes, in-memory reports, and Inngest functions.
- `package.json`: project metadata, scripts, and dependencies.
- `README.md`: setup, API, testing, and evidence instructions.

## Installation

Requirements: Node.js and npm.

```powershell
npm install
```

## Run the Express API

Start the API on port 3000:

```powershell
$env:INNGEST_DEV="1"
npm start
```

The API is available at:

```text
http://localhost:3000
```

## Run the Inngest Dev Server

In a second terminal, run:

```powershell
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

The Inngest dashboard is normally available at:

```text
http://localhost:8288
```

If port 8288 is already in use, the CLI may select another port such as 8290. Open the URL printed by the CLI.

Both terminals must remain running. Express serves the HTTP API, while the Inngest Dev Server discovers and executes background functions.

## Endpoints

| Method | Path | Description | Success |
| --- | --- | --- | --- |
| GET | `/health` | Check that the API is running. | `200` |
| POST | `/reports` | Create a background report job. | `202` |
| GET | `/reports/:id` | Check a report's status and result. | `200` or `404` |
| GET/POST/PUT | `/api/inngest` | Inngest function registration and execution endpoint. | Inngest-managed |

## Inngest Functions

| Function | Trigger | Behavior |
| --- | --- | --- |
| `say-hello` | `test/hello` | Waits 5 seconds in a step and returns a greeting. |
| `make-report` | `report/requested` | Sleeps for 8 seconds, then builds the report in a separate step. Retries twice. |
| `heartbeat` | `* * * * *` | Runs every minute and logs pending, done, and failed counts. |

## API Examples

### Health

```powershell
curl.exe http://localhost:3000/health
```

Response:

```json
{"status":"ok"}
```

### Create a report

```powershell
$body = @{ topic = "cats" } | ConvertTo-Json
Invoke-RestMethod `
  -Uri "http://localhost:3000/reports" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Example `202 Accepted` response:

```json
{
  "id": "a-unique-report-id",
  "status": "pending"
}
```

The POST request does not perform the slow report work. It creates the pending record and sends the `report/requested` Inngest event.

### Check a pending report

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/reports/a-unique-report-id" `
  -Method Get
```

Example response while the job is running:

```json
{
  "id": "a-unique-report-id",
  "topic": "cats",
  "status": "pending"
}
```

Poll the endpoint again after approximately 8 to 10 seconds.

### Check a completed report

```json
{
  "id": "a-unique-report-id",
  "topic": "cats",
  "status": "done",
  "result": "This is a report about cats."
}
```

### Unknown report

An unknown ID returns HTTP `404`:

```json
{
  "error": "report not found"
}
```

### Invalid input

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/reports" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{}'
```

Response: HTTP `400`.

Bad input is rejected immediately; temporary background failures are handled separately and can be retried.

## Retries

`make-report` is configured with `retries: 2`, allowing up to three total attempts. When the topic is `fail`, the `build-report` step throws an error. Inngest shows the retries in the dashboard, and the report is eventually marked `failed` after the final attempt.

## Cron Heartbeat

The heartbeat uses the Inngest cron expression:

```text
* * * * *
```

It runs every minute and logs a summary such as:

```text
[heartbeat] pending=2 done=5 failed=1
```

Cron answers:

- Every day at 08:00: `0 8 * * *`
- Every Sunday at 22:00: `0 22 * * 0`

## Testing

1. Start the Express API.
2. Start the Inngest Dev Server.
3. Open the dashboard and confirm `say-hello`, `make-report`, and `heartbeat` are registered.
4. Invoke `say-hello` and confirm the 5-second step completes.
5. Create a `cats` report and poll its ID from pending to done.
6. Create a `fail` report and confirm three total attempts in the dashboard.
7. Submit `{}` and confirm HTTP `400` without creating a background job.
8. Watch for at least two heartbeat runs approximately one minute apart.

## Evidence

Add real evidence after running the checks. Do not claim a check passed without capturing it.

- 202 response: `[add terminal output or screenshot here]`
- Pending -> done polling: `[add terminal output or screenshot here]`
- Failed job with 3 attempts: `[add Inngest dashboard screenshot or run details here]`
- Heartbeat runs: `[add terminal output or dashboard screenshot here]`
- Inngest dashboard screenshot: `[add screenshot here]`

## GitHub

Create a public repository on GitHub, then connect and push this project:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git branch -M main
git add .
git commit -m "Stage 5: publish and docs"
git push -u origin main
```

For this project, the repository is:

```text
https://github.com/Ayshashafeek/job
```

Do not commit `node_modules`. The included `.gitignore` excludes it.

screenshots
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/f6a15a4a-fb3c-426d-8e42-561ec239aa56" />
<img width="1920" height="1080" alt="Screenshot 2026-09-10 071819" src="https://github.com/user-attachments/assets/eeb37cf8-a33c-4f43-a8dc-7e858e263473" />
<img width="1920" height="1080" alt="Screenshot 2026-09-10 071802" src="https://github.com/user-attachments/assets/8454acaf-4952-4aa5-a923-3f3debdc9680" />
<img width="1920" height="1080" alt="Screenshot 2026-09-10 071741" src="https://github.com/user-attachments/assets/e2011496-5ace-4e48-96e8-ea96ce6c1fde" />
<img width="1920" height="1080" alt="Screenshot 2026-09-10 071710" src="https://github.com/user-attachments/assets/25abd180-b884-4887-a4d5-8a1a3e4def2f" />





