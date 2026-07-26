// lib/ingredients.ts

export type SpeciesKey = string;

export type SpeciesClassifier = {
  id: SpeciesKey;
  label: string;
};

export type IngredientLimit = {
  min: number;
  max: number;
};

/* =========================================================
   CATÁLOGO CENTRAL DE NUTRIENTES
   ========================================================= */

export type NutrientGroup =
  | "energy"
  | "proximate"
  | "aminoAcid"
  | "mineral"
  | "fattyAcid"
  | "other";

export type NutrientDefinition = {
  shortLabel: string;
  fullLabel: string;
  unit: string;
  decimals: number;
  group: NutrientGroup;

  /**
   * true:
   * el nutriente puede utilizarse como restricción del solver.
   *
   * false:
   * solo se muestra o utiliza para cálculos secundarios.
   */
  solver: boolean;
};

/**
 * Este objeto es la única fuente de verdad de los nutrientes reales.
 *
 * Para agregar un nutriente nuevo en el futuro:
 *
 * 1. Agregarlo aquí.
 * 2. Cargar sus valores en los ingredientes correspondientes.
 *
 * El tipo NutrientKey, las etiquetas, unidades, columnas y recorridos
 * se generan automáticamente desde este catálogo.
 */
export const nutrientCatalog = {
  energy: {
    shortLabel: "EM",
    fullLabel: "Energía metabolizable",
    unit: "kcal/kg",
    decimals: 0,
    group: "energy",
    solver: true
  },

  protein: {
    shortLabel: "PB",
    fullLabel: "Proteína bruta",
    unit: "%",
    decimals: 3,
    group: "proximate",
    solver: true
  },

  crudeFiber: {
    shortLabel: "Fibra",
    fullLabel: "Fibra cruda",
    unit: "%",
    decimals: 3,
    group: "proximate",
    solver: true
  },

  lysine: {
    shortLabel: "Lis",
    fullLabel: "Lisina",
    unit: "%",
    decimals: 3,
    group: "aminoAcid",
    solver: true
  },

  methionine: {
    shortLabel: "Met",
    fullLabel: "Metionina",
    unit: "%",
    decimals: 3,
    group: "aminoAcid",
    solver: true
  },

  metCys: {
    shortLabel: "M+C",
    fullLabel: "Metionina + Cistina",
    unit: "%",
    decimals: 3,
    group: "aminoAcid",
    solver: true
  },

  threonine: {
    shortLabel: "Tre",
    fullLabel: "Treonina",
    unit: "%",
    decimals: 3,
    group: "aminoAcid",
    solver: true
  },

  tryptophan: {
    shortLabel: "Trip",
    fullLabel: "Triptófano",
    unit: "%",
    decimals: 3,
    group: "aminoAcid",
    solver: true
  },

  arginine: {
    shortLabel: "Arg",
    fullLabel: "Arginina",
    unit: "%",
    decimals: 3,
    group: "aminoAcid",
    solver: true
  },

  glycineSerine: {
    shortLabel: "Gli+Ser",
    fullLabel: "Glicina + Serina",
    unit: "%",
    decimals: 3,
    group: "aminoAcid",
    solver: true
  },

  histidine: {
    shortLabel: "His",
    fullLabel: "Histidina",
    unit: "%",
    decimals: 3,
    group: "aminoAcid",
    solver: true
  },

  isoleucine: {
    shortLabel: "Iso",
    fullLabel: "Isoleucina",
    unit: "%",
    decimals: 3,
    group: "aminoAcid",
    solver: true
  },

  leucine: {
    shortLabel: "Leu",
    fullLabel: "Leucina",
    unit: "%",
    decimals: 3,
    group: "aminoAcid",
    solver: true
  },

  phenylalanine: {
    shortLabel: "Fen",
    fullLabel: "Fenilalanina",
    unit: "%",
    decimals: 3,
    group: "aminoAcid",
    solver: true
  },

  tyrosine: {
    shortLabel: "Tir",
    fullLabel: "Tirosina",
    unit: "%",
    decimals: 3,
    group: "aminoAcid",
    solver: true
  },

  phenylalanineTyrosine: {
    shortLabel: "Fen+Tir",
    fullLabel: "Fenilalanina + Tirosina",
    unit: "%",
    decimals: 3,
    group: "aminoAcid",
    solver: true
  },

  valine: {
    shortLabel: "Val",
    fullLabel: "Valina",
    unit: "%",
    decimals: 3,
    group: "aminoAcid",
    solver: true
  },

  calcium: {
    shortLabel: "Ca",
    fullLabel: "Calcio",
    unit: "%",
    decimals: 3,
    group: "mineral",
    solver: true
  },

  availablePhosphorus: {
    shortLabel: "P disp",
    fullLabel: "Fósforo disponible",
    unit: "%",
    decimals: 3,
    group: "mineral",
    solver: true
  },

  sodium: {
    shortLabel: "Na",
    fullLabel: "Sodio",
    unit: "%",
    decimals: 3,
    group: "mineral",
    solver: true
  },

  potassium: {
    shortLabel: "K",
    fullLabel: "Potasio",
    unit: "%",
    decimals: 3,
    group: "mineral",
    solver: true
  },

  chlorine: {
    shortLabel: "Cl",
    fullLabel: "Cloro",
    unit: "%",
    decimals: 3,
    group: "mineral",
    solver: true
  },

  linoleicAcid: {
    shortLabel: "Linol",
    fullLabel: "Ácido linoleico",
    unit: "%",
    decimals: 3,
    group: "fattyAcid",
    solver: true
  }
} as const satisfies Record<string, NutrientDefinition>;

