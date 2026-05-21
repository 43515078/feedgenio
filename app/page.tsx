"use client";

import { useEffect, useMemo, useState } from "react";

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
  ingredientsSnapshot?: EditableIngredient[];
  requirementSnapshot?: Requirement;
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

function formatKg(value: number) {
  return Number(value).toFixed(3);
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
      result,
      ingredientsSnapshot: ingredients,
      requirementSnapshot: requirement
    };

    const updated = [newFormula, ...savedFormulas];
    saveSavedFormulas(updated);
    window.alert("Fórmula guardada.");
    setActiveTab("saved");
  }

  function deleteSavedFormula(id: string) {
    const updated = savedFormulas.filter((item) => item.id !== id);
    saveSavedFormulas(updated);

    setMultiplierDrafts((current) => {
      const copy = { ...current };
      delete copy[id];
      return copy;
    });
  }

  function renameSavedFormula(formula: SavedFormula) {
    const newName = window.prompt("Nuevo nombre:", formula.name);

    if (!newName) return;

    const updated = savedFormulas.map((item) =>
      item.id === formula.id ? { ...item, name: newName } : item
    );

    saveSavedFormulas(updated);
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

  function loadSavedFormulaToEditor(formula: SavedFormula) {
    if (!formula.ingredientsSnapshot || !formula.requirementSnapshot) {
      window.alert(
        "Esta fórmula fue guardada antes de activar la carga al editor. Vuelve a guardarla desde Resultados para poder cargarla."
      );
      return;
    }

    const loadedIngredients = normalizeSavedIngredients(
      formula.ingredientsSnapshot
    );

    const loadedRequirement: Requirement = {
      ...normalizeRequirement(formula.requirementSnapshot),
      name: `${formula.requirementSnapshot.name} cargada`
    };

    const updatedProfiles = [...requirementProfiles, loadedRequirement];
    const newIndex = updatedProfiles.length - 1;

    saveAll(loadedIngredients, updatedProfiles, newIndex);

    window.alert("Fórmula cargada al editor.");
    setActiveTab("formular");
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

    const updated = savedFormulas.map((item) =>
      item.id === id
        ? {
            ...item,
            multiplier: numericValue
          }
        : item
    );

    saveSavedFormulas(updated);
  }

  function finishMultiplierEdit(formula: SavedFormula) {
    const numericValue = getMultiplierNumber(formula);
    const finalValue = numericValue > 0 ? numericValue : 1;

    const updated = savedFormulas.map((item) =>
      item.id === formula.id
        ? {
            ...item,
            multiplier: finalValue
          }
        : item
    );

    saveSavedFormulas(updated);

    setMultiplierDrafts((current) => ({
      ...current,
      [formula.id]: String(finalValue)
    }));
  }

  function buildSavedFormulaText(formula: SavedFormula) {
    const multiplier = getMultiplierNumber(formula);
    const totalKg = 100 * multiplier;
    const totalCost = formula.result.costPer100Kg * multiplier;

    const lines = [
      `FeedGenio - ${formula.name}`,
      `Perfil: ${formula.requirementName}`,
      `Total mezcla: ${formatKg(totalKg)} kg`,
      `Costo aprox: S/ ${totalCost.toFixed(2)}`,
      `Costo por kg: S/ ${formula.result.costPerKg.toFixed(3)}`,
      "",
      "Ingredientes:"
    ];

    formula.result.ingredients.forEach((item) => {
      lines.push(`${item.name}: ${formatKg(item.amountKg100 * multiplier)} kg`);
    });

    return lines.join("\n");
  }

  async function copySavedFormula(formula: SavedFormula) {
    const text = buildSavedFormulaText(formula);

    try {
      await navigator.clipboard.writeText(text);
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
                const totalKg = 100 * multiplier;
                const totalCost = formula.result.costPer100Kg * multiplier;
                const canLoadToEditor =
                  Boolean(formula.ingredientsSnapshot) &&
                  Boolean(formula.requirementSnapshot);

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
                    <h3
                      style={{
                        marginTop: 0,
                        wordBreak: "break-word"
                      }}
                    >
                      {formula.name}
                    </h3>

                    <div className="note" style={{ wordBreak: "break-word" }}>
                      Perfil: {formula.requirementName}
                      <br />
                      Guardada:{" "}
                      {new Date(formula.createdAt).toLocaleDateString()}
                      {!canLoadToEditor && (
                        <>
                          <br />
                          ⚠️ Fórmula antigua: no tiene copia editable.
                        </>
                      )}
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
                        updateFormulaMultiplierText(formula.id, event.target.value)
                      }
                      onBlur={() => finishMultiplierEdit(formula)}
                      onFocus={(event) => event.currentTarget.select()}
                      style={{
                        width: 110,
                        marginTop: 8
                      }}
                    />

                    <div className="note" style={{ marginTop: 10 }}>
                      Total mezcla: <strong>{formatKg(totalKg)} kg</strong>
                      <br />
                      Costo aprox: <strong>S/ {totalCost.toFixed(2)}</strong>
                      <br />
                      Costo por kg:{" "}
                      <strong>S/ {formula.result.costPerKg.toFixed(3)}</strong>
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
                      onClick={() => loadSavedFormulaToEditor(formula)}
                    >
                      🔁 Cargar al editor
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
