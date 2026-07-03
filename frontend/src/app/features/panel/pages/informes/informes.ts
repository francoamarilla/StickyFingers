import { Component, inject, signal } from '@angular/core';
import { InformeService } from '../../../../core/services/informe.service';
import { Informe, RangoInforme } from '../../../../core/models/informe.model';
import { MoneyPipe } from '../../../../shared/money.pipe';

@Component({
  selector: 'app-informes',
  imports: [MoneyPipe],
  templateUrl: './informes.html',
  styleUrl: './informes.scss',
})
export class Informes {
  private readonly informeService = inject(InformeService);

  readonly rango = signal<RangoInforme>('DIA');
  readonly informe = signal<Informe | null>(null);

  readonly rangos: { valor: RangoInforme; label: string }[] = [
    { valor: 'DIA', label: 'Día' },
    { valor: 'SEMANA', label: 'Semana' },
    { valor: 'MES', label: 'Mes' },
  ];

  constructor() {
    this.cargar();
  }

  seleccionar(rango: RangoInforme): void {
    this.rango.set(rango);
    this.cargar();
  }

  private cargar(): void {
    this.informeService.generar(this.rango()).subscribe((inf) => this.informe.set(inf));
  }
}
