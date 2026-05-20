import type { Requirement } from "@/lib/requirements";
import type { FormulaResult } from "@/lib/solver";

type Props = {
  result: FormulaResult | null;
  requirement: Requirement;
};

type NutrientRow = {
  label: string;
  obtained: number;
  required: number;
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

function getStatus(obtained: number, required: number) {
  const difference = obtained - required;

  if (difference < -0.001) {
    return {
      label: "❌ Bajo",
      className: "bad"
    };
  }

  if (difference <= required * 0.03) {
    return {
      label: "✅ Ajustado",
      className: "good"
    };
  }

  return {
    label: "🟢 Cumple",
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

function buildFormulaAlerts(result: FormulaResult): Alert[] {
  if (!result.feasible) return [];

  const alerts: Alert[] = [];

  const oil = findAmount(result, ["aceite"]);
  const calciumCarbonate = findAmount(result, ["carbonato"]);
  const soybeanMeal = findAmount(result, ["soya", "soja"]);
  const corn = findAmount(result, ["maíz", "maiz"]);
  const lysine = findAmount(result, ["lisina"]);
  const methionine = findAmount(result, ["metionina"]);

  if (oil > 4) {
    alerts.push({
      level: "warning",
      message:
        "Aceite mayor a 4%. Puede mejorar energía, pero también afectar consumo, mezcla o estabilidad si no se maneja bien."
    });
  }

  if (calciumCarbonate > 11) {
    alerts.push({
      level: "warning",
      message:
        "Carbonato de calcio mayor a 11%. Revisa si el perfil corresponde a ponedoras o si el calcio objetivo está demasiado alto."
    });
  }

  if (soybeanMeal > 30) {
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

  if (corn > 0 && corn < 45) {
    alerts.push({
      level: "info",
      message:
        "Maíz menor a 45%. Puede ser normal, pero revisa si hay exceso de otros ingredientes energéticos o proteicos."
    });
  }

  if (lysine <= 0.001) {
    alerts.push({
      level: "info",
      message:
        "La fórmula no usa lisina sintética. Puede estar bien, pero revisa si la lisina quedó ajustada o si la soya subió demasiado."
    });
  }

  if (methionine <= 0.001) {
    alerts.push({
      level: "info",
      message:
        "La fórmula no usa metionina sintética. En aves normalmente conviene revisar este punto con cuidado."
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

export default function ResultsTab({ result, requirement }: Props) {
  const nutrientRows: NutrientRow[] = result?.feasible
    ? [
        {
          label: "Energía",
          obtained: result.nutrients.energy,
          required: requirement.energy,
          decimals: 0,
          suffix: " kcal/kg"
        },
        {
          label: "Proteína",
          obtained: result.nutrients.protein,
          required: requirement.protein,
          decimals: 2,
          suffix: "%"
        },
        {
          label: "Lisina",
          obtained: result.nutrients.lysine,
          required: requirement.lysine,
          decimals: 2,
          suffix: "%"
        },
        {
          label: "Metionina",
          obtained: result.nutrients.methionine,
          required: requirement.methionine,
          decimals: 2,
          suffix: "%"
        },
        {
          label: "Met + Cist",
          obtained: result.nutrients.metCys,
          required: requirement.metCys,
          decimals: 2,
          suffix: "%"
        },
        {
          label: "Calcio",
          obtained: result.nutrients.calcium,
          required: requirement.calcium,
          decimals: 2,
          suffix: "%"
        },
        {
          label: "P disp",
          obtained: result.nutrients.availablePhosphorus,
          required: requirement.availablePhosphorus,
          decimals: 2,
          suffix: "%"
        },
        {
          label: "Sodio",
          obtained: result.nutrients.sodium,
          required: requirement.sodium,
          decimals: 2,
          suffix: "%"
        }
      ]
    : [];

  const alerts = result?.feasible ? buildFormulaAlerts(result) : [];

  return (
    <>
      <section className="card">
        <h2>📊 Resultados de formulación</h2>

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
                <span>Costo saco 50 kg</span>
                <strong>S/ {round(result.costPer50Kg, 2)}</strong>
              </div>

              <div className="stat">
                <span>Costo 100 kg</span>
                <strong>S/ {round(result.costPer100Kg, 2)}</strong>
              </div>
            </div>

            <div className="table-wrap">
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
          <h2>🧪 Nutrientes obtenidos</h2>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nutriente</th>
                  <th>Obtenido</th>
                  <th>Requerido</th>
                  <th>Diferencia</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {nutrientRows.map((row) => {
                  const difference = row.obtained - row.required;
                  const status = getStatus(row.obtained, row.required);

                  return (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td>
                        {round(row.obtained, row.decimals)}
                        {row.suffix}
                      </td>
                      <td>
                        {round(row.required, row.decimals)}
                        {row.suffix}
                      </td>
                      <td>
                        {difference >= 0 ? "+" : ""}
                        {round(difference, row.decimals)}
                        {row.suffix}
                      </td>
                      <td className={status.className}>{status.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="note" style={{ marginTop: 14 }}>
            ✅ Ajustado significa que el nutriente cumple, pero quedó muy cerca
            del mínimo. Eso suele ser bueno para costo, pero conviene vigilarlo.
          </div>
        </section>
      )}
    </>
  );
}
