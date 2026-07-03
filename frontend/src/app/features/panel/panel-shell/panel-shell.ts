import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/auth.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { ConfigService } from '../../../core/services/config.service';

@Component({
  selector: 'app-panel-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './panel-shell.html',
  styleUrl: './panel-shell.scss',
})
export class PanelShell {
  private readonly auth = inject(AuthService);
  private readonly realtime = inject(RealtimeService);
  private readonly router = inject(Router);
  private readonly config = inject(ConfigService);
  private readonly snack = inject(MatSnackBar);

  readonly lluvia = signal(false);
  readonly guardandoLluvia = signal(false);

  constructor() {
    this.config.obtener().subscribe((c) => this.lluvia.set(c.lluvia));
  }

  toggleLluvia(): void {
    if (this.guardandoLluvia()) {
      return;
    }
    const nuevo = !this.lluvia();
    this.guardandoLluvia.set(true);
    this.config.setLluvia(nuevo).subscribe({
      next: (c) => {
        this.lluvia.set(c.lluvia);
        this.guardandoLluvia.set(false);
        this.snack.open(c.lluvia ? 'Lluvia activada ☔' : 'Lluvia desactivada', 'OK', { duration: 2000 });
      },
      error: () => {
        this.guardandoLluvia.set(false);
        this.snack.open('No se pudo actualizar la lluvia', 'OK', { duration: 3000 });
      },
    });
  }

  salir(): void {
    this.realtime.disconnect();
    this.auth.logout();
    this.router.navigate(['/panel/login']);
  }
}
