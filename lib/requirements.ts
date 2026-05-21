export type Requirement = {
  name: string;

  energy: number;
  energyMax?: number;

  protein: number;
  proteinMax?: number;

  lysine: number;
  lysineMax?: number;

  methionine: number;
  methionineMax?: number;

  metCys: number;
  metCysMax?: number;

  threonine: number;
  threonineMax?: number;

  tryptophan: number;
  tryptophanMax?: number;

  arginine: number;
  arginineMax?: number;

  isoleucine: number;
  isoleucineMax?: number;

  valine: number;
  valineMax?: number;

  calcium: number;
  calciumMax?: number;

  availablePhosphorus: number;
  availablePhosphorusMax?: number;

  sodium: number;
  sodiumMax?: number;

  chlorine: number;
  chlorineMax?: number;

  linoleicAcid: number;
  linoleicAcidMax?: number;
};

export const defaultRequirement: Requirement = {
  name: "Ponedora en producción",
  energy: 2850,
  energyMax: 3000,
  protein: 16,
  proteinMax: 18.5,
  lysine: 0.87,
  lysineMax: 1.1,
  methionine: 0.43,
  methionineMax: 0.55,
  metCys: 0.82,
  metCysMax: 1,
  threonine: 0.65,
  threonineMax: 0.85,
  tryptophan: 0.21,
  tryptophanMax: 0.3,
  arginine: 0.88,
  arginineMax: 1.2,
  isoleucine: 0.7,
  isoleucineMax: 0.95,
  valine: 0.79,
  valineMax: 1.05,
  calcium: 3.7,
  calciumMax: 4.2,
  availablePhosphorus: 0.38,
  availablePhosphorusMax: 0.5,
  sodium: 0.16,
  sodiumMax: 0.23,
  chlorine: 0.16,
  chlorineMax: 0.25,
  linoleicAcid: 1.8,
  linoleicAcidMax: 2.5
};

