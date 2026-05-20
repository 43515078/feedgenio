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
const REQUIREMENT_STORAGE_KEY = "feedgenio_requirement_v1";

const nutrientKeys: NutrientKey[] = [
  "energy",
  "protein",
  "lysine",
  "methionine",
  "metCys",
  "calcium",
  "availablePhosphorus",
  "sodium"
];

function getInitialIngredients(): EditableIngredient[] {
  return defaultIngredients.map((ingredient) => ({
    ...ingredient,
    active: true
  }));
}

function normalizeSavedIngredients(
  items: EditableIngredient[]
): EditableIngredient[] {
  return items.map((item) => ({
    ...item,
    active: typeof item.active === "boolean" ? item.active : true,
    nutrients: {
      energy: Number(item.nutrients?.energy || 0),
      protein: Number(item.nutrients?.protein || 0),
      lysine: Number(item.nutrients?.lysine || 0),
      methionine: Number(item.nutrients?.methionine || 0),
      metCys: Number(item.nutrients?.metCys || 0),
      calcium: Number(item.nutrients?.calcium || 0),
      availablePhosphorus: Number(item.nutrients?.availablePhosphorus || 0),
      sodium: Number(item.nutrients?.sodium || 0)
    }
  }));
}

function normalizeSavedRequirement(item: Requirement): Requirement {
  return {
    name: String(item.name || defaultRequirement.name),
    energy: Number(item.energy || 0),
    protein: Number(item.protein || 0),
    lysine: Number(item.lysine || 0),
    methionine: Number(item.methionine || 0),
    metCys: Number(item.metCys || 0),
    calcium: Number(item.calcium || 0),
    availablePhosphorus: Number(item.availablePhosphorus || 0),
    sodium: Number(item.sodium || 0)
  };
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>("formular");
  const [ingredients, setIngredients] =
    useState<EditableIngredient[]>(getInitialIngredients());
  const [requirement, setRequirement] =
    useState<Requirement>(defaultRequirement);
  const [result, setResult] = useState<FormulaResult | null>(null);
  const [loading, setLoading] = useState(false);

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
      setResult({
        feasible: false,
        costPerKg: 0,
        costPer100Kg: 0,
        costPer50Kg: 0,
        ingredients: [],
        nutrients: {
          energy: 0,
          protein: 0,
          lysine: 0,
          methionine: 0,
          metCys: 0,
          calcium: 0,
          availablePhosphorus: 0,
          sodium: 0
        },
        message: "No se pudo conectar con el calculador."
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let currentIngredients = getInitialIngredients();
    let currentRequirement = defaultRequirement;

    const savedIngredients =
      window.localStorage.getItem(INGREDIENTS_STORAGE_KEY);
    const savedRequirement =
      window.localStorage.getItem(REQUIREMENT_STORAGE_KEY);

    if (savedIngredients) {
      try {
        const parsed = JSON.parse(savedIngredients) as EditableIngredient[];
        currentIngredients = normalizeSavedIngredients(parsed);
      } catch {
        currentIngredients = getInitialIngredients();
      }
    }

    if (savedRequirement) {
      try {
        const parsed = JSON.parse(savedRequirement) as Requirement;
        currentRequirement = normalizeSavedRequirement(parsed);
      } catch {
        currentRequirement = defaultRequirement;
      }
    }

    setIngredients(currentIngredients);
    setRequirement(currentRequirement);
    calculateFormula(currentIngredients, currentRequirement);
  }, []);

  function saveAndCalculate(
    updatedIngredients: EditableIngredient[],
    updatedRequirement: Requirement
  ) {
    setIngredients(updatedIngredients);
    setRequirement(updatedRequirement);

    window.localStorage.setItem(
      INGREDIENTS_STORAGE_KEY,
      JSON.stringify(updatedIngredients)
    );

    window.localStorage.setItem(
      REQUIREMENT_STORAGE_KEY,
      JSON.stringify(updatedRequirement)
    );

    calculateFormula(updatedIngredients, updatedRequirement);
  }

  function updateIngredient(
    id: string,
    field: "price" | "min" | "max",
    value: number
  ) {
    const updatedIngredients = ingredients.map((ingredient) =>
      ingredient.id === id ? { ...ingredient, [field]: value } : ingredient
    );

    saveAndCalculate(updatedIngredients, requirement);
  }

  function updateIngredientName(id: string, name: string) {
    const updatedIngredients = ingredients.map((ingredient) =>
      ingredient.id === id ? { ...ingredient, name } : ingredient
    );

    saveAndCalculate(updatedIngredients, requirement);
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

    saveAndCalculate(updatedIngredients, requirement);
  }

  function updateRequirement(field: keyof Requirement, value: string | number) {
    const updatedRequirement: Requirement = {
      ...requirement,
      [field]: value
    };

    saveAndCalculate(ingredients, updatedRequirement);
  }

  function toggleIngredient(id: string) {
    const updatedIngredients = ingredients.map((ingredient) =>
      ingredient.id === id
        ? { ...ingredient, active: !ingredient.active }
        : ingredient
    );

    saveAndCalculate(updatedIngredients, requirement);
  }

  function addIngredient() {
    const newIngredient: EditableIngredient = {
      ...createEmptyIngredient(),
      active: true
    };

    saveAndCalculate([...ingredients, newIngredient], requirement);
    setActiveTab("matrix");
  }

  function deleteIngredient(id: string) {
    const updatedIngredients = ingredients.filter(
      (ingredient) => ingredient.id !== id
    );

    saveAndCalculate(updatedIngredients, requirement);
  }

  function resetIngredients() {
    const freshIngredients = getInitialIngredients();

    window.localStorage.removeItem(INGREDIENTS_STORAGE_KEY);
    saveAndCalculate(freshIngredients, requirement);
  }

  function resetRequirement() {
    window.localStorage.removeItem(REQUIREMENT_STORAGE_KEY);
    saveAndCalculate(ingredients, defaultRequirement);
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
          <>
            <RequirementsTab
              requirement={requirement}
              onUpdateRequirement={updateRequirement}
            />

            <button
              className="action secondary"
              type="button"
              onClick={resetRequirement}
            >
              Reiniciar requerimientos
            </button>
          </>
        )}

        {activeTab === "results" && (
          <ResultsTab result={result} requirement={requirement} />
        )}
      </div>
    </main>
  );
}
