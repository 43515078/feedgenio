"use client";

import { useEffect, useState } from "react";

import {
  createEmptyIngredient,
  defaultIngredients,
  type Ingredient,
  type NutrientKey
} from "@/lib/ingredients";

import { defaultRequirement, type Requirement } from "@/lib/requirements";

import type { FormulaResult } from "@/lib/solver";

import FormulaTab from "@/components/FormulaTab";
import MatrixTab from "@/components/MatrixTab";
import RequirementsTab from "@/components/RequirementsTab";
import ResultsTab from "@/components/ResultsTab";

type EditableIngredient = Ingredient & {
  active: boolean;
};

type TabType = "formular" | "matrix" | "requirements" | "results";

const INGREDIENTS_STORAGE_KEY = "feedgenio_ingredients_v1";
const REQUIREMENTS_STORAGE_KEY = "feedgenio_requirements_v2";
const ACTIVE_REQUIREMENT_INDEX_KEY = "feedgenio_active_requirement_index_v2";

const nutrientKeys: NutrientKey[] = [
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

function createEmptyNutrients(): Record<NutrientKey, number> {
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

function getInitialIngredients(): EditableIngredient[] {
  return defaultIngredients.map((ingredient) => ({
    ...ingredient,
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

function normalizeSavedIngredients(
  items: EditableIngredient[]
): EditableIngredient[] {
  return items.map((item) => ({
    ...item,
    active: typeof item.active === "boolean" ? item.active : true,
    nutrients: normalizeNutrients(item.nutrients)
  }));
}

function normalizeRequirement(item: Partial<Requirement>): Requirement {
  return {
    name: String(item.name || defaultRequirement.name),
    energy: Number(item.energy || 0),
    protein: Number(item.protein || 0),
    lysine: Number(item.lysine || 0),
    methionine: Number(item.methionine || 0),
    metCys: Number(item.metCys || 0),
    threonine: Number(item.threonine || 0),
    tryptophan: Number(item.tryptophan || 0),
    arginine: Number(item.arginine || 0),
    isoleucine: Number(item.isoleucine || 0),
    valine: Number(item.valine || 0),
    calcium: Number(item.calcium || 0),
    availablePhosphorus: Number(item.availablePhosphorus || 0),
    sodium: Number(item.sodium || 0),
    chlorine: Number(item.chlorine || 0),
    linoleicAcid: Number(item.linoleicAcid || 0)
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

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>("formular");
  const [ingredients, setIngredients] =
    useState<EditableIngredient[]>(getInitialIngredients());
  const [requirementProfiles, setRequirementProfiles] = useState<Requirement[]>(
    [defaultRequirement]
  );
  const [activeRequirementIndex, setActiveRequirementIndex] = useState(0);
  const [result, setResult] = useState<FormulaResult | null>(null);
  const [loading, setLoading] = useState(false);

  const requirement =
    requirementProfiles[activeRequirementIndex] || defaultRequirement;

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

    const savedIngredients = window.localStorage.getItem(
      INGREDIENTS_STORAGE_KEY
    );
    const savedRequirements = window.localStorage.getItem(
      REQUIREMENTS_STORAGE_KEY
    );
    const savedIndex = window.localStorage.getItem(
      ACTIVE_REQUIREMENT_INDEX_KEY
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

    setIngredients(currentIngredients);
    setRequirementProfiles(currentRequirements);
    setActiveRequirementIndex(currentIndex);
    calculateFormula(currentIngredients, currentRequirements[currentIndex]);
  }, []);

  function saveAll(
    updatedIngredients: EditableIngredient[],
    updatedProfiles: Requirement[],
    updatedIndex: number
  ) {
    const safeIndex = updatedProfiles[updatedIndex] ? updatedIndex : 0;

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

    calculateFormula(updatedIngredients, updatedProfiles[safeIndex]);
  }

  function updateIngredient(
    id: string,
    field: "price" | "min" | "max",
    value: number
  ) {
    const updatedIngredients = ingredients.map((ingredient) =>
      ingredient.id === id ? { ...ingredient, [field]: value } : ingredient
    );

    saveAll(updatedIngredients, requirementProfiles, activeRequirementIndex);
  }

  function updateIngredientName(id: string, name: string) {
    const updatedIngredients = ingredients.map((ingredient) =>
      ingredient.id === id ? { ...ingredient, name } : ingredient
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
    const newProfile: Requirement = {
      ...profile,
      name: `${profile.name}`
    };

    const updatedProfiles = [...requirementProfiles, newProfile];
    const newIndex = updatedProfiles.length - 1;

    saveAll(ingredients, updatedProfiles, newIndex);
    setActiveTab("requirements");
  }

  function deleteRequirement() {
    if (requirementProfiles.length <= 1) {
      return;
    }

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
    const freshIngredients = getInitialIngredients();

    saveAll(freshIngredients, requirementProfiles, activeRequirementIndex);
  }

  function resetRequirement() {
    saveAll(ingredients, [defaultRequirement], 0);
  }

  return (
    <main className="page">
      <div className="container">
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
        </section>

        {activeTab === "formular" && (
          <FormulaTab
            ingredients={ingredients}
            loading={loading}
            onToggle={toggleIngredient}
            onUpdate={updateIngredient}
            onCalculate={() => calculateFormula(ingredients, requirement)}
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
            onUpdateName={updateIngredientName}
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
          <ResultsTab result={result} requirement={requirement} />
        )}
      </div>
    </main>
  );
}
