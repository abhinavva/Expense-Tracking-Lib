# Architectural Ledger — Angular Frontend

Angular 18 SPA rewrite of the expenditure tracker, using standalone components, signals, and lazy-loaded routes against the existing PHP REST API.

## Tech Stack

- **Angular 18** — standalone components, signals for state, lazy routes
- **SCSS** — CSS custom properties for design tokens, no Tailwind
- **Fonts** — Manrope (display) + Inter (body) via Google Fonts
- **Icons** — Material Symbols Outlined
- **File import** — `xlsx` package for `.xlsx/.xls` parsing

## Screens

| Route | Guard | Component |
|-------|-------|-----------|
| `/login` | — | `LoginComponent` |
| `/signup` | — | `SignupComponent` |
| `/dashboard` | `authGuard` | `DashboardComponent` |
| `/finance-insights` | `authGuard` | `FinanceInsightsComponent` |
| `/user-management` | `adminGuard` | `UserManagementComponent` |
| `/backup` | `adminGuard` | `BackupComponent` |

## Project Structure

```
src/
├── app/
│   ├── layout/              # App shell — sidebar + topbar + mobile nav
│   ├── features/
│   │   ├── auth/            # Login & signup pages
│   │   ├── dashboard/       # Entry CRUD, summary cards, quick-add
│   │   ├── finance-insights/# Charts, metrics, category analysis
│   │   ├── user-management/ # User table, stats, create/edit dialogs
│   │   └── backup/          # Backup, import, Tally export, operation log
│   └── core/
│       ├── services/        # ApiService, AuthService, EntriesService,
│       │                    # FinanceService, UsersService, BackupService
│       ├── models/          # Entry, User, ApiResponse interfaces
│       └── guards/          # authGuard, adminGuard
├── styles.scss              # Global design tokens & base theme
└── index.html               # Entry point (base href: /Expense-Tracking/app/)
```

## API Integration

All HTTP calls go through `ApiService` with `withCredentials: true` for session cookies.

| Service | Endpoints |
|---------|-----------|
| `AuthService` | `auth/login.php`, `auth/signup.php`, `auth/logout.php`, `auth/me.php` |
| `EntriesService` | `fetch_entries.php`, `insert.php`, `edit_entry.php`, `delete_entry.php`, `export_entries.php` |
| `FinanceService` | `finance_insights.php` |
| `UsersService` | `auth/list_users.php`, `auth/update_user.php`, `auth/signup.php` |
| `BackupService` | `backup_settings.php`, `create_backup.php`, `download_backup.php`, `export_tally.php`, `import_entries.php` |

## Development

```powershell
npm install
npm start
```

Opens at [http://localhost:4200](http://localhost:4200). The dev server proxies `/api/*` → `http://localhost` (AppServ) via `proxy.conf.json`.

## Build & Deploy to AppServ

```powershell
# Build
npm run build

# Copy to AppServ web root
Copy-Item .\dist\architectural-ledger-angular\browser\* ..\app\ -Recurse -Force
```

The production app is served at [http://localhost/Expense-Tracking/app/](http://localhost/Expense-Tracking/app/).

An `.htaccess` in the `app/` folder handles SPA routing (rewrites all paths to `index.html`). Requires `mod_rewrite` enabled and `AllowOverride All` in Apache.

## Rebuild After Changes

```powershell
cd C:\AppServ\www\Expense-Tracking\frontend-angular
npm run build
Copy-Item .\dist\architectural-ledger-angular\browser\* ..\app\ -Recurse -Force
```

No Apache restart needed — just refresh the browser.

## Design System

"Architectural Ledger" / "Precision Atelier" theme:

- **Primary:** `#545f73` / **Surface:** `#f7f9fb`
- **No-line rule:** Tonal layering instead of 1px borders
- **Ambient shadows:** `0 8px 24px -4px rgba(42,52,57,0.06)`
- **Glassmorphism:** Semi-transparent backgrounds + `backdrop-filter: blur()`
- **Cards:** `border-radius: 1rem`, white backgrounds, layered elevation
- **Buttons:** Gradient primary (`linear-gradient(145deg, primary, primary-dim)`), hover lift effect

## Notes

- Voucher number and description are optional across add/edit/import.
- File import supports `.csv`, `.xlsx`, `.xls` with auto column mapping.
- Operation log in the backup page tracks all backup/import/export actions locally.
