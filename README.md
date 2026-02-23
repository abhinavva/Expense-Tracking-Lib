# Library Income & Expenditure Tracker

This project is organized for a clean AppServ/XAMPP-style PHP setup.

## Structure

- `index.html` - Main app page (requires login)
- `login.html` - Login page
- `signup.html` - Initial setup signup page (first account only)
- `assets/css/styles.css` - UI styles
- `assets/js/app.js` - Frontend behavior
- `assets/js/auth.js` - Login/signup behavior
- `api/` - PHP API endpoints used by the frontend
  - `auth/login.php`
  - `auth/signup.php`
  - `auth/logout.php`
  - `auth/me.php`
  - `auth/list_users.php`
  - `auth/update_user.php`
  - `insert.php`
  - `fetch_entries.php`
  - `edit_entry.php`
  - `delete_entry.php`
  - `export_entries.php`
- `config/database.php` - Shared MySQL connection config
- `config/auth.php` - Session/auth helpers
- `database/schema.sql` - SQL schema for database and tables

## Run on AppServ

1. Place this folder inside your AppServ web root (for example `www/`).
2. Import `database/schema.sql` in MySQL.
3. Update DB credentials in `config/database.php` if needed.
4. Open `http://localhost/<your-folder>/signup.html` once for initial setup.
5. Create your first user account (it becomes `administrator` automatically).
6. Login at `http://localhost/<your-folder>/login.html`.
7. Use the app at `http://localhost/<your-folder>/index.html`.
8. Create/edit additional users from the admin-only "User Management" section.

## Authentication Notes

- Auth is session-based using PHP sessions.
- Unauthenticated access to finance APIs returns `401`.
- Role policy:
  - `administrator`: full access (users, entries, view, export)
  - `staff`: can only view and export entries
- User creation and user editing are administrator-only actions.
- Passwords are stored as hashes (`PASSWORD_DEFAULT`), never plain text.

## Quick API Test Checklist

1. First-time signup creates `administrator` successfully.
2. Login with correct credentials -> success.
3. Open `index.html` without login -> redirected to `login.html`.
4. Staff user can view/export but cannot add/edit/delete entries.
5. Staff user cannot create/edit users.
6. Administrator can create/edit users from User Management.
7. Logout invalidates session and redirects to login.
