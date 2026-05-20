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

export const defaultRequirement: Requirement = {
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

export const requirementFields: Array<{
  key: keyof Omit<Requirement, "name">;
  label: string;
  step: string;
}> = [
  {
    key: "energy",
    label: "Energía",
    step: "1"
  },
  {
    key: "protein",
    label: "Proteína",
    step: "0.01"
  },
  {
    key: "lysine",
    label: "Lisina",
    step: "0.01"
  },
  {
    key: "methionine",
    label: "Metionina",
    step: "0.01"
  },
  {
    key: "metCys",
    label: "Met + Cist",
    step: "0.01"
  },
  {
    key: "calcium",
    label: "Calcio",
    step: "0.01"
  },
  {
    key: "availablePhosphorus",
    label: "Fósforo disponible",
    step: "0.01"
  },
  {
    key: "sodium",
    label: "Sodio",
    step: "0.01"
  }
];
