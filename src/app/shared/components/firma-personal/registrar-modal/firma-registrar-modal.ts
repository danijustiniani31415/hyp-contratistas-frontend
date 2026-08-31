import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BaseModal } from '../../base-modal/base-modal';
import { FirmaPersonal } from '../firma-personal';
import { FirmaPersonalDto } from '../../../../core/firma/firma-personal.dto';

/**
 * Modal para registrar la firma en el momento, la primera vez que alguien intenta firmar algo y
 * todavía no tiene firma.
 *
 * Existe para no cortar la tarea: sin esto, el usuario que aprieta "Firmar" tendría que salir de
 * la pantalla, ir a Configuración, registrar la firma y volver a buscar lo que estaba firmando. Lo
 * dispara el 409 que devuelve el backend cuando no hay firma registrada, y al guardarla la
 * pantalla anfitriona reintenta la acción sola.
 */
@Component({
  selector: 'app-firma-registrar-modal',
  standalone: true,
  imports: [CommonModule, BaseModal, FirmaPersonal],
  templateUrl: './firma-registrar-modal.html',
})
export class FirmaRegistrarModal {
  /** Emite la firma recién guardada: la pantalla la usa para reintentar lo que estaba firmando. */
  @Output() guardada = new EventEmitter<FirmaPersonalDto>();

  /** Emite al cerrar sin guardar. */
  @Output() cerrar = new EventEmitter<void>();
}
