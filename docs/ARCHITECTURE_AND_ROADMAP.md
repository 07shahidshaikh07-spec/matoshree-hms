# Matoshree Clinic Architecture & Clinical Workflow

## 1. Modular Structure
```text
matoshree-clinic/
├── prisma/
│   ├── schema.prisma                     # Relational SQLite database schema
│   ├── seed.ts                           # Synthetic Latur clinic demo seed
│   └── matoshree.db                      # Local SQLite database file
├── public/
│   └── logo/
│       └── matoshree-logo.svg            # Official Matoshree Clinic logo
├── src/
│   ├── app/
│   │   ├── api/                          # Endpoints (auth, dashboard, patients, opd,
│   │   │                                 # appointments, consultations, billing, reports, settings)
│   │   ├── globals.css                   # Print stylesheet & typography
│   │   ├── layout.tsx                    # Clinic root shell & metadata
│   │   └── page.tsx                      # Main workspace controller & view router
│   ├── components/
│   │   ├── Sidebar.tsx                   # 7-module teal-green navigation & profile
│   │   ├── DashboardView.tsx             # Daily summary, OPD queue & collections
│   │   ├── PatientsView.tsx              # Registration, duplicate checks & profiles
│   │   ├── OpdView.tsx                   # Queue tokens & doctor assignment
│   │   ├── ConsultationWorkspace.tsx     # Clinical notes, vitals & Rx builder
│   │   ├── AppointmentsView.tsx          # Appointment booking & 1-click OPD conversion
│   │   ├── BillingView.tsx               # Invoicing, partial payments & receipts
│   │   ├── ReportsView.tsx               # Minimal daily/monthly clinic aggregations
│   │   ├── SettingsView.tsx              # Doctor fees & user password management
│   │   ├── LoginModal.tsx                # Role switcher & authentication modal
│   │   └── PrintableDocuments.tsx        # High-res print layouts (Prescription & Receipt)
│   ├── lib/
│   │   ├── auth.ts                       # PBKDF2 password hashing & verification
│   │   ├── db.ts                         # Prisma client singleton
│   │   ├── rbac.ts                       # Server-side RBAC permissions
│   │   ├── timezone.ts                   # Asia/Kolkata (IST) & INR currency formatters
│   │   └── validation.ts                 # Zod validation schemas
│   └── services/
│       └── clinicCoreService.ts          # Core domain business logic
└── tests/
    └── run-tests.mjs                     # 13 automated end-to-end acceptance tests
```
