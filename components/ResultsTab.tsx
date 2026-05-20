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

function hasIngredient(result: FormulaResult, keywords: string[]) {
  return findAmount(result, keywords) > 0.001;
}

function getProfileFlags(requirementName: string) {
  const name = requirementName.toLowerCase();

  return {
    isLayer: name.includes("ponedora"),
    isBroiler:
      name.includes("cobb") ||
      name.includes("broiler") ||
      name.includes("pollo"),
    isPig: name.includes("cerdo"),
    isGuineaPig: name.includes("cuy"),
    isSummer: name.includes("verano")
  };
}

function buildFormulaAlerts(
  result: FormulaResult,
  requirement: Requirement
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

  if (profile.isBroiler && calciumCarbonate > 2.5) {
    alerts.push({
      level: "warning",
      message:
        "Perfil de pollo/Cobb con carbonato mayor a 2.5%. Revisa si el calcio requerido está alto o si falta otra fuente mineral."
    });
  }

  if (profile.isPig && calciumCarbonate > 2) {
    alerts.push({
      level: "warning",
      message:
        "Perfil de cerdo con carbonato mayor a 2%. Revisa calcio y fósforo disponible para evitar exceso mineral."
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

  if (soybeanMeal > 32 && profile.isLayer) {
    alerts.push({
      level: "warning",
      message:
        "Soya alta para ponedora. Revisa costo, proteína final y si conviene usar aminoácidos sintéticos."
    });
  }

  if (soybeanMeal > 35 && profile.isBroiler) {
    alerts.push({
      level: "info",
      message:
        "Soya alta en pollo/Cobb. Puede ser normal en fases iniciales, pero revisa costo y balance de aminoácidos."
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

  if (corn > 0 && corn < 45 && !profile.isGuineaPig) {
    alerts.push({
      level: "info",
      message:
        "Maíz menor a 45%. Puede ser normal, pero revisa si hay exceso de otros ingredientes energéticos o proteicos."
    });
  }

  if (lysine <= 0.001 && (profile.isBroiler || profile.isPig)) {
    alerts.push({
      level: "warning",
      message:
        "Perfil de pollo o cerdo sin lisina sintética. Puede formular, pero revisa si la soya subió demasiado o si la lisina quedó muy ajustada."
    });
  } else if (lysine <= 0.001) {
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
  } else if (methionine <= 0.001) {
    alerts.push({
      level: "info",
      message:
        "La fórmula no usa metionina sintética. Puede estar bien según especie, pero revisa metionina y Met+Cist."
    });
  }

  if (dcp <= 0.001 && requirement.availablePhosphorus > 0.32) {
    alerts.push({
      level: "info",
      message:
        "No se está usando fosfato/DCP pese a un requerimiento de fósforo disponible moderado o alto. Revisa matriz de fósforo de los insumos."
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

function buildSummary(result: FormulaResult, requirement: Requirement) {
  if (!result.feasible) return "";

  const lines = [
    `FeedGenio - ${requirement.name}`,
    "",
    "Fórmula por 100 kg:"
  ];

  result.ingredients.forEach((item) => {
    lines.push(`${item.name}: ${round(item.amountKg100, 3)} kg`);
  });

  lines.push("");
  lines.push("Fórmula por saco de 50 kg:");

  result.ingredients.forEach((item) => {
    lines.push(`${item.name}: ${round(item.amountKg50, 3)} kg`);
  });

  lines.push("");
  lines.push(`Costo por kg: S/ ${round(result.costPerKg, 3)}`);
  lines.push(`Costo por saco 50 kg: S/ ${round(result.costPer50Kg, 2)}`);
  lines.push(`Costo por 100 kg: S/ ${round(result.costPer100Kg, 2)}`);
  lines.push("");
  lines.push("Nutrientes obtenidos:");
  lines.push(`Energía: ${round(result.nutrients.energy, 0)} kcal/kg`);
  lines.push(`Proteína: ${round(result.nutrients.protein, 2)}%`);
  lines.push(`Lisina: ${round(result.nutrients.lysine, 2)}%`);
  lines.push(`Metionina: ${round(result.nutrients.methionine, 2)}%`);
  lines.push(`Met + Cist: ${round(result.nutrients.metCys, 2)}%`);
  lines.push(`Calcio: ${round(result.nutrients.calcium, 2)}%`);
  lines.push(
    `Fósforo disponible: ${round(result.nutrients.availablePhosphorus, 2)}%`
  );
  lines.push(`Sodio: ${round(result.nutrients.sodium, 2)}%`);

  return lines.join("\n");
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

  const alerts =
    result?.feasible ? buildFormulaAlerts(result, requirement) : [];

  const summary = result?.feasible ? buildSummary(result, requirement) : "";

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

            <button className="action" type="button" onClick={copySummary}>
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
          <h2>📋 Resumen copiable</h2>

          <textarea
            className="price-input"
            style={{
              width: "100%",
              minHeight: 260,
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
