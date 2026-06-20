# AI-Powered Content Moderation Platform

A full-stack web application that allows users to submit images for automated AI policy compliance screening, with an appeal workflow and admin oversight tools.

## Features

- **Image Upload & AI Moderation** — Upload multiple images; each is screened against 6 violation categories using Claude AI
- **Verdict System** — Each image receives Approved / Flagged for Review / Blocked based on configurable policies
- **Appeal Workflow** — Users can appeal flagged/blocked verdicts; admins review and accept/reject
- **Policy Configuration** — Admins set per-category confidence thresholds and enforcement actions
- **Analytics Dashboard** — Charts for submission volume, verdict distribution, category violations, appeal stats, and top users

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS v4, React Router, Recharts |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (via Mongoose) |
| Authentication | JWT (JSON Web Tokens) |
| AI Moderation | Anthropic Claude claude-haiku-4-5 (vision) |
| Containerization | Docker + Docker Compose |

## Setup Instructions

### Option 1: Docker (Recommended)

1. Clone the repo and create a root `.env` file:

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/content-moderation
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
ANTHROPIC_API_KEY=sk-ant-...
```

2. Run everything:

```bash
docker-compose up --build
```

3. Open [http://localhost](http://localhost) in your browser.

### Option 2: Local Development

**Backend:**
```bash
cd backend
cp .env.example .env   # Fill in your values
npm install
npm run dev            # Runs on http://localhost:5000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev            # Runs on http://localhost:3000
```

## Environment Variables

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) |
| `ANTHROPIC_API_KEY` | API key from console.anthropic.com |

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | User | Get current user |
| POST | `/api/submissions` | User | Upload & analyze images |
| GET | `/api/submissions/my` | User | User's submission history |
| GET | `/api/submissions/:id` | User | Single submission detail |
| GET | `/api/submissions` | Admin | All submissions |
| PATCH | `/api/submissions/:id/override` | Admin | Manual verdict override |
| POST | `/api/appeals` | User | Submit appeal |
| GET | `/api/appeals/my` | User | User's appeals |
| GET | `/api/appeals` | Admin | All appeals |
| PATCH | `/api/appeals/:id/review` | Admin | Accept/reject appeal |
| GET | `/api/policies` | User | Get all policies |
| PATCH | `/api/policies/:id` | Admin | Update category policy |
| GET | `/api/analytics` | Admin | Analytics data |

## Architecture Decisions

**Why MongoDB?**
Submission documents contain nested arrays (categoryResults, policySnapshot) that map naturally to MongoDB documents. No need for multiple JOIN tables.

**Why policy snapshots?**
The spec requires that policy changes don't retroactively alter verdicts. Storing a snapshot of the active policy at submission time ensures the verdict reasoning is always traceable.

**Why Claude claude-haiku-4-5?**
Haiku is Anthropic's fastest and most cost-effective vision model — ideal for batch image analysis with low latency. The model receives the image as base64 and returns structured JSON for each of the 6 violation categories.

**Why JWT over sessions?**
Stateless — no server-side session storage needed. Works seamlessly across Docker containers without shared session stores.
