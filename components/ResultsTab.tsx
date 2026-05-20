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
