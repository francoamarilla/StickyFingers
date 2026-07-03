import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guard';

export const PANEL_ROUTES: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./panel-shell/panel-shell').then((m) => m.PanelShell),
    children: [
      { path: '', redirectTo: 'pedidos', pathMatch: 'full' },
      { path: 'pedidos', loadComponent: () => import('./pages/pedidos/pedidos').then((m) => m.Pedidos) },
      { path: 'ofertas', loadComponent: () => import('./pages/ofertas/ofertas').then((m) => m.Ofertas) },
      { path: 'informes', loadComponent: () => import('./pages/informes/informes').then((m) => m.Informes) },
    ],
  },
];