export const baseRequirementProfiles: Requirement[] = [
  {
    name: "Ponedora producción",
    energy: 2850,
    energyMax: 3000,
    protein: 16,
    proteinMax: 18.5,
    lysine: 0.87,
    lysineMax: 1.1,
    methionine: 0.43,
    methionineMax: 0.55,
    metCys: 0.82,
    metCysMax: 1,
    threonine: 0.65,
    threonineMax: 0.85,
    tryptophan: 0.21,
    tryptophanMax: 0.3,
    arginine: 0.88,
    arginineMax: 1.2,
    isoleucine: 0.7,
    isoleucineMax: 0.95,
    valine: 0.79,
    valineMax: 1.05,
    calcium: 3.7,
    calciumMax: 4.2,
    availablePhosphorus: 0.38,
    availablePhosphorusMax: 0.5,
    sodium: 0.16,
    sodiumMax: 0.23,
    chlorine: 0.16,
    chlorineMax: 0.25,
    linoleicAcid: 1.8,
    linoleicAcidMax: 2.5
  },
  {
    name: "Ponedora verano",
    energy: 3150,
    energyMax: 3250,
    protein: 16.5,
    proteinMax: 18.5,
    lysine: 0.87,
    lysineMax: 1.1,
    methionine: 0.43,
    methionineMax: 0.55,
    metCys: 0.82,
    metCysMax: 1,
    threonine: 0.65,
    threonineMax: 0.85,
    tryptophan: 0.21,
    tryptophanMax: 0.3,
    arginine: 0.88,
    arginineMax: 1.2,
    isoleucine: 0.7,
    isoleucineMax: 0.95,
    valine: 0.79,
    valineMax: 1.05,
    calcium: 3.64,
    calciumMax: 4.2,
    availablePhosphorus: 0.39,
    availablePhosphorusMax: 0.5,
    sodium: 0.2,
    sodiumMax: 0.25,
    chlorine: 0.16,
    chlorineMax: 0.25,
    linoleicAcid: 1.9,
    linoleicAcidMax: 2.6
  },
  {
    name: "Cobb 500 inicio",
    energy: 3000,
    energyMax: 3100,
    protein: 22,
    proteinMax: 24,
    lysine: 1.28,
    lysineMax: 1.5,
    methionine: 0.5,
    methionineMax: 0.65,
    metCys: 0.95,
    metCysMax: 1.15,
    threonine: 0.86,
    threonineMax: 1.05,
    tryptophan: 0.23,
    tryptophanMax: 0.32,
    arginine: 1.35,
    arginineMax: 1.65,
    isoleucine: 0.85,
    isoleucineMax: 1.05,
    valine: 0.95,
    valineMax: 1.15,
    calcium: 0.95,
    calciumMax: 1.1,
    availablePhosphorus: 0.48,
    availablePhosphorusMax: 0.6,
    sodium: 0.2,
    sodiumMax: 0.25,
    chlorine: 0.2,
    chlorineMax: 0.28,
    linoleicAcid: 1.2,
    linoleicAcidMax: 2.5
  },
  {
    name: "Cobb 500 crecimiento",
    energy: 3100,
    energyMax: 3200,
    protein: 20,
    proteinMax: 22,
    lysine: 1.15,
    lysineMax: 1.35,
    methionine: 0.47,
    methionineMax: 0.6,
    metCys: 0.88,
    metCysMax: 1.08,
    threonine: 0.77,
    threonineMax: 0.95,
    tryptophan: 0.2,
    tryptophanMax: 0.3,
    arginine: 1.22,
    arginineMax: 1.5,
    isoleucine: 0.78,
    isoleucineMax: 1,
    valine: 0.86,
    valineMax: 1.1,
    calcium: 0.85,
    calciumMax: 1,
    availablePhosphorus: 0.42,
    availablePhosphorusMax: 0.55,
    sodium: 0.19,
    sodiumMax: 0.25,
    chlorine: 0.19,
    chlorineMax: 0.28,
    linoleicAcid: 1.1,
    linoleicAcidMax: 2.5
  },
  {
    name: "Cobb 500 engorde",
    energy: 3200,
    energyMax: 3300,
    protein: 18.5,
    proteinMax: 20.5,
    lysine: 1.05,
    lysineMax: 1.25,
    methionine: 0.43,
    methionineMax: 0.55,
    metCys: 0.82,
    metCysMax: 1,
    threonine: 0.7,
    threonineMax: 0.9,
    tryptophan: 0.18,
    tryptophanMax: 0.28,
    arginine: 1.1,
    arginineMax: 1.4,
    isoleucine: 0.72,
    isoleucineMax: 0.95,
    valine: 0.8,
    valineMax: 1,
    calcium: 0.78,
    calciumMax: 0.95,
    availablePhosphorus: 0.38,
    availablePhosphorusMax: 0.5,
    sodium: 0.18,
    sodiumMax: 0.24,
    chlorine: 0.18,
    chlorineMax: 0.26,
    linoleicAcid: 1,
    linoleicAcidMax: 2.3
  },
  {
    name: "Cerdo crecimiento",
    energy: 3250,
    energyMax: 3400,
    protein: 18,
    proteinMax: 20,
    lysine: 1.05,
    lysineMax: 1.3,
    methionine: 0.32,
    methionineMax: 0.5,
    metCys: 0.6,
    metCysMax: 0.8,
    threonine: 0.68,
    threonineMax: 0.9,
    tryptophan: 0.19,
    tryptophanMax: 0.28,
    arginine: 0.75,
    arginineMax: 1.2,
    isoleucine: 0.6,
    isoleucineMax: 0.85,
    valine: 0.7,
    valineMax: 0.95,
    calcium: 0.75,
    calciumMax: 0.95,
    availablePhosphorus: 0.35,
    availablePhosphorusMax: 0.5,
    sodium: 0.18,
    sodiumMax: 0.25,
    chlorine: 0.18,
    chlorineMax: 0.28,
    linoleicAcid: 1,
    linoleicAcidMax: 2.5
  },
  {
    name: "Cerdo engorde",
    energy: 3250,
    energyMax: 3400,
    protein: 16,
    proteinMax: 18.5,
    lysine: 0.85,
    lysineMax: 1.1,
    methionine: 0.27,
    methionineMax: 0.45,
    metCys: 0.52,
    metCysMax: 0.75,
    threonine: 0.55,
    threonineMax: 0.8,
    tryptophan: 0.16,
    tryptophanMax: 0.25,
    arginine: 0.65,
    arginineMax: 1.1,
    isoleucine: 0.5,
    isoleucineMax: 0.75,
    valine: 0.6,
    valineMax: 0.85,
    calcium: 0.65,
    calciumMax: 0.85,
    availablePhosphorus: 0.3,
    availablePhosphorusMax: 0.45,
    sodium: 0.16,
    sodiumMax: 0.24,
    chlorine: 0.16,
    chlorineMax: 0.26,
    linoleicAcid: 0.8,
    linoleicAcidMax: 2.3
  },
  {
    name: "Cuy engorde",
    energy: 2800,
    energyMax: 3000,
    protein: 17,
    proteinMax: 19,
    lysine: 0.8,
    lysineMax: 1.1,
    methionine: 0.28,
    methionineMax: 0.45,
    metCys: 0.55,
    metCysMax: 0.8,
    threonine: 0.55,
    threonineMax: 0.8,
    tryptophan: 0.16,
    tryptophanMax: 0.25,
    arginine: 0.8,
    arginineMax: 1.2,
    isoleucine: 0.55,
    isoleucineMax: 0.8,
    valine: 0.62,
    valineMax: 0.9,
    calcium: 0.8,
    calciumMax: 1.1,
    availablePhosphorus: 0.35,
    availablePhosphorusMax: 0.5,
    sodium: 0.18,
    sodiumMax: 0.25,
    chlorine: 0.18,
    chlorineMax: 0.28,
    linoleicAcid: 0.8,
    linoleicAcidMax: 2.3
  }
];

