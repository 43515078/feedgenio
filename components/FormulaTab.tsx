import type { Ingredient } from "@/lib/ingredients";
import type { Requirement } from "@/lib/requirements";

type EditableIngredient = Ingredient & {
  active: boolean;
};

type Props = {
  ingredients: EditableIngredient[];
  hiddenIngredientCount: number;
  loading: boolean;
  requirementProfiles: Requirement[];
  activeRequirementIndex: number;
  onSelectRequirement: (index: number) => void;
  onToggle: (id: string) => void;
  onUpdate: (
    id: string,
    field: "price" | "min" | "max",
    value: number
  ) => void;
  onCalculate: () => void;
  onGoToResults: () => void;
  onReset: () => void;
  onAddIngredient: () => void;
};

export default function FormulaTab({
  ingredients,
  hiddenIngredientCount,
  loading,
  requirementProfiles,
  activeRequirementIndex,
  onSelectRequirement,
  onToggle,
  onUpdate,
  onCalculate,
  onGoToResults,
  onReset,
  onAddIngredient
}: Props) {
  const activeRequirement =
    requirementProfiles[activeRequirementIndex] || requirementProfiles[0];

  return (
    <section className="card">
      <h2>📦 Insumos, precios y límites</h2>

      <div className="note" style={{ marginBottom: 14 }}>
        <strong>Requerimiento activo:</strong>{" "}
        {activeRequirement?.name || "Sin requerimiento"}
        {hiddenIngredientCount > 0 && (
          <>
            <br />
            Se ocultaron {hiddenIngredientCount} ingrediente(s) no asignados a
            esta especie en la Matriz.
          </>
        )}
      </div>

      <div className="table-wrap" style={{ marginBottom: 14 }}>
        <table>
          <tbody>
            <tr>
              <td>Elegir requerimiento</td>
              <td>
                <select
                  className="price-input"
                  style={{ width: "100%", maxWidth: 320 }}
                  value={activeRequirementIndex}
                  onChange={(event) =>
                    onSelectRequirement(Number(event.target.value))
                  }
                >
                  {requirementProfiles.map((profile, index) => (
                    <option key={`${profile.name}_${index}`} value={index}>
                      {profile.name || `Perfil ${index + 1}`}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {ingredients.length === 0 ? (
        <div className="warning">
          No hay ingredientes asignados a este tipo de requerimiento. Ve a
          Matriz y marca qué especies usa cada ingrediente.
        </div>
      ) : (
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
                    opacity: ingredient.active ? 1 : 0.45
                  }}
                >
                  <td>
                    <input
                      className="checkbox-input"
                      type="checkbox"
                      checked={ingredient.active}
                      onChange={() => onToggle(ingredient.id)}
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
                        onUpdate(
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
                        onUpdate(
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
                        onUpdate(
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
      )}

      <button className="action" type="button" onClick={onCalculate}>
        {loading ? "Calculando..." : "Recalcular fórmula"}
      </button>

      <button className="action secondary" type="button" onClick={onGoToResults}>
        📊 Ver resultados
      </button>

      <button
        className="action secondary"
        type="button"
        onClick={onAddIngredient}
      >
        Agregar ingrediente
      </button>

      <button className="action secondary" type="button" onClick={onReset}>
        Reiniciar datos
      </button>
    </section>
  );
}