export type NutrientKey = keyof typeof nutrientCatalog;

/* =========================================================
   LISTAS Y MAPAS GENERADOS AUTOMÁTICAMENTE
   ========================================================= */

export const nutrientKeys = Object.keys(
  nutrientCatalog
) as NutrientKey[];

export const solverNutrientKeys = nutrientKeys.filter(
  (key) => nutrientCatalog[key].solver
);

export const nutrientLabels = nutrientKeys.reduce(
  (accumulator, key) => {
    accumulator[key] = nutrientCatalog[key].shortLabel;
    return accumulator;
  },
  {} as Record<NutrientKey, string>
);

export const nutrientFullLabels = nutrientKeys.reduce(
  (accumulator, key) => {
    accumulator[key] = nutrientCatalog[key].fullLabel;
    return accumulator;
  },
  {} as Record<NutrientKey, string>
);

export const nutrientUnits = nutrientKeys.reduce(
  (accumulator, key) => {
    accumulator[key] = nutrientCatalog[key].unit;
    return accumulator;
  },
  {} as Record<NutrientKey, string>
);

export const nutrientDecimals = nutrientKeys.reduce(
  (accumulator, key) => {
    accumulator[key] = nutrientCatalog[key].decimals;
    return accumulator;
  },
  {} as Record<NutrientKey, number>
);

export const nutrientGroups = nutrientKeys.reduce(
  (accumulator, key) => {
    accumulator[key] = nutrientCatalog[key].group;
    return accumulator;
  },
  {} as Record<NutrientKey, NutrientGroup>
);

export function getNutrientDefinition(
  key: NutrientKey
): NutrientDefinition {
  return nutrientCatalog[key];
}

export function getNutrientDecimals(
  key: NutrientKey
): number {
  return nutrientCatalog[key].decimals;
}

export function getNutrientUnit(
  key: NutrientKey
): string {
  return nutrientCatalog[key].unit;
}

/* =========================================================
   VARIABLES CALCULADAS
   ========================================================= */

export type DerivedMetricKey = "electrolyteBalance";

export type DerivedMetricDefinition = {
  shortLabel: string;
  fullLabel: string;
  unit: string;
  decimals: number;
  dependencies: NutrientKey[];
};

export const derivedMetricCatalog: Record<
  DerivedMetricKey,
  DerivedMetricDefinition
