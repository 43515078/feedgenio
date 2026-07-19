"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createEmptyIngredient,
  createEmptyNutrients,
  defaultIngredients,
  nutrientKeys,
  nutrientLabels,
  speciesKeys as defaultSpeciesKeys,
  speciesLabels as defaultSpeciesLabels,
  type Ingredient,
  type IngredientLimit,
  type NutrientKey,
  type SpeciesKey
} from "@/lib/ingredients";

import {
  defaultRequirement,
  type Requirement
} from "@/lib/requirements";

import type { FormulaResult } from "@/lib/solver";

import FormulaTab from "@/components/FormulaTab";
import MatrixTab from "@/components/MatrixTab";
import RequirementsTab from "@/components/RequirementsTab";
import ResultsTab from "@/components/ResultsTab";

type EditableIngredient = Ingredient & {
  active: boolean;
};

type SavedCosting = {
  productionCostPerKg: number;
  bagCostPer50Kg: number;
  marginPercent: number;
};

type SavedFormula = {
  id: string;
  name: string;
  createdAt: string;
  multiplier: number;
  requirementName: string;
  result: FormulaResult;
  ingredientsSnapshot?: EditableIngredient[];
  requirementSnapshot?: Requirement;
  costing?: SavedCosting;
};

type ClassifierState = {
  keys: SpeciesKey[];
  labels: Record<SpeciesKey, string>;
};

type TabType =
  | "formular"
  | "matrix"
  | "requirements"
  | "results"
  | "saved";

type ProfilesExportFile = {
  app: string;
  version: number;
  exportedAt: string;
  profiles: Requirement[];
};

const INGREDIENTS_STORAGE_KEY = "feedgenio_ingredients_v1";
const REQUIREMENTS_STORAGE_KEY = "feedgenio_requirements_v2";
const ACTIVE_REQUIREMENT_INDEX_KEY =
  "feedgenio_active_requirement_index_v2";

const SAVED_FORMULAS_STORAGE_KEY =
  "feedgenio_saved_formulas_v1";

const CLASSIFIERS_STORAGE_KEY =
  "feedgenio_classifiers_v1";

const REQUIREMENTS_BACKUP_HISTORY_KEY =
  "feedgenio_requirements_backup_history_v1";

const INGREDIENTS_BACKUP_HISTORY_KEY =
  "feedgenio_ingredients_backup_history_v1";

const MAX_REQUIREMENT_BACKUPS = 20;
const MAX_INGREDIENT_BACKUPS = 20;

function numberOrDefault(
  value: unknown,
  fallback: number
) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : fallback;
}

function sanitizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function createDefaultClassifiers(): ClassifierState {
  return {
    keys: [...defaultSpeciesKeys],
    labels: {
      ...defaultSpeciesLabels
    }
  };
}

function createEmptyRequirement(
  name: string,
  species: SpeciesKey
): Requirement {
  return {
    name,
    species,

    energy: 0,
    energyMax: 0,

    protein: 0,
    proteinMax: 0,

    lysine: 0,
    lysineMax: 0,

    methionine: 0,
    methionineMax: 0,

    metCys: 0,
    metCysMax: 0,

    threonine: 0,
    threonineMax: 0,

    tryptophan: 0,
    tryptophanMax: 0,

    arginine: 0,
    arginineMax: 0,

    glycineSerine: 0,
    glycineSerineMax: 0,

    histidine: 0,
    histidineMax: 0,

    isoleucine: 0,
    isoleucineMax: 0,

    leucine: 0,
    leucineMax: 0,

    phenylalanine: 0,
    phenylalanineMax: 0,

    tyrosine: 0,
    tyrosineMax: 0,

    phenylalanineTyrosine: 0,
    phenylalanineTyrosineMax: 0,

    valine: 0,
    valineMax: 0,

    calcium: 0,
    calciumMax: 0,

    availablePhosphorus: 0,
    availablePhosphorusMax: 0,

    sodium: 0,
    sodiumMax: 0,

    chlorine: 0,
    chlorineMax: 0,

    linoleicAcid: 0,
    linoleicAcidMax: 0
  };
}

function normalizeNutrients(
  nutrients:
    | Partial<Record<NutrientKey, number>>
    | undefined
): Record<NutrientKey, number> {
  const normalized = createEmptyNutrients();

  for (const key of nutrientKeys) {
    normalized[key] = Number(
      nutrients?.[key] || 0
    );
  }

  return normalized;
}

function normalizeSpecies(
  species:
    | Partial<Record<SpeciesKey, boolean>>
    | undefined,
  classifierKeys: SpeciesKey[]
): Record<SpeciesKey, boolean> {
  const normalized =
    {} as Record<SpeciesKey, boolean>;

  for (const key of classifierKeys) {
    normalized[key] =
      typeof species?.[key] === "boolean"
        ? Boolean(species[key])
        : true;
  }

  return normalized;
}

function normalizeLimits(
  limits:
    | Partial<
        Record<
          SpeciesKey,
          Partial<IngredientLimit>
        >
      >
    | undefined,
  fallbackMin: number,
  fallbackMax: number,
  classifierKeys: SpeciesKey[]
): Record<SpeciesKey, IngredientLimit> {
  const normalized =
    {} as Record<SpeciesKey, IngredientLimit>;

  for (const key of classifierKeys) {
    normalized[key] = {
      min: numberOrDefault(
        limits?.[key]?.min,
        fallbackMin
      ),
      max: numberOrDefault(
        limits?.[key]?.max,
        fallbackMax
      )
    };
  }

  return normalized;
}

function getInitialIngredients(
  classifierKeys: SpeciesKey[]
): EditableIngredient[] {
  return defaultIngredients.map((ingredient) => ({
    ...ingredient,

    species: normalizeSpecies(
      ingredient.species,
      classifierKeys
    ),

    limits: normalizeLimits(
      ingredient.limits,
      ingredient.min,
      ingredient.max,
      classifierKeys
    ),

    active: true
  }));
}

function normalizeSavedIngredients(
  items: Array<Partial<EditableIngredient>>,
  classifierKeys: SpeciesKey[]
): EditableIngredient[] {
  return items.map((item, index) => {
    const min = numberOrDefault(item.min, 0);
    const max = numberOrDefault(item.max, 100);

    return {
      id: String(
        item.id ||
          `ingrediente_${Date.now()}_${index}`
      ),

      name: String(
        item.name ||
          "Nuevo ingrediente"
      ),

      price: numberOrDefault(
        item.price,
        0
      ),

      min,
      max,

      active:
        typeof item.active === "boolean"
          ? item.active
          : true,

      species: normalizeSpecies(
        item.species,
        classifierKeys
      ),

      limits: normalizeLimits(
        item.limits,
        min,
        max,
        classifierKeys
      ),

      nutrients: normalizeNutrients(
        item.nutrients
      )
    };
  });
}

function normalizeRequirement(
  item: Partial<Requirement>,
  fallbackSpecies: SpeciesKey,
  classifierKeys?: SpeciesKey[]
): Requirement {
  const incomingSpecies =
    item.species || fallbackSpecies;

  const safeSpecies =
    classifierKeys &&
    classifierKeys.includes(incomingSpecies)
      ? incomingSpecies
      : fallbackSpecies;

  return {
    ...defaultRequirement,
    ...item,

    name: String(
      item.name ||
        defaultRequirement.name
    ),

    species: safeSpecies
  };
}

function normalizeCosting(
  costing:
    | Partial<SavedCosting>
    | undefined
): SavedCosting {
  return {
    productionCostPerKg:
      numberOrDefault(
        costing?.productionCostPerKg,
        0
      ),

    bagCostPer50Kg:
      numberOrDefault(
        costing?.bagCostPer50Kg,
        0
      ),

    marginPercent:
      numberOrDefault(
        costing?.marginPercent,
        0
      )
  };
}

function createEmptyFormulaResult(
  message: string
): FormulaResult {
  return {
    feasible: false,
    costPerKg: 0,
    costPer100Kg: 0,
    costPer50Kg: 0,
    ingredients: [],
    nutrients: createEmptyNutrients(),
    message
  };
}

