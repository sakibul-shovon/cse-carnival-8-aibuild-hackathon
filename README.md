# CampusOS — AI Build Hackathon

An intelligent university platform powered by an AI agent that understands and acts on real-time campus data.

---

## 1. Project Overview

**CampusOS** is a full-stack campus intelligence operating system tailored for universities (modeled after AUST). It integrates scattered campus services into a cohesive, role-aware, and real-time dashboard featuring:

- 📚 **Courses & Curriculum**:
  - Live university course catalog with section capacity gauges.
  - **Quick Join by Course ID / Code** (e.g. `CSE 321`, `CRS-CSE321`) with instant validation and credit calculation.
  - Role-based student enrollments, drops, teacher roster views, and admin course creation.
- 📅 **Schedules**: Weekly timetable grid, room mappings, time slots, and instructor allocations.
- 🏢 **Rooms**: Real-time classroom and laboratory status, equipment filters (projectors, AC, sound systems), capacity tracking, and booking clash detection.
- 🎉 **Events**: Hackathons, workshops, guest seminars with live capacity counting and one-click student registration.
- 📢 **Announcements**: Broadcast notices categorized by priority (Urgent, High, Normal) with automatic active/expired filtering.
- 📝 **Assignments**: Course homework, submission deadlines, and student progress tracking.
- 🤖 **Autonomous AI Agent**: Tool-calling AI connected directly to the live MySQL database capable of executing real actions (booking rooms, registering events, querying schedules, filtering courses) based on real-time database state.

---

## 2. Architecture & Tech Stack

- **Backend**: Laravel 12 (PHP 8.2+), Laravel Sanctum Authentication, Eloquent ORM, REST API
- **Database**: MySQL 8.x (persistent storage across sessions with foreign key integrity)
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons, Axios, React Router v7
- **AI Agent Engine**: Tool-calling AI Architecture supporting OpenAI / Groq / Gemini with a built-in deterministic fallback for 100% offline evaluation reliability.
- **Authentication & RBAC**: Multi-role support (`student`, `teacher`, `admin`) with protected API endpoints and custom permissions.

---

## 3. End-to-End System Workflow

```
[ Student / Teacher / Admin ]
             │
             ▼
    [ Sanctum Auth ]
             │
             ▼
    [ CampusOS Dashboard ]
   ┌─────────┼─────────┬─────────┬─────────┐
   ▼         ▼         ▼         ▼         ▼
Courses  Schedules   Rooms    Events  AI Agent
   │         │         │         │         │
   └─────────┴────┬────┴─────────┴─────────┘
                  ▼
         [( MySQL Database )]
```

### Core User Journeys:
1. **Student Registration & Course Enrollment**:
   - Students register and log in to access their personalized dashboard.
   - Navigate to **Courses**, browse catalog or click **Join by Course ID** to enroll using course codes (e.g., `CSE 321`).
   - The system validates capacity in real-time and increments enrolled counts.
2. **Teacher & Faculty Management**:
   - Teachers view assigned courses, track student rosters, create assignments, and schedule class slots.
3. **AI Campus Senior Agent**:
   - Ask natural language questions like *"What classes do I have tomorrow?"* or *"Book Room 7A02 tomorrow at 3 PM"*.
   - The AI agent dynamically invokes backend tools and executes database operations.

---

## 4. Setup & Installation Instructions

### Prerequisites
- PHP >= 8.2 with `pdo_mysql`, `fileinfo`, `mbstring`, `openssl` enabled
- Composer
- MySQL (e.g., XAMPP or native MySQL on `127.0.0.1:3306`)
- Node.js >= 18.x & npm

---

### Step 1: Backend Setup (Laravel + MySQL)

1. Open terminal and go to `backend`:
   ```bash
   cd backend
   ```

2. Copy environment file:
   ```bash
   cp .env.example .env
   ```
   *(Verify your database credentials in `.env`: `DB_DATABASE=campus_os`, `DB_USERNAME=root`, `DB_PASSWORD=`)*

3. Install dependencies:
   ```bash
   composer install
   ```

4. Generate application key:
   ```bash
   php artisan key:generate
   ```

5. Run migrations & seed data:
   ```bash
   php artisan migrate:fresh --seed
   ```

6. Start Laravel backend:
   ```bash
   php artisan serve --port=8000
   ```
   *Backend will run at: `http://localhost:8000`*

---

### Step 2: Frontend Setup (React + Vite)

1. Open a new terminal and go to `client`:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure `.env` (optional, default `http://localhost:8000/api`):
   ```env
   VITE_API_URL=http://localhost:8000/api
   ```

4. Start development server:
   ```bash
   npm run dev
   ```
   *Frontend dashboard will run at: `http://localhost:5173`*

---

## 5. Seeded Test Accounts

| Role | Email | Password |
|---|---|---|
| **Student** | `student@campusos.com` | `password` |
| **Teacher** | `teacher@campusos.com` | `password` |
| **Admin** | `admin@campusos.com` | `password` |

---

## 6. Environment Configuration

### Backend (`backend/.env`)
| Variable | Description | Default |
|---|---|---|
| `DB_CONNECTION` | Database Driver | `mysql` |
| `DB_HOST` | Database Host | `127.0.0.1` |
| `DB_PORT` | Database Port | `3306` |
| `DB_DATABASE` | Database Name | `campus_os` |
| `DB_USERNAME` | Database User | `root` |
| `DB_PASSWORD` | Database Password | *(empty)* |
| `OPENAI_API_KEY` | Optional OpenAI API Key | *(optional)* |
| `GROQ_API_KEY` | Optional Groq API Key | *(optional)* |

### Frontend (`client/.env`)
| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend REST API Endpoint | `http://localhost:8000/api` |

---

## 7. AI Agent Queries & Capabilities

The autonomous AI Assistant is accessible via `/assistant` or the floating AI prompt:
- **Course & Credits**: *"Which courses am I enrolled in and how many credits do I have?"*
- **Schedules & Classes**: *"When is my next class?"* or *"What is my schedule for Monday?"*
- **Room Availability & Bookings**: *"Find me a lab with a projector and at least 30 capacity"* / *"Book Room 7A02 tomorrow from 3 PM to 5 PM"*
- **Event Registrations**: *"Register me for the Intra-University Hackathon"*
- **Announcements & Deadlines**: *"Show all high-priority announcements and upcoming assignment deadlines"*
