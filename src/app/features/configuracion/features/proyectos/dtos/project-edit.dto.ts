export interface ProjectEditDto {
  projectId: number;
  projectDescription: string;
  codigo?: string;
  abbreviation?: string;
  levelDescription?: string;
  estado?: string;
  /** Ciclo de vida real para el cálculo de ratios SSOMA: Finalizado | Activo | Inactivo. */
  cicloVida?: string;

  // Contribuyente
  contributorId?: number;
  legalEntityRegistryNumber?: string;

  // Ubicación del proyecto
  projectDistrict?: string;
  projectProvince?: string;
  projectDepartment?: string;
  projectLocation?: string;

  // Responsable Arq. Comercial
  responsableArqCom?: string;
  responsableArqComId?: number;

  // Responsable UDP
  responsableUdp?: string;
  responsableUdpId?: number;

  // Fechas (formato YYYY-MM-DD)
  fechaInicio?: string;
  fechaFin?: string;
  inicioObra?: string;
  finObra?: string;

  // Métricas físicas
  numNiveles?: string;
  numSotanos?: string;
  pisos?: string;
  tiempoConstruccion?: number;
  areaM2?: number;
  areaTechadaM2?: number;
  hhTotalCasa?: number;
  cantTrabajadoresCasa?: string;

  // Flags
  tieneArquitecturaComercial?: boolean;

  // Geolocalización (geofencing de Tareo — Arquitectura Comercial)
  lat?: number | null;
  lng?: number | null;
  radioGeofenceMetros?: number;

  active: boolean;
}