function formatKg(value: number) {
  return Number(value).toFixed(3);
}

function formatMoney(value: number) {
  return Number(value).toFixed(3);
}

function formatNutrient(value: number) {
  return Number(value).toFixed(3);
}

function nutrientSuffix(key: NutrientKey) {
  if (key === "energy") {
    return " kcal/kg";
  }

  return "%";
}

function getRequirementMaxValue(
  requirement: Requirement,
  key: NutrientKey
) {
  const maxKey =
    `${key}Max` as keyof Requirement;

  const value = Number(
    requirement[maxKey] || 0
  );

  return Number.isFinite(value) &&
    value > 0
    ? value
    : undefined;
}

function getNutrientStatus(
  obtained: number,
  min: number,
  max: number | undefined
) {
  if (obtained < min - 0.001) {
    return "❌ Bajo";
  }

  if (
    typeof max === "number" &&
    obtained > max + 0.001
  ) {
    return "🔴 Pasado";
  }

  if (
    obtained - min <=
    Math.max(min * 0.03, 0.001)
  ) {
    return "✅ Cerca mín";
  }

  if (
    typeof max === "number" &&
    max - obtained <=
      Math.max(max * 0.03, 0.001)
  ) {
    return "🟠 Cerca máx";
  }

  return "🟢 Correcto";
}

function calculateSavedCosting(
  formula: SavedFormula,
  multiplier: number
) {
  const costing =
    normalizeCosting(formula.costing);

  const costWithProductionPerKg =
    formula.result.costPerKg +
    costing.productionCostPerKg;

  const realCostPer50Kg =
    costWithProductionPerKg * 50 +
    costing.bagCostPer50Kg;

  const realCostPer100Kg =
    costWithProductionPerKg * 100 +
    costing.bagCostPer50Kg * 2;

  const salePer50Kg =
    realCostPer50Kg *
    (1 + costing.marginPercent / 100);

  const totalKg = 100 * multiplier;

  const totalFormulaCost =
    formula.result.costPer100Kg *
    multiplier;

  const totalRealCost =
    realCostPer100Kg *
    multiplier;

  return {
    costWithProductionPerKg,
    realCostPer50Kg,
    salePer50Kg,
    totalKg,
    totalFormulaCost,
    totalRealCost
  };
}

function prepareIngredientsForRequirement(
  items: EditableIngredient[],
  requirement: Requirement
): EditableIngredient[] {
  const classifier =
    requirement.species;

  return items
    .filter((ingredient) =>
      Boolean(
        ingredient.species?.[classifier]
      )
    )
    .map((ingredient) => {
      const limit =
        ingredient.limits?.[classifier];

      return {
        ...ingredient,

        min: numberOrDefault(
          limit?.min,
          ingredient.min
        ),

        max: numberOrDefault(
          limit?.max,
          ingredient.max
        )
      };
    });
}

function requirementSignature(
  requirement: Requirement
) {
  return JSON.stringify(requirement);
}

function createUniqueProfileName(
  desiredName: string,
  existingNames: Set<string>
) {
  const cleanName =
    desiredName.trim() ||
    "Perfil recuperado";

  if (!existingNames.has(cleanName)) {
    existingNames.add(cleanName);
    return cleanName;
  }

  let counter = 2;
  let candidate =
    `${cleanName} recuperado ${counter}`;

  while (existingNames.has(candidate)) {
    counter += 1;

    candidate =
      `${cleanName} recuperado ${counter}`;
  }

  existingNames.add(candidate);

  return candidate;
}

