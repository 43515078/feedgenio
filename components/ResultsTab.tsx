import type { Requirement } from "@/lib/requirements";
import type { FormulaResult } from "@/lib/solver";

type Props = {
  result: FormulaResult | null;
  requirement: Requirement;
};

function round(value: number, decimals = 2) {
  return Number(value).toFixed(decimals);
}

export default function ResultsTab({ result, requirement }: Props) {
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
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>Energía</td>
                  <td>{round(result.nutrients.energy, 0)} kcal/kg</td>
                  <td>{requirement.energy}</td>
                </tr>

                <tr>
                  <td>Proteína</td>
                  <td>{round(result.nutrients.protein)}%</td>
                  <td>{requirement.protein}%</td>
                </tr>

                <tr>
                  <td>Lisina</td>
                  <td>{round(result.nutrients.lysine)}%</td>
                  <td>{requirement.lysine}%</td>
                </tr>

                <tr>
                  <td>Metionina</td>
                  <td>{round(result.nutrients.methionine)}%</td>
                  <td>{requirement.methionine}%</td>
                </tr>

                <tr>
                  <td>Met + Cist</td>
                  <td>{round(result.nutrients.metCys)}%</td>
                  <td>{requirement.metCys}%</td>
                </tr>

                <tr>
                  <td>Calcio</td>
                  <td>{round(result.nutrients.calcium)}%</td>
                  <td>{requirement.calcium}%</td>
                </tr>

                <tr>
                  <td>P disp</td>
                  <td>{round(result.nutrients.availablePhosphorus)}%</td>
                  <td>{requirement.availablePhosphorus}%</td>
                </tr>

                <tr>
                  <td>Sodio</td>
                  <td>{round(result.nutrients.sodium)}%</td>
                  <td>{requirement.sodium}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
