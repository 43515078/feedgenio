export type NutrientKey =
  | "energy"
  | "protein"
  | "lysine"
  | "methionine"
  | "metCys"
  | "threonine"
  | "tryptophan"
  | "arginine"
  | "glycineSerine"
  | "histidine"
  | "isoleucine"
  | "leucine"
  | "phenylalanine"
  | "tyrosine"
  | "phenylalanineTyrosine"
  | "valine"
  | "calcium"
  | "availablePhosphorus"
  | "sodium"
  | "chlorine"
  | "linoleicAcid";

export type SpeciesKey = string;

export type SpeciesClassifier = {
  id: SpeciesKey;
  label: string;
};

export type IngredientLimit = {
  min: number;
  max: number;
};

export type Ingredient = {
  id: string;
  name: string;
  price: number;

  min: number;
  max: number;

  species: Record<SpeciesKey, boolean>;
  limits: Record<SpeciesKey, IngredientLimit>;
  nutrients: Record<NutrientKey, number>;
};

export const defaultSpeciesClassifiers: SpeciesClassifier[] = [
  { id: "layer", label: "Ponedora" },
  { id: "broiler", label: "Pollo" },
  { id: "pig", label: "Cerdo" },
  { id: "guineaPig", label: "Cuy" },

  { id: "layerDig", label: "Ponedora dig" },
  { id: "broilerDig", label: "Pollo dig" },
  { id: "pigDig", label: "Cerdo dig" },

  { id: "broilerSE", label: "Pollo SE" },
  { id: "pigSE", label: "Cerdo SE" }
];

export const speciesKeys: SpeciesKey[] = defaultSpeciesClassifiers.map(
  (item) => item.id
);

export const speciesLabels: Record<SpeciesKey, string> =
  defaultSpeciesClassifiers.reduce((acc, item) => {
    acc[item.id] = item.label;
    return acc;
  }, {} as Record<SpeciesKey, string>);

export const nutrientKeys: NutrientKey[] = [
  "energy",
  "protein",
  "lysine",
  "methionine",
  "metCys",
  "threonine",
  "tryptophan",
  "arginine",
  "glycineSerine",
  "histidine",
  "isoleucine",
  "leucine",
  "phenylalanine",
  "tyrosine",
  "phenylalanineTyrosine",
  "valine",
  "calcium",
  "availablePhosphorus",
  "sodium",
  "chlorine",
  "linoleicAcid"
];

export const nutrientLabels: Record<NutrientKey, string> = {
  energy: "EM",
  protein: "PB",
  lysine: "Lis",
  methionine: "Met",
  metCys: "M+C",
  threonine: "Tre",
  tryptophan: "Trip",
  arginine: "Arg",
  glycineSerine: "Gli+Ser",
  histidine: "His",
  isoleucine: "Iso",
  leucine: "Leu",
  phenylalanine: "Fen",
  tyrosine: "Tir",
  phenylalanineTyrosine: "Fen+Tir",
  valine: "Val",
  calcium: "Ca",
  availablePhosphorus: "P disp",
  sodium: "Na",
  chlorine: "Cl",
  linoleicAcid: "Linol"
};

export const nutrientFullLabels: Record<NutrientKey, string> = {
  energy: "Energía",
  protein: "Proteína",
  lysine: "Lisina",
  methionine: "Metionina",
  metCys: "Met + Cist",
  threonine: "Treonina",
  tryptophan: "Triptófano",
  arginine: "Arginina",
  glycineSerine: "Glicina + Serina",
  histidine: "Histidina",
  isoleucine: "Isoleucina",
  leucine: "Leucina",
  phenylalanine: "Fenilalanina",
  tyrosine: "Tirosina",
  phenylalanineTyrosine: "Fenilalanina + Tirosina",
  valine: "Valina",
  calcium: "Calcio",
  availablePhosphorus: "Fósforo disponible",
  sodium: "Sodio",
  chlorine: "Cloro",
  linoleicAcid: "Ácido linoleico"
};

export function createAllSpecies(value = true): Record<SpeciesKey, boolean> {
  const species = {} as Record<SpeciesKey, boolean>;

  for (const key of speciesKeys) {
    species[key] = value;
  }

  return species;
}

export function createAllLimits(
  min = 0,
  max = 100
): Record<SpeciesKey, IngredientLimit> {
  const limits = {} as Record<SpeciesKey, IngredientLimit>;

  for (const key of speciesKeys) {
    limits[key] = { min, max };
  }

  return limits;
}

export function createEmptyNutrients(): Record<NutrientKey, number> {
  const nutrients = {} as Record<NutrientKey, number>;

  for (const key of nutrientKeys) {
    nutrients[key] = 0;
  }

  return nutrients;
}

export function createEmptyIngredient(): Ingredient {
  const timestamp = Date.now();

  return {
    id: `ingrediente_${timestamp}`,
    name: "Nuevo ingrediente",
    price: 0,
    min: 0,
    max: 100,
    species: createAllSpecies(true),
    limits: createAllLimits(0, 100),
    nutrients: createEmptyNutrients()
  };
}

