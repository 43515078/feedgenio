export type Requirement = {
  name: string;
  energy: number;
  protein: number;
  lysine: number;
  methionine: number;
  metCys: number;
  calcium: number;
  availablePhosphorus: number;
  sodium: number;
};

export const layerRequirement: Requirement = {
  name: "Ponedora en producción",
  energy: 2850,
  protein: 16,
  lysine: 0.87,
  methionine: 0.43,
  metCys: 0.82,
  calcium: 3.7,
  availablePhosphorus: 0.38,
  sodium: 0.16
};
