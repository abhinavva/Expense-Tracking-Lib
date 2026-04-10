import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';

import { UsersService } from '../../core/services/users.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent {
  readonly loading = signal(false);
  readonly error = signal('');

  readonly users = signal<User[]>([]);
  readonly totalItems = signal(0);
  readonly currentPage = signal(1);
  readonly perPage = signal(15);

  readonly totalUsers = signal(0);
  readonly activeUsers = signal(0);
  readonly staffUsers = signal(0);
  readonly adminUsers = signal(0);

  readonly search = signal('');
  readonly role = signal<'all' | 'administrator' | 'staff'>('all');
  readonly status = signal<'all' | 'active' | 'inactive'>('all');

  readonly showCreateDialog = signal(false);
  readonly showEditDialog = signal(false);
  readonly editingUser = signal<User | null>(null);

  readonly createAvatarFile = signal<File | null>(null);
  readonly createAvatarPreview = signal<string | null>(null);
  readonly editAvatarFile = signal<File | null>(null);
  readonly editAvatarPreview = signal<string | null>(null);

  private readonly apiBase = '/Expense-Tracking';

  readonly createForm = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['staff' as 'staff' | 'administrator']
  });

  readonly editForm = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    role: ['staff' as 'staff' | 'administrator'],
    is_active: ['1' as '0' | '1'],
    password: ['']
  });

  constructor(private readonly usersService: UsersService, private readonly fb: FormBuilder) {
    this.loadUsers();
  }

  loadUsers(page = this.currentPage()): void {
    this.loading.set(true);
    this.error.set('');

    this.usersService
      .getUsers({
        page,
        limit: this.perPage(),
        search: this.search(),
        role: this.role(),
        status: this.status()
      })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.status !== 'success') {
            this.error.set(response.message || 'Failed to load users.');
            return;
          }

          this.users.set(response.users ?? []);
          this.totalItems.set(Number(response.total_items || 0));
          this.currentPage.set(Number(response.page || 1));
          this.totalUsers.set(Number(response.summary?.total_users || 0));
          this.activeUsers.set(Number(response.summary?.active_users || 0));
          this.staffUsers.set(Number(response.summary?.staff_users || 0));
          this.adminUsers.set(Number(response.summary?.admin_users || 0));
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.message || 'Failed to load users.');
        }
      });
  }

  applyFilters(): void {
    this.loadUsers(1);
  }

  clearFilters(): void {
    this.search.set('');
    this.role.set('all');
    this.status.set('all');
    this.loadUsers(1);
  }

  openCreate(): void {
    this.createForm.reset({
      full_name: '',
      email: '',
      password: '',
      role: 'staff'
    });
    this.createAvatarFile.set(null);
    this.createAvatarPreview.set(null);
    this.error.set('');
    this.showCreateDialog.set(true);
  }

  closeCreate(): void {
    this.showCreateDialog.set(false);
    this.createAvatarFile.set(null);
    this.createAvatarPreview.set(null);
  }

  createUser(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const data = this.createForm.getRawValue();

    this.usersService.createUser(data).subscribe({
      next: (response) => {
        if (response.status !== 'success') {
          this.error.set(response.message || 'Failed to create user.');
          return;
        }

        const avatarFile = this.createAvatarFile();
        if (avatarFile && (response as any).user?.id) {
          this.usersService.uploadAvatar((response as any).user.id, avatarFile).subscribe({
            next: () => {
              this.closeCreate();
              this.loadUsers(1);
            },
            error: () => {
              this.closeCreate();
              this.loadUsers(1);
            }
          });
        } else {
          this.closeCreate();
          this.loadUsers(1);
        }
      },
      error: (err) => this.error.set(err.message || 'Failed to create user.')
    });
  }

  openEdit(user: User): void {
    this.editingUser.set(user);
    this.editForm.reset({
      full_name: user.full_name,
      email: user.email,
      role: (user.role === 'administrator' ? 'administrator' : 'staff') as 'staff' | 'administrator',
      is_active: (Number(user.is_active ?? 1) === 1 ? '1' : '0') as '0' | '1',
      password: ''
    });
    this.editAvatarFile.set(null);
    this.editAvatarPreview.set(
      user.profile_image ? `${this.apiBase}/${user.profile_image}` : null
    );
    this.error.set('');
    this.showEditDialog.set(true);
  }

  closeEdit(): void {
    this.showEditDialog.set(false);
    this.editingUser.set(null);
    this.editAvatarFile.set(null);
    this.editAvatarPreview.set(null);
  }

  updateUser(): void {
    if (this.editForm.invalid || !this.editingUser()) {
      this.editForm.markAllAsTouched();
      return;
    }

    const user = this.editingUser();
    if (!user) {
      return;
    }

    const data = this.editForm.getRawValue();

    this.usersService
      .updateUser({
        user_id: user.id,
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        is_active: data.is_active,
        password: data.password
      })
      .subscribe({
        next: (response) => {
          if (response.status !== 'success') {
            this.error.set(response.message || 'Failed to update user.');
            return;
          }

          const avatarFile = this.editAvatarFile();
          if (avatarFile) {
            this.usersService.uploadAvatar(user.id, avatarFile).subscribe({
              next: () => {
                this.closeEdit();
                this.loadUsers(this.currentPage());
              },
              error: () => {
                this.closeEdit();
                this.loadUsers(this.currentPage());
              }
            });
          } else {
            this.closeEdit();
            this.loadUsers(this.currentPage());
          }
        },
        error: (err) => this.error.set(err.message || 'Failed to update user.')
      });
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.loadUsers(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.loadUsers(this.currentPage() - 1);
    }
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems() / this.perPage()));
  }

  roleTag(role: string): string {
    return role === 'administrator' ? 'ADMIN' : 'STAFF';
  }

  isUserActive(user: User): boolean {
    return Number(user.is_active ?? 1) === 1;
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  // ─── Avatar Handlers ───

  onCreateAvatarSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;
    this.createAvatarFile.set(file);
    this.createAvatarPreview.set(URL.createObjectURL(file));
  }

  clearCreateAvatar(): void {
    this.createAvatarFile.set(null);
    this.createAvatarPreview.set(null);
  }

  onEditAvatarSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (!file) return;
    this.editAvatarFile.set(file);
    this.editAvatarPreview.set(URL.createObjectURL(file));
  }

  removeEditAvatar(): void {
    const user = this.editingUser();
    if (!user) return;

    this.editAvatarFile.set(null);
    this.editAvatarPreview.set(null);

    if (user.profile_image) {
      this.usersService.removeAvatar(user.id).subscribe();
    }
  }

  avatarUrl(user: User): string | null {
    return user.profile_image ? `${this.apiBase}/${user.profile_image}` : null;
  }
}
