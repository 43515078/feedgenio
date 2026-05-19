import type { Ingredient } from "@/lib/ingredients";

type EditableIngredient = Ingredient & {
  active: boolean;
};

type Props = {
  ingredients: EditableIngredient[];
  loading: boolean;
  onToggle: (id: string) => void;
  onUpdate: (
    id: string,
    field: "price" | "min" | "max",
    value: number
  ) => void;
  onCalculate: () => void;
  onReset: () => void;
  onAddIngredient: () => void;
};

export default function FormulaTab({
  ingredients,
  loading,
  onToggle,
  onUpdate,
  onCalculate,
  onReset,
  onAddIngredient
}: Props) {
  return (
    <section className="card">
      <h2>📦 Insumos, precios y límites</h2>

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
                    onChange={() =>
                      onToggle(ingredient.id)
                    }
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
                        Number(
                          event.target.value || 0
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
                      onUpdate(
                        ingredient.id,
                        "min",
                        Number(
                          event.target.value || 0
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
                      onUpdate(
                        ingredient.id,
                        "max",
                        Number(
                          event.target.value || 0
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
        onClick={onCalculate}
      >
        {loading
          ? "Calculando..."
          : "Recalcular fórmula"}
      </button>

      <button
        className="action secondary"
        type="button"
        onClick={onAddIngredient}
      >
        Agregar ingrediente
      </button>

      <button
        className="action secondary"
        type="button"
        onClick={onReset}
      >
        Reiniciar datos
      </button>
    </section>
  );
}
