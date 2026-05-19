export type NutrientKey =
  | "energy"
  | "protein"
  | "lysine"
  | "methionine"
  | "metCys"
  | "calcium"
  | "availablePhosphorus"
  | "sodium";

export type Ingredient = {
  id: string;
  name: string;
  price: number;
  min: number;
  max: number;
  nutrients: Record<NutrientKey, number>;
};

export function createEmptyIngredient(): Ingredient {
  const timestamp = Date.now();

  return {
    id: `ingrediente_${timestamp}`,
    name: "Nuevo ingrediente",
    price: 0,
    min: 0,
    max: 100,
    nutrients: {
      energy: 0,
      protein: 0,
      lysine: 0,
      methionine: 0,
      metCys: 0,
      calcium: 0,
      availablePhosphorus: 0,
      sodium: 0
    }
  };
}

export const nutrientLabels: Record<NutrientKey, string> = {
  energy: "EM",
  protein: "PB",
  lysine: "Lis",
  methionine: "Met",
  metCys: "M+C",
  calcium: "Ca",
  availablePhosphorus: "P disp",
  sodium: "Na"
};

export const defaultIngredients: Ingredient[] = [
  {
    id: "maiz",
    name: "Maíz",
    price: 1.32,
    min: 40,
    max: 70,
    nutrients: {
      energy: 3350,
      protein: 7.7,
      lysine: 0.24,
      methionine: 0.17,
      metCys: 0.35,
      calcium: 0.03,
      availablePhosphorus: 0.08,
      sodium: 0.02
    }
  },
  {
    id: "soya",
    name: "Torta de soya 46%",
    price: 1.7,
    min: 5,
    max: 35,
    nutrients: {
      energy: 2450,
      protein: 46,
      lysine: 2.85,
      methionine: 0.62,
      metCys: 1.35,
      calcium: 0.3,
      availablePhosphorus: 0.29,
      sodium: 0.02
    }
  },
  {
    id: "aceite",
    name: "Aceite",
    price: 3.5,
    min: 0,
    max: 5,
    nutrients: {
      energy: 8800,
      protein: 0,
      lysine: 0,
      methionine: 0,
      metCys: 0,
      calcium: 0,
      availablePhosphorus: 0,
      sodium: 0
    }
  },
  {
    id: "carbonato",
    name: "Carbonato de calcio",
    price: 0.25,
    min: 6,
    max: 11,
    nutrients: {
      energy: 0,
      protein: 0,
      lysine: 0,
      methionine: 0,
      metCys: 0,
      calcium: 38,
      availablePhosphorus: 0,
      sodium: 0
    }
  },
  {
    id: "dcp",
    name: "Fosfato dicálcico",
    price: 2.8,
    min: 0.5,
    max: 2.5,
    nutrients: {
      energy: 0,
      protein: 0,
      lysine: 0,
      methionine: 0,
      metCys: 0,
      calcium: 23,
      availablePhosphorus: 18,
      sodium: 0
    }
  },
  {
    id: "sal",
    name: "Sal común",
    price: 0.6,
    min: 0.2,
    max: 0.4,
    nutrients: {
      energy: 0,
      protein: 0,
      lysine: 0,
      methionine: 0,
      metCys: 0,
      calcium: 0,
      availablePhosphorus: 0,
      sodium: 39
    }
  },
  {
    id: "metionina",
    name: "DL-Metionina",
    price: 18,
    min: 0,
    max: 0.35,
    nutrients: {
      energy: 0,
      protein: 0,
      lysine: 0,
      methionine: 99,
      metCys: 99,
      calcium: 0,
      availablePhosphorus: 0,
      sodium: 0
    }
  },
  {
    id: "lisina",
    name: "Lisina HCL",
    price: 9,
    min: 0,
    max: 0.35,
    nutrients: {
      energy: 0,
      protein: 0,
      lysine: 78,
      methionine: 0,
      metCys: 0,
      calcium: 0,
      availablePhosphorus: 0,
      sodium: 0
    }
  }
];