> = {
  electrolyteBalance: {
    shortLabel: "BE",
    fullLabel: "Balance electrolítico",
    unit: "mEq/kg",
    decimals: 0,
    dependencies: ["sodium", "potassium", "chlorine"]
  }
};

export const derivedMetricKeys = Object.keys(
  derivedMetricCatalog
) as DerivedMetricKey[];

/**
 * Balance electrolítico dietario:
 *
 * BE = Na + K - Cl
 *
 * Los valores de sodio, potasio y cloro se reciben en porcentaje.
 *
 * El resultado se expresa en mEq/kg.
 */
export function calculateElectrolyteBalance(
  sodiumPercent: number,
  potassiumPercent: number,
  chlorinePercent: number
): number {
  const sodium = Number(sodiumPercent || 0);
  const potassium = Number(potassiumPercent || 0);
  const chlorine = Number(chlorinePercent || 0);

  const sodiumMilliequivalents =
    (sodium * 10000) / 22.989769;

  const potassiumMilliequivalents =
    (potassium * 10000) / 39.0983;

  const chlorineMilliequivalents =
    (chlorine * 10000) / 35.45;

  return (
    sodiumMilliequivalents +
    potassiumMilliequivalents -
    chlorineMilliequivalents
  );
}

export function calculateDerivedMetric(
  key: DerivedMetricKey,
  nutrients: Record<NutrientKey, number>
): number {
  if (key === "electrolyteBalance") {
    return calculateElectrolyteBalance(
      nutrients.sodium,
      nutrients.potassium,
      nutrients.chlorine
    );
  }

  return 0;
}

export function calculateAllDerivedMetrics(
  nutrients: Record<NutrientKey, number>
): Record<DerivedMetricKey, number> {
  const result = {} as Record<DerivedMetricKey, number>;

  for (const key of derivedMetricKeys) {
    result[key] = calculateDerivedMetric(key, nutrients);
  }

  return result;
}

/* =========================================================
   CLASIFICADORES
   ========================================================= */

export const defaultSpeciesClassifiers: SpeciesClassifier[] = [
  {
    id: "layer",
    label: "Ponedora"
  },
  {
    id: "broiler",
    label: "Pollo"
  },
  {
    id: "pig",
    label: "Cerdo"
  },
  {
    id: "guineaPig",
    label: "Cuy"
  },
  {
    id: "layerDig",
    label: "Ponedora dig"
  },
  {
    id: "broilerDig",
    label: "Pollo dig"
  },
  {
    id: "pigDig",
    label: "Cerdo dig"
  },
  {
    id: "broilerSE",
    label: "Pollo SE"
  },
  {
    id: "pigSE",
    label: "Cerdo SE"
  }
];

export const speciesKeys: SpeciesKey[] =
  defaultSpeciesClassifiers.map((item) => item.id);

export const speciesLabels: Record<SpeciesKey, string> =
  defaultSpeciesClassifiers.reduce(
    (accumulator, item) => {
      accumulator[item.id] = item.label;
      return accumulator;
    },
    {} as Record<SpeciesKey, string>
  );

/* =========================================================
   INGREDIENTES
   ========================================================= */

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

export function createAllSpecies(
  value = true,
  classifierKeys: SpeciesKey[] = speciesKeys
): Record<SpeciesKey, boolean> {
  const species = {} as Record<SpeciesKey, boolean>;

  for (const key of classifierKeys) {
    species[key] = value;
  }

  return species;
}

export function createAllLimits(
  min = 0,
  max = 100,
  classifierKeys: SpeciesKey[] = speciesKeys
): Record<SpeciesKey, IngredientLimit> {
  const limits = {} as Record<SpeciesKey, IngredientLimit>;

  for (const key of classifierKeys) {
    limits[key] = {
      min,
      max
    };
  }

  return limits;
}

export function createEmptyNutrients(): Record<
  NutrientKey,
  number
> {
  const nutrients = {} as Record<NutrientKey, number>;

  for (const key of nutrientKeys) {
    nutrients[key] = 0;
  }

  return nutrients;
}

