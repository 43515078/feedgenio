import type { Ingredient } from "@/lib/ingredients";
import type { Requirement } from "@/lib/requirements";

type EditableIngredient = Ingredient & {
  active: boolean;
};

type Props = {
  ingredients: EditableIngredient[];
  hiddenIngredientCount: number;
  speciesFilterEnabled: boolean;
  loading: boolean;
  requirementProfiles: Requirement[];
  activeRequirementIndex: number;
  onSelectRequirement: (index: number) => void;
  onToggleSpeciesFilter: () => void;
  onMoveIngredient: (id: string, direction: "up" | "down") => void;
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
  speciesFilterEnabled,
  loading,
  requirementProfiles,
  activeRequirementIndex,
  onSelectRequirement,
  onToggleSpeciesFilter,
  onMoveIngredient,
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

            <tr>
              <td>Filtro por especie</td>
              <td>
                <button
                  className="action secondary"
                  type="button"
                  onClick={onToggleSpeciesFilter}
                  style={{ marginTop: 0 }}
                >
                  {speciesFilterEnabled
                    ? "✅ Filtro activo"
                    : "⬜ Filtro apagado"}
                </button>

                {speciesFilterEnabled && hiddenIngredientCount > 0 && (
                  <div className="note" style={{ marginTop: 10 }}>
                    Se ocultaron {hiddenIngredientCount} ingrediente(s) que no
                    parecen corresponder al perfil activo.
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Orden</th>
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
                  <button
                    type="button"
                    className="tab-button"
                    onClick={() => onMoveIngredient(ingredient.id, "up")}
                    style={{ padding: "6px 8px", marginRight: 4 }}
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    className="tab-button"
                    onClick={() => onMoveIngredient(ingredient.id, "down")}
                    style={{ padding: "6px 8px" }}
                  >
                    ↓
                  </button>
                </td>

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
