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

## 2. Expertise Mocha Design System (`https://expertise-mocha.vercel.app`)
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
