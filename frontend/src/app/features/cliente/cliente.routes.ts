import { Routes } from '@angular/router';

export const CLIENTE_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./pages/carta/carta').then((m) => m.Carta) },
  { path: 'carrito', loadComponent: () => import('./pages/carrito/carrito').then((m) => m.Carrito) },
  { path: 'checkout', loadComponent: () => import('./pages/checkout/checkout').then((m) => m.Checkout) },
  {
    path: 'confirmacion',
    loadComponent: () => import('./pages/confirmacion/confirmacion').then((m) => m.Confirmacion),
  },
];
