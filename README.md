# Architectural Ledger — Income & Expenditure Tracker

A full-stack expenditure tracking system with a PHP REST API backend and an Angular 18 frontend, designed for AppServ/XAMPP deployment.

## Architecture

```
Expense-Tracking/
├── api/                    # PHP REST API (backend)
│   ├── auth/               # Authentication endpoints
│   │   ├── login.php
│   │   ├── signup.php
│   │   ├── logout.php
│   │   ├── me.php
│   │   ├── list_users.php
│   │   └── update_user.php
│   ├── insert.php          # Add entry
│   ├── fetch_entries.php   # List/paginate entries
│   ├── edit_entry.php      # Update entry
│   ├── delete_entry.php    # Remove entry
│   ├── export_entries.php  # CSV export
│   ├── finance_insights.php# Monthly analytics
│   ├── backup_settings.php # Backup path config
│   ├── create_backup.php   # Server-side backup
│   ├── download_backup.php # ZIP download
│   ├── export_tally.php    # Tally XML export
│   └── import_entries.php  # Bulk CSV/XLSX import
├── config/
│   ├── database.php        # MySQL connection
│   ├── auth.php            # Session/auth helpers
│   └── backup_settings.json
├── database/
│   ├── schema.sql          # Base schema
│   └── migrations/         # Schema migrations
├── frontend-angular/       # Angular 18 SPA (source)
├── app/                    # Angular production build (served by Apache)
└── mobile/                 # Flutter SMS expense tracker companion
```

## Quick Start (AppServ)

### Prerequisites

- AppServ or XAMPP with Apache + PHP + MySQL running
- Node.js v20+ (for building the Angular frontend)

### 1. Database Setup

```sql
-- Import in phpMyAdmin or MySQL CLI:
source C:/AppServ/www/Expense-Tracking/database/schema.sql
source C:/AppServ/www/Expense-Tracking/database/migrations/20260410_nullable_voucher_description.sql
```

### 2. Configure Database Connection

Edit `config/database.php` if your MySQL credentials differ from the defaults.

### 3. Build & Deploy the Angular Frontend

```powershell
cd C:\AppServ\www\Expense-Tracking\frontend-angular

# Install dependencies (first time only)
npm install

# Build for production
npm run build

# Deploy to AppServ
Copy-Item .\dist\architectural-ledger-angular\browser\* ..\app\ -Recurse -Force
```

### 4. Apache Configuration

Ensure these are set in `C:\AppServ\Apache24\conf\httpd.conf`:

```apache
# Uncomment this line:
LoadModule rewrite_module modules/mod_rewrite.so

# In the <Directory "C:/AppServ/www"> block, set:
AllowOverride All
```

Restart Apache after changes.

### 5. Open the App

- **Angular app:** [http://localhost/Expense-Tracking/app/](http://localhost/Expense-Tracking/app/)
- **First-time setup:** Navigate to the signup page and create your first account (becomes `administrator` automatically).

## Rebuild After Code Changes

```powershell
cd C:\AppServ\www\Expense-Tracking\frontend-angular
npm run build
Copy-Item .\dist\architectural-ledger-angular\browser\* ..\app\ -Recurse -Force
```

No Apache restart needed — just refresh the browser.

## Development Server

For live-reload development without rebuilding:

```powershell
cd C:\AppServ\www\Expense-Tracking\frontend-angular
npm start
```

Opens at [http://localhost:4200](http://localhost:4200). API calls are proxied to `http://localhost` (AppServ) via `proxy.conf.json`.

## Angular Frontend

See [frontend-angular/README.md](frontend-angular/README.md) for source details.

### Screens

| Route | Access | Description |
|-------|--------|-------------|
| `/login` | Public | Email/password authentication |
| `/signup` | Public | First-time account creation |
| `/dashboard` | Authenticated | Entry CRUD, summary cards, quick-add form |
| `/finance-insights` | Authenticated | Monthly analytics, charts, category breakdown |
| `/user-management` | Admin only | User list, create/edit users, role management |
| `/backup` | Admin only | Server backup, ZIP download, Tally export, CSV/XLSX import |

### Design System

"Architectural Ledger" — uses Manrope + Inter typography, tonal surface layering, ambient shadows, glassmorphism modals, Material Symbols icons, and a no-line layout approach. Primary color: `#545f73`.

## Authentication

- Session-based using PHP sessions with `withCredentials` cookies.
- **Administrator:** Full access — entries, users, backup, export.
- **Staff:** View and export entries only.
- First signup automatically gets the `administrator` role.
- Passwords stored as bcrypt hashes (`PASSWORD_DEFAULT`).

## Mobile Companion

The `mobile/flutter_sms_expense_tracker/` directory contains a Flutter app that reads SMS messages to auto-capture expenses. See its own README for setup.
