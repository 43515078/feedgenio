"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createAllSpecies,
  createEmptyIngredient,
  createEmptyNutrients,
  defaultIngredients,
  nutrientKeys,
  speciesKeys,
  speciesLabels,
  type Ingredient,
  type NutrientKey,
  type SpeciesKey
} from "@/lib/ingredients";

import { defaultRequirement, type Requirement } from "@/lib/requirements";

import type { FormulaResult } from "@/lib/solver";

import FormulaTab from "@/components/FormulaTab";
import MatrixTab from "@/components/MatrixTab";
import RequirementsTab from "@/components/RequirementsTab";
import ResultsTab from "@/components/ResultsTab";

type SpeciesLimit = {
  min: number;
  max: number;
};

type SpeciesLimits = Record<SpeciesKey, SpeciesLimit>;

type EditableIngredient = Ingredient & {
  active: boolean;
  speciesLimits?: SpeciesLimits;
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

type TabType = "formular" | "matrix" | "requirements" | "results" | "saved";

const INGREDIENTS_STORAGE_KEY = "feedgenio_ingredients_v1";
const REQUIREMENTS_STORAGE_KEY = "feedgenio_requirements_v2";
const ACTIVE_REQUIREMENT_INDEX_KEY = "feedgenio_active_requirement_index_v2";
const SAVED_FORMULAS_STORAGE_KEY = "feedgenio_saved_formulas_v1";

function numberOrDefault(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function createSpeciesLimits(min: number, max: number): SpeciesLimits {
  return {
    layer: { min, max },
    broiler: { min, max },
    pig: { min, max },
    guineaPig: { min, max }
  };
}

function normalizeSpeciesLimits(
  limits: Partial<Record<SpeciesKey, Partial<SpeciesLimit>>> | undefined,
  fallbackMin: number,
  fallbackMax: number
): SpeciesLimits {
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

function getInitialIngredients(): EditableIngredient[] {
  return defaultIngredients.map((ingredient) => ({
    ...ingredient,
    species: ingredient.species || createAllSpecies(true),
    speciesLimits: createSpeciesLimits(ingredient.min, ingredient.max),
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
      speciesLimits: normalizeSpeciesLimits(item.speciesLimits, min, max),
      nutrients: normalizeNutrients(item.nutrients)
    };
  });
}

function normalizeRequirement(item: Partial<Requirement>): Requirement {
  return {
    ...defaultRequirement,
    ...item,
    name: String(item.name || defaultRequirement.name)
  };
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

  const realCostPerTon =
    costWithProductionPerKg * 1000 + costing.bagCostPer50Kg * 20;

  const salePer50Kg = realCostPer50Kg * (1 + costing.marginPercent / 100);
  const salePerKg = salePer50Kg / 50;

  const totalKg = 100 * multiplier;
  const totalFormulaCost = formula.result.costPer100Kg * multiplier;
  const totalRealCost = realCostPer100Kg * multiplier;

  return {
    costing,
    costWithProductionPerKg,
    realCostPer50Kg,
    realCostPer100Kg,
    realCostPerTon,
    salePer50Kg,
    salePerKg,
    totalKg,
    totalFormulaCost,
    totalRealCost
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
      const speciesLimit = ingredient.speciesLimits?.[species];

      return {
        ...ingredient,
        min: numberOrDefault(speciesLimit?.min, ingredient.min),
        max: numberOrDefault(speciesLimit?.max, ingredient.max)
      };
    });
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>("formular");
  const [ingredients, setIngredients] =
    useState<EditableIngredient[]>(getInitialIngredients());
  const [requirementProfiles, setRequirementProfiles] = useState<Requirement[]>(
    [defaultRequirement]
  );
  const [activeRequirementIndex, setActiveRequirementIndex] = useState(0);
  const [savedFormulas, setSavedFormulas] = useState<SavedFormula[]>([]);
  const [savedSearch, setSavedSearch] = useState("");
  const [multiplierDrafts, setMultiplierDrafts] = useState<
    Record<string, string>
  >({});
  const [result, setResult] = useState<FormulaResult | null>(null);
  const [loading, setLoading] = useState(false);

  const requirement =
    requirementProfiles[activeRequirementIndex] || defaultRequirement;

  const activeSpecies = getSpeciesFromRequirement(requirement.name);

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

  async function calculateFormula(
    currentIngredients: EditableIngredient[],
    currentRequirement: Requirement
  ) {
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
      setResult(data);
    } catch {
      setResult(createEmptyFormulaResult("No se pudo conectar con el calculador."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let currentIngredients = getInitialIngredients();
    let currentRequirements = [defaultRequirement];
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
        currentRequirements = parsed.map(normalizeRequirement);
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
    setRequirementProfiles(updatedProfiles);
    setActiveRequirementIndex(safeIndex);

    window.localStorage.setItem(
      INGREDIENTS_STORAGE_KEY,
      JSON.stringify(updatedIngredients)
    );

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
    const updatedIngredients = ingredients.map((ingredient) => {
      if (ingredient.id !== id) return ingredient;

      if ((field === "min" || field === "max") && activeSpecies) {
        return {
          ...ingredient,
          speciesLimits: {
            ...normalizeSpeciesLimits(
              ingredient.speciesLimits,
              ingredient.min,
              ingredient.max
            ),
            [activeSpecies]: {
              ...normalizeSpeciesLimits(
                ingredient.speciesLimits,
                ingredient.min,
                ingredient.max
              )[activeSpecies],
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

  function updateRequirement(field: keyof Requirement, value: string | number) {
    const updatedProfiles = requirementProfiles.map((profile, index) =>
      index === activeRequirementIndex ? { ...profile, [field]: value } : profile
    );

    saveAll(ingredients, updatedProfiles, activeRequirementIndex);
  }

  function selectRequirement(index: number) {
    saveAll(ingredients, requirementProfiles, index);
  }

  function createRequirement() {
    const newRequirement: Requirement = {
      ...defaultRequirement,
      name: `Nuevo perfil ${requirementProfiles.length + 1}`
    };

    const updatedProfiles = [...requirementProfiles, newRequirement];
    const newIndex = updatedProfiles.length - 1;

    saveAll(ingredients, updatedProfiles, newIndex);
  }

  function duplicateRequirement() {
    const duplicated: Requirement = {
      ...requirement,
      name: `${requirement.name} copia`
    };

    const updatedProfiles = [...requirementProfiles, duplicated];
    const newIndex = updatedProfiles.length - 1;

    saveAll(ingredients, updatedProfiles, newIndex);
  }

  function loadBaseRequirement(profile: Requirement) {
    const newProfile: Requirement = normalizeRequirement(profile);

    const updatedProfiles = [...requirementProfiles, newProfile];
    const newIndex = updatedProfiles.length - 1;

    saveAll(ingredients, updatedProfiles, newIndex);
    setActiveTab("requirements");
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

  function addIngredient() {
    const baseIngredient = createEmptyIngredient();

    const newIngredient: EditableIngredient = {
      ...baseIngredient,
      species: baseIngredient.species || createAllSpecies(true),
      speciesLimits: createSpeciesLimits(baseIngredient.min, baseIngredient.max),
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

    saveAll(ingredients, [defaultRequirement], 0);
  }

  function saveCurrentFormula(costing?: SavedCosting) {
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
      result,
      ingredientsSnapshot: ingredients,
      requirementSnapshot: requirement,
      costing: normalizeCosting(costing)
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
      `Costo real por kg: S/ ${formatMoney(
        costingData.costWithProductionPerKg,
        3
      )}`,
      `Costo real saco 50 kg: S/ ${formatMoney(
        costingData.realCostPer50Kg,
        2
      )}`,
      `Venta sugerida saco 50 kg: S/ ${formatMoney(
        costingData.salePer50Kg,
        2
      )}`,
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
            🎯 Requerimientos
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
            onAddIngredient={addIngredient}
            onDeleteIngredient={deleteIngredient}
            onMoveIngredient={moveIngredient}
            onUpdateName={updateIngredientName}
            onUpdateSpecies={updateIngredientSpecies}
            onUpdateNutrient={updateNutrient}
          />
        )}

        {activeTab === "requirements" && (
          <RequirementsTab
            requirement={requirement}
            requirementProfiles={requirementProfiles}
            activeRequirementIndex={activeRequirementIndex}
            onSelectRequirement={selectRequirement}
            onUpdateRequirement={updateRequirement}
            onCreateRequirement={createRequirement}
            onDuplicateRequirement={duplicateRequirement}
            onDeleteRequirement={deleteRequirement}
            onResetRequirement={resetRequirement}
            onLoadBaseRequirement={loadBaseRequirement}
          />
        )}

        {activeTab === "results" && (
          <ResultsTab
            result={result}
            requirement={requirement}
            onSaveFormula={saveCurrentFormula}
          />
        )}

        {activeTab === "saved" && (
          <section className="card" style={{ maxWidth: "100%" }}>
            <h2>💾 Fórmulas guardadas</h2>

            <input
              className="price-input"
              type="text"
              placeholder="Buscar fórmula..."
              value={savedSearch}
              onChange={(event) => setSavedSearch(event.target.value)}
              style={{
                width: "100%",
                marginBottom: 14
              }}
            />

            {filteredSavedFormulas.length === 0 ? (
              <div className="note">No hay fórmulas guardadas para mostrar.</div>
            ) : (
              filteredSavedFormulas.map((formula) => {
                const multiplier = getMultiplierNumber(formula);
                const costingData = calculateSavedCosting(formula, multiplier);

                return (
                  <div
                    key={formula.id}
                    className="card"
                    style={{
                      marginTop: 16,
                      border: "1px solid #ddd",
                      padding: 14,
                      maxWidth: "100%",
                      overflowX: "hidden"
                    }}
                  >
                    <h3 style={{ marginTop: 0, wordBreak: "break-word" }}>
                      {formula.name}
                    </h3>

                    <div className="note" style={{ wordBreak: "break-word" }}>
                      Perfil: {formula.requirementName}
                      <br />
                      Guardada: {new Date(formula.createdAt).toLocaleDateString()}
                    </div>

                    <label
                      style={{
                        display: "block",
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
                      value={getMultiplierText(formula)}
                      onChange={(event) =>
                        updateFormulaMultiplierText(
                          formula.id,
                          event.target.value
                        )
                      }
                      onBlur={() => finishMultiplierEdit(formula)}
                      onFocus={(event) => event.currentTarget.select()}
                      style={{
                        width: 110,
                        marginTop: 8
                      }}
                    />

                    <div className="note" style={{ marginTop: 10 }}>
                      Total mezcla:{" "}
                      <strong>{formatKg(costingData.totalKg)} kg</strong>
                      <br />
                      Costo fórmula:{" "}
                      <strong>
                        S/ {formatMoney(costingData.totalFormulaCost, 2)}
                      </strong>
                      <br />
                      Costo real aprox:{" "}
                      <strong>
                        S/ {formatMoney(costingData.totalRealCost, 2)}
                      </strong>
                      <br />
                      Costo real kg:{" "}
                      <strong>
                        S/ {formatMoney(costingData.costWithProductionPerKg, 3)}
                      </strong>
                      <br />
                      Costo real saco 50 kg:{" "}
                      <strong>
                        S/ {formatMoney(costingData.realCostPer50Kg, 2)}
                      </strong>
                      <br />
                      Venta sugerida saco:{" "}
                      <strong>
                        S/ {formatMoney(costingData.salePer50Kg, 2)}
                      </strong>
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        display: "grid",
                        gap: 8
                      }}
                    >
                      {formula.result.ingredients.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            gap: 10,
                            alignItems: "center",
                            padding: "10px 0",
                            borderBottom: "1px solid #e5ece7"
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 600,
                              minWidth: 0,
                              wordBreak: "break-word"
                            }}
                          >
                            {item.name}
                          </div>

                          <div
                            style={{
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              textAlign: "right"
                            }}
                          >
                            {formatKg(item.amountKg100 * multiplier)} kg
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      className="action"
                      type="button"
                      onClick={() => copySavedFormula(formula)}
                    >
                      📋 Copiar fórmula multiplicada
                    </button>

                    <button
                      className="action secondary"
                      type="button"
                      onClick={() => viewSavedFormula(formula)}
                    >
                      👁️ Ver fórmula guardada
                    </button>

                    <button
                      className="action secondary"
                      type="button"
                      onClick={() => renameSavedFormula(formula)}
                    >
                      ✏️ Cambiar nombre
                    </button>

                    <button
                      className="action secondary"
                      type="button"
                      onClick={() => duplicateSavedFormula(formula)}
                    >
                      📄 Duplicar fórmula
                    </button>

                    <button
                      className="action secondary"
                      type="button"
                      onClick={() => deleteSavedFormula(formula.id)}
                    >
                      Eliminar fórmula
                    </button>
                  </div>
                );
              })
            )}
          </section>
        )}
      </div>
    </main>
  );
}
