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

type SavedFormula = {
  id: string;
  name: string;
  createdAt: string;
  multiplier: number;
  requirementName: string;
  result: FormulaResult;
};

type TabType = "formular" | "matrix" | "requirements" | "results" | "saved";

const INGREDIENTS_STORAGE_KEY = "feedgenio_ingredients_v1";
const REQUIREMENTS_STORAGE_KEY = "feedgenio_requirements_v2";
const ACTIVE_REQUIREMENT_INDEX_KEY = "feedgenio_active_requirement_index_v2";
const SAVED_FORMULAS_STORAGE_KEY = "feedgenio_saved_formulas_v1";

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
  const [savedFormulas, setSavedFormulas] = useState<SavedFormula[]>([]);
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
        setSavedFormulas(parsed);
      } catch {}
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

  function saveSavedFormulas(updated: SavedFormula[]) {
    setSavedFormulas(updated);
    window.localStorage.setItem(
      SAVED_FORMULAS_STORAGE_KEY,
      JSON.stringify(updated)
    );
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

  function saveCurrentFormula() {
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
      result
    };

    const updated = [newFormula, ...savedFormulas];
    saveSavedFormulas(updated);
    window.alert("Fórmula guardada.");
    setActiveTab("saved");
  }

  function deleteSavedFormula(id: string) {
    const updated = savedFormulas.filter((item) => item.id !== id);
    saveSavedFormulas(updated);
  }

  function updateFormulaMultiplier(id: string, multiplier: number) {
    const safeMultiplier = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;

    const updated = savedFormulas.map((item) =>
      item.id === id
        ? {
            ...item,
            multiplier: safeMultiplier
          }
        : item
    );

    saveSavedFormulas(updated);
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

          <button
            className={`tab-button ${activeTab === "saved" ? "active" : ""}`}
            onClick={() => setActiveTab("saved")}
          >
            💾 Guardadas
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
          <ResultsTab
            result={result}
            requirement={requirement}
            onSaveFormula={saveCurrentFormula}
          />
        )}

        {activeTab === "saved" && (
          <section className="card">
            <h2>💾 Fórmulas guardadas</h2>

            {savedFormulas.length === 0 ? (
              <div className="note">No hay fórmulas guardadas todavía.</div>
            ) : (
              savedFormulas.map((formula) => (
                <div
                  key={formula.id}
                  className="card"
                  style={{
                    marginTop: 16,
                    border: "1px solid #ddd"
                  }}
                >
                  <h3>{formula.name}</h3>

                  <div className="note">
                    Perfil: {formula.requirementName}
                    <br />
                    Guardada:{" "}
                    {new Date(formula.createdAt).toLocaleDateString()}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <strong>Multiplicador:</strong>
                  </div>

                  <input
                    className="price-input"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formula.multiplier}
                    onChange={(event) =>
                      updateFormulaMultiplier(
                        formula.id,
                        Number(event.target.value || 1)
                      )
                    }
                    style={{
                      maxWidth: 120,
                      marginTop: 8
                    }}
                  />

                  <div className="table-wrap" style={{ marginTop: 14 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Ingrediente</th>
                          <th>Kg por 100 kg</th>
                          <th>Kg finales</th>
                        </tr>
                      </thead>

                      <tbody>
                        {formula.result.ingredients.map((item) => (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                            <td>{item.amountKg100.toFixed(3)} kg</td>
                            <td>
                              {(item.amountKg100 * formula.multiplier).toFixed(
                                3
                              )}{" "}
                              kg
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="stats" style={{ marginTop: 14 }}>
                    <div className="stat">
                      <span>Total mezcla</span>
                      <strong>{(100 * formula.multiplier).toFixed(0)} kg</strong>
                    </div>

                    <div className="stat">
                      <span>Costo aprox</span>
                      <strong>
                        S/{" "}
                        {(
                          formula.result.costPer100Kg * formula.multiplier
                        ).toFixed(2)}
                      </strong>
                    </div>

                    <div className="stat">
                      <span>Costo por kg</span>
                      <strong>S/ {formula.result.costPerKg.toFixed(3)}</strong>
                    </div>
                  </div>

                  <button
                    className="action secondary"
                    type="button"
                    onClick={() => deleteSavedFormula(formula.id)}
                  >
                    Eliminar fórmula
                  </button>
                </div>
              ))
            )}
          </section>
        )}
      </div>
    </main>
  );
}
