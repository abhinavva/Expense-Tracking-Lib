import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './auth.component.scss'
})
export class LoginComponent {
  readonly loading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.authService.ensureSession().subscribe({
      next: (user) => {
        if (user) {
          this.router.navigateByUrl('/dashboard');
        }
      },
      error: () => {
        // no-op: user is not logged in
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set('');

    this.authService.login(email, password).subscribe({
      next: (user) => {
        this.loading.set(false);
        if (user) {
          this.router.navigateByUrl('/dashboard');
          return;
        }
        this.error.set('Login failed.');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message || 'Login failed.');
      }
    });
  }
}