export default function HomePage() {
  const [classifiers, setClassifiers] =
    useState<ClassifierState>(
      createDefaultClassifiers()
    );

  const [activeTab, setActiveTab] =
    useState<TabType>("formular");

  const [ingredients, setIngredients] =
    useState<EditableIngredient[]>(
      getInitialIngredients(
        createDefaultClassifiers().keys
      )
    );

  const [
    requirementProfiles,
    setRequirementProfiles
  ] = useState<Requirement[]>([
    defaultRequirement
  ]);

  const [
    activeRequirementIndex,
    setActiveRequirementIndex
  ] = useState(0);

  const [
    savedFormulas,
    setSavedFormulas
  ] = useState<SavedFormula[]>([]);

  const [
    savedSearch,
    setSavedSearch
  ] = useState("");

  const [
    comparisonFormulaId,
    setComparisonFormulaId
  ] = useState("");

  const [
    multiplierDrafts,
    setMultiplierDrafts
  ] = useState<Record<string, string>>(
    {}
  );

  const [result, setResult] =
    useState<FormulaResult | null>(null);

  const [loading, setLoading] =
    useState(false);

  const requirement =
    requirementProfiles[
      activeRequirementIndex
    ] || defaultRequirement;

  const visibleIngredients =
    useMemo(() => {
      return prepareIngredientsForRequirement(
        ingredients,
        requirement
      );
    }, [ingredients, requirement]);

  const hiddenIngredientCount =
    ingredients.length -
    visibleIngredients.length;

  const filteredSavedFormulas =
    useMemo(() => {
      const query =
        savedSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return savedFormulas;
      }

      return savedFormulas.filter(
        (formula) => {
          return (
            formula.name
              .toLowerCase()
              .includes(query) ||
            formula.requirementName
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }, [
      savedFormulas,
      savedSearch
    ]);

  const comparisonFormula =
    useMemo(() => {
      if (!comparisonFormulaId) {
        return null;
      }

      return (
        savedFormulas.find(
          (formula) =>
            formula.id ===
            comparisonFormulaId
        ) || null
      );
    }, [
      savedFormulas,
      comparisonFormulaId
    ]);

  async function calculateFormula(
    currentIngredients:
      EditableIngredient[],
    currentRequirement: Requirement
  ) {
    setLoading(true);

    const activeIngredients =
      currentIngredients.filter(
        (ingredient) =>
          ingredient.active
      );

    try {
      const response = await fetch(
        "/api/solve",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            ingredients:
              activeIngredients,

            requirement:
              currentRequirement
          })
        }
      );

      const data =
        (await response.json()) as FormulaResult;

      setResult(data);
    } catch {
      setResult(
        createEmptyFormulaResult(
          "No se pudo conectar con el calculador."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let currentClassifiers =
      createDefaultClassifiers();

    const savedClassifiers =
      window.localStorage.getItem(
        CLASSIFIERS_STORAGE_KEY
      );

    if (savedClassifiers) {
      try {
        const parsed =
          JSON.parse(
            savedClassifiers
          ) as ClassifierState;

        if (
          Array.isArray(parsed.keys) &&
          parsed.keys.length > 0
        ) {
          currentClassifiers = {
            keys: parsed.keys,

            labels: {
              ...defaultSpeciesLabels,
              ...(parsed.labels || {})
            }
          };
        }
      } catch {}
    }

    let currentIngredients =
      getInitialIngredients(
        currentClassifiers.keys
      );

    let currentRequirements = [
      normalizeRequirement(
        defaultRequirement,
        currentClassifiers.keys[0],
        currentClassifiers.keys
      )
    ];

    let currentIndex = 0;

    const savedIngredients =
      window.localStorage.getItem(
        INGREDIENTS_STORAGE_KEY
      );

    const savedRequirements =
      window.localStorage.getItem(
        REQUIREMENTS_STORAGE_KEY
      );

    const savedIndex =
      window.localStorage.getItem(
        ACTIVE_REQUIREMENT_INDEX_KEY
      );

    const savedFormulasStorage =
      window.localStorage.getItem(
        SAVED_FORMULAS_STORAGE_KEY
      );

    if (savedIngredients) {
      try {
        const parsed =
          JSON.parse(
            savedIngredients
          ) as EditableIngredient[];

        if (
          Array.isArray(parsed) &&
          parsed.length > 0
        ) {
          currentIngredients =
            normalizeSavedIngredients(
              parsed,
              currentClassifiers.keys
            );
        }
      } catch {}
    }

    if (savedRequirements) {
      try {
        const parsed =
          JSON.parse(
            savedRequirements
          ) as Partial<Requirement>[];

        if (
          Array.isArray(parsed) &&
          parsed.length > 0
        ) {
          currentRequirements =
            parsed.map((item) =>
              normalizeRequirement(
                item,
                currentClassifiers.keys[0],
                currentClassifiers.keys
              )
            );
        }
      } catch {}
    }

    if (savedIndex !== null) {
      currentIndex =
        Number(savedIndex || 0);
    }

    if (
      !Number.isInteger(currentIndex) ||
      !currentRequirements[currentIndex]
    ) {
      currentIndex = 0;
    }

    if (savedFormulasStorage) {
      try {
        const parsed =
          JSON.parse(
            savedFormulasStorage
          ) as SavedFormula[];

        if (Array.isArray(parsed)) {
          setSavedFormulas(
            parsed.map((formula) => ({
              ...formula,

              requirementSnapshot:
                formula.requirementSnapshot
                  ? normalizeRequirement(
                      formula.requirementSnapshot,
                      currentClassifiers.keys[0],
                      currentClassifiers.keys
                    )
                  : undefined,

              costing:
                normalizeCosting(
                  formula.costing
                )
            }))
          );
        }
      } catch {}
    }

    const currentRequirement =
      currentRequirements[
        currentIndex
      ];

    const visible =
      prepareIngredientsForRequirement(
        currentIngredients,
        currentRequirement
      );

    setClassifiers(
      currentClassifiers
    );

    setIngredients(
      currentIngredients
    );

    setRequirementProfiles(
      currentRequirements
    );

    setActiveRequirementIndex(
      currentIndex
    );

    calculateFormula(
      visible,
      currentRequirement
    );
  }, []);

  function saveClassifiers(
    updated: ClassifierState
  ) {
    setClassifiers(updated);

    window.localStorage.setItem(
      CLASSIFIERS_STORAGE_KEY,
      JSON.stringify(updated)
    );
  }

  function saveRequirementBackupIfNeeded(
    updatedProfiles: Requirement[]
  ) {
    const currentRaw =
      window.localStorage.getItem(
        REQUIREMENTS_STORAGE_KEY
      );

    if (!currentRaw) {
      return;
    }

    try {
      const currentProfiles =
        JSON.parse(
          currentRaw
        ) as Requirement[];

      if (
        !Array.isArray(currentProfiles) ||
        currentProfiles.length === 0
      ) {
        return;
      }

      const currentSignature =
        JSON.stringify(
          currentProfiles
        );

      const nextSignature =
        JSON.stringify(
          updatedProfiles
        );

      if (
        currentSignature ===
        nextSignature
      ) {
        return;
      }

      let history:
        Requirement[][] = [];

      const historyRaw =
        window.localStorage.getItem(
          REQUIREMENTS_BACKUP_HISTORY_KEY
        );

      if (historyRaw) {
        try {
          const parsedHistory =
            JSON.parse(historyRaw);

          if (
            Array.isArray(
              parsedHistory
            )
          ) {
            history =
              parsedHistory.filter(
                (item) =>
                  Array.isArray(item) &&
                  item.length > 0
              );
          }
        } catch {}
      }

      const deduplicated =
        [
          currentProfiles,
          ...history
        ].filter(
          (profiles, index, array) => {
            const signature =
              JSON.stringify(profiles);

            return (
              array.findIndex(
                (candidate) =>
                  JSON.stringify(
                    candidate
                  ) === signature
              ) === index
            );
          }
        );

      window.localStorage.setItem(
        REQUIREMENTS_BACKUP_HISTORY_KEY,
        JSON.stringify(
          deduplicated.slice(
            0,
            MAX_REQUIREMENT_BACKUPS
          )
        )
      );
    } catch {}
  }

  function saveIngredientBackupIfNeeded(
    updatedIngredients: EditableIngredient[]
  ) {
    const currentRaw =
      window.localStorage.getItem(
        INGREDIENTS_STORAGE_KEY
      );

    if (!currentRaw) {
      return;
    }

    try {
      const currentIngredients =
        JSON.parse(
          currentRaw
        ) as EditableIngredient[];

      if (
        !Array.isArray(currentIngredients) ||
        currentIngredients.length === 0
      ) {
        return;
      }

      if (
        JSON.stringify(currentIngredients) ===
        JSON.stringify(updatedIngredients)
      ) {
        return;
      }

      let history: EditableIngredient[][] = [];

      const historyRaw =
        window.localStorage.getItem(
          INGREDIENTS_BACKUP_HISTORY_KEY
        );

      if (historyRaw) {
        try {
          const parsedHistory =
            JSON.parse(historyRaw);

          if (Array.isArray(parsedHistory)) {
            history = parsedHistory.filter(
              (item) =>
                Array.isArray(item) &&
                item.length > 0
            );
          }
        } catch {}
      }

      const candidates = [
        currentIngredients,
        ...history
      ];

      const seen = new Set<string>();
      const deduplicated =
        candidates.filter((item) => {
          const signature =
            JSON.stringify(item);

          if (seen.has(signature)) {
            return false;
          }

          seen.add(signature);
          return true;
        });

      window.localStorage.setItem(
        INGREDIENTS_BACKUP_HISTORY_KEY,
        JSON.stringify(
          deduplicated.slice(
            0,
            MAX_INGREDIENT_BACKUPS
          )
        )
      );
    } catch {}
  }

  function saveAll(
    updatedIngredients:
      EditableIngredient[],
    updatedProfiles:
      Requirement[],
    updatedIndex: number
  ) {
    if (updatedIngredients.length === 0) {
      window.alert(
        "Protección activada: FeedGenio no guardará una matriz vacía. Usa el centro de rescate para recuperar tus ingredientes."
      );

      return;
    }

    const safeProfiles =
      updatedProfiles.length > 0
        ? updatedProfiles
        : [
            normalizeRequirement(
              defaultRequirement,
              classifiers.keys[0],
              classifiers.keys
            )
          ];

    const safeIndex =
      safeProfiles[updatedIndex]
        ? updatedIndex
        : 0;

    const nextRequirement =
      safeProfiles[safeIndex];

    saveRequirementBackupIfNeeded(
      safeProfiles
    );

    saveIngredientBackupIfNeeded(
      updatedIngredients
    );

    setIngredients(
      updatedIngredients
    );

    setRequirementProfiles(
      safeProfiles
    );

    setActiveRequirementIndex(
      safeIndex
    );

    window.localStorage.setItem(
      INGREDIENTS_STORAGE_KEY,
      JSON.stringify(
        updatedIngredients
      )
    );

    window.localStorage.setItem(
      REQUIREMENTS_STORAGE_KEY,
      JSON.stringify(
        safeProfiles
      )
    );

    window.localStorage.setItem(
      ACTIVE_REQUIREMENT_INDEX_KEY,
      String(safeIndex)
    );

    const visible =
      prepareIngredientsForRequirement(
        updatedIngredients,
        nextRequirement
      );

    calculateFormula(
      visible,
      nextRequirement
    );
  }

  function saveSavedFormulas(
    updated: SavedFormula[]
  ) {
    setSavedFormulas(updated);

    window.localStorage.setItem(
      SAVED_FORMULAS_STORAGE_KEY,
      JSON.stringify(updated)
    );

    if (
      comparisonFormulaId &&
      !updated.some(
        (formula) =>
          formula.id ===
          comparisonFormulaId
      )
    ) {
      setComparisonFormulaId("");
    }
  }

  function addClassifier() {
    const label =
      window.prompt(
        "Nombre del nuevo clasificador:",
        "Nueva especie"
      );

    if (!label) {
      return;
    }

    const baseKey =
      sanitizeKey(
        label
      ) as SpeciesKey;

    if (!baseKey) {
      return;
    }

    let key = baseKey;
    let counter = 2;

    while (
      classifiers.keys.includes(key)
    ) {
      key =
        `${baseKey}_${counter}` as SpeciesKey;

      counter += 1;
    }

    const updatedClassifiers:
      ClassifierState = {
      keys: [
        ...classifiers.keys,
        key
      ],

      labels: {
        ...classifiers.labels,
        [key]: label
      }
    };

    const updatedIngredients =
      ingredients.map(
        (ingredient) => ({
          ...ingredient,

          species: {
            ...ingredient.species,
            [key]: true
          },

          limits: {
            ...ingredient.limits,

            [key]: {
              min: ingredient.min,
              max: ingredient.max
            }
          }
        })
      );

    saveClassifiers(
      updatedClassifiers
    );

    saveAll(
      updatedIngredients,
      requirementProfiles,
      activeRequirementIndex
    );
  }

  function renameClassifier(
    species: SpeciesKey
  ) {
    const currentLabel =
      classifiers.labels[species] ||
      species;

    const newLabel =
      window.prompt(
        "Nuevo nombre del clasificador:",
        currentLabel
      );

    if (!newLabel) {
      return;
    }

    const updated:
      ClassifierState = {
      keys: [
        ...classifiers.keys
      ],

      labels: {
        ...classifiers.labels,
        [species]: newLabel
      }
    };

    saveClassifiers(updated);
  }

  function deleteClassifier(
    species: SpeciesKey
  ) {
    if (
      classifiers.keys.length <= 1
    ) {
      window.alert(
        "Debe quedar al menos un clasificador."
      );

      return;
    }

    const confirmDelete =
      window.confirm(
        `¿Eliminar el clasificador "${
          classifiers.labels[species] ||
          species
        }"?`
      );

    if (!confirmDelete) {
      return;
    }

    const nextKeys =
      classifiers.keys.filter(
        (key) =>
          key !== species
      );

    const nextLabels = {
      ...classifiers.labels
    };

    delete nextLabels[species];

    const fallbackSpecies =
      nextKeys[0];

    const updatedIngredients =
      ingredients.map(
        (ingredient) => {
          const nextSpecies = {
            ...ingredient.species
          };

          const nextLimits = {
            ...ingredient.limits
          };

          delete nextSpecies[species];
          delete nextLimits[species];

          return {
            ...ingredient,
            species: nextSpecies,
            limits: nextLimits
          };
        }
      );

    const updatedProfiles =
      requirementProfiles.map(
        (profile) => ({
          ...profile,

          species:
            profile.species === species
              ? fallbackSpecies
              : profile.species
        })
      );

    const updatedClassifiers:
      ClassifierState = {
      keys: nextKeys,
      labels: nextLabels
    };

    saveClassifiers(
      updatedClassifiers
    );

    saveAll(
      updatedIngredients,
      updatedProfiles,
      activeRequirementIndex
    );
  }

  function moveIngredient(
    id: string,
    direction: "up" | "down"
  ) {
    const currentIndex =
      ingredients.findIndex(
        (ingredient) =>
          ingredient.id === id
      );

    if (currentIndex < 0) {
      return;
    }

    const targetIndex =
      direction === "up"
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      targetIndex < 0 ||
      targetIndex >=
        ingredients.length
    ) {
      return;
    }

    const updatedIngredients = [
      ...ingredients
    ];

    const [moved] =
      updatedIngredients.splice(
        currentIndex,
        1
      );

    updatedIngredients.splice(
      targetIndex,
      0,
      moved
    );

    saveAll(
      updatedIngredients,
      requirementProfiles,
      activeRequirementIndex
    );
  }

  function updateIngredient(
    id: string,
    field:
      | "price"
      | "min"
      | "max",
    value: number
  ) {
    const activeClassifier =
      requirement.species;

    const updatedIngredients =
      ingredients.map(
        (ingredient) => {
          if (
            ingredient.id !== id
          ) {
            return ingredient;
          }

          if (
            field === "min" ||
            field === "max"
          ) {
            const normalizedLimits =
              normalizeLimits(
                ingredient.limits,
                ingredient.min,
                ingredient.max,
                classifiers.keys
              );

            return {
              ...ingredient,

              limits: {
                ...normalizedLimits,

                [activeClassifier]: {
                  ...normalizedLimits[
                    activeClassifier
                  ],

                  [field]: value
                }
              }
            };
          }

          return {
            ...ingredient,
            [field]: value
          };
        }
      );

    saveAll(
      updatedIngredients,
      requirementProfiles,
      activeRequirementIndex
    );
  }

  function updateIngredientLimit(
    id: string,
    species: SpeciesKey,
    field: "min" | "max",
    value: number
  ) {
    const updatedIngredients =
      ingredients.map(
        (ingredient) => {
          if (
            ingredient.id !== id
          ) {
            return ingredient;
          }

          const normalizedLimits =
            normalizeLimits(
              ingredient.limits,
              ingredient.min,
              ingredient.max,
              classifiers.keys
            );

          return {
            ...ingredient,

            limits: {
              ...normalizedLimits,

              [species]: {
                ...normalizedLimits[
                  species
                ],

                [field]: value
              }
            }
          };
        }
      );

    saveAll(
      updatedIngredients,
      requirementProfiles,
      activeRequirementIndex
    );
  }

  function updateIngredientName(
    id: string,
    name: string
  ) {
    const updatedIngredients =
      ingredients.map(
        (ingredient) =>
          ingredient.id === id
            ? {
                ...ingredient,
                name
              }
            : ingredient
      );

    saveAll(
      updatedIngredients,
      requirementProfiles,
      activeRequirementIndex
    );
  }

  function updateIngredientSpecies(
    id: string,
    species: SpeciesKey,
    value: boolean
  ) {
    const updatedIngredients =
      ingredients.map(
        (ingredient) =>
          ingredient.id === id
            ? {
                ...ingredient,

                species: {
                  ...normalizeSpecies(
                    ingredient.species,
                    classifiers.keys
                  ),

                  [species]: value
                }
              }
            : ingredient
      );

    saveAll(
      updatedIngredients,
      requirementProfiles,
      activeRequirementIndex
    );
  }

  function updateNutrient(
    id: string,
    nutrient: NutrientKey,
    value: number
  ) {
    const updatedIngredients =
      ingredients.map(
        (ingredient) =>
          ingredient.id === id
            ? {
                ...ingredient,

                nutrients: {
                  ...ingredient.nutrients,
                  [nutrient]: value
                }
              }
            : ingredient
      );

    saveAll(
      updatedIngredients,
      requirementProfiles,
      activeRequirementIndex
    );
  }

  function updateRequirement(
    field: keyof Requirement,
    value: string | number
  ) {
    const updatedProfiles =
      requirementProfiles.map(
        (profile, index) =>
          index ===
          activeRequirementIndex
            ? {
                ...profile,
                [field]: value
              }
            : profile
      );

    saveAll(
      ingredients,
      updatedProfiles,
      activeRequirementIndex
    );
  }

  function selectRequirement(
    index: number
  ) {
    saveAll(
      ingredients,
      requirementProfiles,
      index
    );
  }

  function createRequirement() {
    const newRequirement =
      createEmptyRequirement(
        `Nuevo perfil ${
          requirementProfiles.length + 1
        }`,
        classifiers.keys[0]
      );

    const updatedProfiles = [
      ...requirementProfiles,
      newRequirement
    ];

    const newIndex =
      updatedProfiles.length - 1;

    saveAll(
      ingredients,
      updatedProfiles,
      newIndex
    );
  }

  function duplicateRequirement() {
    const duplicated:
      Requirement = {
      ...requirement,

      name:
        `${requirement.name} copia`
    };

    const updatedProfiles = [
      ...requirementProfiles,
      duplicated
    ];

    const newIndex =
      updatedProfiles.length - 1;

    saveAll(
      ingredients,
      updatedProfiles,
      newIndex
    );
  }

  function deleteRequirement() {
    if (
      requirementProfiles.length <= 1
    ) {
      window.alert(
        "Debe quedar al menos un perfil."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `¿Eliminar el perfil "${requirement.name}"?`
      );

    if (!confirmed) {
      return;
    }

    const updatedProfiles =
      requirementProfiles.filter(
        (_, index) =>
          index !==
          activeRequirementIndex
      );

    const newIndex =
      Math.min(
        activeRequirementIndex,
        updatedProfiles.length - 1
      );

    saveAll(
      ingredients,
      updatedProfiles,
      Math.max(0, newIndex)
    );
  }

  function recoverProfilesFromSavedFormulas() {
    if (
      savedFormulas.length === 0
    ) {
      window.alert(
        "No se encontraron fórmulas guardadas."
      );

      return;
    }

    const existingSignatures =
      new Set(
        requirementProfiles.map(
          requirementSignature
        )
      );

    const existingNames =
      new Set(
        requirementProfiles.map(
          (profile) =>
            profile.name
        )
      );

    const recoveredProfiles:
      Requirement[] = [];

    for (
      const formula of savedFormulas
    ) {
      if (
        !formula.requirementSnapshot
      ) {
        continue;
      }

      const normalized =
        normalizeRequirement(
          formula.requirementSnapshot,
          classifiers.keys[0],
          classifiers.keys
        );

      const signature =
        requirementSignature(
          normalized
        );

      if (
        existingSignatures.has(
          signature
        )
      ) {
        continue;
      }

      existingSignatures.add(
        signature
      );

      const uniqueName =
        createUniqueProfileName(
          normalized.name ||
            formula.requirementName ||
            "Perfil recuperado",
          existingNames
        );

      recoveredProfiles.push({
        ...normalized,
        name: uniqueName
      });
    }

    if (
      recoveredProfiles.length === 0
    ) {
      window.alert(
        "No se encontraron perfiles nuevos para recuperar. Los perfiles disponibles ya existen o las fórmulas antiguas no contienen una copia del requerimiento."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Se encontraron ${recoveredProfiles.length} perfiles recuperables.\n\n¿Deseas agregarlos a tus perfiles actuales?`
      );

    if (!confirmed) {
      return;
    }

    const updatedProfiles = [
      ...requirementProfiles,
      ...recoveredProfiles
    ];

    const firstRecoveredIndex =
      requirementProfiles.length;

    saveAll(
      ingredients,
      updatedProfiles,
      firstRecoveredIndex
    );

    window.alert(
      `¡Rescate completado! Se recuperaron ${recoveredProfiles.length} perfiles desde tus fórmulas guardadas.`
    );
  }

  function restoreLatestProfilesBackup() {
    const historyRaw =
      window.localStorage.getItem(
        REQUIREMENTS_BACKUP_HISTORY_KEY
      );

    if (!historyRaw) {
      window.alert(
        "Todavía no existe una copia automática de perfiles."
      );

      return;
    }

    try {
      const history =
        JSON.parse(
          historyRaw
        ) as Partial<Requirement>[][];

      if (
        !Array.isArray(history) ||
        !Array.isArray(history[0]) ||
        history[0].length === 0
      ) {
        window.alert(
          "No se encontró una copia automática válida."
        );

        return;
      }

      const restoredProfiles =
        history[0].map((profile) =>
          normalizeRequirement(
            profile,
            classifiers.keys[0],
            classifiers.keys
          )
        );

      const confirmed =
        window.confirm(
          `La última copia contiene ${restoredProfiles.length} perfiles.\n\n¿Deseas restaurarla? Tus perfiles actuales quedarán guardados como una nueva copia automática.`
        );

      if (!confirmed) {
        return;
      }

      saveAll(
        ingredients,
        restoredProfiles,
        0
      );

      window.alert(
        `Se restauraron ${restoredProfiles.length} perfiles desde la última copia automática.`
      );
    } catch {
      window.alert(
        "La copia automática está dañada o no se pudo leer."
      );
    }
  }

  function exportProfiles() {
    const exportData:
      ProfilesExportFile = {
      app: "FeedGenio",
      version: 1,
      exportedAt:
        new Date().toISOString(),
      profiles: requirementProfiles
    };

    const json =
      JSON.stringify(
        exportData,
        null,
        2
      );

    const blob =
      new Blob(
        [json],
        {
          type: "application/json"
        }
      );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    const dateText =
      new Date()
        .toISOString()
        .slice(0, 10);

    link.href = url;

    link.download =
      `feedgenio_perfiles_${dateText}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    window.alert(
      `Se exportaron ${requirementProfiles.length} perfiles. Guarda el archivo en un lugar seguro.`
    );
  }

  async function importProfiles(
    file: File
  ) {
    try {
      const text =
        await file.text();

      const parsed =
        JSON.parse(text) as
          | ProfilesExportFile
          | Partial<Requirement>[];

      const rawProfiles =
        Array.isArray(parsed)
          ? parsed
          : parsed.profiles;

      if (
        !Array.isArray(rawProfiles) ||
        rawProfiles.length === 0
      ) {
        window.alert(
          "El archivo no contiene perfiles válidos."
        );

        return;
      }

      const normalizedProfiles =
        rawProfiles.map(
          (profile) =>
            normalizeRequirement(
              profile,
              classifiers.keys[0],
              classifiers.keys
            )
        );

      const mode =
        window.prompt(
          `Se encontraron ${normalizedProfiles.length} perfiles.\n\nEscribe AGREGAR para conservar tus perfiles actuales.\n\nEscribe REEMPLAZAR para sustituirlos.`,
          "AGREGAR"
        );

      if (!mode) {
        return;
      }

      const normalizedMode =
        mode
          .trim()
          .toUpperCase();

      if (
        normalizedMode !== "AGREGAR" &&
        normalizedMode !== "REEMPLAZAR"
      ) {
        window.alert(
          "Operación cancelada. Debes escribir AGREGAR o REEMPLAZAR."
        );

        return;
      }

      if (
        normalizedMode === "REEMPLAZAR"
      ) {
        const confirmed =
          window.confirm(
            `¿Reemplazar tus perfiles actuales por los ${normalizedProfiles.length} perfiles importados?`
          );

        if (!confirmed) {
          return;
        }

        saveAll(
          ingredients,
          normalizedProfiles,
          0
        );

        window.alert(
          `Se importaron ${normalizedProfiles.length} perfiles y reemplazaron los anteriores.`
        );

        return;
      }

      const existingSignatures =
        new Set(
          requirementProfiles.map(
            requirementSignature
          )
        );

      const existingNames =
        new Set(
          requirementProfiles.map(
            (profile) =>
              profile.name
          )
        );

      const profilesToAdd:
        Requirement[] = [];

      for (
        const profile of normalizedProfiles
      ) {
        const signature =
          requirementSignature(
            profile
          );

        if (
          existingSignatures.has(
            signature
          )
        ) {
          continue;
        }

        existingSignatures.add(
          signature
        );

        profilesToAdd.push({
          ...profile,

          name:
            createUniqueProfileName(
              profile.name ||
                "Perfil importado",
              existingNames
            )
        });
      }

      if (
        profilesToAdd.length === 0
      ) {
        window.alert(
          "Todos los perfiles del archivo ya existen."
        );

        return;
      }

      const updatedProfiles = [
        ...requirementProfiles,
        ...profilesToAdd
      ];

      saveAll(
        ingredients,
        updatedProfiles,
        requirementProfiles.length
      );

      window.alert(
        `Se agregaron ${profilesToAdd.length} perfiles.`
      );
    } catch {
      window.alert(
        "No se pudo leer el archivo. Verifica que sea un respaldo JSON de FeedGenio."
      );
    }
  }

  function ingredientRecoveryKey(
    ingredient: EditableIngredient
  ) {
    const id = String(
      ingredient.id || ""
    ).trim();

    if (id) {
      return `id:${id}`;
    }

    return `name:${ingredient.name
      .trim()
      .toLowerCase()}`;
  }

  function recoverIngredientsFromSavedFormulas() {
    const formulasWithSnapshot =
      savedFormulas.filter(
        (formula) =>
          Array.isArray(
            formula.ingredientsSnapshot
          ) &&
          formula.ingredientsSnapshot.length > 0
      );

    if (formulasWithSnapshot.length === 0) {
      window.alert(
        "No se encontraron copias de ingredientes dentro de las fórmulas guardadas."
      );

      return;
    }

    const recoveredMap =
      new Map<string, EditableIngredient>();

    for (const ingredient of ingredients) {
      const normalized =
        normalizeSavedIngredients(
          [ingredient],
          classifiers.keys
        )[0];

      recoveredMap.set(
        ingredientRecoveryKey(normalized),
        normalized
      );
    }

    const oldestToNewest =
      [...formulasWithSnapshot].reverse();

    for (const formula of oldestToNewest) {
      const normalizedSnapshot =
        normalizeSavedIngredients(
          formula.ingredientsSnapshot || [],
          classifiers.keys
        );

      for (const ingredient of normalizedSnapshot) {
        recoveredMap.set(
          ingredientRecoveryKey(ingredient),
          ingredient
        );
      }
    }

    const recoveredIngredients =
      Array.from(recoveredMap.values());

    if (recoveredIngredients.length === 0) {
      window.alert(
        "No se pudo reconstruir una matriz válida."
      );

      return;
    }

    const confirmed = window.confirm(
      `Se reconstruirá una matriz con ${recoveredIngredients.length} ingredientes usando ${formulasWithSnapshot.length} fórmulas guardadas.\n\nLa matriz actual quedará guardada automáticamente como respaldo. ¿Continuar?`
    );

    if (!confirmed) {
      return;
    }

    saveAll(
      recoveredIngredients,
      requirementProfiles,
      activeRequirementIndex
    );

    window.alert(
      `¡Rescate completado! Se recuperaron ${recoveredIngredients.length} ingredientes.`
    );
  }

  function restoreLatestIngredientsBackup() {
    const historyRaw =
      window.localStorage.getItem(
        INGREDIENTS_BACKUP_HISTORY_KEY
      );

    if (!historyRaw) {
      window.alert(
        "Todavía no existe una copia automática de ingredientes."
      );

      return;
    }

    try {
      const history =
        JSON.parse(
          historyRaw
        ) as Partial<EditableIngredient>[][];

      if (
        !Array.isArray(history) ||
        !Array.isArray(history[0]) ||
        history[0].length === 0
      ) {
        window.alert(
          "No se encontró una copia automática válida de ingredientes."
        );

        return;
      }

      const restoredIngredients =
        normalizeSavedIngredients(
          history[0],
          classifiers.keys
        );

      const confirmed = window.confirm(
        `La última copia contiene ${restoredIngredients.length} ingredientes.\n\n¿Deseas restaurarla? La matriz actual quedará guardada como una nueva copia automática.`
      );

      if (!confirmed) {
        return;
      }

      saveAll(
        restoredIngredients,
        requirementProfiles,
        activeRequirementIndex
      );

      window.alert(
        `Se restauraron ${restoredIngredients.length} ingredientes desde la última copia automática.`
      );
    } catch {
      window.alert(
        "La copia automática de ingredientes está dañada o no se pudo leer."
      );
    }
  }

  function toggleIngredient(
    id: string
  ) {
    const updatedIngredients =
      ingredients.map(
        (ingredient) =>
          ingredient.id === id
            ? {
                ...ingredient,
                active:
                  !ingredient.active
              }
            : ingredient
      );

    saveAll(
      updatedIngredients,
      requirementProfiles,
      activeRequirementIndex
    );
  }

  function addIngredient() {
    const newIngredient:
      EditableIngredient = {
      ...createEmptyIngredient(
        classifiers.keys
      ),

      active: true
    };

    saveAll(
      [
        ...ingredients,
        newIngredient
      ],
      requirementProfiles,
      activeRequirementIndex
    );

    setActiveTab("matrix");
  }

  function deleteIngredient(
    id: string
  ) {
    const updatedIngredients =
      ingredients.filter(
        (ingredient) =>
          ingredient.id !== id
      );

    saveAll(
      updatedIngredients,
      requirementProfiles,
      activeRequirementIndex
    );
  }

  function resetIngredients() {
    const confirmReset =
      window.confirm(
        "Esto reiniciará la matriz de ingredientes. Si tienes ingredientes nuevos escritos a mano, se perderán. ¿Seguro?"
      );

    if (!confirmReset) {
      return;
    }

    const freshIngredients =
      getInitialIngredients(
        classifiers.keys
      );

    saveAll(
      freshIngredients,
      requirementProfiles,
      activeRequirementIndex
    );
  }

  function saveCurrentFormula(
    costing?: SavedCosting
  ) {
    if (!result?.feasible) {
      window.alert(
        "No hay fórmula válida para guardar."
      );

      return;
    }

    const formulaName =
      window.prompt(
        "Nombre de la fórmula:",
        `${requirement.name} ${new Date().toLocaleDateString()}`
      );

    if (!formulaName) {
      return;
    }

    const newFormula:
      SavedFormula = {
      id: Date.now().toString(),

      name: formulaName,

      createdAt:
        new Date().toISOString(),

      multiplier: 1,

      requirementName:
        requirement.name,

      result,

      ingredientsSnapshot:
        ingredients,

      requirementSnapshot:
        requirement,

      costing:
        normalizeCosting(costing)
    };

    saveSavedFormulas([
      newFormula,
      ...savedFormulas
    ]);

    window.alert(
      "Fórmula guardada."
    );

    setActiveTab("saved");
  }

  function deleteSavedFormula(
    id: string
  ) {
    saveSavedFormulas(
      savedFormulas.filter(
        (item) =>
          item.id !== id
      )
    );

    setMultiplierDrafts(
      (current) => {
        const copy = {
          ...current
        };

        delete copy[id];

        return copy;
      }
    );
  }

  function renameSavedFormula(
    formula: SavedFormula
  ) {
    const newName =
      window.prompt(
        "Nuevo nombre:",
        formula.name
      );

    if (!newName) {
      return;
    }

    saveSavedFormulas(
      savedFormulas.map(
        (item) =>
          item.id === formula.id
            ? {
                ...item,
                name: newName
              }
            : item
      )
    );
  }

  function duplicateSavedFormula(
    formula: SavedFormula
  ) {
    const copy:
      SavedFormula = {
      ...formula,

      id:
        Date.now().toString(),

      name:
        `${formula.name} copia`,

      createdAt:
        new Date().toISOString()
    };

    saveSavedFormulas([
      copy,
      ...savedFormulas
    ]);
  }

  function viewSavedFormula(
    formula: SavedFormula
  ) {
    setResult(
      formula.result
    );

    window.alert(
      "Fórmula abierta en resultados. No se modificó la matriz ni los requerimientos."
    );

    setActiveTab("results");
  }

  function compareWithSavedFormula(
    formula: SavedFormula
  ) {
    setComparisonFormulaId(
      formula.id
    );

    setActiveTab("results");
  }

  function getMultiplierText(
    formula: SavedFormula
  ) {
    return (
      multiplierDrafts[
        formula.id
      ] ??
      String(formula.multiplier)
    );
  }

  function getMultiplierNumber(
    formula: SavedFormula
  ) {
    const text =
      getMultiplierText(formula)
        .replace(",", ".");

    const value = Number(text);

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return 0;
    }

    return value;
  }

  function updateFormulaMultiplierText(
    id: string,
    value: string
  ) {
    const cleanValue =
      value.replace(",", ".");

    setMultiplierDrafts(
      (current) => ({
        ...current,
        [id]: cleanValue
      })
    );

    if (cleanValue === "") {
      return;
    }

    const numericValue =
      Number(cleanValue);

    if (
      !Number.isFinite(
        numericValue
      ) ||
      numericValue <= 0
    ) {
      return;
    }

    saveSavedFormulas(
      savedFormulas.map(
        (item) =>
          item.id === id
            ? {
                ...item,

                multiplier:
                  numericValue
              }
            : item
      )
    );
  }

  function finishMultiplierEdit(
    formula: SavedFormula
  ) {
    const numericValue =
      getMultiplierNumber(
        formula
      );

    const finalValue =
      numericValue > 0
        ? numericValue
        : 1;

    saveSavedFormulas(
      savedFormulas.map(
        (item) =>
          item.id === formula.id
            ? {
                ...item,

                multiplier:
                  finalValue
              }
            : item
      )
    );

    setMultiplierDrafts(
      (current) => ({
        ...current,

        [formula.id]:
          String(finalValue)
      })
    );
  }

  function getSavedFormulaRequirement(
    formula: SavedFormula
  ) {
    if (
      formula.requirementSnapshot
    ) {
      return normalizeRequirement(
        formula.requirementSnapshot,
        classifiers.keys[0],
        classifiers.keys
      );
    }

    const foundRequirement =
      requirementProfiles.find(
        (profile) =>
          profile.name ===
          formula.requirementName
      );

    if (foundRequirement) {
      return normalizeRequirement(
        foundRequirement,
        classifiers.keys[0],
        classifiers.keys
      );
    }

    return normalizeRequirement(
      {
        ...defaultRequirement,

        name:
          formula.requirementName
      },

      classifiers.keys[0],
      classifiers.keys
    );
  }

  function buildSavedFormulaText(
    formula: SavedFormula
  ) {
    const multiplier =
      getMultiplierNumber(
        formula
      );

    const costingData =
      calculateSavedCosting(
        formula,
        multiplier
      );

    const savedRequirement =
      getSavedFormulaRequirement(
        formula
      );

    const lines = [
      `FeedGenio - ${formula.name}`,
      `Perfil: ${formula.requirementName}`,
      `Total mezcla: ${formatKg(costingData.totalKg)} kg`,
      `Costo fórmula: S/ ${formatMoney(costingData.totalFormulaCost)}`,
      `Costo real aprox: S/ ${formatMoney(costingData.totalRealCost)}`,
      `Costo por kg: S/ ${formatMoney(formula.result.costPerKg)}`,
      `Costo real por kg: S/ ${formatMoney(costingData.costWithProductionPerKg)}`,
      `Costo real saco 50 kg: S/ ${formatMoney(costingData.realCostPer50Kg)}`,
      `Venta sugerida saco 50 kg: S/ ${formatMoney(costingData.salePer50Kg)}`,
      "",
      "Ingredientes:"
    ];

    formula.result.ingredients.forEach(
      (item) => {
        lines.push(
          `${item.name}: ${formatKg(item.amountKg100 * multiplier)} kg`
        );
      }
    );

    lines.push("");
    lines.push(
      "Nutrientes obtenidos VS requerimiento:"
    );

    nutrientKeys.forEach(
      (key) => {
        const obtained =
          Number(
            formula.result
              .nutrients[key] || 0
          );

        const min =
          Number(
            savedRequirement[key] || 0
          );

        const max =
          getRequirementMaxValue(
            savedRequirement,
            key
          );

        const maxText =
          typeof max === "number"
            ? ` | máx ${formatNutrient(max)}${nutrientSuffix(key)}`
            : "";

        lines.push(
          `${nutrientLabels[key]}: obtenido ${formatNutrient(obtained)}${nutrientSuffix(
            key
          )} | mín ${formatNutrient(min)}${nutrientSuffix(key)}${maxText}`
        );
      }
    );

    return lines.join("\n");
  }

  async function copySavedFormula(
    formula: SavedFormula
  ) {
    try {
      await navigator.clipboard.writeText(
        buildSavedFormulaText(
          formula
        )
      );

      window.alert(
        "Fórmula copiada."
      );
    } catch {
      window.alert(
        "No se pudo copiar la fórmula."
      );
    }
  }

  return (
    <main className="page">
      <div
        className="container"
        style={{
          overflowX: "hidden"
        }}
      >
        <section className="hero">
          <h1>FeedGenio 🧠🌽</h1>

          <p>
            Sistema profesional de
            formulación de raciones por
            mínimo costo.
          </p>
        </section>

        <section className="tabs">
          <button
            className={`tab-button ${
              activeTab === "formular"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveTab("formular")
            }
          >
            📦 Formular
          </button>

          <button
            className={`tab-button ${
              activeTab === "matrix"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveTab("matrix")
            }
          >
            🧪 Matriz
          </button>

          <button
            className={`tab-button ${
              activeTab ===
              "requirements"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveTab(
                "requirements"
              )
            }
          >
            🎯 Requerimientos
          </button>

          <button
            className={`tab-button ${
              activeTab === "results"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveTab("results")
            }
          >
            📊 Resultados
          </button>

          <button
            className={`tab-button ${
              activeTab === "saved"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveTab("saved")
            }
          >
            💾 Guardadas
          </button>
        </section>

        {activeTab ===
          "formular" && (
          <FormulaTab
            ingredients={
              visibleIngredients
            }
            hiddenIngredientCount={
              hiddenIngredientCount
            }
            loading={loading}
            requirementProfiles={
              requirementProfiles
            }
            activeRequirementIndex={
              activeRequirementIndex
            }
            activeSpecies={
              requirement.species
            }
            onSelectRequirement={
              selectRequirement
            }
            onToggle={
              toggleIngredient
            }
            onUpdate={
              updateIngredient
            }
            onCalculate={() =>
              calculateFormula(
                visibleIngredients,
                requirement
              )
            }
            onGoToResults={() =>
              setActiveTab("results")
            }
            onReset={
              resetIngredients
            }
            onAddIngredient={
              addIngredient
            }
          />
        )}

        {activeTab ===
          "matrix" && (
          <>
          <MatrixTab
            ingredients={ingredients}
            nutrientKeys={
              nutrientKeys
            }
            classifierKeys={
              classifiers.keys
            }
            classifierLabels={
              classifiers.labels
            }
            onAddIngredient={
              addIngredient
            }
            onDeleteIngredient={
              deleteIngredient
            }
            onMoveIngredient={
              moveIngredient
            }
            onUpdateName={
              updateIngredientName
            }
            onUpdateSpecies={
              updateIngredientSpecies
            }
            onUpdateLimit={
              updateIngredientLimit
            }
            onUpdateNutrient={
              updateNutrient
            }
            onAddClassifier={
              addClassifier
            }
            onRenameClassifier={
              renameClassifier
            }
            onDeleteClassifier={
              deleteClassifier
            }
          />

          <section
            className="card"
            style={{
              marginTop: 16,
              maxWidth: "100%"
            }}
          >
            <h2>🛟 Rescate de ingredientes</h2>

            <p className="note">
              Recupera la matriz desde las copias guardadas dentro de tus fórmulas o restaura la última copia automática. FeedGenio también bloqueará cualquier intento de guardar una matriz vacía.
            </p>

            <button
              className="action"
              type="button"
              onClick={
                recoverIngredientsFromSavedFormulas
              }
            >
              🧬 Recuperar desde fórmulas guardadas
            </button>

            <button
              className="action secondary"
              type="button"
              onClick={
                restoreLatestIngredientsBackup
              }
            >
              ↩️ Restaurar última copia automática
            </button>
          </section>
          </>
        )}

        {activeTab ===
          "requirements" && (
          <RequirementsTab
            requirement={requirement}
            requirementProfiles={
              requirementProfiles
            }
            activeRequirementIndex={
              activeRequirementIndex
            }
            classifierKeys={
              classifiers.keys
            }
            classifierLabels={
              classifiers.labels
            }
            onSelectRequirement={
              selectRequirement
            }
            onUpdateRequirement={
              updateRequirement
            }
            onCreateRequirement={
              createRequirement
            }
            onDuplicateRequirement={
              duplicateRequirement
            }
            onDeleteRequirement={
              deleteRequirement
            }
            onRecoverProfiles={
              recoverProfilesFromSavedFormulas
            }
            onRestoreProfilesBackup={
              restoreLatestProfilesBackup
            }
            onExportProfiles={
              exportProfiles
            }
            onImportProfiles={
              importProfiles
            }
          />
        )}

        {activeTab ===
          "results" && (
          <ResultsTab
            result={result}
            requirement={requirement}
            onSaveFormula={
              saveCurrentFormula
            }
            savedFormulas={
              savedFormulas
            }
            comparisonFormulaId={
              comparisonFormulaId
            }
            comparisonFormula={
              comparisonFormula
            }
            onSelectComparisonFormula={
              setComparisonFormulaId
            }
          />
        )}

        {activeTab === "saved" && (
          <section
            className="card"
            style={{
              maxWidth: "100%"
            }}
          >
            <h2>
              💾 Fórmulas guardadas
            </h2>

            <input
              className="price-input"
              type="text"
              placeholder="Buscar fórmula..."
              value={savedSearch}
              onChange={(event) =>
                setSavedSearch(
                  event.target.value
                )
              }
              style={{
                width: "100%",
                marginBottom: 14
              }}
            />

            {filteredSavedFormulas.length ===
            0 ? (
              <div className="note">
                No hay fórmulas guardadas
                para mostrar.
              </div>
            ) : (
              filteredSavedFormulas.map(
                (formula) => {
                  const multiplier =
                    getMultiplierNumber(
                      formula
                    );

                  const costingData =
                    calculateSavedCosting(
                      formula,
                      multiplier
                    );

                  const savedRequirement =
                    getSavedFormulaRequirement(
                      formula
                    );

                  return (
                    <details
                      key={formula.id}
                      className="card"
                      style={{
                        marginTop: 16,
                        border:
                          "1px solid #ddd",
                        padding: 14,
                        maxWidth: "100%",
                        overflowX:
                          "hidden"
                      }}
                    >
                      <summary
                        style={{
                          cursor:
                            "pointer",
                          fontWeight: 800,
                          wordBreak:
                            "break-word"
                        }}
                      >
                        {formula.name}
                      </summary>

                      <div
                        className="note"
                        style={{
                          marginTop: 12,
                          wordBreak:
                            "break-word"
                        }}
                      >
                        Perfil:{" "}
                        {
                          formula.requirementName
                        }
                        <br />
                        Guardada:{" "}
                        {new Date(
                          formula.createdAt
                        ).toLocaleDateString()}
                      </div>

                      <label
                        style={{
                          display:
                            "block",
                          marginTop: 12,
                          fontWeight: 700
                        }}
                      >
                        Multiplicador
                      </label>

                      <input
                        className="price-input"
                        type="text"
                        inputMode="decimal"
                        value={getMultiplierText(
                          formula
                        )}
                        onChange={(
                          event
                        ) =>
                          updateFormulaMultiplierText(
                            formula.id,
                            event.target
                              .value
                          )
                        }
                        onBlur={() =>
                          finishMultiplierEdit(
                            formula
                          )
                        }
                        onFocus={(
                          event
                        ) =>
                          event.currentTarget.select()
                        }
                        style={{
                          width: 110,
                          marginTop: 8
                        }}
                      />

                      <div
                        className="note"
                        style={{
                          marginTop: 10
                        }}
                      >
                        Total mezcla:{" "}
                        <strong>
                          {formatKg(
                            costingData.totalKg
                          )}{" "}
                          kg
                        </strong>
                        <br />

                        Costo fórmula:{" "}
                        <strong>
                          S/{" "}
                          {formatMoney(
                            costingData.totalFormulaCost
                          )}
                        </strong>
                        <br />

                        Costo real aprox:{" "}
                        <strong>
                          S/{" "}
                          {formatMoney(
                            costingData.totalRealCost
                          )}
                        </strong>
                        <br />

                        Costo real kg:{" "}
                        <strong>
                          S/{" "}
                          {formatMoney(
                            costingData.costWithProductionPerKg
                          )}
                        </strong>
                        <br />

                        Costo real saco 50
                        kg:{" "}
                        <strong>
                          S/{" "}
                          {formatMoney(
                            costingData.realCostPer50Kg
                          )}
                        </strong>
                        <br />

                        Venta sugerida
                        saco:{" "}
                        <strong>
                          S/{" "}
                          {formatMoney(
                            costingData.salePer50Kg
                          )}
                        </strong>
                      </div>

                      <h3
                        style={{
                          marginTop: 16
                        }}
                      >
                        🌽 Ingredientes
                      </h3>

                      <div
                        style={{
                          marginTop: 10,
                          display: "grid",
                          gap: 8
                        }}
                      >
                        {formula.result.ingredients.map(
                          (item) => (
                            <div
                              key={
                                item.id
                              }
                              style={{
                                display:
                                  "grid",
                                gridTemplateColumns:
                                  "1fr auto",
                                gap: 10,
                                alignItems:
                                  "center",
                                padding:
                                  "10px 0",
                                borderBottom:
                                  "1px solid #e5ece7"
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 600,
                                  minWidth: 0,
                                  wordBreak:
                                    "break-word"
                                }}
                              >
                                {
                                  item.name
                                }
                              </div>

                              <div
                                style={{
                                  fontWeight: 700,
                                  whiteSpace:
                                    "nowrap",
                                  textAlign:
                                    "right"
                                }}
                              >
                                {formatKg(
                                  item.amountKg100 *
                                    multiplier
                                )}{" "}
                                kg
                              </div>
                            </div>
                          )
                        )}
                      </div>

                      <h3
                        style={{
                          marginTop: 16
                        }}
                      >
                        🧪 Nutrientes
                        obtenidos VS
                        requerimiento
                      </h3>

                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>
                                Nutriente
                              </th>
                              <th>Mín</th>
                              <th>
                                Obtenido
                              </th>
                              <th>Máx</th>
                              <th>
                                Estado
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {nutrientKeys.map(
                              (key) => {
                                const obtained =
                                  Number(
                                    formula
                                      .result
                                      .nutrients[
                                      key
                                    ] || 0
                                  );

                                const min =
                                  Number(
                                    savedRequirement[
                                      key
                                    ] || 0
                                  );

                                const max =
                                  getRequirementMaxValue(
                                    savedRequirement,
                                    key
                                  );

                                const suffix =
                                  nutrientSuffix(
                                    key
                                  );

                                const status =
                                  getNutrientStatus(
                                    obtained,
                                    min,
                                    max
                                  );

                                return (
                                  <tr
                                    key={
                                      key
                                    }
                                  >
                                    <td>
                                      {
                                        nutrientLabels[
                                          key
                                        ]
                                      }
                                    </td>

                                    <td>
                                      {formatNutrient(
                                        min
                                      )}
                                      {
                                        suffix
                                      }
                                    </td>

                                    <td>
                                      <strong>
                                        {formatNutrient(
                                          obtained
                                        )}
                                        {
                                          suffix
                                        }
                                      </strong>
                                    </td>

                                    <td>
                                      {typeof max ===
                                      "number"
                                        ? `${formatNutrient(
                                            max
                                          )}${suffix}`
                                        : "Sin máx"}
                                    </td>

                                    <td>
                                      <strong>
                                        {
                                          status
                                        }
                                      </strong>
                                    </td>
                                  </tr>
                                );
                              }
                            )}
                          </tbody>
                        </table>
                      </div>

                      <button
                        className="action"
                        type="button"
                        onClick={() =>
                          copySavedFormula(
                            formula
                          )
                        }
                      >
                        📋 Copiar fórmula
                        multiplicada
                      </button>

                      <button
                        className="action secondary"
                        type="button"
                        onClick={() =>
                          viewSavedFormula(
                            formula
                          )
                        }
                      >
                        👁️ Ver fórmula
                        guardada
                      </button>

                      <button
                        className="action secondary"
                        type="button"
                        onClick={() =>
                          compareWithSavedFormula(
                            formula
                          )
                        }
                      >
                        ⚖️ Comparar con
                        resultado actual
                      </button>

                      <button
                        className="action secondary"
                        type="button"
                        onClick={() =>
                          renameSavedFormula(
                            formula
                          )
                        }
                      >
                        ✏️ Cambiar nombre
                      </button>

                      <button
                        className="action secondary"
                        type="button"
                        onClick={() =>
                          duplicateSavedFormula(
                            formula
                          )
                        }
                      >
                        📄 Duplicar fórmula
                      </button>

                      <button
                        className="action secondary"
                        type="button"
                        onClick={() =>
                          deleteSavedFormula(
                            formula.id
                          )
                        }
                      >
                        Eliminar fórmula
                      </button>
                    </details>
                  );
                }
              )
            )}
          </section>
        )}
      </div>
    </main>
  );
}
