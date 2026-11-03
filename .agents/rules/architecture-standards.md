---
name: architecture-standards
description: Enforce 3-tier architecture, API-driven separation of concerns, and the exact Expertise Mocha UI design system.
always_on: true
---

# Architecture & Design Standards for Health Portal

## 1. Strict 3-Tier Architecture
All features must strictly follow a 3-tier separation:
1. **Presentation Tier (`client/`)**:
   - Pure UI and user interaction layer.
   - All state mutations and queries must go through dedicated API client services calling the backend API.
   - Handle loading, error, empty, and optimistic update states gracefully.

2. **Application / Logic Tier (`server/`)**:
   - Houses all domain logic, validation schemas, business rules, and role permissions.
   - Responsible for:
     - Role-Based Access Control (RBAC) and authentication checks.
     - 3-Way matching logic (Contracts vs. Completed Tests vs. Billed Invoices).
     - Medical clearance validity date calculations and expiration states.
     - Clinic appointment scheduling and capacity slot quota enforcement.
     - File upload storage and PDF certificate generation.
     - Centralized audit logging for every mutating action.

3. **Data Tier (PostgreSQL + Prisma ORM)**:
   - Relational database schema with strong foreign keys, integrity constraints, and indexes.
   - All mutations must be committed to the database.

## 2. Browser URL Routing & Local Environment Invariants
- **Browser URL Routing Standard**:
  - NEVER implement core application views solely using in-memory state (e.g., `useState('tab')`) without URL synchronization.
  - Always configure client-side routing (`react-router-dom`) with distinct paths (`/dashboard`, `/requests`, `/clinic`, `/finance`, etc.).
  - Ensure the browser address bar reflects the active view, and that page reloads, browser back/forward buttons, and deep-link bookmarks are fully supported.
- **Local Environment Backend Proxying**:
  - In local development, configure the frontend build tool (`Vite` proxy) to route `/api` requests to the local backend port (`http://localhost:5000`).
  - Do not set default `.env` to remote cloud servers (such as Render) during local development to ensure transparent local network logs and instant local response times.
- **Dynamic Database Persistence**:
  - Controllers must compute aggregations, volume distributions, and metrics directly from database models via the ORM (Prisma).
  - Do not embed static mock data arrays inside controller responses.

## 3. Expertise Mocha Design System (`https://expertise-mocha.vercel.app`)
- **Fonts**: `Plus Jakarta Sans` (Display/Headings), `Inter` (Body text), `Material Symbols Outlined` (Icons).
- **Color Tokens**:
  - Primary Navy: `#0A0F1D` (Sidebar), `#131B35` (Hero cards)
  - Secondary Brand Orange: `#E97F29` / `#F7A65E`
  - Canvas: `#F8FAFC` (slate-50)
  - Card Surfaces: `#FFFFFF` with `border-slate-200/80` and `rounded-2xl`
  - Typography: `#0F172A` (slate-900) and `#64748B` (slate-500)
- **Signature Components**:
  - Dark sidebar with active facility widget, white active pill navigation, role picker.
  - Operations hero banner with telemetry chips, time filters, and orange action button.
  - 4-column KPI metric cards with ceiling progress bars.
  - 4-step stepper intake wizard with document dropzones.
  - 2-column directory cards with CR, ZATCA tax IDs, and action buttons.
  - Data tables with soft status pills (`Approved`, `Waiting`, `Scheduled`, `Fit`, `Unfit`).
