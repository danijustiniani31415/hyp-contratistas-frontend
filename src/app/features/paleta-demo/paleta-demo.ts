import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ColorToken {
  nombre: string;
  hex: string;
  label: string;
  light: boolean;
}

@Component({
  selector: 'app-paleta-demo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paleta-demo.html',
  styleUrl: './paleta-demo.css',
})
export class PaletaDemoComponent {

  paleta: ColorToken[] = [
    { nombre: 'abril-ink',      hex: '#0D1B2A', label: 'NIVEL 0',  light: false },
    { nombre: 'abril-prussian', hex: '#1B263B', label: 'NIVEL 1A', light: false },
    { nombre: 'abril-steel',    hex: '#415A77', label: 'NIVEL 1B', light: false },
    { nombre: 'abril-dusk',     hex: '#778DA9', label: 'NIVEL 1C', light: false },
    { nombre: 'abril-light',    hex: '#E0E1DD', label: 'NIVEL 1D', light: true  },
  ];

  derivados: ColorToken[] = [
    { nombre: 'abril-n2a', hex: '#2C3E56', label: 'N2 · 1A', light: false },
    { nombre: 'abril-n2b', hex: '#557090', label: 'N2 · 1B', light: false },
    { nombre: 'abril-n2c', hex: '#8FA3B8', label: 'N2 · 1C', light: true  },
    { nombre: 'abril-n2d', hex: '#CACBC7', label: 'N2 · 1D', light: true  },
  ];

  semanticos: ColorToken[] = [
    { nombre: 'abril-success', hex: '#86EFAC', label: 'SUCCESS', light: true },
    { nombre: 'abril-danger',  hex: '#FCA5A5', label: 'DANGER',  light: true },
    { nombre: 'abril-info',    hex: '#93C5FD', label: 'INFO',    light: true },
    { nombre: 'abril-warning', hex: '#FDE68A', label: 'WARNING', light: true },
  ];

  stripColors = [
    '#0D1B2A','#1B263B','#2C3E56','#415A77','#557090',
    '#778DA9','#8FA3B8','#CACBC7','#E0E1DD',
  ];

  hierarquiaRows = [
    { desc: 'PROYECTO GENERAL',       nivel: 0, bg: '#0D1B2A', text: '#E0E1DD', border: null,     estado: 'EN PROCESO', pct: 45  },
    { desc: 'Fase 1 — Excavaciones',  nivel: 1, bg: '#1B263B', text: '#E0E1DD', border: null,     estado: 'CULMINADO',  pct: 100 },
    { desc: 'Movimiento de tierras',   nivel: 2, bg: '#2C3E56', text: '#E0E1DD', border: null,     estado: 'CULMINADO',  pct: 100 },
    { desc: 'Relleno compactado A',    nivel: 3, bg: '#DDE3EC', text: '#1B263B', border: '#2C3E56',estado: 'VENCIDO',    pct: 60  },
    { desc: 'Fase 2 — Estructura',    nivel: 1, bg: '#415A77', text: '#E0E1DD', border: null,     estado: 'EN PROCESO', pct: 55  },
    { desc: 'Columnas y vigas',       nivel: 2, bg: '#557090', text: '#E0E1DD', border: null,     estado: 'EN PROCESO', pct: 40  },
    { desc: 'Encofrado bloque norte', nivel: 3, bg: '#E4EAF1', text: '#415A77', border: '#557090', estado: 'PENDIENTE',  pct: 0   },
  ];

  tipoMuestras = [
    { label: 'Título de vista',     size: '1.25rem',  weight: '700', sample: 'Cronograma de Actividades',        mono: false },
    { label: 'Título de proyecto',  size: '1.1rem',   weight: '700', sample: 'PROYECTO RESIDENCIAL LIMA NORTE', mono: false },
    { label: 'Subtítulo / meta',    size: '0.87rem',  weight: '400', sample: 'Responsable UDP: J. Pérez',       mono: false },
    { label: 'Celda de tabla',      size: '0.875rem', weight: '500', sample: 'Movimiento de tierras — Lote 4',  mono: false },
    { label: 'Fecha',               size: '0.83rem',  weight: '400', sample: '31 / 05 / 2026',                  mono: true  },
    { label: 'Label uppercase',     size: '0.72rem',  weight: '600', sample: 'AVANCE PROGRAMADO',               mono: false },
    { label: 'Badge',               size: '0.70rem',  weight: '700', sample: 'EN PROCESO',                      mono: false },
    { label: 'Número tabular',      size: '0.9rem',   weight: '700', sample: '01   ·   12   ·   47   ·   99',   mono: true  },
  ];

  badgesDark = [
    { label: 'CULMINADO',    bg: 'rgba(74,222,128,0.18)',  fg: '#86efac' },
    { label: 'VENCIDO',      bg: 'rgba(248,113,113,0.18)', fg: '#fca5a5' },
    { label: 'EN PROCESO',   bg: 'rgba(147,197,253,0.18)', fg: '#93c5fd' },
    { label: 'PENDIENTE',    bg: 'rgba(209,213,219,0.12)', fg: '#e5e7eb' },
  ];

  badgesLight = [
    { label: 'CULMINADO',    bg: '#eefbd6', fg: '#2d6a00' },
    { label: 'VENCIDO',      bg: '#fee2e2', fg: '#b91c1c' },
    { label: 'EN PROCESO',   bg: '#e6f4f9', fg: '#0e5f7a' },
    { label: 'PENDIENTE',    bg: '#f3f4f6', fg: '#4b5563' },
  ];

  estadoColor(e: string): string {
    const m: Record<string, string> = {
      'CULMINADO':  '#86efac',
      'VENCIDO':    '#fca5a5',
      'EN PROCESO': '#93c5fd',
      'PENDIENTE':  '#d1d5db',
    };
    return m[e] ?? '#d1d5db';
  }
}
