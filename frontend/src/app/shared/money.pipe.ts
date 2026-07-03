import { Pipe, PipeTransform } from '@angular/core';

/** Formatea un importe en pesos argentinos: 8000 -> "$8.000". */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    const n = Math.round(Number(value) || 0);
    return '$' + n.toLocaleString('es-AR');
  }
}
