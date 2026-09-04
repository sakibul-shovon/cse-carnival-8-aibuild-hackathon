# CampusOS — AI Build Hackathon

An intelligent university platform powered by an AI agent that understands and acts on real-time campus data.

---

## 1. Project Overview

**CampusOS** is a comprehensive campus intelligence system designed for universities (specifically modeled after AUST). It bridges scattered campus information into a single real-time platform with full CRUD operations for:
- 📅 **Schedules** (Weekly timetable, rooms, instructors)
- 🏢 **Rooms** (Classrooms, labs, seminar rooms with equipment, capacity, and live booking clash checks)
- 🎉 **Events** (Workshops, guest lectures, hackathons with interactive student registrations)
- 📢 **Announcements** (Department updates, prioritized notices, expirations)
- 📝 **Assignments** (Course homework, project deadlines, submission status)

It features an **Autonomous AI Agent** connected directly to the live backend database. The agent can answer natural language campus questions, execute bookings, register students for events, and dynamically reflect database updates without caching stale seed data.

---

## 2. Tech Stack

- **Backend**: Laravel 12 (PHP 8.2+), Eloquent ORM, RESTful API
- **Database**: MySQL (seeded from initial dataset, fully persistent across app restarts)
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons, Axios, React Router v7
- **AI Agent Engine**: Tool-calling AI Architecture supporting OpenAI / Groq / Gemini with a built-in deterministic live database reasoning fallback

---

## 3. Setup & Installation Instructions

### Prerequisites
- PHP >= 8.2 with `pdo_mysql`, `fileinfo`, `mbstring`, `openssl` enabled
- Composer
- MySQL (e.g. XAMPP or native MySQL running on `127.0.0.1:3306`)
- Node.js >= 18.x & npm

---

### Step 1: Backend Setup (Laravel + MySQL)

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```

2. Copy the environment configuration and set your database credentials:
   ```bash
   cp .env.example .env
   ```
   *(Ensure `DB_CONNECTION=mysql`, `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_DATABASE=campus_os`, `DB_USERNAME=root`, `DB_PASSWORD=` match your local MySQL settings)*

3. Install Composer dependencies:
   ```bash
   composer install
   ```

4. Generate the application key:
   ```bash
   php artisan key:generate
   ```

5. Run migrations and seed data from `/data/*.json` into MySQL:
   ```bash
   php artisan migrate:fresh --seed
   ```

6. Start the Laravel backend server:
   ```bash
   php artisan serve --port=8000
   ```
   *The backend API will run at `http://localhost:8000`.*

---

### Step 2: Frontend Setup (React + Vite)

1. Open a new terminal and navigate to the `client` folder:
   ```bash
   cd client
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Configure `.env` (optional, default is `http://localhost:8000/api`):
   ```env
   VITE_API_URL=http://localhost:8000/api
   ```

4. Build or run the development server:
   ```bash
   npm run dev
   ```
   *The frontend dashboard will run at `http://localhost:5173`.*

---

## 4. Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Default |
|---|---|---|
| `DB_CONNECTION` | Database Driver | `mysql` |
| `DB_HOST` | Database Host | `127.0.0.1` |
| `DB_PORT` | Database Port | `3306` |
| `DB_DATABASE` | Database Name | `campus_os` |
| `DB_USERNAME` | Database User | `root` |
| `DB_PASSWORD` | Database Password | *(empty)* |
| `OPENAI_API_KEY` | Optional OpenAI key for LLM tool calling | *(optional)* |
| `GROQ_API_KEY` | Optional Groq key for Llama 3.3 tool calling | *(optional)* |

### Frontend (`client/.env`)
| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API URL | `http://localhost:8000/api` |

---

## 5. How to Use the AI Agent

Navigate to the **AI Assistant** tab in the dashboard (or click **Ask AI**). You can execute queries such as:

- **Timetable Queries**: *"What classes do I have on Sunday?"* or *"When is my next class?"*
- **Room Search with Filters**: *"Which labs have a projector and can fit at least 30 people?"*
- **Action Execution (Booking)**: *"Book Room 7A02 tomorrow from 3 PM to 5 PM"*
- **Action Execution (Registration)**: *"Register me for the Guest Lecture on Deep Learning"*
- **Assignments & Deadlines**: *"What assignments do I have due this week?"*
- **Announcements**: *"Show me all high priority announcements"*
