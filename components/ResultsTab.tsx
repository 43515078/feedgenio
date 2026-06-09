"use client";

import { useState } from "react";
import {
  nutrientLabels,
  nutrientKeys,
  type NutrientKey
} from "@/lib/ingredients";
import type { Requirement } from "@/lib/requirements";
import type { FormulaResult } from "@/lib/solver";

type Props = {
  result: FormulaResult | null;
  requirement: Requirement;
  onSaveFormula: () => void;
};

type NutrientRow = {
  key: NutrientKey;
  label: string;
  obtained: number;
  min: number;
  max?: number;
  decimals: number;
  suffix: string;
};

type Alert = {
  level: "warning" | "danger" | "info";
  message: string;
};

function round(value: number, decimals = 2) {
  return Number(value).toFixed(decimals);
}

function nutrientSuffix(key: NutrientKey) {
  if (key === "energy") return " kcal/kg";
  return "%";
}

function nutrientDecimals(key: NutrientKey) {
  if (key === "energy") return 0;
  return 2;
}

function getMaxValue(requirement: Requirement, key: NutrientKey) {
  const maxKey = `${key}Max` as keyof Requirement;
  const value = Number(requirement[maxKey] || 0);

  if (!Number.isFinite(value) || value <= 0) return undefined;

  return value;
}

