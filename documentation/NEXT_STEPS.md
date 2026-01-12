# Next Steps - Health & Fitness Research Study Platform

## Current Status

### ✅ Completed
- [x] Project setup (Next.js 15, TypeScript, Tailwind CSS)
- [x] Authentication system (register/login)
- [x] Database schema with RLS policies
- [x] Landing page
- [x] Basic dashboard pages (participant & admin)
- [x] Events listing page
- [x] Role-based routing and access control
- [x] Environment variable configuration
- [x] Comprehensive README with setup instructions

---

## Priority 1: Core Functionality (Week 1-2)

### 1.1 Booking System ⚠️ **HIGH PRIORITY**
**Status:** Not Implemented

**Tasks:**
- [ ] Create `/app/events/book/[id]/page.tsx` - Booking page
  - Show event details
  - Check capacity before booking
  - Create booking record in database
  - Handle duplicate bookings
  - Success/error feedback

- [ ] Create `/app/dashboard/bookings/page.tsx` - User's bookings view
  - List all user bookings (past and upcoming)
  - Show booking status
  - Cancel booking functionality
  - Implement 24-hour cancellation policy

- [ ] Add booking cancellation logic
  - Check if cancellation is within 24 hours of event
  - Update booking status to 'cancelled'
  - Free up the spot for others

**Files to create:**
- `app/events/book/[id]/page.tsx`
- `app/dashboard/bookings/page.tsx`
- `lib/api/bookings.ts` (API functions)

---

### 1.2 Health Metrics System ⚠️ **HIGH PRIORITY**
**Status:** Not Implemented

**Tasks:**
- [ ] Create `/app/dashboard/health/page.tsx` - Health metrics page
  - Form to submit new health metrics
  - Display latest metrics
  - Historical data table/list
  - Charts using Recharts (already installed)

- [ ] Create health metrics form component
  - Fields: grip_strength, bone_density, pushup_count, heart_rate, body_fat, notes
  - Validation using Zod
  - Date picker for recorded_date

- [ ] Implement charts/visualization
  - Line charts showing trends over time
  - Multiple metrics on same chart
  - Date range selector

**Files to create:**
- `app/dashboard/health/page.tsx`
- `components/HealthMetricsForm.tsx`
- `components/HealthMetricsChart.tsx`
- `lib/api/health-metrics.ts`

---

### 1.3 Admin Event Management ⚠️ **HIGH PRIORITY**
**Status:** Not Implemented

**Tasks:**
- [ ] Create `/app/admin/events/page.tsx` - Admin events management
  - List all events (past and upcoming)
  - Create new event form
  - Edit existing event
  - Delete event (with confirmation)
  - View participant list for each event

- [ ] Create event form component
  - All required fields from PRD
  - Date/time picker
  - Validation

- [ ] Add participant list view per event
  - Show all users booked for an event
  - Export functionality (optional)

**Files to create:**
- `app/admin/events/page.tsx`
- `app/admin/events/new/page.tsx`
- `app/admin/events/[id]/edit/page.tsx`
- `components/EventForm.tsx`
- `lib/api/events.ts`

---

## Priority 2: Enhanced Features (Week 3)

### 2.1 Calendar View
**Status:** Not Implemented

**Tasks:**
- [ ] Create `/app/events/calendar/page.tsx`
  - Calendar component showing events by date
  - Visual indicators (available, booked, full)
  - Click to book/cancel
  - Month navigation

**Dependencies:**
- May need to install a calendar library (e.g., `react-calendar` or `@fullcalendar/react`)

---

### 2.2 Search and Filter
**Status:** Not Implemented

**Tasks:**
- [ ] Add search functionality to events page
  - Search by event title, type, location
  - Real-time filtering

- [ ] Add filter options
  - Filter by event type
  - Filter by date range
  - Filter by availability

---

### 2.3 Logout Functionality
**Status:** Not Implemented

**Tasks:**
- [ ] Add logout button to dashboard/admin pages
- [ ] Create logout handler
- [ ] Redirect to home page after logout

**Files to create:**
- `components/LogoutButton.tsx` (or add to existing header/nav)

---

### 2.4 Navigation/Header Component
**Status:** Not Implemented

**Tasks:**
- [ ] Create shared navigation component
  - User name/email display
  - Logout button
  - Role-based menu items
  - Responsive mobile menu

**Files to create:**
- `components/Navigation.tsx` or `components/Header.tsx`

---

## Priority 3: Infrastructure & Quality (Week 4)

### 3.1 Error Boundaries
**Status:** Not Implemented (per user rules)

**Tasks:**
- [ ] Create `components/ErrorBoundary.tsx`
- [ ] Wrap app routes in error boundaries
- [ ] Add error logging/reporting

