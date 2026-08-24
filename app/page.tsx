"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  createAllLimits,
  createAllSpecies,
  createEmptyIngredient,
  createEmptyNutrients,
  defaultIngredients,
  nutrientKeys,
  nutrientLabels,
  speciesKeys,
  speciesLabels,
  type Ingredient,
  type IngredientLimit,
  type NutrientKey,
  type SpeciesKey
} from "@/lib/ingredients";

import {
  attachLegacyRequirementFields,
  baseRequirementProfiles,
  createBaseRequirement,
  defaultRequirement,
  normalizeRequirement as normalizeRequirementData,
  updateRequirementNutrient,
  type Requirement
} from "@/lib/requirements";

import type { FormulaResult } from "@/lib/solver";

import FormulaTab from "@/components/FormulaTab";
import MatrixTab from "@/components/MatrixTab";
import RequirementsTab from "@/components/RequirementsTab";
import ResultsTab, { type ProductiveCosting } from "@/components/ResultsTab";

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
  productiveCostingSnapshot?: ProductiveCosting;
  detailVersion?: 2;
};

type SavedFormulaGroupKey =
  | "pollos"
  | "pavos"
  | "cerdos"
  | "gallinas"
  | "codornices"
  | "cuyes"
  | "otros";

type SavedFormulaGroup = {
  key: SavedFormulaGroupKey;
  label: string;
  icon: string;
  formulas: SavedFormula[];
};

type TabType = "formular" | "matrix" | "requirements" | "results" | "saved";

const INGREDIENTS_STORAGE_KEY = "feedgenio_ingredients_v1";
const REQUIREMENTS_STORAGE_KEY = "feedgenio_requirements_v2";
const ACTIVE_REQUIREMENT_INDEX_KEY = "feedgenio_active_requirement_index_v2";
const SAVED_FORMULAS_STORAGE_KEY = "feedgenio_saved_formulas_v1";
const REQUIREMENTS_BACKUP_STORAGE_KEY = "feedgenio_requirements_backup_v2";