function getStatus(row: NutrientRow) {
  const minDifference = row.obtained - row.min;

  const maxDifference =
    typeof row.max === "number" ? row.max - row.obtained : undefined;

  if (minDifference < -0.001) {
    return {
      label: "❌ Bajo",
      className: "bad"
    };
  }

  if (typeof row.max === "number" && row.obtained - row.max > 0.001) {
    return {
      label: "🔴 Pasado",
      className: "bad"
    };
  }

  if (minDifference <= row.min * 0.03) {
    return {
      label: "✅ Cerca mín",
      className: "good"
    };
  }

  if (
    typeof row.max === "number" &&
    typeof maxDifference === "number" &&
    maxDifference >= 0 &&
    maxDifference <= row.max * 0.03
  ) {
    return {
      label: "🟠 Cerca máx",
      className: "bad"
    };
  }

  return {
    label: "🟢 Correcto",
    className: "good"
  };
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
    isPig: name.includes("cerdo") || name.includes("porcino"),
    isGuineaPig: name.includes("cuy"),
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
    decimals: nutrientDecimals(key),
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
  const dcp = findAmount(result, ["fosfato", "dcp", "dicálcico", "dicalcico"]);
  const salt = findAmount(result, ["sal"]);

  nutrientRows.forEach((row) => {
    if (row.obtained < row.min - 0.001) {
      alerts.push({
        level: "danger",
        message: `${row.label} está por debajo del mínimo: obtenido ${round(
          row.obtained,
          row.decimals
        )}${row.suffix}, mínimo ${round(row.min, row.decimals)}${row.suffix}.`
      });
    }

    if (typeof row.max === "number" && row.obtained > row.max + 0.001) {
      alerts.push({
        level: "danger",
        message: `${row.label} supera el máximo: obtenido ${round(
          row.obtained,
          row.decimals
        )}${row.suffix}, máximo ${round(row.max, row.decimals)}${row.suffix}.`
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

  if (dcp <= 0.001 && requirement.availablePhosphorus > 0.32) {
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
  if (level === "danger") return "warning";
  if (level === "warning") return "warning";
  return "note";
}

function limitStatusClass(status: string) {
  if (
    status === "max" ||
    status === "nearMax" ||
    status === "above" ||
    status === "danger"
  ) {
    return "warning";
  }

  return "note";
}

function smartDiagnosisClass(level: "info" | "warning" | "danger") {
  if (level === "danger") return "warning";
  if (level === "warning") return "warning";
  return "note";
}

function buildSummary(
  result: FormulaResult,
  requirement: Requirement,
  productionCostPerKg: number,
  bagCostPer50Kg: number,
  marginPercent: number
) {
  if (!result.feasible) return "";

  const nutrientRows = buildNutrientRows(result, requirement);

  const costWithProductionPerKg = result.costPerKg + productionCostPerKg;
  const realCostPer50Kg = costWithProductionPerKg * 50 + bagCostPer50Kg;
  const realCostPer100Kg = costWithProductionPerKg * 100 + bagCostPer50Kg * 2;
  const realCostPerTon = costWithProductionPerKg * 1000 + bagCostPer50Kg * 20;
  const salePer50Kg = realCostPer50Kg * (1 + marginPercent / 100);
  const salePerKg = salePer50Kg / 50;

  const lines = [
    `FeedGenio - ${requirement.name}`,
    "",
    "Fórmula por 100 kg:"
  ];

  result.ingredients.forEach((item) => {
    lines.push(`${item.name}: ${round(item.amountKg100, 3)} kg`);
  });

  lines.push("");
  lines.push("Costeo:");
  lines.push(`Costo fórmula por kg: S/ ${round(result.costPerKg, 3)}`);
  lines.push(`Costo productivo por kg: S/ ${round(productionCostPerKg, 3)}`);
  lines.push(`Bolsa por saco 50 kg: S/ ${round(bagCostPer50Kg, 2)}`);
  lines.push(`Costo real saco 50 kg: S/ ${round(realCostPer50Kg, 2)}`);
  lines.push(`Costo real 100 kg: S/ ${round(realCostPer100Kg, 2)}`);
  lines.push(`Costo real tonelada: S/ ${round(realCostPerTon, 2)}`);
  lines.push(`Margen: ${round(marginPercent, 1)}%`);
  lines.push(`Precio venta sugerido saco 50 kg: S/ ${round(salePer50Kg, 2)}`);
  lines.push(`Precio venta sugerido por kg: S/ ${round(salePerKg, 3)}`);

  if (result.smartDiagnostics && result.smartDiagnostics.length > 0) {
    lines.push("");
    lines.push("Diagnóstico inteligente:");

    result.smartDiagnostics.forEach((item) => {
      lines.push(`- ${item.title}: ${item.message} Acción: ${item.action}`);
    });
  }

  lines.push("");
  lines.push("Nutrientes obtenidos:");

  nutrientRows.forEach((row) => {
    const maxText =
      typeof row.max === "number"
        ? ` / máx ${round(row.max, row.decimals)}${row.suffix}`
        : "";

    lines.push(
      `${row.label}: ${round(row.obtained, row.decimals)}${row.suffix} | mín ${round(
        row.min,
        row.decimals
      )}${row.suffix}${maxText}`
    );
  });

  return lines.join("\n");
}

export default function ResultsTab({
  result,
  requirement,
  onSaveFormula
}: Props) {
  const [productionCostPerKg, setProductionCostPerKg] = useState(0);
  const [bagCostPer50Kg, setBagCostPer50Kg] = useState(0);
  const [marginPercent, setMarginPercent] = useState(0);

  const nutrientRows =
    result?.feasible ? buildNutrientRows(result, requirement) : [];

  const alerts =
    result?.feasible ? buildFormulaAlerts(result, requirement, nutrientRows) : [];

  const ingredientLimitStatuses =
    result?.ingredientLimitStatuses?.filter((item) => item.status !== "free") ||
    [];

  const nutrientLimitStatuses =
    result?.nutrientLimitStatuses?.filter((item) => item.status !== "ok") || [];

  const smartDiagnostics = result?.smartDiagnostics || [];

  const costWithProductionPerKg =
    result?.feasible ? result.costPerKg + productionCostPerKg : 0;

  const realCostPer50Kg =
    result?.feasible ? costWithProductionPerKg * 50 + bagCostPer50Kg : 0;

  const realCostPer100Kg =
    result?.feasible ? costWithProductionPerKg * 100 + bagCostPer50Kg * 2 : 0;

  const realCostPerTon =
    result?.feasible ? costWithProductionPerKg * 1000 + bagCostPer50Kg * 20 : 0;

  const salePer50Kg = realCostPer50Kg * (1 + marginPercent / 100);
  const salePerKg = salePer50Kg / 50;

  const summary =
    result?.feasible
      ? buildSummary(
          result,
          requirement,
          productionCostPerKg,
          bagCostPer50Kg,
          marginPercent
        )
      : "";

  async function copySummary() {
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(summary);
      window.alert("Resumen copiado.");
    } catch {
      window.alert("No se pudo copiar el resumen.");
    }
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

            {smartDiagnostics.length > 0 && (
              <section className="card" style={{ marginTop: 18 }}>
                <h2>🧠 Diagnóstico inteligente</h2>

                {smartDiagnostics.map((item, index) => (
                  <div
                    key={`${item.title}_${index}`}
                    className={smartDiagnosisClass(item.level)}
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
            <div className="stats">
              <div className="stat">
                <span>Costo por kg</span>
                <strong>S/ {round(result.costPerKg, 3)}</strong>
              </div>

              <div className="stat">
                <span>Costo saco 50 kg</span>
                <strong>S/ {round(result.costPer50Kg, 2)}</strong>
              </div>

              <div className="stat">
                <span>Costo 100 kg</span>
                <strong>S/ {round(result.costPer100Kg, 2)}</strong>
              </div>
            </div>

            <button className="action" type="button" onClick={onSaveFormula}>
              💾 Guardar fórmula
            </button>

            <button
              className="action secondary"
              type="button"
              onClick={copySummary}
            >
              Copiar resumen
            </button>

            <div className="table-wrap" style={{ marginTop: 14 }}>
              <table>
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>Kg / 100</th>
                    <th>Kg / 50</th>
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

      {result?.feasible && smartDiagnostics.length > 0 && (
        <section className="card" style={{ marginTop: 18 }}>
          <h2>🧠 Diagnóstico inteligente</h2>

          {smartDiagnostics.map((item, index) => (
            <div
              key={`${item.title}_${index}`}
              className={smartDiagnosisClass(item.level)}
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

      {result?.feasible && (
        <section className="card" style={{ marginTop: 18 }}>
          <h2>🏭 Costeo productivo</h2>

          <div className="table-wrap">
            <table>
              <tbody>
                <tr>
                  <td>Costo producción por kg</td>
                  <td>
                    <input
                      className="price-input"
                      type="number"
                      step="0.001"
                      value={productionCostPerKg}
                      onChange={(event) =>
                        setProductionCostPerKg(Number(event.target.value || 0))
                      }
                    />
                  </td>
                </tr>

                <tr>
                  <td>Costo bolsa por saco 50 kg</td>
                  <td>
                    <input
                      className="price-input"
                      type="number"
                      step="0.01"
                      value={bagCostPer50Kg}
                      onChange={(event) =>
                        setBagCostPer50Kg(Number(event.target.value || 0))
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
                      step="0.1"
                      value={marginPercent}
                      onChange={(event) =>
                        setMarginPercent(Number(event.target.value || 0))
                      }
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="stats" style={{ marginTop: 14 }}>
            <div className="stat">
              <span>Costo real kg</span>
              <strong>S/ {round(costWithProductionPerKg, 3)}</strong>
            </div>

            <div className="stat">
              <span>Costo real saco 50 kg</span>
              <strong>S/ {round(realCostPer50Kg, 2)}</strong>
            </div>

            <div className="stat">
              <span>Costo real tonelada</span>
              <strong>S/ {round(realCostPerTon, 2)}</strong>
            </div>

            <div className="stat">
              <span>Venta sugerida saco</span>
              <strong>S/ {round(salePer50Kg, 2)}</strong>
            </div>

            <div className="stat">
              <span>Venta sugerida kg</span>
              <strong>S/ {round(salePerKg, 3)}</strong>
            </div>
          </div>

          <div className="note" style={{ marginTop: 14 }}>
            El costo real incluye fórmula + producción + bolsa. El margen se
            aplica sobre el saco de 50 kg.
          </div>
        </section>
      )}

      {result?.feasible && (
        <section className="card" style={{ marginTop: 18 }}>
          <h2>🧭 Mapa de restricciones</h2>

          {ingredientLimitStatuses.length === 0 &&
          nutrientLimitStatuses.length === 0 ? (
            <div className="note">
              No hay ingredientes pegados a límites ni nutrientes demasiado
              ajustados. La fórmula tiene buen margen.
            </div>
          ) : (
            <>
              {ingredientLimitStatuses.length > 0 && (
                <>
                  <h3>📌 Ingredientes pegados</h3>

                  {ingredientLimitStatuses.map((item) => (
                    <div
                      key={item.id}
                      className={limitStatusClass(item.status)}
                      style={{ marginTop: 10 }}
                    >
                      {item.message}
                    </div>
                  ))}
                </>
              )}

              {nutrientLimitStatuses.length > 0 && (
                <>
                  <h3 style={{ marginTop: 16 }}>🧪 Nutrientes limitantes</h3>

                  {nutrientLimitStatuses.map((item) => (
                    <div
                      key={item.key}
                      className={limitStatusClass(item.status)}
                      style={{ marginTop: 10 }}
                    >
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

      {result?.feasible && (
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
                      <td>
                        {round(row.min, row.decimals)}
                        {row.suffix}
                      </td>
                      <td>
                        <strong>
                          {round(row.obtained, row.decimals)}
                          {row.suffix}
                        </strong>
                      </td>
                      <td>
                        {typeof row.max === "number"
                          ? `${round(row.max, row.decimals)}${row.suffix}`
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
      )}

      {result?.feasible && (
        <section className="card" style={{ marginTop: 18 }}>
          <h2>📋 Resumen copiable</h2>

          <textarea
            className="price-input"
            style={{
              width: "100%",
              minHeight: 320,
              lineHeight: 1.5
            }}
            value={summary}
            readOnly
          />

          <button className="action" type="button" onClick={copySummary}>
            Copiar resumen
          </button>
        </section>
      )}
    </>
  );
}
