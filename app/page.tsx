"use client";

import { useEffect, useState } from "react";
import { defaultIngredients, type Ingredient } from "@/lib/ingredients";
import { layerRequirement } from "@/lib/requirements";
import type { FormulaResult } from "@/lib/solver";

type EditableIngredient = Ingredient & {
  active: boolean;
};

const STORAGE_KEY = "feedgenio_ingredients_v1";

function round(value: number, decimals = 2) {
  return Number(value).toFixed(decimals);
}

function getInitialIngredients(): EditableIngredient[] {
  return defaultIngredients.map((ingredient) => ({
    ...ingredient,
    active: true
  }));
}

export default function HomePage() {
  const [ingredients, setIngredients] = useState<EditableIngredient[]>(
    getInitialIngredients()
  );

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
        setIngredients(parsed);
        calculateFormula(parsed);
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

  function toggleIngredient(id: string) {
    const updatedIngredients = ingredients.map((ingredient) =>
      ingredient.id === id
        ? { ...ingredient, active: !ingredient.active }
        : ingredient
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
          <p>
            Creador de raciones por mínimo costo. Primera versión para ponedoras
            en producción.
          </p>
        </section>

        <section className="grid">
          <div className="card">
            <h2>📦 Insumos, precios y límites</h2>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Usar</th>
                    <th>Insumo</th>
                    <th>Precio S/kg</th>
                    <th>Mín %</th>
                    <th>Máx %</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ingredient) => (
                    <tr
                      key={ingredient.id}
                      style={{
                        opacity: ingredient.active ? 1 : 0.45
                      }}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={ingredient.active}
                          onChange={() => toggleIngredient(ingredient.id)}
                        />
                      </td>
                      <td>{ingredient.name}</td>
                      <td>
                        <input
                          className="price-input"
                          type="number"
                          step="0.01"
                          value={ingredient.price}
                          onChange={(event) =>
                            updateIngredient(
                              ingredient.id,
                              "price",
                              Number(event.target.value || 0)
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="price-input"
                          type="number"
                          step="0.1"
                          value={ingredient.min}
                          onChange={(event) =>
                            updateIngredient(
                              ingredient.id,
                              "min",
                              Number(event.target.value || 0)
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="price-input"
                          type="number"
                          step="0.1"
                          value={ingredient.max}
                          onChange={(event) =>
                            updateIngredient(
                              ingredient.id,
                              "max",
                              Number(event.target.value || 0)
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              className="action"
              type="button"
              onClick={() => calculateFormula(ingredients)}
            >
              {loading ? "Calculando..." : "Recalcular fórmula"}
            </button>

            <button
              className="action"
              type="button"
              onClick={resetIngredients}
              style={{
                marginTop: 10,
                background: "#5d6b63"
              }}
            >
              Reiniciar datos
            </button>
          </div>

          <div className="card">
            <h2>🎯 Requerimiento actual</h2>

            <table>
              <tbody>
                <tr>
                  <td>Energía</td>
                  <td>{layerRequirement.energy} kcal/kg</td>
                </tr>
                <tr>
                  <td>Proteína</td>
                  <td>{layerRequirement.protein}%</td>
                </tr>
                <tr>
                  <td>Lisina</td>
                  <td>{layerRequirement.lysine}%</td>
                </tr>
                <tr>
                  <td>Metionina</td>
                  <td>{layerRequirement.methionine}%</td>
                </tr>
                <tr>
                  <td>Met + Cist</td>
                  <td>{layerRequirement.metCys}%</td>
                </tr>
                <tr>
                  <td>Calcio</td>
                  <td>{layerRequirement.calcium}%</td>
                </tr>
                <tr>
                  <td>Fósforo disponible</td>
                  <td>{layerRequirement.availablePhosphorus}%</td>
                </tr>
                <tr>
                  <td>Sodio</td>
                  <td>{layerRequirement.sodium}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="card" style={{ marginTop: 18 }}>
          <h2>⚖️ Fórmula calculada</h2>

          {!result ? (
            <p>Calculando fórmula...</p>
          ) : !result.feasible ? (
            <div className="warning">
              <strong>No se pudo formular.</strong>
              <p>{result.message}</p>
            </div>
          ) : (
            <>
              <div className="stats">
                <div className="stat">
                  <span>Costo por kg</span>
                  <strong>S/ {round(result.costPerKg, 3)}</strong>
                </div>
                <div className="stat">
                  <span>Costo por saco 50 kg</span>
                  <strong>S/ {round(result.costPer50Kg, 2)}</strong>
                </div>
                <div className="stat">
                  <span>Costo por 100 kg</span>
                  <strong>S/ {round(result.costPer100Kg, 2)}</strong>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Insumo</th>
                      <th>Kg / 100 kg</th>
                      <th>Kg / saco 50 kg</th>
                      <th>Costo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.ingredients.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{round(item.amountKg100, 3)}</td>
                        <td>{round(item.amountKg50, 3)}</td>
                        <td>S/ {round(item.cost, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        {result?.feasible && (
          <section className="card" style={{ marginTop: 18 }}>
            <h2>🧪 Nutrientes obtenidos</h2>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nutriente</th>
                    <th>Obtenido</th>
                    <th>Requerido</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Energía</td>
                    <td>{round(result.nutrients.energy, 0)} kcal/kg</td>
                    <td>{layerRequirement.energy}</td>
                    <td className="good">Cumple</td>
                  </tr>
                  <tr>
                    <td>Proteína</td>
                    <td>{round(result.nutrients.protein)}%</td>
                    <td>{layerRequirement.protein}%</td>
                    <td className="good">Cumple</td>
                  </tr>
                  <tr>
                    <td>Lisina</td>
                    <td>{round(result.nutrients.lysine)}%</td>
                    <td>{layerRequirement.lysine}%</td>
                    <td className="good">Cumple</td>
                  </tr>
                  <tr>
                    <td>Metionina</td>
                    <td>{round(result.nutrients.methionine)}%</td>
                    <td>{layerRequirement.methionine}%</td>
                    <td className="good">Cumple</td>
                  </tr>
                  <tr>
                    <td>Met + Cist</td>
                    <td>{round(result.nutrients.metCys)}%</td>
                    <td>{layerRequirement.metCys}%</td>
                    <td className="good">Cumple</td>
                  </tr>
                  <tr>
                    <td>Calcio</td>
                    <td>{round(result.nutrients.calcium)}%</td>
                    <td>{layerRequirement.calcium}%</td>
                    <td className="good">Cumple</td>
                  </tr>
                  <tr>
                    <td>Fósforo disp.</td>
                    <td>{round(result.nutrients.availablePhosphorus)}%</td>
                    <td>{layerRequirement.availablePhosphorus}%</td>
                    <td className="good">Cumple</td>
                  </tr>
                  <tr>
                    <td>Sodio</td>
                    <td>{round(result.nutrients.sodium)}%</td>
                    <td>{layerRequirement.sodium}%</td>
                    <td className="good">Cumple</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
