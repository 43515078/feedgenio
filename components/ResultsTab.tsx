"use client";

import { useEffect, useState } from "react";
import {
  nutrientLabels,
  nutrientKeys,
  type NutrientKey
} from "@/lib/ingredients";
import type { Requirement } from "@/lib/requirements";
import type { FormulaResult } from "@/lib/solver";

type SavedFormula = {
  id: string;
  name: string;
  createdAt: string;
  multiplier: number;
  requirementName: string;
  result: FormulaResult;
};

type Props = {
  result: FormulaResult | null;
  requirement: Requirement;
  onSaveFormula: () => void;
  savedFormulas: SavedFormula[];
  comparisonFormulaId: string;
  comparisonFormula: SavedFormula | null;
  onSelectComparisonFormula: (id: string) => void;
};

type NutrientRow = {
  key: NutrientKey;
  label: string;
  obtained: number;
  min: number;
  max?: number;
  suffix: string;
};

type Alert = {
  level: "warning" | "danger" | "info";
  message: string;
};

type ComparisonSnapshot = {
  name: string;
  costPerKg: number;
  costPer100Kg: number;
  costPer50Kg: number;
  ingredients: FormulaResult["ingredients"];
  nutrients: Record<NutrientKey, number>;
};

type ProductiveCosting = {
  humanCostPer50Kg: number;
  machineCostPer50Kg: number;
  bagCostPer50Kg: number;
  marginPercent: number;
};

const PRODUCTIVE_COSTING_STORAGE_KEY =
  "feedgenio_productive_costing_v1";

const DEFAULT_PRODUCTIVE_COSTING: ProductiveCosting = {
  humanCostPer50Kg: 1.5,
  machineCostPer50Kg: 0.1,
  bagCostPer50Kg: 0.7,
  marginPercent: 10
};

function round(value: number, decimals = 3) {
  return Number(value).toFixed(decimals);
}