/**
 * Permite definir solamente los nutrientes que posee un ingrediente.
 *
 * El resto se completa automáticamente con cero.
 *
 * Gracias a esta función, cuando agreguemos un nutriente nuevo al catálogo
 * no será necesario modificar todos los ingredientes existentes.
 */
export function createNutrients(
  values: Partial<Record<NutrientKey, number>> = {}
): Record<NutrientKey, number> {
  const nutrients = createEmptyNutrients();

  for (const key of nutrientKeys) {
    const value = Number(values[key] ?? 0);

    nutrients[key] = Number.isFinite(value)
      ? value
      : 0;
  }

  return nutrients;
}

/**
 * Recupera matrices antiguas que no contienen nutrientes nuevos.
 *
 * Por ejemplo:
 * - fibra cruda
 * - potasio
 * - futuros nutrientes
 */
export function normalizeNutrients(
  nutrients?: Partial<Record<NutrientKey, number>> | null
): Record<NutrientKey, number> {
  return createNutrients(nutrients ?? {});
}

export function normalizeIngredientSpecies(
  species?: Record<SpeciesKey, boolean> | null,
  classifierKeys: SpeciesKey[] = speciesKeys
): Record<SpeciesKey, boolean> {
  const normalized = createAllSpecies(
    true,
    classifierKeys
  );

  for (const key of classifierKeys) {
    if (typeof species?.[key] === "boolean") {
      normalized[key] = species[key];
    }
  }

  return normalized;
}

export function normalizeIngredientLimits(
  limits?: Record<SpeciesKey, IngredientLimit> | null,
  classifierKeys: SpeciesKey[] = speciesKeys
): Record<SpeciesKey, IngredientLimit> {
  const normalized = createAllLimits(
    0,
    100,
    classifierKeys
  );

  for (const key of classifierKeys) {
    const min = Number(limits?.[key]?.min ?? 0);
    const max = Number(limits?.[key]?.max ?? 100);

    normalized[key] = {
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : 100
    };
  }

  return normalized;
}

export function normalizeIngredient(
  ingredient: Ingredient,
  classifierKeys: SpeciesKey[] = speciesKeys
): Ingredient {
  const price = Number(ingredient.price ?? 0);
  const min = Number(ingredient.min ?? 0);
  const max = Number(ingredient.max ?? 100);

  return {
    ...ingredient,

    price: Number.isFinite(price)
      ? price
      : 0,

    min: Number.isFinite(min)
      ? min
      : 0,

    max: Number.isFinite(max)
      ? max
      : 100,

    species: normalizeIngredientSpecies(
      ingredient.species,
      classifierKeys
    ),

    limits: normalizeIngredientLimits(
      ingredient.limits,
      classifierKeys
    ),

    nutrients: normalizeNutrients(
      ingredient.nutrients
    )
  };
}

export function createEmptyIngredient(
  classifierKeys: SpeciesKey[] = speciesKeys
): Ingredient {
  const timestamp = Date.now();

  return {
    id: `ingrediente_${timestamp}`,
    name: "Nuevo ingrediente",
    price: 0,
    min: 0,
    max: 100,

    species: createAllSpecies(
      true,
      classifierKeys
    ),

    limits: createAllLimits(
      0,
      100,
      classifierKeys
    ),

    nutrients: createEmptyNutrients()
  };
}

