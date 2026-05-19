"use client";

import { useEffect, useState } from "react";
import { defaultIngredients, type Ingredient } from "@/lib/ingredients";
import { layerRequirement } from "@/lib/requirements";
import type { FormulaResult } from "@/lib/solver";

type EditableIngredient = Ingredient & {
  active: boolean;
};

type TabType =
  | "formular"
  | "matrix"
  | "requirements"
  | "results";

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
  const [activeTab, setActiveTab] =
    useState<TabType>("formular");

  const [ingredients, setIngredients] =
    useState<EditableIngredient[]>(
      getInitialIngredients()
    );

  const [result, setResult] =
    useState<FormulaResult | null>(null);

  const [loading, setLoading] = useState(false);

  async function calculateFormula(
    currentIngredients: EditableIngredient[]
  ) {
    setLoading(true);

    const activeIngredients =
      currentIngredients.filter(
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

      const data =
        (await response.json()) as FormulaResult;

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
        message:
          "No se pudo conectar con el calculador."
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved =
      window.localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const parsed =
          JSON.parse(saved) as EditableIngredient[];

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

  function saveAndCalculate(
    updatedIngredients: EditableIngredient[]
  ) {
    setIngredients(updatedIngredients);

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedIngredients)
    );

    calculateFormula(updatedIngredients);
  }

  function updateIngredient(
    id: string,
    field: "price" | "min" | "max",
    value: number
  ) {
    const updatedIngredients = ingredients.map(
      (ingredient) =>
        ingredient.id === id
          ? {
              ...ingredient,
              [field]: value
            }
          : ingredient
    );

    saveAndCalculate(updatedIngredients);
  }

  function toggleIngredient(id: string) {
    const updatedIngredients = ingredients.map(
      (ingredient) =>
        ingredient.id === id
          ? {
              ...ingredient,
              active: !ingredient.active
            }
          : ingredient
    );

    saveAndCalculate(updatedIngredients);
  }

  function resetIngredients() {
    const freshIngredients =
      getInitialIngredients();

    window.localStorage.removeItem(STORAGE_KEY);

    saveAndCalculate(freshIngredients);
  }

  return (
    <main className="page">
      <div className="container">
        <section className="hero">
          <h1>FeedGenio 🧠🌽</h1>

          <p>
            Sistema profesional de formulación
            de raciones por mínimo costo.
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
              activeTab === "requirements"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveTab("requirements")
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
        </section>

        {activeTab === "formular" && (
          <section className="card">
            <h2>
              📦 Insumos, precios y límites
            </h2>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Usar</th>
                    <th>Insumo</th>
                    <th>Precio</th>
                    <th>Mín %</th>
                    <th>Máx %</th>
                  </tr>
                </thead>

                <tbody>
                  {ingredients.map((ingredient) => (
                    <tr
                      key={ingredient.id}
                      style={{
                        opacity:
                          ingredient.active
                            ? 1
                            : 0.45
                      }}
                    >
                      <td>
                        <input
                          className="checkbox-input"
                          type="checkbox"
                          checked={
                            ingredient.active
                          }
                          onChange={() =>
                            toggleIngredient(
                              ingredient.id
                            )
                          }
                        />
                      </td>

                      <td>
                        {ingredient.name}
                      </td>

                      <td>
                        <input
                          className="price-input"
                          type="number"
                          step="0.01"
                          value={
                            ingredient.price
                          }
                          onChange={(event) =>
                            updateIngredient(
                              ingredient.id,
                              "price",
                              Number(
                                event.target
                                  .value || 0
                              )
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
                              Number(
                                event.target
                                  .value || 0
                              )
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
                              Number(
                                event.target
                                  .value || 0
                              )
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
              onClick={() =>
                calculateFormula(
                  ingredients
                )
              }
            >
              {loading
                ? "Calculando..."
                : "Recalcular fórmula"}
            </button>

            <button
              className="action secondary"
              type="button"
              onClick={resetIngredients}
            >
              Reiniciar datos
            </button>
          </section>
        )}

        {activeTab === "matrix" && (
          <section className="card">
            <h2>
              🧪 Matriz nutricional
            </h2>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>EM</th>
                    <th>PB</th>
                    <th>Lis</th>
                    <th>Met</th>
                    <th>M+C</th>
                    <th>Ca</th>
                    <th>P disp</th>
                    <th>Na</th>
                  </tr>
                </thead>

                <tbody>
                  {ingredients.map(
                    (ingredient) => (
                      <tr
                        key={
                          ingredient.id
                        }
                      >
                        <td>
                          {
                            ingredient.name
                          }
                        </td>

                        <td>
                          {
                            ingredient
                              .nutrients
                              .energy
                          }
                        </td>

                        <td>
                          {
                            ingredient
                              .nutrients
                              .protein
                          }
                        </td>

                        <td>
                          {
                            ingredient
                              .nutrients
                              .lysine
                          }
                        </td>

                        <td>
                          {
                            ingredient
                              .nutrients
                              .methionine
                          }
                        </td>

                        <td>
                          {
                            ingredient
                              .nutrients
                              .metCys
                          }
                        </td>

                        <td>
                          {
                            ingredient
                              .nutrients
                              .calcium
                          }
                        </td>

                        <td>
                          {
                            ingredient
                              .nutrients
                              .availablePhosphorus
                          }
                        </td>

                        <td>
                          {
                            ingredient
                              .nutrients
                              .sodium
                          }
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "requirements" && (
          <section className="card">
            <h2>
              🎯 Requerimientos actuales
            </h2>

            <div className="table-wrap">
              <table>
                <tbody>
                  <tr>
                    <td>Energía</td>

                    <td>
                      {
                        layerRequirement.energy
                      }{" "}
                      kcal/kg
                    </td>
                  </tr>

                  <tr>
                    <td>Proteína</td>

                    <td>
                      {
                        layerRequirement.protein
                      }
                      %
                    </td>
                  </tr>

                  <tr>
                    <td>Lisina</td>

                    <td>
                      {
                        layerRequirement.lysine
                      }
                      %
                    </td>
                  </tr>

                  <tr>
                    <td>Metionina</td>

                    <td>
                      {
                        layerRequirement.methionine
                      }
                      %
                    </td>
                  </tr>

                  <tr>
                    <td>Met + Cist</td>

                    <td>
                      {
                        layerRequirement.metCys
                      }
                      %
                    </td>
                  </tr>

                  <tr>
                    <td>Calcio</td>

                    <td>
                      {
                        layerRequirement.calcium
                      }
                      %
                    </td>
                  </tr>

                  <tr>
                    <td>
                      Fósforo disponible
                    </td>

                    <td>
                      {
                        layerRequirement.availablePhosphorus
                      }
                      %
                    </td>
                  </tr>

                  <tr>
                    <td>Sodio</td>

                    <td>
                      {
                        layerRequirement.sodium
                      }
                      %
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="note">
              Más adelante aquí podrás:
              <br />
              <br />
              ✅ Crear fases
              <br />
              ✅ Duplicar perfiles
              <br />
              ✅ Manejar Cobb, cerdos,
              cuyes y ponedoras
              <br />
              ✅ Requerimientos verano /
              invierno
            </div>
          </section>
        )}

        {activeTab === "results" && (
          <>
            <section className="card">
              <h2>
                📊 Resultados de formulación
              </h2>

              {!result ? (
                <p>
                  Calculando fórmula...
                </p>
              ) : !result.feasible ? (
                <div className="warning">
                  <strong>
                    No se pudo formular.
                  </strong>

                  <p>
                    {result.message}
                  </p>
                </div>
              ) : (
                <>
                  <div className="stats">
                    <div className="stat">
                      <span>
                        Costo por kg
                      </span>

                      <strong>
                        S/{" "}
                        {round(
                          result.costPerKg,
                          3
                        )}
                      </strong>
                    </div>

                    <div className="stat">
                      <span>
                        Costo saco 50 kg
                      </span>

                      <strong>
                        S/{" "}
                        {round(
                          result.costPer50Kg,
                          2
                        )}
                      </strong>
                    </div>

                    <div className="stat">
                      <span>
                        Costo 100 kg
                      </span>

                      <strong>
                        S/{" "}
                        {round(
                          result.costPer100Kg,
                          2
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>
                            Insumo
                          </th>

                          <th>
                            Kg / 100
                          </th>

                          <th>
                            Kg / 50
                          </th>

                          <th>
                            Costo
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {result.ingredients.map(
                          (item) => (
                            <tr
                              key={item.id}
                            >
                              <td>
                                {
                                  item.name
                                }
                              </td>

                              <td>
                                {round(
                                  item.amountKg100,
                                  3
                                )}
                              </td>

                              <td>
                                {round(
                                  item.amountKg50,
                                  3
                                )}
                              </td>

                              <td>
                                S/{" "}
                                {round(
                                  item.cost,
                                  2
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            {result?.feasible && (
              <section
                className="card"
                style={{
                  marginTop: 18
                }}
              >
                <h2>
                  🧪 Nutrientes obtenidos
                </h2>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>
                          Nutriente
                        </th>

                        <th>
                          Obtenido
                        </th>

                        <th>
                          Requerido
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <td>
                          Energía
                        </td>

                        <td>
                          {round(
                            result
                              .nutrients
                              .energy,
                            0
                          )}{" "}
                          kcal/kg
                        </td>

                        <td>
                          {
                            layerRequirement.energy
                          }
                        </td>
                      </tr>

                      <tr>
                        <td>
                          Proteína
                        </td>

                        <td>
                          {round(
                            result
                              .nutrients
                              .protein
                          )}
                          %
                        </td>

                        <td>
                          {
                            layerRequirement.protein
                          }
                          %
                        </td>
                      </tr>

                      <tr>
                        <td>
                          Lisina
                        </td>

                        <td>
                          {round(
                            result
                              .nutrients
                              .lysine
                          )}
                          %
                        </td>

                        <td>
                          {
                            layerRequirement.lysine
                          }
                          %
                        </td>
                      </tr>

                      <tr>
                        <td>
                          Metionina
                        </td>

                        <td>
                          {round(
                            result
                              .nutrients
                              .methionine
                          )}
                          %
                        </td>

                        <td>
                          {
                            layerRequirement.methionine
                          }
                          %
                        </td>
                      </tr>

                      <tr>
                        <td>
                          Met + Cist
                        </td>

                        <td>
                          {round(
                            result
                              .nutrients
                              .metCys
                          )}
                          %
                        </td>

                        <td>
                          {
                            layerRequirement.metCys
                          }
                          %
                        </td>
                      </tr>

                      <tr>
                        <td>
                          Calcio
                        </td>

                        <td>
                          {round(
                            result
                              .nutrients
                              .calcium
                          )}
                          %
                        </td>

                        <td>
                          {
                            layerRequirement.calcium
                          }
                          %
                        </td>
                      </tr>

                      <tr>
                        <td>
                          P disp
                        </td>

                        <td>
                          {round(
                            result
                              .nutrients
                              .availablePhosphorus
                          )}
                          %
                        </td>

                        <td>
                          {
                            layerRequirement.availablePhosphorus
                          }
                          %
                        </td>
                      </tr>

                      <tr>
                        <td>
                          Sodio
                        </td>

                        <td>
                          {round(
                            result
                              .nutrients
                              .sodium
                          )}
                          %
                        </td>

                        <td>
                          {
                            layerRequirement.sodium
                          }
                          %
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
