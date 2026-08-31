import { ElementRef } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { DatePicker } from './date-picker';

function crear(): DatePicker {
  return new DatePicker(new ElementRef(document.createElement('div')));
}

describe('DatePicker — autoformato del texto (dd/mm/aaaa)', () => {
  it('agrega "/" automáticamente tras el día', () => {
    const dp = crear();
    dp.texto = '1';
    dp.onTextoChange('12');
    expect(dp.texto).toBe('12/');
  });

  it('agrega la segunda "/" tras el mes', () => {
    const dp = crear();
    dp.texto = '12/0';
    dp.onTextoChange('12/04');
    expect(dp.texto).toBe('12/04/');
  });

  it('formatea un pegado completo de 8 dígitos', () => {
    const dp = crear();
    dp.texto = '';
    dp.onTextoChange('12042003');
    expect(dp.texto).toBe('12/04/2003');
  });

  it('no re-inserta la "/" al borrar', () => {
    const dp = crear();
    dp.texto = '12/';
    dp.onTextoChange('12'); // backspace sobre la barra
    expect(dp.texto).toBe('12');
  });

  it('limita a 8 dígitos e ignora caracteres no numéricos', () => {
    const dp = crear();
    dp.texto = '';
    dp.onTextoChange('12abc04/20031999');
    expect(dp.texto).toBe('12/04/2003');
  });
});

describe('DatePicker — selector de mes y año', () => {
  it('toggleVistaMeses alterna entre días y meses', () => {
    const dp = crear();
    dp.abrir();
    expect(dp.vista).toBe('dias');
    dp.toggleVistaMeses();
    expect(dp.vista).toBe('meses');
    dp.toggleVistaMeses();
    expect(dp.vista).toBe('dias');
  });

  it('toggleVistaAnios muestra un bloque de 12 años que contiene el año visible', () => {
    const dp = crear();
    dp.abrir();
    dp.vistaAnio = 2026;
    dp.toggleVistaAnios();
    expect(dp.vista).toBe('anios');
    expect(dp.aniosGrid).toHaveLength(12);
    expect(dp.aniosGrid).toContain(2026);
    expect(dp.etiquetaRangoAnios).toBe(`${dp.anioBase} – ${dp.anioBase + 11}`);
  });

  it('seleccionarMes cambia el mes visible y vuelve a la vista de días', () => {
    const dp = crear();
    dp.abrir();
    dp.toggleVistaMeses();
    dp.seleccionarMes(11);
    expect(dp.vistaMes).toBe(11);
    expect(dp.vista).toBe('dias');
    expect(dp.semanas.length).toBeGreaterThan(0);
  });

  it('seleccionarAnio cambia el año visible y vuelve a la vista de días', () => {
    const dp = crear();
    dp.abrir();
    dp.toggleVistaAnios();
    dp.seleccionarAnio(dp.anioBase + 3);
    expect(dp.vistaAnio).toBe(dp.anioBase + 3);
    expect(dp.vista).toBe('dias');
  });

  it('la navegación en la vista de años avanza de 12 en 12', () => {
    const dp = crear();
    dp.abrir();
    dp.vistaAnio = 2026;
    dp.toggleVistaAnios();
    const base = dp.anioBase;
    dp.navNext();
    expect(dp.anioBase).toBe(base + 12);
    dp.navPrev();
    dp.navPrev();
    expect(dp.anioBase).toBe(base - 12);
  });

  it('deshabilitado: no abre el calendario', () => {
    const dp = crear();
    dp.disabled = true;
    dp.abrir();
    expect(dp.isOpen).toBe(false);
    dp.toggleCalendario(new MouseEvent('click'));
    expect(dp.isOpen).toBe(false);
  });

  it('al reabrir el panel siempre vuelve a la vista de días', () => {
    const dp = crear();
    dp.abrir();
    dp.toggleVistaAnios();
    dp.close();
    dp.abrir();
    expect(dp.vista).toBe('dias');
  });
});
