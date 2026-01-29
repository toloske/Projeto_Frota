
export interface VehicleStatus {
  plate: string;
  category: string;
  running: boolean;
  justification?: string;
  customJustification?: string; // Campo para o texto livre de "OUTROS"
}

export interface SpotOffer {
  bulkVan: number;
  bulkVuc: number;
  utilitarios: number;
  van: number;
  veiculoPasseio: number;
  vuc: number;
}

export interface OperationalProblem {
  description: string;
  media: string[];
}

export interface FormData {
  id: string;
  timestamp: string;
  date: string;
  svc: string;
  spotOffers: SpotOffer;
  fleetStatus: VehicleStatus[];
  baseCapacity: Record<string, number>;
  problems: OperationalProblem;
  weeklyAcceptance?: string;
  acceptances: string[];
}

export interface SVCConfig {
  id: string;
  name: string;
  vehicles: { plate: string; category: string }[];
}

export interface DashboardStats {
  totalRunning: number;
  totalStopped: number;
  totalSpot: number;
  efficiency: string;
  problemCount: number;
}
