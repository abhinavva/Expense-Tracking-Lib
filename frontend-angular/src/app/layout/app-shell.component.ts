import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/services/auth.service';
import { SettingsDialogComponent } from '../features/settings/settings-dialog.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, SettingsDialogComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  readonly user = computed(() => this.authService.currentUser());
  readonly showSettings = signal(false);
  readonly userMenuOpen = signal(false);

  readonly navItems = [
    { route: '/dashboard', icon: 'dashboard', label: 'Home', adminOnly: false },
    { route: '/finance-insights', icon: 'analytics', label: 'Finance Insights', adminOnly: false },
    { route: '/user-management', icon: 'group', label: 'User Management', adminOnly: true },
    { route: '/backup', icon: 'backup', label: 'Backup', adminOnly: true }
  ];

  readonly visibleNavItems = computed(() => {
    const role = this.user()?.role ?? '';
    const isAdmin = role === 'administrator';
    return this.navItems.filter((item) => (item.adminOnly ? isAdmin : true));
  });

  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  toggleUserMenu(): void {
    this.userMenuOpen.update((value) => !value);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.closeUserMenu();
        this.router.navigateByUrl('/login');
      },
      error: () => {
        this.closeUserMenu();
        this.router.navigateByUrl('/login');
      }
    });
  }

  initials(name: string | undefined): string {
    const safe = String(name ?? '').trim();
    if (!safe) {
      return 'U';
    }

    return safe
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