---

### 3.2 Debug Logging Setup
**Status:** Not Implemented (per user rules)

**Tasks:**
- [ ] Install `debug` package (or use existing)
- [ ] Create `lib/logger.ts` utility
- [ ] Replace any console.log with debug logger
- [ ] Configure build step to strip console.log in production

---

### 3.3 Typed API Wrappers
**Status:** Not Implemented (per user rules)

**Tasks:**
- [ ] Create `lib/api/` directory structure
- [ ] Create typed wrappers for Supabase queries
- [ ] Add error handling with full context logging
- [ ] Use Zod for response validation

**Files to create:**
- `lib/api/bookings.ts`
- `lib/api/events.ts`
- `lib/api/health-metrics.ts`
- `lib/api/users.ts`
- `lib/api/types.ts`

---

### 3.4 Testing Infrastructure
**Status:** Partially Configured

**Tasks:**
- [ ] Create `jest.config.js` using `next/jest`
- [ ] Install testing dependencies:
  ```bash
  npm install --save-dev @testing-library/react @testing-library/jest-dom jest-environment-jsdom
  ```
- [ ] Create `jest.setup.js`
- [ ] Write tests for:
  - Validation schemas (easiest to start)
  - API functions
  - Components (React Testing Library)

---

## Priority 4: Polish & UX (Week 5)

### 4.1 Loading States
**Status:** Basic implementation exists

**Tasks:**
- [ ] Add loading skeletons/spinners
- [ ] Improve loading UX across all pages

---

### 4.2 Error Handling & Messages
**Status:** Basic implementation exists

**Tasks:**
- [ ] Standardize error messages
- [ ] Add toast notifications (consider `react-hot-toast`)
- [ ] Improve form validation error display

---

### 4.3 Responsive Design
**Status:** Basic Tailwind responsive classes used

**Tasks:**
- [ ] Test on mobile devices
- [ ] Improve mobile navigation
- [ ] Optimize forms for mobile
- [ ] Test calendar view on mobile

---

### 4.4 Analytics Dashboard
**Status:** Basic stats shown

**Tasks:**
- [ ] Create `/app/admin/analytics/page.tsx`
- [ ] Add charts for:
  - Attendance rates over time
  - Average health metrics
  - Event popularity
  - Participant engagement

---

## Priority 5: Advanced Features (Future)

### 5.1 Real-time Updates
- [ ] Use Supabase Realtime for live booking updates
- [ ] Live event capacity updates
- [ ] Real-time notifications

### 5.2 Email Notifications
- [ ] Booking confirmations
- [ ] Event reminders
- [ ] Cancellation confirmations

### 5.3 Export/Reporting
- [ ] Export participant data (CSV)
- [ ] Generate reports
- [ ] Health metrics reports

### 5.4 Advanced Filtering
- [ ] Filter health metrics by date range
- [ ] Correlate health data with attended events
- [ ] Advanced admin filters

---

## Recommended Implementation Order

### Week 1: Core Booking & Health Metrics
1. Booking system (`/events/book/[id]`, `/dashboard/bookings`)
2. Health metrics form and display (`/dashboard/health`)
3. Basic charts for health metrics

### Week 2: Admin Features
1. Admin event CRUD (`/admin/events`)
2. Participant management (`/admin/participants`)
3. Enhanced analytics

### Week 3: UX Improvements
1. Calendar view
2. Search and filters
3. Navigation component
4. Logout functionality

### Week 4: Infrastructure
1. Error boundaries
2. Debug logging
3. Typed API wrappers
4. Testing setup

### Week 5: Polish
1. Loading states
2. Error handling improvements
3. Mobile optimization
4. Final testing

---

## Quick Start: Next Feature to Build

**Recommended:** Start with the booking system as it's core functionality.

1. Create `/app/events/book/[id]/page.tsx`
2. Add booking API function in `lib/api/bookings.ts`
3. Update events page to link to booking page
4. Test booking flow

**Estimated time:** 2-3 hours for basic booking functionality

---

## Notes

- All features should follow the user rules:
  - Use Zod for validation
  - Error boundaries and typed API wrappers
  - Debug logging (not console.log)
  - Jest + React Testing Library for tests
  - ESLint warnings = errors

- Database schema is already set up, so focus on UI and API layer

- Recharts is already installed for data visualization

- Consider using React Hook Form for complex forms

---

## Questions to Consider

1. **Email verification:** Should registration require email verification?
2. **Booking limits:** Should users be limited to X bookings at once?
3. **Waitlist:** Should there be a waitlist for full events?
4. **Notifications:** In-app notifications or email only?
5. **Data export:** What format for health metrics export?

---

**Last Updated:** After initial commit
**Current Phase:** Core functionality development
