# TicketHold - Complete Ticket Booking System

TicketHold is a full-stack, production-ready Ticket Booking Website built with Next.js (App Router), PostgreSQL (via Prisma ORM), and styled using custom Vanilla CSS. It features dynamic location/venue filters, role-based authorization, visual seat maps, concurrency-protected seat holding, automated FIFO waitlist assignments, dynamic QR code ticket generation, and email alerts.

## 🖼️ Application Previews

### 1. Role Selection Portal
![Role Selection Welcome Page](public/screenshots/role_selection.png)

### 2. Interactive Seat Booking Map
![Interactive Seat Booking Map](public/screenshots/ticket_view.png)

---

## 🚀 Features

### Customer Flow:
- **Authentication**: Secure registration, login, and sessions using HTTP-Only JWT cookies.
- **Search & Filters**: Browse events by keywords, locations, dates, and ticket prices.
- **Visual Seat Map**: A database-driven visual seat layout grid color-coded by status (Available, Held, Booked).
- **Seat Locking**: Concurrency-safe seat holding (atomic database locking for 10 minutes during checkout).
- **Checkout**: Simulated payment gateway completing reservations into confirmed bookings.
- **QR Tickets**: Interactive dynamic QR codes generated for each ticket.
- **Booking History**: Overview of upcoming, past, and cancelled ticket orders.
- **FIFO Waitlist**: Join queues for sold-out events and receive automatic 10-minute ticket offers when bookings are cancelled.

### Organiser Flow:
- **Event Management**: Create and publish events, assign venues, set date/time, and define pricing zones.
- **Dashboard & Analytics**: View total revenue, tickets sold, available capacity, and individual event performance.

### Admin Flow:
- **Venue Builder**: Create venue templates, configure rows/seats, and define category divisions (Premium, Standard, Economy).
- **User Audits**: Edit user permissions, manage user roles, or delete accounts.
- **Global Overview**: Track system-wide revenue, users, venues, events, recent transactions, and email notification logs.

---

## 🛠️ Technology Stack

- **Frontend & Backend API**: Next.js (App Router, TypeScript)
- **Styling**: Vanilla CSS (CSS Modules)
- **Database ORM**: Prisma with PostgreSQL
- **Authentication**: JWT stored in HTTP-Only cookies
- **Hold Expiry / TTL**: On-demand checks + cron-triggered API endpoint (`/api/cron/cleanup`)
- **Concurrency Protection**: Database transactions with atomic row updates (`UPDATE ... WHERE status = 'AVAILABLE'`)
- **Real-Time Seat Updates**: Client-side short polling (every 3 seconds)
- **QR Code**: Dynamically generated as a base64 PNG data URL on the server
- **Email**: NodeMailer (SMTP) with automatic local fallback logging to `scratch/emails.log` if SMTP is unconfigured

---

## 🗺️ Role-Separated User Flow & Routing

TicketHold splits the application into three completely separated workflows to address different user goals:

1. **Role Selection (Website Entry)**:
   - Route `/` presents a landing screen to choose between: **Customer**, **Organiser**, or **Admin**.
   - Directs users to role-specific login paths: `/customer/login`, `/organiser/login`, `/admin/login`.

2. **Customer Experience (Ticket Booking Platform)**:
   - Entry: `/customer/login` & `/customer/register`
   - Area: `/customer/*` (Dashboard, events browsing, seat map, bookings, waitlists)
   - Route Protection: Enforced via `customer/layout.tsx` (unauthorized sessions are kicked back).

3. **Organiser Experience (Event Management Platform)**:
   - Entry: `/organiser/login` & `/organiser/register`
   - Area: `/organiser/*` (Dashboard metrics, 4-step creation wizard, sales reporting)
   - Route Protection: Enforced via `organiser/layout.tsx`.

4. **Admin Experience (Platform Administration System)**:
   - Entry: `/admin/login` (No public registration)
   - Area: `/admin/*` (Dashboard metrics audit, User role controls, global Venue Builder)
   - Route Protection: Enforced via `admin/layout.tsx`.

---

## 🔑 Demo Accounts

