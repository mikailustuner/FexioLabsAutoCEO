# FLAO - Fexio Labs Autonomous Organization

FLAO is an autonomous agent system that manages a mobile app company (Fexio Labs) as if it were a virtual CEO/CTO/PM/PMgr/QA/Release/Operations/Client agent team.

## Overview

This system orchestrates multiple specialized agents to handle various aspects of company operations:

- **CEO Agent**: Strategic decision-making and project prioritization
- **Product Agent**: Feature breakdown and roadmap planning
- **CTO Agent**: Architecture decisions and technical constraints
- **PM Agent**: Task breakdown and assignment
- **QA Agent**: Quality assurance and testing
- **Release Agent**: Versioning and release notes
- **Ops Agent**: Daily standups, team management, and nudges
- **Client Agent**: Client request handling and brief refinement

## Architecture

The system is built as a **monorepo** using pnpm workspaces with the following structure:

```
FLAOA/
├── apps/
│   ├── api-gateway/      # Fastify HTTP API
│   └── cli/              # Command-line interface
├── packages/
│   ├── core/             # Core abstractions, workflows, utilities
│   ├── db/               # Prisma schema and database repositories
│   ├── shared-types/     # Shared DTOs and types
│   ├── agents-*/         # Individual agent implementations
│   └── integrations-*/   # External service integrations (GitHub, Calendar, WhatsApp, ClickUp, Telegram)
└── package.json          # Root workspace configuration
```

## Tech Stack

- **Language**: TypeScript (Node.js 20+)
- **Package Manager**: pnpm
- **Monorepo**: pnpm workspaces
- **HTTP Framework**: Fastify
- **ORM**: Prisma with PostgreSQL
- **Validation**: Zod
- **Testing**: Vitest
- **Linting/Formatting**: ESLint + Prettier

## Prerequisites

- Node.js 20 or higher
- pnpm 9 or higher
- PostgreSQL database

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd FLAOA
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/flao

# LLM Provider (optional, for LLM features)
# You can use either OpenAI or Gemini (Gemini is preferred if both are set)
OPENAI_API_KEY=sk-your-key-here
GEMINI_API_KEY=your-gemini-api-key

# GitHub (optional)
GITHUB_TOKEN=ghp_your-token
GITHUB_WEBHOOK_SECRET=your-secret

# Calendar (optional)
GOOGLE_CALENDAR_CLIENT_ID=your-id
GOOGLE_CALENDAR_CLIENT_SECRET=your-secret
GOOGLE_CALENDAR_REFRESH_TOKEN=your-token

# WhatsApp (optional - uses WhatsApp Web.js, requires Chrome/Chromium)
# Set WHATSAPP_ENABLED=false to disable WhatsApp (app will run without it)
WHATSAPP_ENABLED=true
WHATSAPP_SESSION_DIR=.wwebjs_auth
WHATSAPP_MONITORED_GROUPS=Group Name 1,Group Name 2
WHATSAPP_AUTO_REPLY_ENABLED=true

# ClickUp (optional)
CLICKUP_API_KEY=your-clickup-api-key
CLICKUP_TEAM_ID=your-team-id

# Telegram (optional)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_IDS=123456789,987654321

# API Gateway
PORT=3000
NODE_ENV=development
```

## Usage

### Running the API Gateway

Start the Fastify API server:

```bash
pnpm dev:api
```

The API will be available at `http://localhost:3000` (or the port specified in your `.env`).

#### API Endpoints

- `GET /health` - Health check
- `GET /whatsapp/qr` - Get QR code for WhatsApp authentication
- `GET /whatsapp/status` - Check WhatsApp connection status
- `POST /webhooks/github` - GitHub webhook handler
- `GET /webhooks/whatsapp` - WhatsApp webhook verification
- `POST /webhooks/whatsapp` - WhatsApp webhook handler
- `POST /webhooks/clickup` - ClickUp webhook handler
- `POST /workflows/new-project` - Trigger new project bootstrap workflow
- `POST /workflows/daily-standup/run` - Trigger daily standup workflow
- `POST /workflows/weekly-report/run` - Generate weekly report
- `POST /workflows/release-prep` - Prepare release
- `POST /workflows/daily-summary` - Generate and send daily summary to Telegram

#### WhatsApp Setup

**Note:** WhatsApp integration is **enabled by default in Docker** (Chrome included). For local development, Chrome/Chromium is required.

WhatsApp integration uses WhatsApp Web.js, which connects to your personal WhatsApp account via QR code:

