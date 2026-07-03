import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly username = signal('');
  readonly password = signal('');
  readonly enviando = signal(false);
  readonly error = signal('');

  ingresar(): void {
    if (!this.username().trim() || !this.password() || this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.error.set('');
    this.auth.login({ username: this.username().trim(), password: this.password() }).subscribe({
      next: () => this.router.navigate(['/panel']),
      error: () => {
        this.enviando.set(false);
        this.error.set('Usuario o contraseña inválidos');
      },
    });
  }
}
