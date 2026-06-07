# ☕ Kopi Kaki — Chiong Together, Score Together

> **Orbital 2026 | Proposed Level: Project Gemini**  
> By Chua Jun En & Qian Grace Pan | Advised by Shearer Tang

Kopi Kaki is a student-centric web app that connects NUS students with compatible study buddies — based on their course, modules, accommodation, and study style.

---

## 🎯 Motivation

Starting university is exciting but can feel isolating, especially for students who don't yet know many peers in their course. Finding someone to bid modules with, attend lectures together, or simply study alongside can be surprisingly difficult.

Existing platforms like Telegram group chats are unstructured and impersonal — there's no easy way to find a compatible study companion. Kopi Kaki fills this gap with a purposeful, NUS-student-centric platform.

---

## 👥 User Stories

1. **Hall/RC student** — Filter by accommodation to find kakis I can easily meet up with in person.
2. **Year 1 student** — Filter peers taking the same modules to coordinate bids and avoid clashing timetables.
3. **Any user** — Send, accept, or decline buddy requests to stay in control of my connections.
4. **Connected user** — Contact my kaki via Telegram or in-app to plan study sessions.
5. **Any user** — Edit my profile and update my modules each semester to keep my info relevant.

---

## ✅ Features Implemented (Milestone 1)

### 1. User Authentication
- OTP login via NUS email (`@u.nus.edu`) — 6-digit code sent to inbox
- Frontend validation blocks non-NUS emails before any OTP request
- 60-second cooldown on resend to prevent spam; code expires after 10 minutes
- Built with **Supabase Auth** (`signInWithOtp` + `verifyOtp`)
- On success, user is redirected to profile setup

### 2. Basic Profile Creation
- Fields: Course and Year of Study
- Stored in Supabase under the user's authenticated session ID
- Pre-fills existing data for returning users; updates persisted on save

### 3. User Homepage
- Displays upcoming study sessions (Kopi Meet-ups) and suggested kakis
- Quick Add button to send buddy requests directly from the homepage
- Persistent bottom nav bar (Home, Kakis, Bids, Profile)
- Unauthenticated users are redirected to login

### 4. Profile Page
- Displays name, Telegram handle, course, year, accommodation, bio, study style
- Report a User feature: submit reports by email with reason + optional description
- Log out button that clears session and redirects to login

---

## 🗺️ Proposed Features (by Splashdown / Milestone 3)

| # | Feature | Type |
|---|---------|------|
| 1 | User Auth & Profile Creation | Core |
| 2 | Study Buddy Discovery & Filtering (course, modules, accommodation, compatibility score) | Core |
| 3 | Buddy Request System (send/accept/decline; Telegram revealed on mutual acceptance) | Core |
| 4 | Profile Management (edit profile, update modules, manage connections) | Core |
| 5 | Module Bidding Coordination (flag modules to bid; surface peers with same plans) | Extension |
| 6 | Admin & Reporting Panel (review flagged profiles; warn or disable accounts) | Extension |

---

## 🛠️ Tech Stack

| Area | Technology |
|------|-----------|
| Frontend | React.js |
| Styling | Tailwind CSS |
| Backend & Auth | Supabase (Auth + Database) |
| Hosting | TBC |
| Version Control | Git / GitHub |

---

## 🚀 Running Locally

> You'll need **Node.js** installed. Check with `node --version` in your terminal.

```bash
# 1. Clone the repo
git clone https://github.com/graceqian06/kopi-kaki.git

# 2. Navigate into the project folder
cd kopi-kaki

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

Then open your browser at `http://localhost:8080` (or the port shown in your terminal).

### Testing the app
1. Enter your NUS email (`@u.nus.edu`) on the login page
2. Check your inbox for a 6-digit OTP (valid for 10 minutes)
3. Enter the OTP to be redirected to profile setup
4. Fill in your Course and Year of Study, then click Save
5. Refresh — your saved values should be pre-filled ✅

> **Note:** Only `@u.nus.edu` emails are accepted. If you don't receive the OTP, wait 60 seconds and click Resend.

---

## 📅 Development Timeline

| Dates | Milestone |
|-------|-----------|
| 12–19 May | Liftoff: poster, video, wireframes, repo setup |
| 19–25 May | Auth skeleton, initial UI |
| 26 May – 1 Jun | OTP auth + profile creation connected to Supabase |
| 2 Jun | **Milestone 1 submission** |
| 2–22 Jun | Discovery feed + filtering system |
| 23–29 Jun | Buddy request system + "My Buddies" list |
| 30 Jun | **Milestone 2 submission** |
| 1–21 Jul | Module bidding + admin/reporting panel |
| 22–27 Jul | UI/UX refinement, final testing + docs |
| 28 Jul | **Milestone 3 (Splashdown) submission** |

---

## 👩‍💻 Team

| Name | GitHub |
|------|--------|
| Chua Jun En | [@desirecje](#) |
| Qian Grace Pan | [@graceqian06](#) |