/* =========================================================
   INGREDIENTES INICIALES
   ========================================================= */

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

      layer: {
        min: 40,
        max: 75
      },

      broiler: {
        min: 40,
        max: 75
      },

      pig: {
        min: 40,
        max: 80
      },

      guineaPig: {
        min: 0,
        max: 40
      },

      layerDig: {
        min: 40,
        max: 75
      },

      broilerDig: {
        min: 40,
        max: 75
      },

      pigDig: {
        min: 40,
        max: 80
      },

      broilerSE: {
        min: 40,
        max: 75
      },

      pigSE: {
        min: 40,
        max: 80
      }
    },

    nutrients: createNutrients({
      energy: 3350,
      protein: 7.7,
      crudeFiber: 2.2,

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
      potassium: 0.29,
      chlorine: 0.05,

      linoleicAcid: 1.9
    })
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

      layer: {
        min: 0,
        max: 35
      },

      broiler: {
        min: 0,
        max: 40
      },

      pig: {
        min: 0,
        max: 35
      },

      guineaPig: {
        min: 0,
        max: 30
      },

      layerDig: {
        min: 0,
        max: 35
      },

      broilerDig: {
        min: 0,
        max: 40
      },

      pigDig: {
        min: 0,
        max: 35
      },

      broilerSE: {
        min: 0,
        max: 40
      },

      pigSE: {
        min: 0,
        max: 35
      }
    },

    nutrients: createNutrients({
      energy: 2450,
      protein: 46,
      crudeFiber: 3.9,

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
      potassium: 2.2,
      chlorine: 0.05,

      linoleicAcid: 0.6
    })
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

      layer: {
        min: 0,
        max: 5
      },

      broiler: {
        min: 0,
        max: 6
      },

      pig: {
        min: 0,
        max: 5
      },

      guineaPig: {
        min: 0,
        max: 3
      },

      layerDig: {
        min: 0,
        max: 5
      },

      broilerDig: {
        min: 0,
        max: 6
      },

      pigDig: {
        min: 0,
        max: 5
      },

      broilerSE: {
        min: 0,
        max: 6
      },

      pigSE: {
        min: 0,
        max: 5
      }
    },

    nutrients: createNutrients({
      energy: 8800,
      linoleicAcid: 50
    })
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

      layer: {
        min: 0,
        max: 12
      },

      broiler: {
        min: 0,
        max: 2.5
      },

      pig: {
        min: 0,
        max: 2
      },

      guineaPig: {
        min: 0,
        max: 2
      },

      layerDig: {
        min: 0,
        max: 12
      },

      broilerDig: {
        min: 0,
        max: 2.5
      },

      pigDig: {
        min: 0,
        max: 2
      },

      broilerSE: {
        min: 0,
        max: 2.5
      },

      pigSE: {
        min: 0,
        max: 2
      }
    },

    nutrients: createNutrients({
      calcium: 38
    })
  },

  {
    id: "dcp",
    name: "Fosfato dicálcico",
    price: 2.8,
    min: 0,
    max: 2.5,

    species: createAllSpecies(true),

    limits: createAllLimits(
      0,
      2.5
    ),

    nutrients: createNutrients({
      calcium: 23,
      availablePhosphorus: 18
    })
  },

  {
    id: "sal",
    name: "Sal común",
    price: 0.6,
    min: 0,
    max: 0.4,

    species: createAllSpecies(true),

    limits: createAllLimits(
      0,
      0.45
    ),

    nutrients: createNutrients({
      sodium: 39,
      chlorine: 60
    })
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

      broiler: {
        min: 0,
        max: 0.4
      },

      broilerDig: {
        min: 0,
        max: 0.4
      },

      broilerSE: {
        min: 0,
        max: 0.4
      },

      pig: {
        min: 0,
        max: 0.3
      },

      pigDig: {
        min: 0,
        max: 0.3
      },

      pigSE: {
        min: 0,
        max: 0.3
      },

      guineaPig: {
        min: 0,
        max: 0.25
      }
    },

    nutrients: createNutrients({
      methionine: 99,
      metCys: 99
    })
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

      broiler: {
        min: 0,
        max: 0.45
      },

      broilerDig: {
        min: 0,
        max: 0.45
      },

      broilerSE: {
        min: 0,
        max: 0.45
      },

      pig: {
        min: 0,
        max: 0.5
      },

      pigDig: {
        min: 0,
        max: 0.5
      },

      pigSE: {
        min: 0,
        max: 0.5
      }
    },

    nutrients: createNutrients({
      lysine: 78,
      chlorine: 19
    })
  }
];