export const defaultIngredients: Ingredient[] = [
  {
    id: "maiz",
    name: "Maíz",
    price: 1.32,
    min: 0,
    max: 75,
    species: createAllSpecies(true),
    limits: {
      ...createAllLimits(0, 100),
      layer: { min: 40, max: 75 },
      broiler: { min: 40, max: 75 },
      pig: { min: 40, max: 80 },
      guineaPig: { min: 0, max: 40 },
      layerDig: { min: 40, max: 75 },
      broilerDig: { min: 40, max: 75 },
      pigDig: { min: 40, max: 80 },
      broilerSE: { min: 40, max: 75 },
      pigSE: { min: 40, max: 80 }
    },
    nutrients: {
      energy: 3350,
      protein: 7.7,
      lysine: 0.24,
      methionine: 0.17,
      metCys: 0.35,
      threonine: 0.29,
      tryptophan: 0.06,
      arginine: 0.37,
      glycineSerine: 0.58,
      histidine: 0.2,
      isoleucine: 0.28,
      leucine: 0.93,
      phenylalanine: 0.35,
      tyrosine: 0.24,
      phenylalanineTyrosine: 0.59,
      valine: 0.37,
      calcium: 0.03,
      availablePhosphorus: 0.08,
      sodium: 0.02,
      chlorine: 0.05,
      linoleicAcid: 1.9
    }
  },
  {
    id: "soya",
    name: "Torta de soya 46%",
    price: 1.7,
    min: 0,
    max: 35,
    species: createAllSpecies(true),
    limits: {
      ...createAllLimits(0, 100),
      layer: { min: 0, max: 35 },
      broiler: { min: 0, max: 40 },
      pig: { min: 0, max: 35 },
      guineaPig: { min: 0, max: 30 },
      layerDig: { min: 0, max: 35 },
      broilerDig: { min: 0, max: 40 },
      pigDig: { min: 0, max: 35 },
      broilerSE: { min: 0, max: 40 },
      pigSE: { min: 0, max: 35 }
    },
    nutrients: {
      energy: 2450,
      protein: 46,
      lysine: 2.85,
      methionine: 0.62,
      metCys: 1.35,
      threonine: 1.78,
      tryptophan: 0.62,
      arginine: 3.35,
      glycineSerine: 4.35,
      histidine: 1.18,
      isoleucine: 2.1,
      leucine: 3.55,
      phenylalanine: 2.25,
      tyrosine: 1.55,
      phenylalanineTyrosine: 3.8,
      valine: 2.25,
      calcium: 0.3,
      availablePhosphorus: 0.29,
      sodium: 0.02,
      chlorine: 0.05,
      linoleicAcid: 0.6
    }
  },
  {
    id: "aceite",
    name: "Aceite",
    price: 3.5,
    min: 0,
    max: 5,
    species: createAllSpecies(true),
    limits: {
      ...createAllLimits(0, 100),
      layer: { min: 0, max: 5 },
      broiler: { min: 0, max: 6 },
      pig: { min: 0, max: 5 },
      guineaPig: { min: 0, max: 3 },
      layerDig: { min: 0, max: 5 },
      broilerDig: { min: 0, max: 6 },
      pigDig: { min: 0, max: 5 },
      broilerSE: { min: 0, max: 6 },
      pigSE: { min: 0, max: 5 }
    },
    nutrients: {
      ...createEmptyNutrients(),
      energy: 8800,
      linoleicAcid: 50
    }
  },
  {
    id: "carbonato",
    name: "Carbonato de calcio",
    price: 0.25,
    min: 0,
    max: 11,
    species: createAllSpecies(true),
    limits: {
      ...createAllLimits(0, 100),
      layer: { min: 0, max: 12 },
      broiler: { min: 0, max: 2.5 },
      pig: { min: 0, max: 2 },
      guineaPig: { min: 0, max: 2 },
      layerDig: { min: 0, max: 12 },
      broilerDig: { min: 0, max: 2.5 },
      pigDig: { min: 0, max: 2 },
      broilerSE: { min: 0, max: 2.5 },
      pigSE: { min: 0, max: 2 }
    },
    nutrients: {
      ...createEmptyNutrients(),
      calcium: 38
    }
  },
  {
    id: "dcp",
    name: "Fosfato dicálcico",
    price: 2.8,
    min: 0,
    max: 2.5,
    species: createAllSpecies(true),
    limits: {
      ...createAllLimits(0, 2.5)
    },
    nutrients: {
      ...createEmptyNutrients(),
      calcium: 23,
      availablePhosphorus: 18
    }
  },
  {
    id: "sal",
    name: "Sal común",
    price: 0.6,
    min: 0,
    max: 0.4,
    species: createAllSpecies(true),
    limits: {
      ...createAllLimits(0, 0.45)
    },
    nutrients: {
      ...createEmptyNutrients(),
      sodium: 39,
      chlorine: 60
    }
  },
  {
    id: "metionina",
    name: "DL-Metionina",
    price: 18,
    min: 0,
    max: 0.35,
    species: createAllSpecies(true),
    limits: {
      ...createAllLimits(0, 0.35),
      broiler: { min: 0, max: 0.4 },
      broilerDig: { min: 0, max: 0.4 },
      broilerSE: { min: 0, max: 0.4 },
      pig: { min: 0, max: 0.3 },
      pigDig: { min: 0, max: 0.3 },
      pigSE: { min: 0, max: 0.3 },
      guineaPig: { min: 0, max: 0.25 }
    },
    nutrients: {
      ...createEmptyNutrients(),
      methionine: 99,
      metCys: 99
    }
  },
  {
    id: "lisina",
    name: "Lisina HCL",
    price: 9,
    min: 0,
    max: 0.35,
    species: createAllSpecies(true),
    limits: {
      ...createAllLimits(0, 0.35),
      broiler: { min: 0, max: 0.45 },
      broilerDig: { min: 0, max: 0.45 },
      broilerSE: { min: 0, max: 0.45 },
      pig: { min: 0, max: 0.5 },
      pigDig: { min: 0, max: 0.5 },
      pigSE: { min: 0, max: 0.5 }
    },
    nutrients: {
      ...createEmptyNutrients(),
      lysine: 78,
      chlorine: 19
    }
  }
];
