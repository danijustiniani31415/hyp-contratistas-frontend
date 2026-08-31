import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HomeGreeting } from '../../../shared/components/home-greeting/home-greeting';
import { HighlightCard } from '../../../shared/components/highlight-card/highlight-card';

interface Highlight {
  titulo: string;
  descripcion: string;
  img: string;
}

/** Copia exacta del contenido de las tarjetas SOMOS ABRIL del boletín. */
const NOVEDADES: Highlight[] = [
  {
    titulo: 'THE BIRTHDAY CLUB',
    descripcion: '¡Descubre los protagonistas de <strong>Abril, Mayo y Junio</strong>!',
    img: '/images/inicio/perro-cumpleanero.webp',
  },
  {
    titulo: 'NUEVOS TALENTOS',
    descripcion:
      '<strong>Nuevas ideas</strong>, misma pasión. Conoce quiénes se sumaron a <strong>ABRIL</strong>.',
    img: '/images/inicio/perro-ropa-azul.webp',
  },
  {
    titulo: 'ORGULLO ABRIL',
    descripcion: '<strong>Años de trayectoria</strong> que construyen nuestra historia.',
    img: '/images/inicio/perro-en-medalla.webp',
  },
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, HomeGreeting, HighlightCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  readonly novedades = NOVEDADES;

  /**
   * Cuarta tarjeta de novedades: acceso al Centro de aprendizaje. Se muestra siempre;
   * la propia página /centro-aprendizaje resuelve qué grupos ve el usuario (incluidos
   * los grupos sin videos) o muestra su estado vacío si no ve ninguno.
   */
  readonly centroAprendizaje: Highlight = {
    titulo: 'CENTRO DE APRENDIZAJE',
    descripcion: '<strong>Videos y guías</strong> para dominar cada módulo a tu ritmo.',
    img: '/images/inicio/perro-centro-de-aprendizaje.png',
  };

  /** Nombre de pila (primera palabra del displayName guardado en el login). */
  firstName = '';
  jobTitle = '';

  /** Fecha de hoy en es-PE, formato largo, con la primera letra en mayúscula. */
  readonly today = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  constructor(private router: Router) {}

  ngOnInit(): void {
    if (typeof localStorage !== 'undefined') {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      this.firstName = (user?.displayName ?? '').split(' ')[0] || '';
      this.jobTitle = user?.jobTitle ?? '';
    }
  }

  irAlBoletin(): void {
    this.router.navigate(['/boletin']);
  }

  irAlCentroAprendizaje(): void {
    this.router.navigate(['/centro-aprendizaje']);
  }

  get todayCapitalized(): string {
    return this.today.charAt(0).toUpperCase() + this.today.slice(1);
  }
}