function numberOrDefault(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function createEmptyRequirement(name: string): Requirement {
  let requirement = createBaseRequirement(name, defaultRequirement.species);
  for (const key of nutrientKeys) {
    requirement = updateRequirementNutrient(requirement, key, {
      min: 0,
      max: undefined,
      enabled: false
    });
  }
  return requirement;
}

function getInitialIngredients(): EditableIngredient[] {
  return defaultIngredients.map((ingredient) => ({
    ...ingredient,
    species: ingredient.species || createAllSpecies(true),
    limits: ingredient.limits || createAllLimits(ingredient.min, ingredient.max),
    active: true
  }));
}

function normalizeNutrients(
  nutrients: Partial<Record<NutrientKey, number>> | undefined
): Record<NutrientKey, number> {
  const normalized = createEmptyNutrients();

  for (const key of nutrientKeys) {
    normalized[key] = Number(nutrients?.[key] || 0);
  }

  return normalized;
}

function normalizeSpecies(
  species: Partial<Record<SpeciesKey, boolean>> | undefined
): Record<SpeciesKey, boolean> {
  const normalized = createAllSpecies(true);

  for (const key of speciesKeys) {
    normalized[key] =
      typeof species?.[key] === "boolean" ? Boolean(species[key]) : true;
  }

  return normalized;
}

function normalizeLimits(
  limits: Partial<Record<SpeciesKey, Partial<IngredientLimit>>> | undefined,
  fallbackMin: number,
  fallbackMax: number
): Record<SpeciesKey, IngredientLimit> {
  return {
    layer: {
      min: numberOrDefault(limits?.layer?.min, fallbackMin),
      max: numberOrDefault(limits?.layer?.max, fallbackMax)
    },
    broiler: {
      min: numberOrDefault(limits?.broiler?.min, fallbackMin),
      max: numberOrDefault(limits?.broiler?.max, fallbackMax)
    },
    pig: {
      min: numberOrDefault(limits?.pig?.min, fallbackMin),
      max: numberOrDefault(limits?.pig?.max, fallbackMax)
    },
    guineaPig: {
      min: numberOrDefault(limits?.guineaPig?.min, fallbackMin),
      max: numberOrDefault(limits?.guineaPig?.max, fallbackMax)
    }
  };
}

function normalizeSavedIngredients(
  items: Array<Partial<EditableIngredient>>
): EditableIngredient[] {
  return items.map((item) => {
    const min = numberOrDefault(item.min, 0);
    const max = numberOrDefault(item.max, 100);

    return {
      id: String(item.id || `ingrediente_${Date.now()}`),
      name: String(item.name || "Nuevo ingrediente"),
      price: numberOrDefault(item.price, 0),
      min,
      max,
      active: typeof item.active === "boolean" ? item.active : true,
      species: normalizeSpecies(item.species),
      limits: normalizeLimits(item.limits, min, max),
      nutrients: normalizeNutrients(item.nutrients)
    };
  });
}

function cloneRequirementProfile(profile: Requirement): Requirement {
  return normalizeRequirementData(
    JSON.parse(JSON.stringify(profile)) as Partial<Requirement>
  );
}

/**
 * Repara perfiles guardados durante la migración defectuosa.
 *
 * Algunas copias quedaron con `nutrients` repetido desde el perfil por defecto,
 * mientras los campos antiguos (`energy`, `protein`, `energyMax`, etc.) todavía
 * conservaban los valores reales de cada perfil. Cuando hay contradicción,
 * se eliminan solamente los nutrientes anidados dañados y se reconstruyen desde
 * esos campos antiguos. Los perfiles modernos coherentes se conservan intactos.
 */
function normalizeStoredRequirement(item: Partial<Requirement>): Requirement {
  const source = item as Partial<Requirement> & Record<string, unknown>;
  const nested =
    source.nutrients && typeof source.nutrients === "object"
      ? source.nutrients
      : undefined;

  let hasLegacyNestedConflict = false;

  if (nested) {
    for (const key of nutrientKeys) {
      const legacyMinimum = source[key];
      const legacyMaximum = source[`${key}Max`];
      const nestedRange = nested[key];

      if (
        typeof legacyMinimum === "number" &&
        Number(nestedRange?.min) !== Number(legacyMinimum)
      ) {
        hasLegacyNestedConflict = true;
        break;
      }

      const normalizedNestedMaximum =
        typeof nestedRange?.max === "number" && nestedRange.max > 0
          ? nestedRange.max
          : undefined;
      const normalizedLegacyMaximum =
        typeof legacyMaximum === "number" && legacyMaximum > 0
          ? legacyMaximum
          : undefined;

      if (normalizedNestedMaximum !== normalizedLegacyMaximum) {
        hasLegacyNestedConflict = true;
        break;
      }
    }
  }

  if (hasLegacyNestedConflict) {
    const repairedSource = { ...source };
    delete repairedSource.nutrients;
    return normalizeRequirementData(repairedSource);
  }

  return normalizeRequirementData(source);
}

function createInitialRequirementProfiles(): Requirement[] {
  return baseRequirementProfiles.map(cloneRequirementProfile);
}

function normalizeCosting(costing: Partial<SavedCosting> | undefined): SavedCosting {
  return {
    productionCostPerKg: numberOrDefault(costing?.productionCostPerKg, 0),
    bagCostPer50Kg: numberOrDefault(costing?.bagCostPer50Kg, 0),
    marginPercent: numberOrDefault(costing?.marginPercent, 0)
  };
}

function createEmptyFormulaResult(message: string): FormulaResult {
  return {
    feasible: false,
    costPerKg: 0,
    costPer100Kg: 0,
    costPer50Kg: 0,
    ingredients: [],
    nutrients: createEmptyNutrients(),
    derivedMetrics: {} as FormulaResult["derivedMetrics"],
    message
  };
}

function formatKg(value: number) {
  return Number(value).toFixed(3);
}

function formatMoney(value: number, decimals = 2) {
  return Number(value).toFixed(decimals);
}

function calculateSavedCosting(formula: SavedFormula, multiplier: number) {
  const costing = normalizeCosting(formula.costing);

  const costWithProductionPerKg =
    formula.result.costPerKg + costing.productionCostPerKg;

  const realCostPer50Kg =
    costWithProductionPerKg * 50 + costing.bagCostPer50Kg;

  const realCostPer100Kg =
    costWithProductionPerKg * 100 + costing.bagCostPer50Kg * 2;

  const salePer50Kg = realCostPer50Kg * (1 + costing.marginPercent / 100);

  const totalKg = 100 * multiplier;
  const totalFormulaCost = formula.result.costPer100Kg * multiplier;
  const totalRealCost = realCostPer100Kg * multiplier;

  return {
    costWithProductionPerKg,
    realCostPer50Kg,
    salePer50Kg,
    totalKg,
    totalFormulaCost,
    totalRealCost
  };
}

function calculateSavedProductiveCosting(formula: SavedFormula) {
  const snapshot = formula.productiveCostingSnapshot;

  if (!snapshot) return null;

  const humanCostPer50Kg = numberOrDefault(snapshot.humanCostPer50Kg, 0);
  const machineCostPer50Kg = numberOrDefault(snapshot.machineCostPer50Kg, 0);
  const bagCostPer50Kg = numberOrDefault(snapshot.bagCostPer50Kg, 0);
  const profitPer50Kg = numberOrDefault(snapshot.profitPer50Kg, 0);

  const extrasPer50Kg =
    humanCostPer50Kg + machineCostPer50Kg + bagCostPer50Kg;

  const realCostPer50Kg = formula.result.costPer50Kg + extrasPer50Kg;
  const realCostPerKg = realCostPer50Kg / 50;
  const realCostPer100Kg = formula.result.costPer100Kg + extrasPer50Kg * 2;
  const realCostPerTon = formula.result.costPerKg * 1000 + extrasPer50Kg * 20;
  const salePer50Kg = realCostPer50Kg + profitPer50Kg;
  const salePerKg = salePer50Kg / 50;

  return {
    humanCostPer50Kg,
    machineCostPer50Kg,
    bagCostPer50Kg,
    profitPer50Kg,
    realCostPer50Kg,
    realCostPerKg,
    realCostPer100Kg,
    realCostPerTon,
    salePer50Kg,
    salePerKg
  };
}

function getSpeciesFromRequirement(requirementName: string): SpeciesKey | null {
  const name = requirementName.toLowerCase();

  if (
    name.includes("ponedora") ||
    name.includes("postura") ||
    name.includes("gallina") ||
    name.includes("hyline") ||
    name.includes("hy-line") ||
    name.includes("dekalb")
  ) {
    return "layer";
  }

  if (
    name.includes("cobb") ||
    name.includes("pollo") ||
    name.includes("broiler")
  ) {
    return "broiler";
  }

  if (name.includes("cerdo") || name.includes("porcino")) {
    return "pig";
  }

  if (name.includes("cuy")) {
    return "guineaPig";
  }

  return null;
}

function prepareIngredientsForRequirement(
  items: EditableIngredient[],
  requirementName: string
): EditableIngredient[] {
  const species = getSpeciesFromRequirement(requirementName);

  if (!species) return items;

  return items
    .filter((ingredient) => Boolean(ingredient.species?.[species]))
    .map((ingredient) => {
      const limit = ingredient.limits?.[species];

      return {
        ...ingredient,
        min: numberOrDefault(limit?.min, ingredient.min),
        max: numberOrDefault(limit?.max, ingredient.max)
      };
    });
}

const SAVED_FORMULA_GROUPS: Array<{
  key: SavedFormulaGroupKey;
  label: string;
  icon: string;
}> = [
  { key: "pollos", label: "Pollos", icon: "🐔" },
  { key: "pavos", label: "Pavos", icon: "🦃" },
  { key: "cerdos", label: "Cerdos", icon: "🐷" },
  { key: "gallinas", label: "Gallinas", icon: "🥚" },
  { key: "codornices", label: "Codornices", icon: "🐦" },
  { key: "cuyes", label: "Cuyes", icon: "🐹" },
  { key: "otros", label: "Otros", icon: "📦" }
];

function getSavedFormulaGroup(formula: SavedFormula): SavedFormulaGroupKey {
  const text = `${formula.name} ${formula.requirementName}`.toLowerCase();

  if (text.includes("pavo") || text.includes("turkey")) return "pavos";
  if (text.includes("codorniz") || text.includes("quail")) return "codornices";
  if (text.includes("cuy") || text.includes("guinea pig")) return "cuyes";
  if (text.includes("cerdo") || text.includes("porcino") || text.includes("pig")) {
    return "cerdos";
  }
  if (
    text.includes("ponedora") ||
    text.includes("postura") ||
    text.includes("gallina") ||
    text.includes("hyline") ||
    text.includes("hy-line") ||
    text.includes("dekalb") ||
    text.includes("layer")
  ) {
    return "gallinas";
  }
  if (
    text.includes("cobb") ||
    text.includes("pollo") ||
    text.includes("broiler")
  ) {
    return "pollos";
  }

  return "otros";
}

function groupSavedFormulas(formulas: SavedFormula[]): SavedFormulaGroup[] {
  return SAVED_FORMULA_GROUPS.map((group) => ({
    ...group,
    formulas: formulas.filter(
      (formula) => getSavedFormulaGroup(formula) === group.key
    )
  }));
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>("formular");
  const [ingredients, setIngredients] =
    useState<EditableIngredient[]>(getInitialIngredients());
  const [requirementProfiles, setRequirementProfiles] = useState<Requirement[]>(
    createInitialRequirementProfiles
  );
  const requirementProfilesRef = useRef<Requirement[]>(requirementProfiles);
  const [activeRequirementIndex, setActiveRequirementIndex] = useState(0);
  const [savedFormulas, setSavedFormulas] = useState<SavedFormula[]>([]);
  const [comparisonFormulaId, setComparisonFormulaId] = useState("");
  const [savedSearch, setSavedSearch] = useState("");
  const [expandedSavedGroup, setExpandedSavedGroup] =
    useState<SavedFormulaGroupKey | null>(null);
  const [expandedFormulaId, setExpandedFormulaId] = useState<string | null>(null);
  const [multiplierDrafts, setMultiplierDrafts] = useState<Record<string, string>>(
    {}
  );
  const [result, setResult] = useState<FormulaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const calculationRequestIdRef = useRef(0);

  const requirement =
    requirementProfiles[activeRequirementIndex] || defaultRequirement;

  const visibleIngredients = useMemo(() => {
    return prepareIngredientsForRequirement(ingredients, requirement.name);
  }, [ingredients, requirement.name]);

  const hiddenIngredientCount = ingredients.length - visibleIngredients.length;

  const filteredSavedFormulas = useMemo(() => {
    const query = savedSearch.trim().toLowerCase();

    if (!query) return savedFormulas;

    return savedFormulas.filter((formula) => {
      return (
        formula.name.toLowerCase().includes(query) ||
        formula.requirementName.toLowerCase().includes(query)
      );
    });
  }, [savedFormulas, savedSearch]);

  const groupedSavedFormulas = useMemo(
    () => groupSavedFormulas(filteredSavedFormulas),
    [filteredSavedFormulas]
  );

  async function calculateFormula(
    currentIngredients: EditableIngredient[],
    currentRequirement: Requirement
  ) {
    const requestId = ++calculationRequestIdRef.current;

    setLoading(true);

    const activeIngredients = currentIngredients.filter(
      (ingredient) => ingredient.active
    );

    try {
      const response = await fetch("/api/solve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ingredients: activeIngredients,
          requirement: currentRequirement
        })
      });

      const data = (await response.json()) as FormulaResult;

      if (requestId === calculationRequestIdRef.current) {
        setResult(data);
      }
    } catch {
      if (requestId === calculationRequestIdRef.current) {
        setResult(
          createEmptyFormulaResult("No se pudo conectar con el calculador.")
        );
      }
    } finally {
      if (requestId === calculationRequestIdRef.current) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    let currentIngredients = getInitialIngredients();
    let currentRequirements = createInitialRequirementProfiles();
    let currentIndex = 0;

    const savedIngredients = window.localStorage.getItem(INGREDIENTS_STORAGE_KEY);
    const savedRequirements = window.localStorage.getItem(REQUIREMENTS_STORAGE_KEY);
    const savedIndex = window.localStorage.getItem(ACTIVE_REQUIREMENT_INDEX_KEY);
    const savedFormulasStorage = window.localStorage.getItem(
      SAVED_FORMULAS_STORAGE_KEY
    );

    if (savedIngredients) {
      try {
        const parsed = JSON.parse(savedIngredients) as EditableIngredient[];
        currentIngredients = normalizeSavedIngredients(parsed);
      } catch {}
    }

    if (savedRequirements) {
      try {
        const parsed = JSON.parse(savedRequirements) as Partial<Requirement>[];
        currentRequirements = parsed.map(normalizeStoredRequirement);
      } catch {}
    }

    if (savedIndex) {
      currentIndex = Number(savedIndex || 0);
    }

    if (!currentRequirements[currentIndex]) {
      currentIndex = 0;
    }

    if (savedFormulasStorage) {
      try {
        const parsed = JSON.parse(savedFormulasStorage) as SavedFormula[];
        setSavedFormulas(
          parsed.map((formula) => ({
            ...formula,
            costing: normalizeCosting(formula.costing)
          }))
        );
      } catch {}
    }

    const currentRequirement = currentRequirements[currentIndex];
    const visible = prepareIngredientsForRequirement(
      currentIngredients,
      currentRequirement.name
    );

    setIngredients(currentIngredients);
    requirementProfilesRef.current = currentRequirements;
    setRequirementProfiles(currentRequirements);
    setActiveRequirementIndex(currentIndex);
    calculateFormula(visible, currentRequirement);
  }, []);

  function saveAll(
    updatedIngredients: EditableIngredient[],
    updatedProfiles: Requirement[],
    updatedIndex: number
  ) {
    const safeIndex = updatedProfiles[updatedIndex] ? updatedIndex : 0;
    const nextRequirement = updatedProfiles[safeIndex];

    setIngredients(updatedIngredients);
    requirementProfilesRef.current = updatedProfiles;
    setRequirementProfiles(updatedProfiles);
    setActiveRequirementIndex(safeIndex);

    window.localStorage.setItem(
      INGREDIENTS_STORAGE_KEY,
      JSON.stringify(updatedIngredients)
    );

    const previousProfiles = window.localStorage.getItem(
      REQUIREMENTS_STORAGE_KEY
    );

    if (previousProfiles) {
      window.localStorage.setItem(
        REQUIREMENTS_BACKUP_STORAGE_KEY,
        previousProfiles
      );
    }

    window.localStorage.setItem(
      REQUIREMENTS_STORAGE_KEY,
      JSON.stringify(updatedProfiles)
    );

    window.localStorage.setItem(ACTIVE_REQUIREMENT_INDEX_KEY, String(safeIndex));

    const visible = prepareIngredientsForRequirement(
      updatedIngredients,
      nextRequirement.name
    );

    calculateFormula(visible, nextRequirement);
  }

  function saveSavedFormulas(updated: SavedFormula[]) {
    setSavedFormulas(updated);
    window.localStorage.setItem(
      SAVED_FORMULAS_STORAGE_KEY,
      JSON.stringify(updated)
    );
  }

  function moveIngredient(id: string, direction: "up" | "down") {
    const currentIndex = ingredients.findIndex(
      (ingredient) => ingredient.id === id
    );

    if (currentIndex < 0) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= ingredients.length) return;

    const updatedIngredients = [...ingredients];
    const [moved] = updatedIngredients.splice(currentIndex, 1);
    updatedIngredients.splice(targetIndex, 0, moved);

    saveAll(updatedIngredients, requirementProfiles, activeRequirementIndex);
  }

  function updateIngredient(
    id: string,
    field: "price" | "min" | "max",
    value: number
  ) {
    const activeSpecies = getSpeciesFromRequirement(requirement.name);

    const updatedIngredients = ingredients.map((ingredient) => {
      if (ingredient.id !== id) return ingredient;

      if ((field === "min" || field === "max") && activeSpecies) {
        const normalizedLimits = normalizeLimits(
          ingredient.limits,
          ingredient.min,
          ingredient.max
        );

        return {
          ...ingredient,
          limits: {
            ...normalizedLimits,
            [activeSpecies]: {
              ...normalizedLimits[activeSpecies],
              [field]: value
            }
          }
        };
      }

      return {
        ...ingredient,
        [field]: value
      };
    });

    saveAll(updatedIngredients, requirementProfiles, activeRequirementIndex);
  }

  function updateIngredientLimit(
    id: string,
    species: SpeciesKey,
    field: "min" | "max",
    value: number
  ) {
    const updatedIngredients = ingredients.map((ingredient) => {
      if (ingredient.id !== id) return ingredient;

      const normalizedLimits = normalizeLimits(
        ingredient.limits,
        ingredient.min,
        ingredient.max
      );

      return {
        ...ingredient,
        limits: {
          ...normalizedLimits,
          [species]: {
            ...normalizedLimits[species],
            [field]: value
          }
        }
      };
    });

    saveAll(updatedIngredients, requirementProfiles, activeRequirementIndex);
  }

  function updateIngredientName(id: string, name: string) {
    const updatedIngredients = ingredients.map((ingredient) =>
      ingredient.id === id ? { ...ingredient, name } : ingredient
    );

    saveAll(updatedIngredients, requirementProfiles, activeRequirementIndex);
  }

  function updateIngredientSpecies(
    id: string,
    species: SpeciesKey,
    value: boolean
  ) {
    const updatedIngredients = ingredients.map((ingredient) =>
      ingredient.id === id
        ? {
            ...ingredient,
            species: {
              ...normalizeSpecies(ingredient.species),
              [species]: value
            }
          }
        : ingredient
    );

    saveAll(updatedIngredients, requirementProfiles, activeRequirementIndex);
  }

  function updateNutrient(id: string, nutrient: NutrientKey, value: number) {
    const updatedIngredients = ingredients.map((ingredient) =>
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

    saveAll(updatedIngredients, requirementProfiles, activeRequirementIndex);
  }

  function updateRequirement(
    field: keyof Requirement,
    value:
      | string
      | number
      | Requirement["nutrients"]
      | Requirement["derivedRequirements"]
  ) {
    const currentProfiles = requirementProfilesRef.current;
    const updatedProfiles = currentProfiles.map((profile, index) =>
      index === activeRequirementIndex ? { ...profile, [field]: value } : profile
    );

    saveAll(ingredients, updatedProfiles, activeRequirementIndex);
  }

  function updateActiveRequirementNutrient(
    nutrient: NutrientKey,
    field: "min" | "max" | "enabled",
    value: number | boolean | undefined
  ) {
    const currentProfiles = requirementProfilesRef.current;

    const updatedProfiles = currentProfiles.map((profile, index) => {
      if (index !== activeRequirementIndex) return profile;

      const currentRange = profile.nutrients[nutrient];
      const nextValue =
        field === "enabled"
          ? Boolean(value)
          : field === "max"
            ? value === undefined || Number(value) <= 0
              ? undefined
              : Number(value)
            : value === undefined
              ? 0
              : Number(value);

      return attachLegacyRequirementFields({
        ...profile,
        nutrients: {
          ...profile.nutrients,
          [nutrient]: {
            ...currentRange,
            [field]: nextValue
          }
        }
      });
    });

    saveAll(ingredients, updatedProfiles, activeRequirementIndex);
  }

  function updateElectrolyteRequirement(
    field: "min" | "max" | "enabled",
    value: number | boolean | undefined
  ) {
    const currentProfiles = requirementProfilesRef.current;

    const updatedProfiles = currentProfiles.map((profile, index) => {
      if (index !== activeRequirementIndex) return profile;

      const current = profile.derivedRequirements.electrolyteBalance;
      const nextValue =
        field === "enabled"
          ? Boolean(value)
          : value === undefined || Number(value) <= 0
            ? undefined
            : Number(value);

      return {
        ...profile,
        derivedRequirements: {
          ...profile.derivedRequirements,
          electrolyteBalance: {
            ...current,
            [field]: nextValue
          }
        }
      };
    });

    saveAll(ingredients, updatedProfiles, activeRequirementIndex);
  }

  function selectRequirement(index: number) {
    saveAll(ingredients, requirementProfiles, index);
  }

  function createRequirement() {
    const newRequirement = createEmptyRequirement(
      `Nuevo perfil ${requirementProfiles.length + 1}`
    );

    const updatedProfiles = [...requirementProfiles, newRequirement];
    const newIndex = updatedProfiles.length - 1;

    saveAll(ingredients, updatedProfiles, newIndex);
  }

  function duplicateRequirement() {
    const duplicated: Requirement = {
      ...cloneRequirementProfile(requirement),
      name: `${requirement.name} copia`
    };

    const updatedProfiles = [...requirementProfiles, duplicated];
    const newIndex = updatedProfiles.length - 1;

    saveAll(ingredients, updatedProfiles, newIndex);
  }

  function deleteRequirement() {
    if (requirementProfiles.length <= 1) return;

    const updatedProfiles = requirementProfiles.filter(
      (_, index) => index !== activeRequirementIndex
    );

    const newIndex = Math.max(0, activeRequirementIndex - 1);

    saveAll(ingredients, updatedProfiles, newIndex);
  }

  function toggleIngredient(id: string) {
    const updatedIngredients = ingredients.map((ingredient) =>
      ingredient.id === id ? { ...ingredient, active: !ingredient.active } : ingredient
    );

    saveAll(updatedIngredients, requirementProfiles, activeRequirementIndex);
  }

  function addClassifier() {
    window.alert(
      "Los clasificadores disponibles están definidos en lib/ingredients.ts. Para agregar uno nuevo de forma permanente, primero debe añadirse allí."
    );
  }

  function renameClassifier(species: SpeciesKey) {
    window.alert(
      `El clasificador ${speciesLabels[species] || species} se renombra desde lib/ingredients.ts para mantener consistencia en toda la aplicación.`
    );
  }

  function deleteClassifier(species: SpeciesKey) {
    window.alert(
      `El clasificador ${speciesLabels[species] || species} no puede borrarse solo desde esta pantalla porque forma parte del tipo SpeciesKey.`
    );
  }

  function addIngredient() {
    const newIngredient: EditableIngredient = {
      ...createEmptyIngredient(),
      active: true
    };

    saveAll(
      [...ingredients, newIngredient],
      requirementProfiles,
      activeRequirementIndex
    );

    setActiveTab("matrix");
  }

  function deleteIngredient(id: string) {
    const updatedIngredients = ingredients.filter(
      (ingredient) => ingredient.id !== id
    );

    saveAll(updatedIngredients, requirementProfiles, activeRequirementIndex);
  }

  function resetIngredients() {
    const confirmReset = window.confirm(
      "Esto reiniciará la matriz de ingredientes. Si tienes ingredientes nuevos escritos a mano, se perderán. ¿Seguro?"
    );

    if (!confirmReset) return;

    const freshIngredients = getInitialIngredients();
    saveAll(freshIngredients, requirementProfiles, activeRequirementIndex);
  }

  function resetRequirement() {
    const confirmReset = window.confirm(
      "Esto reiniciará todos los perfiles de requerimientos. ¿Seguro?"
    );

    if (!confirmReset) return;

    saveAll(ingredients, createInitialRequirementProfiles(), 0);
  }

  function recoverProfilesFromSavedFormulas() {
    const recoveredProfiles = savedFormulas
      .map((formula) => formula.requirementSnapshot)
      .filter((profile): profile is Requirement => Boolean(profile))
      .map((profile) => normalizeStoredRequirement(profile));

    if (recoveredProfiles.length === 0) {
      window.alert(
        "No se encontraron perfiles de requerimientos dentro de las fórmulas guardadas."
      );
      return;
    }

    const uniqueProfiles = recoveredProfiles.filter((profile, index, all) => {
      const signature = JSON.stringify(profile);
      return all.findIndex((candidate) => JSON.stringify(candidate) === signature) === index;
    });

    saveAll(ingredients, uniqueProfiles, 0);
    window.alert(`Se recuperaron ${uniqueProfiles.length} perfil(es).`);
  }

  function restoreProfilesBackup() {
    const backup = window.localStorage.getItem(REQUIREMENTS_BACKUP_STORAGE_KEY);

    if (!backup) {
      window.alert("Todavía no existe una copia automática de los perfiles.");
      return;
    }

    try {
      const parsed = JSON.parse(backup) as Partial<Requirement>[];
      const restoredProfiles = parsed.map((profile) => normalizeStoredRequirement(profile));

      if (restoredProfiles.length === 0) {
        throw new Error("Copia vacía");
      }

      saveAll(ingredients, restoredProfiles, 0);
      window.alert("Se restauró la última copia automática.");
    } catch {
      window.alert("La copia automática no es válida y no pudo restaurarse.");
    }
  }

  function exportProfiles() {
    const content = JSON.stringify(requirementProfiles, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `feedgenio-perfiles-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function importProfiles(file: File) {
    try {
      const content = await file.text();
      const parsed = JSON.parse(content) as Partial<Requirement>[];

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Archivo sin perfiles");
      }

      const importedProfiles = parsed.map((profile) => normalizeStoredRequirement(profile));
      saveAll(ingredients, importedProfiles, 0);
      window.alert(`Se importaron ${importedProfiles.length} perfil(es).`);
    } catch {
      window.alert("El archivo no contiene perfiles válidos de FeedGenio.");
    }
  }

  function saveCurrentFormula(productiveCosting?: ProductiveCosting) {
    if (!result?.feasible) {
      window.alert("No hay fórmula válida para guardar.");
      return;
    }

    const formulaName = window.prompt(
      "Nombre de la fórmula:",
      `${requirement.name} ${new Date().toLocaleDateString()}`
    );

    if (!formulaName) return;

    const newFormula: SavedFormula = {
      id: Date.now().toString(),
      name: formulaName,
      createdAt: new Date().toISOString(),
      multiplier: 1,
      requirementName: requirement.name,
      result: JSON.parse(JSON.stringify(result)),
      ingredientsSnapshot: JSON.parse(JSON.stringify(ingredients)),
      requirementSnapshot: cloneRequirementProfile(requirement),
      productiveCostingSnapshot: productiveCosting
        ? JSON.parse(JSON.stringify(productiveCosting))
        : undefined,
      detailVersion: productiveCosting ? 2 : undefined
    };

    saveSavedFormulas([newFormula, ...savedFormulas]);
    window.alert("Fórmula guardada.");
    setActiveTab("saved");
  }

  function deleteSavedFormula(id: string) {
    saveSavedFormulas(savedFormulas.filter((item) => item.id !== id));

    setMultiplierDrafts((current) => {
      const copy = { ...current };
      delete copy[id];
      return copy;
    });
  }

  function renameSavedFormula(formula: SavedFormula) {
    const newName = window.prompt("Nuevo nombre:", formula.name);
    if (!newName) return;

    saveSavedFormulas(
      savedFormulas.map((item) =>
        item.id === formula.id ? { ...item, name: newName } : item
      )
    );
  }

  function duplicateSavedFormula(formula: SavedFormula) {
    const copy: SavedFormula = {
      ...formula,
      id: Date.now().toString(),
      name: `${formula.name} copia`,
      createdAt: new Date().toISOString()
    };

    saveSavedFormulas([copy, ...savedFormulas]);
  }

  function viewSavedFormula(formula: SavedFormula) {
    setResult(formula.result);

    window.alert(
      "Fórmula abierta en resultados. No se modificó la matriz ni los requerimientos."
    );

    setActiveTab("results");
  }

  function getMultiplierText(formula: SavedFormula) {
    return multiplierDrafts[formula.id] ?? String(formula.multiplier);
  }

  function getMultiplierNumber(formula: SavedFormula) {
    const text = getMultiplierText(formula).replace(",", ".");
    const value = Number(text);

    if (!Number.isFinite(value) || value <= 0) return 0;

    return value;
  }

  function updateFormulaMultiplierText(id: string, value: string) {
    const cleanValue = value.replace(",", ".");

    setMultiplierDrafts((current) => ({
      ...current,
      [id]: cleanValue
    }));

    if (cleanValue === "") return;

    const numericValue = Number(cleanValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return;

    saveSavedFormulas(
      savedFormulas.map((item) =>
        item.id === id ? { ...item, multiplier: numericValue } : item
      )
    );
  }

  function finishMultiplierEdit(formula: SavedFormula) {
    const numericValue = getMultiplierNumber(formula);
    const finalValue = numericValue > 0 ? numericValue : 1;

    saveSavedFormulas(
      savedFormulas.map((item) =>
        item.id === formula.id ? { ...item, multiplier: finalValue } : item
      )
    );

    setMultiplierDrafts((current) => ({
      ...current,
      [formula.id]: String(finalValue)
    }));
  }

  function buildSavedFormulaText(formula: SavedFormula) {
    const multiplier = getMultiplierNumber(formula);
    const costingData = calculateSavedCosting(formula, multiplier);

    const lines = [
      `FeedGenio - ${formula.name}`,
      `Perfil: ${formula.requirementName}`,
      `Total mezcla: ${formatKg(costingData.totalKg)} kg`,
      `Costo fórmula: S/ ${formatMoney(costingData.totalFormulaCost, 2)}`,
      `Costo real aprox: S/ ${formatMoney(costingData.totalRealCost, 2)}`,
      `Costo por kg: S/ ${formula.result.costPerKg.toFixed(3)}`,
      `Costo real por kg: S/ ${formatMoney(costingData.costWithProductionPerKg, 3)}`,
      `Costo real saco 50 kg: S/ ${formatMoney(costingData.realCostPer50Kg, 2)}`,
      `Venta sugerida saco 50 kg: S/ ${formatMoney(costingData.salePer50Kg, 2)}`,
      "",
      "Ingredientes:"
    ];

    formula.result.ingredients.forEach((item) => {
      lines.push(`${item.name}: ${formatKg(item.amountKg100 * multiplier)} kg`);
    });

    return lines.join("\n");
  }

  async function copySavedFormula(formula: SavedFormula) {
    try {
      await navigator.clipboard.writeText(buildSavedFormulaText(formula));
      window.alert("Fórmula copiada.");
    } catch {
      window.alert("No se pudo copiar la fórmula.");
    }
  }

  return (
    <main className="page">
      <div className="container" style={{ overflowX: "hidden" }}>
        <section className="hero">
          <h1>FeedGenio 🧠🌽</h1>
          <p>Sistema profesional de formulación de raciones por mínimo costo.</p>
        </section>

        <section className="tabs">
          <button
            className={`tab-button ${activeTab === "formular" ? "active" : ""}`}
            onClick={() => setActiveTab("formular")}
          >
            📦 Formular
          </button>

          <button
            className={`tab-button ${activeTab === "matrix" ? "active" : ""}`}
            onClick={() => setActiveTab("matrix")}
          >
            🧪 Matriz
          </button>

          <button
            className={`tab-button ${
              activeTab === "requirements" ? "active" : ""
            }`}
            onClick={() => setActiveTab("requirements")}
          >
            🎯 Requems
          </button>

          <button
            className={`tab-button ${activeTab === "results" ? "active" : ""}`}
            onClick={() => setActiveTab("results")}
          >
            📊 Resultados
          </button>

          <button
            className={`tab-button ${activeTab === "saved" ? "active" : ""}`}
            onClick={() => setActiveTab("saved")}
          >
            💾 Guardadas
          </button>
        </section>

        {activeTab === "formular" && (
          <FormulaTab
            ingredients={visibleIngredients}
            hiddenIngredientCount={hiddenIngredientCount}
            loading={loading}
            requirementProfiles={requirementProfiles}
            activeRequirementIndex={activeRequirementIndex}
            activeSpecies={getSpeciesFromRequirement(requirement.name)}
            onSelectRequirement={selectRequirement}
            onToggle={toggleIngredient}
            onUpdate={updateIngredient}
            onCalculate={() => calculateFormula(visibleIngredients, requirement)}
            onGoToResults={() => setActiveTab("results")}
            onReset={resetIngredients}
            onAddIngredient={addIngredient}
          />
        )}

        {activeTab === "matrix" && (
          <MatrixTab
            ingredients={ingredients}
            nutrientKeys={nutrientKeys}
            classifierKeys={speciesKeys}
            classifierLabels={speciesLabels}
            onAddIngredient={addIngredient}
            onDeleteIngredient={deleteIngredient}
            onMoveIngredient={moveIngredient}
            onUpdateName={updateIngredientName}
            onUpdateSpecies={updateIngredientSpecies}
            onUpdateLimit={updateIngredientLimit}
            onUpdateNutrient={updateNutrient}
            onAddClassifier={addClassifier}
            onRenameClassifier={renameClassifier}
            onDeleteClassifier={deleteClassifier}
          />
        )}

        {activeTab === "requirements" && (
          <RequirementsTab
            requirement={requirement}
            requirementProfiles={requirementProfiles}
            activeRequirementIndex={activeRequirementIndex}
            classifierKeys={speciesKeys}
            classifierLabels={speciesLabels}
            onSelectRequirement={selectRequirement}
            onUpdateRequirement={updateRequirement}
            onUpdateNutrient={updateActiveRequirementNutrient}
            onUpdateElectrolyteBalance={updateElectrolyteRequirement}
            onCreateRequirement={createRequirement}
            onDuplicateRequirement={duplicateRequirement}
            onDeleteRequirement={deleteRequirement}
            onRecoverProfiles={recoverProfilesFromSavedFormulas}
            onRestoreProfilesBackup={restoreProfilesBackup}
            onExportProfiles={exportProfiles}
            onImportProfiles={importProfiles}
          />
        )}

        {activeTab === "results" && (
          <ResultsTab
            result={result}
            requirement={requirement}
            onSaveFormula={saveCurrentFormula}
            savedFormulas={savedFormulas}
            comparisonFormulaId={comparisonFormulaId}
            comparisonFormula={
              savedFormulas.find((formula) => formula.id === comparisonFormulaId) ??
              null
            }
            onSelectComparisonFormula={setComparisonFormulaId}
          />
        )}

        {activeTab === "saved" && (
          <section className="saved-section">
            <div className="saved-heading">
              <div>
                <h2>💾 Fórmulas guardadas</h2>
                
              </div>
              <span className="saved-total-badge">{savedFormulas.length}</span>
            </div>

            {filteredSavedFormulas.length === 0 ? (
              <div className="saved-empty">
                No hay fórmulas guardadas para mostrar.
              </div>
            ) : (
              <div className="saved-groups">
                {groupedSavedFormulas.map((group) => {
                  const isGroupExpanded = expandedSavedGroup === group.key;
                  const formulaCount = group.formulas.length;

                  if (formulaCount === 0 && savedSearch.trim()) return null;

                  return (
                    <article
                      key={group.key}
                      className={`saved-group ${isGroupExpanded ? "is-open" : ""}`}
                    >
                      <button
                        className="saved-group-toggle"
                        type="button"
                        onClick={() => {
                          setExpandedSavedGroup(
                            isGroupExpanded ? null : group.key
                          );
                          setExpandedFormulaId(null);
                        }}
                        aria-expanded={isGroupExpanded}
                      >
                        <span className="saved-group-icon">{group.icon}</span>

                        <span className="saved-group-copy">
                          <strong>Alimento {group.label}</strong>
                          <small>
                            {formulaCount} {formulaCount === 1 ? "fórmula" : "fórmulas"}
                          </small>
                        </span>

                        <span className="saved-group-arrow">
                          {isGroupExpanded ? "▾" : "▸"}
                        </span>
                      </button>

                      {isGroupExpanded && (
                        <div className="saved-group-content">
                          {formulaCount === 0 ? (
                            <div className="saved-group-empty">
                              Todavía no hay fórmulas en esta categoría.
                            </div>
                          ) : (
                            group.formulas.map((formula) => {
                              const isFormulaExpanded =
                                expandedFormulaId === formula.id;
                              const multiplier = getMultiplierNumber(formula);
                              const costingData = calculateSavedCosting(
                                formula,
                                multiplier
                              );
                              const productiveCostingData =
                                calculateSavedProductiveCosting(formula);
                              const hasDetailedSnapshot = Boolean(
                                formula.detailVersion === 2 &&
                                  formula.productiveCostingSnapshot &&
                                  formula.requirementSnapshot
                              );

                              return (
                                <div
                                  key={formula.id}
                                  className={`saved-formula-card ${
                                    isFormulaExpanded ? "is-open" : ""
                                  }`}
                                >
                                  <button
                                    className="saved-formula-summary"
                                    type="button"
                                    onClick={() =>
                                      setExpandedFormulaId(
                                        isFormulaExpanded ? null : formula.id
                                      )
                                    }
                                    aria-expanded={isFormulaExpanded}
                                  >
                                    <span className="saved-formula-title">
                                      <strong>{formula.name}</strong>
                                      
                                    </span>

                                    <span className="saved-formula-chevron">
                                      {isFormulaExpanded ? "▾" : "▸"}
                                    </span>
                                  </button>

                                  {isFormulaExpanded && (
                                    <div className="saved-formula-detail">
                                      <div className="saved-meta-row">
                                        <span>
                                          Guardada: {new Date(
                                            formula.createdAt
                                          ).toLocaleDateString()}
                                        </span>
                                        <span className="saved-weight-badge">
                                          50 kg
                                        </span>
                                      </div>

                                      {hasDetailedSnapshot && productiveCostingData ? (
                                        <>
                                          <div className="saved-detail-section saved-productive-section">
                                            <h3>🏭 Costeo productivo por 50 kg</h3>

                                            <div className="saved-productive-inputs">
                                              <div>
                                                <span>Costo humano</span>
                                                <strong>S/ {formatMoney(productiveCostingData.humanCostPer50Kg, 2)}</strong>
                                              </div>
                                              <div>
                                                <span>Costo máquina</span>
                                                <strong>S/ {formatMoney(productiveCostingData.machineCostPer50Kg, 2)}</strong>
                                              </div>
                                              <div>
                                                <span>Costo del saco</span>
                                                <strong>S/ {formatMoney(productiveCostingData.bagCostPer50Kg, 2)}</strong>
                                              </div>
                                              <div>
                                                <span>Ganancia fija por saco</span>
                                                <strong>S/ {formatMoney(productiveCostingData.profitPer50Kg, 2)}</strong>
                                              </div>
                                            </div>

                                            <div className="saved-cost-sections">
                                              <section className="saved-cost-section saved-cost-formula">
                                                <h4>🌽 Costo de fórmula</h4>
                                                <div className="saved-cost-section-grid">
                                                  <div>
                                                    <span>Por kg</span>
                                                    <strong>S/ {formatMoney(formula.result.costPerKg, 3)}</strong>
                                                  </div>
                                                  <div>
                                                    <span>Saco 50 kg</span>
                                                    <strong>S/ {formatMoney(formula.result.costPer50Kg, 2)}</strong>
                                                  </div>
                                                </div>
                                              </section>

                                              <section className="saved-cost-section saved-cost-real">
                                                <h4>🏭 Costo real</h4>
                                                <div className="saved-cost-section-grid">
                                                  <div>
                                                    <span>Por kg</span>
                                                    <strong>S/ {formatMoney(productiveCostingData.realCostPerKg, 3)}</strong>
                                                  </div>
                                                  <div>
                                                    <span>Saco 50 kg</span>
                                                    <strong>S/ {formatMoney(productiveCostingData.realCostPer50Kg, 2)}</strong>
                                                  </div>
                                                  <div>
                                                    <span>100 kg</span>
                                                    <strong>S/ {formatMoney(productiveCostingData.realCostPer100Kg, 2)}</strong>
                                                  </div>
                                                  <div>
                                                    <span>Tonelada</span>
                                                    <strong>S/ {formatMoney(productiveCostingData.realCostPerTon, 2)}</strong>
                                                  </div>
                                                </div>
                                              </section>

                                              <section className="saved-cost-section saved-cost-sale">
                                                <h4>💰 Venta sugerida</h4>
                                                <div className="saved-cost-section-grid">
                                                  <div>
                                                    <span>Saco 50 kg</span>
                                                    <strong>S/ {formatMoney(productiveCostingData.salePer50Kg, 2)}</strong>
                                                  </div>
                                                  <div>
                                                    <span>Por kg</span>
                                                    <strong>S/ {formatMoney(productiveCostingData.salePerKg, 3)}</strong>
                                                  </div>
                                                </div>
                                              </section>
                                            </div>
                                          </div>

                                          <label className="saved-multiplier-label">
                                            Multiplicador
                                            <input
                                              className="price-input"
                                              type="text"
                                              inputMode="decimal"
                                              value={getMultiplierText(formula)}
                                              onChange={(event) =>
                                                updateFormulaMultiplierText(
                                                  formula.id,
                                                  event.target.value
                                                )
                                              }
                                              onBlur={() => finishMultiplierEdit(formula)}
                                              onFocus={(event) => event.currentTarget.select()}
                                            />
                                          </label>

                                          <div className="saved-detail-section">
                                            <h3>🌽 Fórmula obtenida</h3>
                                            <div className="saved-formula-table">
                                              <div className="saved-formula-table-head">
                                                <span>Insumo</span>
                                                <span>Kg</span>
                                                <span>Costo</span>
                                              </div>
                                              {formula.result.ingredients.map((item) => (
                                                <div key={item.id} className="saved-formula-table-row">
                                                  <span>{item.name}</span>
                                                  <strong>{formatKg(item.amountKg100 * multiplier)}</strong>
                                                  <strong>S/ {formatMoney(item.cost * multiplier, 2)}</strong>
                                                </div>
                                              ))}
                                            </div>
                                          </div>

                                          <div className="saved-detail-section">
                                            <h3>🧪 Nutrientes obtenidos</h3>
                                            <div className="saved-nutrient-table">
                                              <div className="saved-nutrient-table-head">
                                                <span>Nutriente</span>
                                                <span>Mín</span>
                                                <span>Obtenido</span>
                                                <span>Máx</span>
                                              </div>

                                              {nutrientKeys.map((key) => {
                                                const nutrientRequirement =
                                                  formula.requirementSnapshot?.nutrients?.[key];
                                                const minValue = Number(
                                                  nutrientRequirement?.min ??
                                                    formula.requirementSnapshot?.[key] ??
                                                    0
                                                );
                                                const maxValue = nutrientRequirement?.max;
                                                const decimals = key === "energy" ? 0 : 3;

                                                return (
                                                  <div key={key} className="saved-nutrient-table-row">
                                                    <span>{nutrientLabels[key]}</span>
                                                    <span>{minValue.toFixed(decimals)}</span>
                                                    <strong>
                                                      {Number(formula.result.nutrients[key] ?? 0).toFixed(decimals)}
                                                    </strong>
                                                    <span>
                                                      {typeof maxValue === "number"
                                                        ? Number(maxValue).toFixed(decimals)
                                                        : "Sin máx"}
                                                    </span>
                                                  </div>
                                                );
                                              })}

                                              <div className="saved-nutrient-table-row">
                                                <span>Balance electrolítico</span>
                                                <span>
                                                  {Number(
                                                    formula.requirementSnapshot?.derivedRequirements?.electrolyteBalance?.min ??
                                                      0
                                                  ).toFixed(3)}
                                                </span>
                                                <strong>
                                                  {Number(
                                                    formula.result.derivedMetrics?.electrolyteBalance ?? 0
                                                  ).toFixed(3)}
                                                </strong>
                                                <span>
                                                  {typeof formula.requirementSnapshot?.derivedRequirements?.electrolyteBalance?.max ===
                                                  "number"
                                                    ? Number(
                                                        formula.requirementSnapshot.derivedRequirements.electrolyteBalance.max
                                                      ).toFixed(3)
                                                    : "Sin máx"}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <label className="saved-multiplier-label">
                                            Multiplicador
                                            <input
                                              className="price-input"
                                              type="text"
                                              inputMode="decimal"
                                              value={getMultiplierText(formula)}
                                              onChange={(event) =>
                                                updateFormulaMultiplierText(
                                                  formula.id,
                                                  event.target.value
                                                )
                                              }
                                              onBlur={() => finishMultiplierEdit(formula)}
                                              onFocus={(event) => event.currentTarget.select()}
                                            />
                                          </label>

                                          <div className="saved-cost-grid">
                                            <div>
                                              <span>Total mezcla</span>
                                              <strong>{formatKg(costingData.totalKg)} kg</strong>
                                            </div>
                                            <div>
                                              <span>Costo fórmula</span>
                                              <strong>S/ {formatMoney(costingData.totalFormulaCost, 2)}</strong>
                                            </div>
                                            <div>
                                              <span>Costo real aprox.</span>
                                              <strong>S/ {formatMoney(costingData.totalRealCost, 2)}</strong>
                                            </div>
                                            <div>
                                              <span>Venta sugerida saco</span>
                                              <strong>S/ {formatMoney(costingData.salePer50Kg, 2)}</strong>
                                            </div>
                                          </div>

                                          <div className="saved-ingredients-list">
                                            {formula.result.ingredients.map((item) => (
                                              <div key={item.id} className="saved-ingredient-row">
                                                <span>{item.name}</span>
                                                <strong>{formatKg(item.amountKg100 * multiplier)} kg</strong>
                                              </div>
                                            ))}
                                          </div>

                                          <div className="saved-detail-section">
                                            <h3>🧪 Nutrientes obtenidos</h3>
                                            <div className="saved-nutrients-grid">
                                              {nutrientKeys.map((key) => (
                                                <div key={key} className="saved-nutrient-item">
                                                  <span>{nutrientLabels[key]}</span>
                                                  <strong>
                                                    {Number(formula.result.nutrients[key] ?? 0).toFixed(
                                                      key === "energy" ? 0 : 3
                                                    )}
                                                  </strong>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </>
                                      )}

                                      <div className="saved-actions-grid">
                                        <button
                                          className="action"
                                          type="button"
                                          onClick={() =>
                                            copySavedFormula(formula)
                                          }
                                        >
                                          📋 Copiar
                                        </button>

                                        <button
                                          className="action secondary"
                                          type="button"
                                          onClick={() =>
                                            viewSavedFormula(formula)
                                          }
                                        >
                                          👁️ Ver resultados
                                        </button>

                                        <button
                                          className="action secondary"
                                          type="button"
                                          onClick={() =>
                                            renameSavedFormula(formula)
                                          }
                                        >
                                          ✏️ Renombrar
                                        </button>

                                        <button
                                          className="action secondary"
                                          type="button"
                                          onClick={() =>
                                            duplicateSavedFormula(formula)
                                          }
                                        >
                                          📄 Duplicar
                                        </button>

                                        <button
                                          className="action secondary saved-delete-button"
                                          type="button"
                                          onClick={() => {
                                            const confirmed = window.confirm(
                                              `¿Eliminar la fórmula “${formula.name}”?`
                                            );
                                            if (confirmed) {
                                              deleteSavedFormula(formula.id);
                                              setExpandedFormulaId(null);
                                            }
                                          }}
                                        >
                                          🗑️ Eliminar
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
