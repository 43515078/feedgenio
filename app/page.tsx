"use client";

import { useEffect, useState } from "react";
import {
  createEmptyIngredient,
  defaultIngredients,
  type Ingredient,
  type NutrientKey
} from "@/lib/ingredients";
import { layerRequirement } from "@/lib/requirements";
import type { FormulaResult } from "@/lib/solver";

import FormulaTab from "@/components/FormulaTab";
import MatrixTab from "@/components/MatrixTab";
import RequirementsTab from "@/components/RequirementsTab";
import ResultsTab from "@/components/ResultsTab";

type EditableIngredient = Ingredient & {
  active: boolean;
};

type TabType = "formular" | "matrix" | "requirements" | "results";

const STORAGE_KEY = "feedgenio_ingredients_v1";

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

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>("formular");
  const [ingredients, setIngredients] =
    useState<EditableIngredient[]>(getInitialIngredients());
  const [result, setResult] = useState<FormulaResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function calculateFormula(currentIngredients: EditableIngredient[]) {
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
          ingredients: activeIngredients
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
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as EditableIngredient[];
        const normalized = normalizeSavedIngredients(parsed);

        setIngredients(normalized);
        calculateFormula(normalized);
        return;
      } catch {
        calculateFormula(getInitialIngredients());
        return;
      }
    }

    calculateFormula(getInitialIngredients());
  }, []);

  function saveAndCalculate(updatedIngredients: EditableIngredient[]) {
    setIngredients(updatedIngredients);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedIngredients));
    calculateFormula(updatedIngredients);
  }

  function updateIngredient(
    id: string,
    field: "price" | "min" | "max",
    value: number
  ) {
    const updatedIngredients = ingredients.map((ingredient) =>
      ingredient.id === id ? { ...ingredient, [field]: value } : ingredient
    );

    saveAndCalculate(updatedIngredients);
  }

  function updateIngredientName(id: string, name: string) {
    const updatedIngredients = ingredients.map((ingredient) =>
      ingredient.id === id ? { ...ingredient, name } : ingredient
    );

    saveAndCalculate(updatedIngredients);
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

    saveAndCalculate(updatedIngredients);
  }

  function toggleIngredient(id: string) {
    const updatedIngredients = ingredients.map((ingredient) =>
      ingredient.id === id
        ? { ...ingredient, active: !ingredient.active }
        : ingredient
    );

    saveAndCalculate(updatedIngredients);
  }

  function addIngredient() {
    const newIngredient: EditableIngredient = {
      ...createEmptyIngredient(),
      active: true
    };

    saveAndCalculate([...ingredients, newIngredient]);
    setActiveTab("matrix");
  }

  function deleteIngredient(id: string) {
    const updatedIngredients = ingredients.filter(
      (ingredient) => ingredient.id !== id
    );

    saveAndCalculate(updatedIngredients);
  }

  function resetIngredients() {
    const freshIngredients = getInitialIngredients();

    window.localStorage.removeItem(STORAGE_KEY);
    saveAndCalculate(freshIngredients);
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
            onCalculate={() => calculateFormula(ingredients)}
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
          <RequirementsTab requirement={layerRequirement} />
        )}

        {activeTab === "results" && (
          <ResultsTab result={result} requirement={layerRequirement} />
        )}
      </div>
    </main>
  );
}
