export const ETIQUETAS_PACK = [
  'Trabajar Steffen',
  'Reventa',
  'Rutinas de tratamiento',
] as const;

export type EtiquetaPack = (typeof ETIQUETAS_PACK)[number];

export interface EtiquetaPackMeta {
  id: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  tagColor: string;
}

export const ETIQUETAS_PACK_CONFIG: Record<string, EtiquetaPackMeta> = {
  'Trabajar Steffen': {
    id: 'Trabajar Steffen',
    titulo: 'Trabajar Steffen',
    subtitulo: 'Línea de uso técnico en salón',
    descripcion: 'Packs diseñados especialmente para el trabajo diario profesional en el salón: tratamientos técnicos, lavacabezas y finalizado de alto rendimiento.',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    tagColor: 'indigo',
  },
  'Reventa': {
    id: 'Reventa',
    titulo: 'Reventa',
    subtitulo: 'Packs para reventa y retail en salón',
    descripcion: 'Combos pensados para potenciar la venta en mostrador, aumentar el ticket promedio y ofrecer a tus clientas productos de continuidad en casa.',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    tagColor: 'emerald',
  },
  'Rutinas de tratamiento': {
    id: 'Rutinas de tratamiento',
    titulo: 'Rutinas de tratamiento',
    subtitulo: 'Protocolos y soluciones capilares completas',
    descripcion: 'Packs ordenados por diagnóstico capilar específico (nutrición, reconstrucción, sellado químico, hidratación) para soluciones integrales.',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    tagColor: 'amber',
  },
  // Alias de compatibilidad con datos históricos
  'Vender más en mi salón': {
    id: 'Reventa',
    titulo: 'Reventa',
    subtitulo: 'Packs para reventa y retail en salón',
    descripcion: 'Combos pensados para potenciar la venta en mostrador, aumentar el ticket promedio y ofrecer a tus clientas productos de continuidad en casa.',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    tagColor: 'emerald',
  },
  'Rutinas segun necesidad': {
    id: 'Rutinas de tratamiento',
    titulo: 'Rutinas de tratamiento',
    subtitulo: 'Protocolos y soluciones capilares completas',
    descripcion: 'Packs ordenados por diagnóstico capilar específico (nutrición, reconstrucción, sellado químico, hidratación) para soluciones integrales.',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    tagColor: 'amber',
  },
};