**Docker ile (Önerilen):**
1. Start the API Gateway with Docker: `docker-compose up -d`
2. Open your browser and go to: `http://your-server:3000/whatsapp/qr-page`
3. A QR code will be displayed on the page
4. Open WhatsApp on your phone
5. Go to Settings → Linked Devices → Link a Device
6. Scan the QR code from the browser
7. Once connected, the session will be saved and you won't need to scan again

**Local Development:**
1. **Prerequisites:** Install Chrome/Chromium (or set `WHATSAPP_ENABLED=false` to disable)
2. Start the API Gateway: `pnpm dev:api`
3. Open your browser and go to: `http://localhost:3000/whatsapp/qr-page`
4. Follow the same steps as above

**API Endpoints:**
- `GET /whatsapp/qr-page` - HTML page with QR code (for browser access)
- `GET /whatsapp/qr` - JSON API with QR code data
- `GET /whatsapp/status` - Check WhatsApp connection status

**Disabling WhatsApp:**
- Set `WHATSAPP_ENABLED=false` in your `.env` file to disable WhatsApp completely
- The application will continue to run normally without WhatsApp support

**Group Message Auto-Reply:**
- Configure monitored groups in `.env` with `WHATSAPP_MONITORED_GROUPS` (comma-separated group names)
- Enable auto-reply with `WHATSAPP_AUTO_REPLY_ENABLED=true`
- The system will automatically reply to messages in monitored groups using Ops Agent
- Supports Turkish keywords: "standup", "günlük", "rapor", "task", "görev", etc.

#### Telegram Bot Setup

Telegram bot integration allows you to receive daily summaries and interact with FLAO via Telegram:

1. Create a bot with [@BotFather](https://t.me/botfather) on Telegram
2. Get your bot token
3. Add `TELEGRAM_BOT_TOKEN` to your `.env` file
4. Start a chat with your bot and send `/start`
5. Get your chat ID (you can use [@userinfobot](https://t.me/userinfobot) or check bot logs)
6. Add your chat ID(s) to `TELEGRAM_CHAT_IDS` in `.env` (comma-separated)

**Telegram Commands:**
- `/start` - Start the bot and see available commands
- `/help` - Show help message
- `/summary` or `/ozet` - Get today's daily summary
- `/summary [date]` - Get summary for a specific date (e.g., `/summary 2024-01-15`)

**Daily Summary includes:**
- ✅ Completed tasks
- 🚀 Started tasks
- 📋 Pending tasks
- 🚫 Blocked tasks
- ⚙️ In-progress tasks
- 👥 Standup entries
- 📁 Active projects

**API Endpoint:**
- `POST /workflows/daily-summary` - Generate and send daily summary
  - Body: `{ "date": "2024-01-15", "chatIds": [123456789] }` (optional)

#### LLM Provider Setup (OpenAI or Gemini)

FLAO supports both OpenAI and Google Gemini for LLM-powered features. Gemini is preferred if both API keys are provided.

**Gemini API Key (Recommended):**

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key
5. Add `GEMINI_API_KEY` to your `.env` file

**OpenAI API Key:**

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy your API key
5. Add `OPENAI_API_KEY` to your `.env` file

**Note:** If both keys are provided, Gemini will be used by default. To use OpenAI instead, only set `OPENAI_API_KEY` and leave `GEMINI_API_KEY` empty.

### Using the CLI

Run workflow simulations via the CLI:

```bash
# Simulate a new project
pnpm dev:cli simulate:new-project

# Run daily standup
pnpm dev:cli run:daily-standup

# Generate weekly report
pnpm dev:cli run:weekly-report
```

## Workflows

### New Project Bootstrap

Creates a new project from a brief by:
1. Client Agent refining the brief
2. CEO Agent validating and prioritizing
3. Product Agent breaking down features
4. CTO Agent providing architecture suggestions
5. PM Agent creating tasks
6. Ops Agent assigning tasks to team members

### Daily Standup

Collects standup entries from team members and generates a summary.

### Weekly Report

Generates a comprehensive weekly report including:
- Completed tasks
- Ongoing projects
- Blocked items
- Activity summary

### Release Preparation

Prepares a release by:
1. QA Agent assessing quality
2. Release Agent generating release notes
3. Ops Agent notifying the team

## Development

### Building

Build all packages:
```bash
pnpm build
```

### Testing

Run tests:
```bash
pnpm test
```

### Linting

Lint code:
```bash
pnpm lint
```

### Formatting

Format code:
```bash
pnpm format
```

### Database Management

- Generate Prisma client: `pnpm db:generate`
- Run migrations: `pnpm db:migrate`
- Open Prisma Studio: `pnpm db:studio`
- Seed database: `pnpm db:seed`

## Agent Personality

All agents use a **Turkish casual-professional tone** - balanced, modern startup language that is:
- Not too formal, not too friendly
- Direct and clear
- Encouraging and action-oriented
- Respectful when pointing out delays
- Positive and team-like

## Project Structure Details

### Packages

- **`@flao/core`**: Core abstractions (Agent, Workflow interfaces), LLM client, logger, config, context builder, and all workflows
- **`@flao/db`**: Prisma schema, database client, and repository functions
- **`@flao/shared-types`**: Shared DTOs and API request/response types
- **`@flao/agents-*`**: Individual agent implementations
- **`@flao/integrations-*`**: Integration clients for external services

### Apps

- **`api-gateway`**: Fastify HTTP server with workflow and webhook routes
- **`cli`**: Command-line interface for running workflows

## Database Schema

The system uses the following main models:

- **Employee**: Team members with roles, workload tracking
- **Project**: Projects with status and priority
- **Task**: Tasks with assignments, estimates, and status
- **StandupEntry**: Daily standup entries
- **WorkflowRun**: Workflow execution tracking
- **EventLog**: System event logging

## Extending the System

### Adding a New Agent

1. Create a new package in `packages/agents-<name>/`
2. Implement the `Agent<Input, Output>` interface
3. Export the agent class
4. Add it to workflow dependencies if needed

### Adding a New Integration

1. Create a new package in `packages/integrations-<name>/`
2. Implement the integration client interface
3. Add mock implementation
4. Register in `AgentContext` creation
5. Add webhook handlers in API gateway if needed
6. Update config schema and environment variables

### Adding a New Workflow

1. Create a workflow class in `packages/core/src/workflows/`
2. Implement the `Workflow<Input, Output>` interface
3. Add route in API gateway if needed
4. Add CLI command if needed

## Docker Deployment

FLAO can be easily deployed using Docker and Docker Compose. This is the recommended way to run the application in production.

### Prerequisites

- Docker 20.10 or higher
- Docker Compose 2.0 or higher

**Important:** Make sure Docker Desktop is running before starting!

- **Windows/Mac:** Start Docker Desktop application
- **Linux:** Make sure Docker daemon is running: `sudo systemctl start docker`

### Quick Start

1. **Clone the repository:**
```bash
git clone <repository-url>
cd FLAOA
```

2. **Create environment file:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Verify Docker is running:**
```bash
docker --version
docker-compose --version
```

4. **Start with Docker Compose:**
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- API Gateway (port 3000)

5. **Check logs:**
```bash
docker-compose logs -f api-gateway
```

6. **Stop the services:**
```bash
docker-compose down
```

### Troubleshooting Docker Issues

**Error: "unable to get image" or "cannot connect to Docker daemon"**

This means Docker Desktop is not running. Solutions:

1. **Windows/Mac:**
   - Open Docker Desktop application
   - Wait for it to fully start (whale icon in system tray should be steady)
   - Try the command again

2. **Linux:**
   ```bash
   sudo systemctl start docker
   sudo systemctl enable docker  # Enable on boot
   ```

3. **Verify Docker is working:**
   ```bash
   docker ps
   ```

**If Docker Desktop won't start:**
- Restart your computer
- Check if virtualization is enabled in BIOS
- Update Docker Desktop to the latest version

### Docker Compose Configuration

The `docker-compose.yml` file includes:
- **PostgreSQL**: Database service with persistent volume
- **API Gateway**: FLAO API service with automatic database migrations

### Environment Variables

All environment variables from `.env` are passed to the containers. Key variables:

- `DATABASE_URL`: Automatically set from PostgreSQL service
- `WHATSAPP_ENABLED`: Set to `true` by default in Docker (Chrome included)
- `PORT`: API Gateway external port (default: 3001 to avoid conflicts)
- `POSTGRES_PORT`: PostgreSQL external port (default: 5433 to avoid conflicts)
- `NODE_ENV`: Set to `production` by default

**Port Configuration (to avoid conflicts):**
If you have other services using ports 3000 or 5432, you can change them in `.env`:
```env
PORT=3001              # API Gateway external port
POSTGRES_PORT=5433     # PostgreSQL external port
```

**Note:** Internal container ports remain the same (3000 for API, 5432 for PostgreSQL). Only external ports change.

### Building Docker Image

To build the Docker image manually:

```bash
docker build -t flao-api-gateway .
```

### Running Migrations

Database migrations run automatically when the container starts. To run manually:

```bash
docker-compose exec api-gateway pnpm --filter @flao/db migrate:deploy
```

### Persisting Data

- **Database**: Stored in `postgres_data` volume
- **WhatsApp Sessions**: Stored in `whatsapp_session` volume (if enabled)

### Production Considerations

1. **Security**: Change default database passwords
2. **SSL/TLS**: Use a reverse proxy (nginx, Traefik) for HTTPS
3. **Backups**: Regularly backup the `postgres_data` volume
4. **Monitoring**: Add health checks and monitoring
5. **WhatsApp**: Disable by default (`WHATSAPP_ENABLED=false`) unless Chrome is installed in the container

### Checking Status (Linux Server)

After starting with `-d` (detached mode), check if everything is running:

**1. Quick Status Check:**
```bash
# Container status
docker-compose ps

# Or use the status script
chmod +x check-status.sh
./check-status.sh
```

**2. Check Container Logs:**
```bash
# API Gateway logs
docker-compose logs -f api-gateway

# All logs
docker-compose logs -f

# Last 50 lines
docker-compose logs --tail=50 api-gateway
```

**3. Health Check Endpoints:**
```bash
# API Gateway health (replace 3001 with your PORT)
curl http://localhost:3001/health

# WhatsApp status
curl http://localhost:3001/whatsapp/status

# With JSON formatting (if jq is installed)
curl http://localhost:3001/health | jq
```

**4. Container Health:**
```bash
# Check if containers are healthy
docker ps --filter "name=flao"

# Check resource usage
docker stats flao-api-gateway flao-postgres
```

**5. Test API Endpoints:**
```bash
# Health check
curl http://localhost:3001/health

# WhatsApp QR page (open in browser)
# http://your-server-ip:3001/whatsapp/qr-page
```

### Port Conflicts

If you have port conflicts (e.g., 5432 or 3000 already in use):

**Solution 1: Change ports in `.env` file:**
```env
PORT=3001              # Change API Gateway port
POSTGRES_PORT=5433     # Change PostgreSQL external port
```

**Solution 2: Check what's using the ports:**
```bash
# Check port 3000
sudo lsof -i :3000
# or
sudo netstat -tulpn | grep :3000

# Check port 5432
sudo lsof -i :5432
# or
sudo netstat -tulpn | grep :5432
```

**Solution 3: Use Docker networks (recommended for multiple services):**
Docker Compose automatically creates an isolated network (`flao-network`), so containers can communicate internally without port conflicts. Only external ports need to be unique.

### Troubleshooting

**Database connection issues:**
```bash
docker-compose logs postgres
docker-compose exec postgres psql -U flao -d flao
```

**API Gateway issues:**
```bash
docker-compose logs api-gateway
docker-compose exec api-gateway sh
```

**Port already in use:**
```bash
# Find and stop conflicting service, or change ports in .env
sudo lsof -i :3001
sudo lsof -i :5433
```

**Rebuild after code changes:**
```bash
docker-compose build --no-cache
docker-compose up -d
```

**Container won't start:**
```bash
# Check logs
docker-compose logs

# Check container status
docker-compose ps -a

# Restart containers
docker-compose restart
```

**pnpm lockfile compatibility error:**
If you see `ERR_PNPM_LOCKFILE_BREAKING_CHANGE` error:

1. **Solution 1 (Recommended):** Update pnpm in Dockerfile (already fixed)
   - Dockerfile now uses `pnpm@9` to match lockfile version 9.0
   - Rebuild: `docker-compose build --no-cache`

2. **Solution 2:** If still having issues, update lockfile locally:
   ```bash
   # Update pnpm to version 9
   npm install -g pnpm@9
   
   # Regenerate lockfile
   pnpm install
   
   # Commit the updated pnpm-lock.yaml
   git add pnpm-lock.yaml
   git commit -m "Update pnpm lockfile to version 9"
   ```

3. **Solution 3:** Use --no-frozen-lockfile (not recommended for production):
   ```dockerfile
   # In Dockerfile, change:
   RUN pnpm install --frozen-lockfile
   # To:
   RUN pnpm install --no-frozen-lockfile
   ```

## Future Enhancements

- Real integration implementations (currently using mocks)
- Advanced LLM-powered decision making
- AWS Lambda + ECS Fargate deployment
- Infrastructure as Code (IaC) setup
- More sophisticated agent orchestration
- Real-time event processing
- Advanced analytics and reporting

## License

[Your License Here]

## Contributing

[Contributing Guidelines Here]