For testing, the database comes pre-seeded with the following accounts (all use password: **`password123`**):
- **Admin**: `admin@tbs.com`
- **Organiser**: `organiser@tbs.com`
- **Customer 1**: `customer@tbs.com`
- **Customer 2**: `customer2@tbs.com`
- **Customer 3**: `customer3@tbs.com`

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory. You can use the template below (and refer to `.env.example`):

```ini
DATABASE_URL="postgresql://postgres:password@localhost:5433/ticket_booking?schema=public"
AUTH_SECRET="your-32-character-random-secret-key"
APP_URL="http://localhost:3000"

# Optional SMTP Settings (Logs to scratch/emails.log if empty)
EMAIL_FROM="noreply@yourdomain.com"
EMAIL_SMTP_HOST="smtp.mailtrap.io"
EMAIL_SMTP_PORT="2525"
EMAIL_SMTP_USER=""
EMAIL_SMTP_PASS=""
```

---

## 📥 Installation & Running Locally

1. **Clone and Install Dependencies**:
   ```bash
   npm install
   ```

2. **Database Setup**:
   Ensure your PostgreSQL instance is running (e.g. port `5433` or standard `5432` as configured in your `.env`).
   Run migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Seed Database**:
   Populate the database with locations, venues, seat maps, users, and events:
   ```bash
   npm run db:seed
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Run Integration Tests**:
   Verify concurrency protection and FIFO waitlist offers:
   ```bash
   npx tsx scratch/test_concurrency.ts
   ```

---

## 📡 API Reference

### Authentication
- `POST /api/auth/register` - Create account (Customer/Organiser).
- `POST /api/auth/login` - Authenticate credentials and issue cookie.
- `POST /api/auth/logout` - Clear JWT token cookie.
- `GET /api/auth/me` - Fetch session of logged-in user.

### Events & Seats
- `GET /api/events` - Retrieve/Filter events list.
- `POST /api/events` - Create event & instantiate seat layout (Organiser/Admin).
- `GET /api/events/:id` - Fetch single event details.
- `GET /api/events/:id/seats` - Retrieve event seat map (triggers hold/offer cleanup).
- `POST /api/seats/hold` - Hold or release seats (concurrency-safe transaction).

### Bookings
- `POST /api/bookings` - simulated billing checkout & confirm booking.
- `GET /api/bookings` - Retrieve booking history.
- `GET /api/bookings/:id` - Fetch booking details with dynamic QR ticket.
- `POST /api/bookings/:id/cancel` - Cancel booking and trigger waitlist offers.

### Waitlist
- `POST /api/waitlist` - Join waitlist for sold-out event category.
- `GET /api/waitlist` - Retrieve queue positions and active waitlist offers.
- `POST /api/waitlist/offers/:offerId/decline` - Decline offer & trigger next user offer.

### Venues & Administration
- `GET /api/venues` - Get list of venues.
- `POST /api/venues` - Create venue & auto-generate seat grids (Admin).
- `DELETE /api/venues/:id` - Delete venue layout.
- `GET /api/admin/users` - Get list of system users.
- `PUT /api/admin/users/:id` - Modify user role.
- `GET /api/admin/stats` - Fetch Admin metrics.
- `GET /api/admin/emails` - Audit email dispatch log history.

### Cron
- `GET /api/cron/cleanup` - Expire holds, offers, and reassign seats.

---

## ☁️ Deployment

### 1. Database Setup
Provision a serverless PostgreSQL database using Neon (`neon.tech`) or Supabase (`supabase.com`) and copy the connection string.

### 2. Frontend & API Setup (Vercel)
1. Commit and push the project code to your public GitHub repository.
2. Sign in to **Vercel** (`vercel.com`) and select **Add New Project** -> **Import** your repository.
3. Configure the **Environment Variables** in Vercel:
   - `DATABASE_URL` (your Neon or Supabase PostgreSQL connection URL)
   - `AUTH_SECRET` (generate a random 32-character string)
   - `APP_URL` (your final Vercel deployment URL, e.g. `https://your-app.vercel.app`)
4. Click **Deploy**. Vercel will automatically run `prisma generate` and compile the optimized production build.
5. Create a Cron Job in Vercel dashboard pointing to `https://your-app.vercel.app/api/cron/cleanup` to trigger cleanup every minute.
