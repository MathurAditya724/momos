export interface SpotlightEvent {
  envelopeId?: string;
  type: string;
  timestamp: number;
  data: unknown;
  headers?: Record<string, string>;
}

export type SpotlightData = SpotlightEvent[];
