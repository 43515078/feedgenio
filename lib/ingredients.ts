export type NutrientKey =
  | "energy"
  | "protein"
  | "lysine"
  | "methionine"
  | "metCys"
  | "threonine"
  | "tryptophan"
  | "arginine"
  | "isoleucine"
  | "valine"
  | "calcium"
  | "availablePhosphorus"
  | "sodium"
  | "chlorine"
  | "linoleicAcid";

export type SpeciesKey = "layer" | "broiler" | "pig" | "guineaPig";

export type Ingredient = {
  id: string;
  name: string;
  price: number;
  min: number;
  max: number;
  species: Record<SpeciesKey, boolean>;
  nutrients: Record<NutrientKey, number>;
};

export const speciesKeys: SpeciesKey[] = [
  "layer",
  "broiler",
  "pig",
  "guineaPig"
];

export const speciesLabels: Record<SpeciesKey, string> = {
  layer: "Ponedora",
  broiler: "Pollo",
  pig: "Cerdo",
  guineaPig: "Cuy"
};

export const nutrientKeys: NutrientKey[] = [
  "energy",
  "protein",
  "lysine",
  "methionine",
  "metCys",
  "threonine",
  "tryptophan",
  "arginine",
  "isoleucine",
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
  isoleucine: "Iso",
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
  isoleucine: "Isoleucina",
  valine: "Valina",
  calcium: "Calcio",
  availablePhosphorus: "Fósforo disponible",
  sodium: "Sodio",
  chlorine: "Cloro",
  linoleicAcid: "Ácido linoleico"
};

export function createAllSpecies(value = true): Record<SpeciesKey, boolean> {
  return {
    layer: value,
    broiler: value,
    pig: value,
    guineaPig: value
  };
}

export function createEmptyNutrients(): Record<NutrientKey, number> {
  return {
    energy: 0,
    protein: 0,
    lysine: 0,
    methionine: 0,
    metCys: 0,
    threonine: 0,
    tryptophan: 0,
    arginine: 0,
    isoleucine: 0,
    valine: 0,
    calcium: 0,
    availablePhosphorus: 0,
    sodium: 0,
    chlorine: 0,
    linoleicAcid: 0
  };
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
    nutrients: createEmptyNutrients()
  };
}

export const defaultIngredients: Ingredient[] = [
  {
    id: "maiz",
    name: "Maíz",
    price: 1.32,
    min: 40,
    max: 70,
    species: createAllSpecies(true),
    nutrients: {
      energy: 3350,
      protein: 7.7,
      lysine: 0.24,
      methionine: 0.17,
      metCys: 0.35,
      threonine: 0.29,
      tryptophan: 0.06,
      arginine: 0.37,
      isoleucine: 0.28,
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
    min: 5,
    max: 35,
    species: createAllSpecies(true),
    nutrients: {
      energy: 2450,
      protein: 46,
      lysine: 2.85,
      methionine: 0.62,
      metCys: 1.35,
      threonine: 1.78,
      tryptophan: 0.62,
      arginine: 3.35,
      isoleucine: 2.1,
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
    nutrients: {
      energy: 8800,
      protein: 0,
      lysine: 0,
      methionine: 0,
      metCys: 0,
      threonine: 0,
      tryptophan: 0,
      arginine: 0,
      isoleucine: 0,
      valine: 0,
      calcium: 0,
      availablePhosphorus: 0,
      sodium: 0,
      chlorine: 0,
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
    nutrients: {
      energy: 0,
      protein: 0,
      lysine: 0,
      methionine: 0,
      metCys: 0,
      threonine: 0,
      tryptophan: 0,
      arginine: 0,
      isoleucine: 0,
      valine: 0,
      calcium: 38,
      availablePhosphorus: 0,
      sodium: 0,
      chlorine: 0,
      linoleicAcid: 0
    }
  },
  {
    id: "dcp",
    name: "Fosfato dicálcico",
    price: 2.8,
    min: 0,
    max: 2.5,
    species: createAllSpecies(true),
    nutrients: {
      energy: 0,
      protein: 0,
      lysine: 0,
      methionine: 0,
      metCys: 0,
      threonine: 0,
      tryptophan: 0,
      arginine: 0,
      isoleucine: 0,
      valine: 0,
      calcium: 23,
      availablePhosphorus: 18,
      sodium: 0,
      chlorine: 0,
      linoleicAcid: 0
    }
  },
  {
    id: "sal",
    name: "Sal común",
    price: 0.6,
    min: 0,
    max: 0.4,
    species: createAllSpecies(true),
    nutrients: {
      energy: 0,
      protein: 0,
      lysine: 0,
      methionine: 0,
      metCys: 0,
      threonine: 0,
      tryptophan: 0,
      arginine: 0,
      isoleucine: 0,
      valine: 0,
      calcium: 0,
      availablePhosphorus: 0,
      sodium: 39,
      chlorine: 60,
      linoleicAcid: 0
    }
  },
  {
    id: "metionina",
    name: "DL-Metionina",
    price: 18,
    min: 0,
    max: 0.35,
    species: createAllSpecies(true),
    nutrients: {
      energy: 0,
      protein: 0,
      lysine: 0,
      methionine: 99,
      metCys: 99,
      threonine: 0,
      tryptophan: 0,
      arginine: 0,
      isoleucine: 0,
      valine: 0,
      calcium: 0,
      availablePhosphorus: 0,
      sodium: 0,
      chlorine: 0,
      linoleicAcid: 0
    }
  },
  {
    id: "lisina",
    name: "Lisina HCL",
    price: 9,
    min: 0,
    max: 0.35,
    species: createAllSpecies(true),
    nutrients: {
      energy: 0,
      protein: 0,
      lysine: 78,
      methionine: 0,
      metCys: 0,
      threonine: 0,
      tryptophan: 0,
      arginine: 0,
      isoleucine: 0,
      valine: 0,
      calcium: 0,
      availablePhosphorus: 0,
      sodium: 0,
      chlorine: 19,
      linoleicAcid: 0
    }
  }
];
