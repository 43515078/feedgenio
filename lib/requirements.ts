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

export const baseRequirementProfiles: Requirement[] = [
  {
    name: "Ponedora producción",
    energy: 2850,
    protein: 16,
    lysine: 0.87,
    methionine: 0.43,
    metCys: 0.82,
    calcium: 3.7,
    availablePhosphorus: 0.38,
    sodium: 0.16
  },
  {
    name: "Ponedora verano",
    energy: 3150,
    protein: 16.5,
    lysine: 0.87,
    methionine: 0.43,
    metCys: 0.82,
    calcium: 3.64,
    availablePhosphorus: 0.39,
    sodium: 0.2
  },
  {
    name: "Cobb 500 inicio",
    energy: 3000,
    protein: 22,
    lysine: 1.28,
    methionine: 0.5,
    metCys: 0.95,
    calcium: 0.95,
    availablePhosphorus: 0.48,
    sodium: 0.2
  },
  {
    name: "Cobb 500 crecimiento",
    energy: 3100,
    protein: 20,
    lysine: 1.15,
    methionine: 0.47,
    metCys: 0.88,
    calcium: 0.85,
    availablePhosphorus: 0.42,
    sodium: 0.19
  },
  {
    name: "Cobb 500 engorde",
    energy: 3200,
    protein: 18.5,
    lysine: 1.05,
    methionine: 0.43,
    metCys: 0.82,
    calcium: 0.78,
    availablePhosphorus: 0.38,
    sodium: 0.18
  },
  {
    name: "Cerdo crecimiento",
    energy: 3250,
    protein: 18,
    lysine: 1.05,
    methionine: 0.32,
    metCys: 0.6,
    calcium: 0.75,
    availablePhosphorus: 0.35,
    sodium: 0.18
  },
  {
    name: "Cerdo engorde",
    energy: 3250,
    protein: 16,
    lysine: 0.85,
    methionine: 0.27,
    metCys: 0.52,
    calcium: 0.65,
    availablePhosphorus: 0.3,
    sodium: 0.16
  },
  {
    name: "Cuy engorde",
    energy: 2800,
    protein: 17,
    lysine: 0.8,
    methionine: 0.28,
    metCys: 0.55,
    calcium: 0.8,
    availablePhosphorus: 0.35,
    sodium: 0.18
  }
];

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
