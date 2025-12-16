# Esport Tournament Platform

Full-stack esport tournament management platform with React frontend and Express backend.

## Quick Start

### Running Both Backend and Frontend Together

The easiest way to run the entire application is using the root runner:

```bash
# Install dependencies for all projects (run once)
npm run install:all

# Start both backend and frontend in one console
npm run dev
```

This will start:
- **Backend** on `http://localhost:3000` (or configured port)
- **Frontend** on `http://localhost:5173` (Vite default)

Both services will run concurrently with colored output prefixes:
- `[BACKEND]` in cyan
- `[FRONTEND]` in magenta

### Running Services Individually

If you prefer to run services separately:

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## Project Structure

```
EsportTournament/
├── backend/          # Express + Prisma backend
├── frontend/         # React + Vite frontend
└── package.json      # Root runner configuration
```

## Available Scripts (Root)

- `npm run dev` - Start both backend and frontend
- `npm run dev:backend` - Start only backend
- `npm run dev:frontend` - Start only frontend
- `npm run install:all` - Install dependencies for all projects

## Backend Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with initial data

## Frontend Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Development

1. Make sure you have Node.js installed (v18+ recommended)
2. Install all dependencies: `npm run install:all`
3. Configure your backend environment variables (`.env` in backend folder)
4. Run database migrations: `cd backend && npm run db:migrate`
5. (Optional) Seed the database: `cd backend && npm run db:seed`
6. Start the development servers: `npm run dev`

## Technologies

### Backend
- Express.js
- Prisma ORM
- PostgreSQL
- JWT Authentication
- TypeScript

### Frontend
- React 19
- Vite
- React Router
- Redux Toolkit
- Tailwind CSS
- Shadcn UI
- TypeScript
