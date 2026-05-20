export type Requirement = {
  name: string;
  energy: number;
  protein: number;
  lysine: number;
  methionine: number;
  metCys: number;
  threonine: number;
  tryptophan: number;
  arginine: number;
  isoleucine: number;
  valine: number;
  calcium: number;
  availablePhosphorus: number;
  sodium: number;
  chlorine: number;
  linoleicAcid: number;
};

export const defaultRequirement: Requirement = {
  name: "Ponedora en producción",
  energy: 2850,
  protein: 16,
  lysine: 0.87,
  methionine: 0.43,
  metCys: 0.82,
  threonine: 0.65,
  tryptophan: 0.21,
  arginine: 0.88,
  isoleucine: 0.7,
  valine: 0.79,
  calcium: 3.7,
  availablePhosphorus: 0.38,
  sodium: 0.16,
  chlorine: 0.16,
  linoleicAcid: 1.8
};

export const baseRequirementProfiles: Requirement[] = [
  {
    name: "Ponedora producción",
    energy: 2850,
    protein: 16,
    lysine: 0.87,
    methionine: 0.43,
    metCys: 0.82,
    threonine: 0.65,
    tryptophan: 0.21,
    arginine: 0.88,
    isoleucine: 0.7,
    valine: 0.79,
    calcium: 3.7,
    availablePhosphorus: 0.38,
    sodium: 0.16,
    chlorine: 0.16,
    linoleicAcid: 1.8
  },
  {
    name: "Ponedora verano",
    energy: 3150,
    protein: 16.5,
    lysine: 0.87,
    methionine: 0.43,
    metCys: 0.82,
    threonine: 0.65,
    tryptophan: 0.21,
    arginine: 0.88,
    isoleucine: 0.7,
    valine: 0.79,
    calcium: 3.64,
    availablePhosphorus: 0.39,
    sodium: 0.2,
    chlorine: 0.16,
    linoleicAcid: 1.9
  },
  {
    name: "Cobb 500 inicio",
    energy: 3000,
    protein: 22,
    lysine: 1.28,
    methionine: 0.5,
    metCys: 0.95,
    threonine: 0.86,
    tryptophan: 0.23,
    arginine: 1.35,
    isoleucine: 0.85,
    valine: 0.95,
    calcium: 0.95,
    availablePhosphorus: 0.48,
    sodium: 0.2,
    chlorine: 0.2,
    linoleicAcid: 1.2
  },
  {
    name: "Cobb 500 crecimiento",
    energy: 3100,
    protein: 20,
    lysine: 1.15,
    methionine: 0.47,
    metCys: 0.88,
    threonine: 0.77,
    tryptophan: 0.2,
    arginine: 1.22,
    isoleucine: 0.78,
    valine: 0.86,
    calcium: 0.85,
    availablePhosphorus: 0.42,
    sodium: 0.19,
    chlorine: 0.19,
    linoleicAcid: 1.1
  },
  {
    name: "Cobb 500 engorde",
    energy: 3200,
    protein: 18.5,
    lysine: 1.05,
    methionine: 0.43,
    metCys: 0.82,
    threonine: 0.7,
    tryptophan: 0.18,
    arginine: 1.1,
    isoleucine: 0.72,
    valine: 0.8,
    calcium: 0.78,
    availablePhosphorus: 0.38,
    sodium: 0.18,
    chlorine: 0.18,
    linoleicAcid: 1
  },
  {
    name: "Cerdo crecimiento",
    energy: 3250,
    protein: 18,
    lysine: 1.05,
    methionine: 0.32,
    metCys: 0.6,
    threonine: 0.68,
    tryptophan: 0.19,
    arginine: 0.75,
    isoleucine: 0.6,
    valine: 0.7,
    calcium: 0.75,
    availablePhosphorus: 0.35,
    sodium: 0.18,
    chlorine: 0.18,
    linoleicAcid: 1
  },
  {
    name: "Cerdo engorde",
    energy: 3250,
    protein: 16,
    lysine: 0.85,
    methionine: 0.27,
    metCys: 0.52,
    threonine: 0.55,
    tryptophan: 0.16,
    arginine: 0.65,
    isoleucine: 0.5,
    valine: 0.6,
    calcium: 0.65,
    availablePhosphorus: 0.3,
    sodium: 0.16,
    chlorine: 0.16,
    linoleicAcid: 0.8
  },
  {
    name: "Cuy engorde",
    energy: 2800,
    protein: 17,
    lysine: 0.8,
    methionine: 0.28,
    metCys: 0.55,
    threonine: 0.55,
    tryptophan: 0.16,
    arginine: 0.8,
    isoleucine: 0.55,
    valine: 0.62,
    calcium: 0.8,
    availablePhosphorus: 0.35,
    sodium: 0.18,
    chlorine: 0.18,
    linoleicAcid: 0.8
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
    key: "threonine",
    label: "Treonina",
    step: "0.01"
  },
  {
    key: "tryptophan",
    label: "Triptófano",
    step: "0.01"
  },
  {
    key: "arginine",
    label: "Arginina",
    step: "0.01"
  },
  {
    key: "isoleucine",
    label: "Isoleucina",
    step: "0.01"
  },
  {
    key: "valine",
    label: "Valina",
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
  },
  {
    key: "chlorine",
    label: "Cloro",
    step: "0.01"
  },
  {
    key: "linoleicAcid",
    label: "Ácido linoleico",
    step: "0.01"
  }
];