function numberOrDefault(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nutrientSuffix(key: NutrientKey) {
  return key === "energy" ? " kcal/kg" : "%";
}

function getMaxValue(requirement: Requirement, key: NutrientKey) {
  const maxKey = `${key}Max` as keyof Requirement;
  const value = Number(requirement[maxKey] || 0);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function getStatus(row: NutrientRow) {
  const minDifference = row.obtained - row.min;
  const maxDifference =
    typeof row.max === "number" ? row.max - row.obtained : undefined;

  if (row.min > 0 && minDifference < -0.001) {
    return { label: "❌ Bajo", className: "bad" };
  }

  if (typeof row.max === "number" && row.obtained - row.max > 0.001) {
    return { label: "🔴 Pasado", className: "bad" };
  }

  if (row.min > 0 && minDifference <= Math.max(row.min * 0.03, 0.001)) {
    return { label: "✅ Cerca mín", className: "good" };
  }

  if (
    typeof row.max === "number" &&
    typeof maxDifference === "number" &&
    maxDifference >= 0 &&
    maxDifference <= Math.max(row.max * 0.03, 0.001)
  ) {
    return { label: "🟠 Cerca máx", className: "bad" };
  }

  return { label: "🟢 Correcto", className: "good" };
}

function findAmount(result: FormulaResult, keywords: string[]) {
  const item = result.ingredients.find((ingredient) =>
    keywords.some((keyword) =>
      ingredient.name.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  return item?.amountKg100 || 0;
}

function getProfileFlags(requirementName: string) {
  const name = requirementName.toLowerCase();

  return {
    isLayer:
      name.includes("ponedora") ||
      name.includes("postura") ||
      name.includes("gallina") ||
      name.includes("hyline") ||
      name.includes("hy-line") ||
      name.includes("dekalb"),
    isBroiler:
      name.includes("cobb") ||
      name.includes("broiler") ||
      name.includes("pollo"),
    isSummer: name.includes("verano")
  };
}

function buildNutrientRows(
  result: FormulaResult,
  requirement: Requirement
): NutrientRow[] {
  return nutrientKeys.map((key) => ({
    key,
    label: nutrientLabels[key],
    obtained: Number(result.nutrients[key] || 0),
    min: Number(requirement[key] || 0),
    max: getMaxValue(requirement, key),
    suffix: nutrientSuffix(key)
  }));
}

function buildFormulaAlerts(
  result: FormulaResult,
  requirement: Requirement,
  nutrientRows: NutrientRow[]
): Alert[] {
  if (!result.feasible) return [];

  const alerts: Alert[] = [];
  const profile = getProfileFlags(requirement.name);
  const oil = findAmount(result, ["aceite"]);
  const calciumCarbonate = findAmount(result, ["carbonato"]);
  const soybeanMeal = findAmount(result, ["soya", "soja"]);
  const corn = findAmount(result, ["maíz", "maiz"]);
  const lysine = findAmount(result, ["lisina"]);
  const methionine = findAmount(result, ["metionina"]);
  const dcp = findAmount(result, [
    "fosfato",
    "dcp",
    "dicálcico",
    "dicalcico"
  ]);
  const salt = findAmount(result, ["sal"]);

  nutrientRows.forEach((row) => {
    if (row.min > 0 && row.obtained < row.min - 0.001) {
      alerts.push({
        level: "danger",
        message: `${row.label} está por debajo del mínimo: obtenido ${round(
          row.obtained
        )}${row.suffix}, mínimo ${round(row.min)}${row.suffix}.`
      });
    }

    if (typeof row.max === "number" && row.obtained > row.max + 0.001) {
      alerts.push({
        level: "danger",
        message: `${row.label} supera el máximo: obtenido ${round(
          row.obtained
        )}${row.suffix}, máximo ${round(row.max)}${row.suffix}.`
      });
    }
  });

  if (profile.isLayer && calciumCarbonate < 6) {
    alerts.push({
      level: "danger",
      message:
        "Ponedora con carbonato de calcio menor a 6%. Revisa calcio, fase productiva o si falta carbonato en la fórmula."
    });
  }

  if (profile.isLayer && calciumCarbonate > 11.5) {
    alerts.push({
      level: "warning",
      message:
        "Ponedora con carbonato mayor a 11.5%. Puede ser posible, pero revisa calcio total, granulometría y consumo esperado."
    });
  }

  if (profile.isSummer && oil > 4.5) {
    alerts.push({
      level: "info",
      message:
        "Perfil de verano con aceite alto. Puede ser intencional para subir energía, pero vigila consumo, rancidez y calidad de mezcla."
    });
  } else if (oil > 4) {
    alerts.push({
      level: "warning",
      message:
        "Aceite mayor a 4%. Puede mejorar energía, pero también afectar consumo, mezcla o estabilidad si no se maneja bien."
    });
  }

  if (soybeanMeal > 30 && !profile.isBroiler) {
    alerts.push({
      level: "warning",
      message:
        "Torta de soya mayor a 30%. La fórmula puede quedar cara o con proteína demasiado alta según la especie."
    });
  }

  if (corn > 75) {
    alerts.push({
      level: "info",
      message:
        "Maíz mayor a 75%. Fórmula muy cargada a cereal; revisa aminoácidos y fósforo disponible."
    });
  }

  if (lysine <= 0.001) {
    alerts.push({
      level: "info",
      message:
        "La fórmula no usa lisina sintética. Puede estar bien, pero revisa lisina y costo de proteína."
    });
  }

  if (methionine <= 0.001 && (profile.isLayer || profile.isBroiler)) {
    alerts.push({
      level: "warning",
      message:
        "Perfil de aves sin metionina sintética. Revisa con cuidado porque suele ser un nutriente crítico en aves."
    });
  }

  if (
  dcp <= 0.001 &&
  (requirement.nutrients.availablePhosphorus?.min ?? 0) > 0.32
) {
    alerts.push({
      level: "info",
      message:
        "No se está usando fosfato/DCP pese a un requerimiento de fósforo disponible moderado o alto."
    });
  }

  if (salt > 0.45) {
    alerts.push({
      level: "warning",
      message:
        "Sal mayor a 0.45%. Revisa sodio, cloro y el consumo esperado de agua."
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      level: "info",
      message:
        "No se detectaron alertas básicas de formulación. Igual revisa la fórmula con criterio técnico antes de producir."
    });
  }

  return alerts;
}

function alertClass(level: Alert["level"]) {
  return level === "info" ? "note" : "warning";
}

function limitStatusClass(status: string) {
  return ["max", "nearMax", "above", "danger"].includes(status)
    ? "warning"
    : "note";
}

function diagnosisClass(level: "info" | "warning" | "danger") {
  return level === "info" ? "note" : "warning";
}

function buildSnapshot(
  result: FormulaResult,
  requirementName: string
): ComparisonSnapshot {
  return {
    name: requirementName,
    costPerKg: result.costPerKg,
    costPer100Kg: result.costPer100Kg,
    costPer50Kg: result.costPer50Kg,
    ingredients: result.ingredients,
    nutrients: result.nutrients
  };
}

function getIngredientAmount(
  ingredients: FormulaResult["ingredients"],
  id: string
) {
  return ingredients.find((item) => item.id === id)?.amountKg100 || 0;
}

export default function ResultsTab({
  result,
  requirement,
  onSaveFormula,
  savedFormulas,
  comparisonFormulaId,
  comparisonFormula,
  onSelectComparisonFormula
}: Props) {
  const [productiveCosting, setProductiveCosting] =
    useState<ProductiveCosting>(DEFAULT_PRODUCTIVE_COSTING);

  const [comparisonBase, setComparisonBase] =
    useState<ComparisonSnapshot | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(
      PRODUCTIVE_COSTING_STORAGE_KEY
    );

    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Partial<ProductiveCosting>;

      setProductiveCosting({
        humanCostPer50Kg: numberOrDefault(
          parsed.humanCostPer50Kg,
          DEFAULT_PRODUCTIVE_COSTING.humanCostPer50Kg
        ),
        machineCostPer50Kg: numberOrDefault(
          parsed.machineCostPer50Kg,
          DEFAULT_PRODUCTIVE_COSTING.machineCostPer50Kg
        ),
        bagCostPer50Kg: numberOrDefault(
          parsed.bagCostPer50Kg,
          DEFAULT_PRODUCTIVE_COSTING.bagCostPer50Kg
        ),
        marginPercent: numberOrDefault(
          parsed.marginPercent,
          DEFAULT_PRODUCTIVE_COSTING.marginPercent
        )
      });
    } catch {}
  }, []);

  function updateProductiveCost(
    field: keyof ProductiveCosting,
    value: number
  ) {
    const updated = {
      ...productiveCosting,
      [field]: Number.isFinite(value) ? value : 0
    };

    setProductiveCosting(updated);
    window.localStorage.setItem(
      PRODUCTIVE_COSTING_STORAGE_KEY,
      JSON.stringify(updated)
    );
  }

  const nutrientRows =
    result?.feasible ? buildNutrientRows(result, requirement) : [];

  const alerts =
    result?.feasible
      ? buildFormulaAlerts(result, requirement, nutrientRows)
      : [];

  const ingredientLimitStatuses =
    result?.ingredientLimitStatuses?.filter(
      (item) => item.status !== "free"
    ) || [];

  const nutrientLimitStatuses =
    result?.nutrientLimitStatuses?.filter(
      (item) => item.status !== "ok"
    ) || [];

  const shadowPriceStatuses =
    result?.shadowPriceStatuses?.filter(
      (item) => Number(item.estimatedSavingPer100Kg || 0) >= 1
    ) || [];

  const safetyStatuses = result?.safetyStatuses || [];

  const selectedComparisonBase =
    comparisonFormula?.result?.feasible
      ? buildSnapshot(comparisonFormula.result, comparisonFormula.name)
      : null;

  const activeComparisonBase = selectedComparisonBase || comparisonBase;

  const comparisonCurrent =
    result?.feasible && activeComparisonBase
      ? buildSnapshot(result, requirement.name)
      : null;

  const extrasPer50Kg =
    productiveCosting.humanCostPer50Kg +
    productiveCosting.machineCostPer50Kg +
    productiveCosting.bagCostPer50Kg;

  const realCostPer50Kg =
    result?.feasible ? result.costPer50Kg + extrasPer50Kg : 0;

  const realCostPerKg = realCostPer50Kg / 50;

  const realCostPer100Kg =
    result?.feasible ? result.costPer100Kg + extrasPer50Kg * 2 : 0;

  const realCostPerTon =
    result?.feasible
      ? result.costPerKg * 1000 + extrasPer50Kg * 20
      : 0;

  const salePer50Kg =
    realCostPer50Kg * (1 + productiveCosting.marginPercent / 100);

  const salePerKg = salePer50Kg / 50;

  function saveComparisonBase() {
    if (!result?.feasible) {
      window.alert("Primero necesitas una fórmula válida para comparar.");
      return;
    }

    onSelectComparisonFormula("");
    setComparisonBase(buildSnapshot(result, requirement.name));
    window.alert("Fórmula guardada como base de comparación.");
  }

  function clearComparisonBase() {
    setComparisonBase(null);
    onSelectComparisonFormula("");
  }

  return (
    <>
      <section className="card">
        <h2>📊 Resultados de formulación</h2>

        {!result ? (
          <p>Calculando fórmula...</p>
        ) : !result.feasible ? (
          <>
            <div className="warning">
              <strong>No se pudo formular.</strong>
              <p style={{ whiteSpace: "pre-line" }}>{result.message}</p>
            </div>

            {safetyStatuses.length > 0 && (
              <section className="card" style={{ marginTop: 18 }}>
                <h2>🛡️ Control de seguridad nutricional</h2>

                {safetyStatuses.map((item, index) => (
                  <div
                    key={item.id}
                    className={diagnosisClass(item.level)}
                    style={{ marginTop: index === 0 ? 0 : 10 }}
                  >
                    <strong>{item.title}</strong>
                    <p style={{ marginBottom: 8 }}>{item.message}</p>
                    <strong>Acción sugerida:</strong>
                    <p style={{ marginBottom: 0 }}>{item.action}</p>
                  </div>
                ))}
              </section>
            )}
          </>
        ) : (
          <>
            <section className="card" style={{ marginTop: 14 }}>
              <h2>🏭 Costeo productivo por saco de 50 kg</h2>

              <div className="table-wrap">
                <table>
                  <tbody>
                    <tr>
                      <td>Costo humano</td>
                      <td>
                        <input
                          className="price-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={productiveCosting.humanCostPer50Kg}
                          onChange={(event) =>
                            updateProductiveCost(
                              "humanCostPer50Kg",
                              Number(event.target.value || 0)
                            )
                          }
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Costo máquina</td>
                      <td>
                        <input
                          className="price-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={productiveCosting.machineCostPer50Kg}
                          onChange={(event) =>
                            updateProductiveCost(
                              "machineCostPer50Kg",
                              Number(event.target.value || 0)
                            )
                          }
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Costo del saco</td>
                      <td>
                        <input
                          className="price-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={productiveCosting.bagCostPer50Kg}
                          onChange={(event) =>
                            updateProductiveCost(
                              "bagCostPer50Kg",
                              Number(event.target.value || 0)
                            )
                          }
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Margen de ganancia %</td>
                      <td>
                        <input
                          className="price-input"
                          type="number"
                          min="0"
                          step="0.1"
                          value={productiveCosting.marginPercent}
                          onChange={(event) =>
                            updateProductiveCost(
                              "marginPercent",
                              Number(event.target.value || 0)
                            )
                          }
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="stats" style={{ marginTop: 14 }}>
                <div className="stat">
                  <span>Costo fórmula por kg</span>
                  <strong>S/ {round(result.costPerKg)}</strong>
                </div>
                <div className="stat">
                  <span>Costo fórmula saco 50 kg</span>
                  <strong>S/ {round(result.costPer50Kg)}</strong>
                </div>
                <div className="stat">
                  <span>Costo real por kg</span>
                  <strong>S/ {round(realCostPerKg)}</strong>
                </div>
                <div className="stat">
                  <span>Costo real saco 50 kg</span>
                  <strong>S/ {round(realCostPer50Kg)}</strong>
                </div>
                <div className="stat">
                  <span>Costo real 100 kg</span>
                  <strong>S/ {round(realCostPer100Kg)}</strong>
                </div>
                <div className="stat">
                  <span>Costo real tonelada</span>
                  <strong>S/ {round(realCostPerTon)}</strong>
                </div>
                <div className="stat">
                  <span>Venta sugerida saco 50 kg</span>
                  <strong>S/ {round(salePer50Kg)}</strong>
                </div>
                <div className="stat">
                  <span>Venta sugerida por kg</span>
                  <strong>S/ {round(salePerKg)}</strong>
                </div>
              </div>

              <div className="note" style={{ marginTop: 14 }}>
                Los costos humano, máquina y saco corresponden a cada saco de
                50 kg. Los valores quedan guardados automáticamente en este
                dispositivo.
              </div>
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>🌽 Fórmula obtenida</h2>

              <div className="table-wrap">
                <table className="formula-result-table">
                  <thead>
                    <tr>
                      <th>Insumo</th>
                      <th>Kg / 100</th>
                      <th>Costo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.ingredients.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{round(item.amountKg100)}</td>
                        <td>S/ {round(item.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button className="action" type="button" onClick={onSaveFormula}>
                💾 Guardar fórmula
              </button>

              <button
                className="action secondary"
                type="button"
                onClick={saveComparisonBase}
              >
                ⚖️ Guardar actual como base
              </button>

              {savedFormulas.length > 0 && (
                <div className="note" style={{ marginTop: 12 }}>
                  <strong>Comparar contra fórmula guardada</strong>
                  <select
                    className="price-input"
                    style={{ width: "100%", marginTop: 10 }}
                    value={comparisonFormulaId}
                    onChange={(event) => {
                      setComparisonBase(null);
                      onSelectComparisonFormula(event.target.value);
                    }}
                  >
                    <option value="">Sin fórmula guardada seleccionada</option>
                    {savedFormulas.map((formula) => (
                      <option key={formula.id} value={formula.id}>
                        {formula.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeComparisonBase && (
                <button
                  className="action secondary"
                  type="button"
                  onClick={clearComparisonBase}
                >
                  Limpiar comparación
                </button>
              )}
            </section>

            <section className="card" style={{ marginTop: 18 }}>
              <h2>🧪 Análisis visual de nutrientes</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nutriente</th>
                      <th>Mín</th>
                      <th>Obtenido</th>
                      <th>Máx</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nutrientRows.map((row) => {
                      const status = getStatus(row);
                      return (
                        <tr key={row.key}>
                          <td>{row.label}</td>
                          <td>{round(row.min)}{row.suffix}</td>
                          <td><strong>{round(row.obtained)}{row.suffix}</strong></td>
                          <td>
                            {typeof row.max === "number"
                              ? `${round(row.max)}${row.suffix}`
                              : "Sin máx"}
                          </td>
                          <td className={status.className}>{status.label}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </section>

      {result?.feasible && activeComparisonBase && comparisonCurrent && (
        <section className="card" style={{ marginTop: 18 }}>
          <h2>⚖️ Comparador de fórmulas</h2>
          <div className="note" style={{ marginBottom: 12 }}>
            Base: <strong>{activeComparisonBase.name}</strong><br />
            Actual: <strong>{comparisonCurrent.name}</strong>
          </div>
          <div className="stats">
            <div className="stat">
              <span>Diferencia costo kg</span>
              <strong>S/ {round(comparisonCurrent.costPerKg - activeComparisonBase.costPerKg)}</strong>
            </div>
            <div className="stat">
              <span>Diferencia costo 50 kg</span>
              <strong>S/ {round(comparisonCurrent.costPer50Kg - activeComparisonBase.costPer50Kg)}</strong>
            </div>
            <div className="stat">
              <span>Diferencia costo 100 kg</span>
              <strong>S/ {round(comparisonCurrent.costPer100Kg - activeComparisonBase.costPer100Kg)}</strong>
            </div>
          </div>

          <h3>🌽 Diferencia de ingredientes</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th>Base</th>
                  <th>Actual</th>
                  <th>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(
                  new Map(
                    [
                      ...activeComparisonBase.ingredients,
                      ...comparisonCurrent.ingredients
                    ].map((item) => [item.id, item])
                  ).values()
                ).map((item) => {
                  const baseAmount = getIngredientAmount(
                    activeComparisonBase.ingredients,
                    item.id
                  );
                  const currentAmount = getIngredientAmount(
                    comparisonCurrent.ingredients,
                    item.id
                  );
                  return (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{round(baseAmount)} kg</td>
                      <td>{round(currentAmount)} kg</td>
                      <td><strong>{round(currentAmount - baseAmount)} kg</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h3 style={{ marginTop: 16 }}>🧪 Diferencia nutricional</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nutriente</th>
                  <th>Base</th>
                  <th>Actual</th>
                  <th>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {nutrientKeys.map((key) => {
                  const baseValue = Number(activeComparisonBase.nutrients[key] || 0);
                  const currentValue = Number(comparisonCurrent.nutrients[key] || 0);
                  const suffix = nutrientSuffix(key);
                  return (
                    <tr key={key}>
                      <td>{nutrientLabels[key]}</td>
                      <td>{round(baseValue)}{suffix}</td>
                      <td>{round(currentValue)}{suffix}</td>
                      <td><strong>{round(currentValue - baseValue)}{suffix}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {result?.feasible && safetyStatuses.length > 0 && (
        <section className="card" style={{ marginTop: 18 }}>
          <h2>🛡️ Control de seguridad nutricional</h2>
          <div className="note" style={{ marginBottom: 12 }}>
            Este bloque no cambia la fórmula. Solo avisa si hay señales de riesgo antes de producir.
          </div>
          {safetyStatuses.map((item, index) => (
            <div
              key={item.id}
              className={diagnosisClass(item.level)}
              style={{ marginTop: index === 0 ? 0 : 10 }}
            >
              <strong>{item.title}</strong>
              <p style={{ marginBottom: 8 }}>{item.message}</p>
              <strong>Acción sugerida:</strong>
              <p style={{ marginBottom: 0 }}>{item.action}</p>
            </div>
          ))}
        </section>
      )}

      {result?.feasible && shadowPriceStatuses.length > 0 && (
        <section className="card" style={{ marginTop: 18 }}>
          <h2>💰 Precio sombra práctico</h2>
          <div className="note" style={{ marginBottom: 12 }}>
            Solo se muestran restricciones cuyo ahorro estimado sea de al menos S/ 1.00 por cada 100 kg.
          </div>
          {shadowPriceStatuses.map((item, index) => (
            <div
              key={item.id}
              className="note"
              style={{ marginTop: index === 0 ? 0 : 10 }}
            >
              <strong>{item.name}</strong>
              <p style={{ marginBottom: 8 }}>{item.message}</p>
              <p style={{ marginBottom: 0 }}>
                Límite actual: <strong>{round(item.currentLimit)}</strong> → probado: <strong>{round(item.relaxedLimit)}</strong><br />
                Ahorro estimado: <strong>S/ {round(item.estimatedSavingPer100Kg)} por 100 kg</strong>
              </p>
            </div>
          ))}
        </section>
      )}

      {result?.feasible && (
        <section className="card" style={{ marginTop: 18 }}>
          <h2>🧭 Mapa de restricciones</h2>
          {ingredientLimitStatuses.length === 0 && nutrientLimitStatuses.length === 0 ? (
            <div className="note">
              No hay ingredientes pegados a límites ni nutrientes demasiado ajustados. La fórmula tiene buen margen.
            </div>
          ) : (
            <>
              {ingredientLimitStatuses.length > 0 && (
                <>
                  <h3>📌 Ingredientes pegados</h3>
                  {ingredientLimitStatuses.map((item) => (
                    <div key={item.id} className={limitStatusClass(item.status)} style={{ marginTop: 10 }}>
                      {item.message}
                    </div>
                  ))}
                </>
              )}
              {nutrientLimitStatuses.length > 0 && (
                <>
                  <h3 style={{ marginTop: 16 }}>🧪 Nutrientes limitantes</h3>
                  {nutrientLimitStatuses.map((item) => (
                    <div key={item.key} className={limitStatusClass(item.status)} style={{ marginTop: 10 }}>
                      {item.message}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </section>
      )}

      {result?.feasible && (
        <section className="card" style={{ marginTop: 18 }}>
          <h2>🚨 Diagnóstico de formulación</h2>
          {alerts.map((alert, index) => (
            <div
              key={`${alert.message}_${index}`}
              className={alertClass(alert.level)}
              style={{ marginTop: index === 0 ? 0 : 10 }}
            >
              {alert.message}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