export const requirementFields: Array<{
  key: keyof Omit<Requirement, "name">;
  label: string;
  step: string;
}> = [
  { key: "energy", label: "Energía mín", step: "1" },
  { key: "energyMax", label: "Energía máx", step: "1" },

  { key: "protein", label: "Proteína mín", step: "0.01" },
  { key: "proteinMax", label: "Proteína máx", step: "0.01" },

  { key: "lysine", label: "Lisina mín", step: "0.01" },
  { key: "lysineMax", label: "Lisina máx", step: "0.01" },

  { key: "methionine", label: "Metionina mín", step: "0.01" },
  { key: "methionineMax", label: "Metionina máx", step: "0.01" },

  { key: "metCys", label: "Met + Cist mín", step: "0.01" },
  { key: "metCysMax", label: "Met + Cist máx", step: "0.01" },

  { key: "threonine", label: "Treonina mín", step: "0.01" },
  { key: "threonineMax", label: "Treonina máx", step: "0.01" },

  { key: "tryptophan", label: "Triptófano mín", step: "0.01" },
  { key: "tryptophanMax", label: "Triptófano máx", step: "0.01" },

  { key: "arginine", label: "Arginina mín", step: "0.01" },
  { key: "arginineMax", label: "Arginina máx", step: "0.01" },

  { key: "isoleucine", label: "Isoleucina mín", step: "0.01" },
  { key: "isoleucineMax", label: "Isoleucina máx", step: "0.01" },

  { key: "valine", label: "Valina mín", step: "0.01" },
  { key: "valineMax", label: "Valina máx", step: "0.01" },

  { key: "calcium", label: "Calcio mín", step: "0.01" },
  { key: "calciumMax", label: "Calcio máx", step: "0.01" },

  { key: "availablePhosphorus", label: "Fósforo disp mín", step: "0.01" },
  { key: "availablePhosphorusMax", label: "Fósforo disp máx", step: "0.01" },

  { key: "sodium", label: "Sodio mín", step: "0.01" },
  { key: "sodiumMax", label: "Sodio máx", step: "0.01" },

  { key: "chlorine", label: "Cloro mín", step: "0.01" },
  { key: "chlorineMax", label: "Cloro máx", step: "0.01" },

  { key: "linoleicAcid", label: "Ácido linoleico mín", step: "0.01" },
  { key: "linoleicAcidMax", label: "Ácido linoleico máx", step: "0.01" }
];
