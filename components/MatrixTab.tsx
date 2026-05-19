import {
  nutrientLabels,
  type Ingredient,
  type NutrientKey
} from "@/lib/ingredients";

type EditableIngredient = Ingredient & {
  active: boolean;
};

type Props = {
  ingredients: EditableIngredient[];
  nutrientKeys: NutrientKey[];
  onAddIngredient: () => void;
  onDeleteIngredient: (id: string) => void;
  onUpdateName: (id: string, name: string) => void;
  onUpdateNutrient: (
    id: string,
    nutrient: NutrientKey,
    value: number
  ) => void;
};

export default function MatrixTab({
  ingredients,
  nutrientKeys,
  onAddIngredient,
  onDeleteIngredient,
  onUpdateName,
  onUpdateNutrient
}: Props) {
  return (
    <section className="card">
      <h2>🧪 Matriz nutricional editable</h2>

      <div className="note" style={{ marginBottom: 14 }}>
        Aquí puedes editar nombres y nutrientes. Todo se guarda automáticamente
        en este navegador.
      </div>

      <button
        className="action"
        type="button"
        onClick={onAddIngredient}
        style={{ marginTop: 0, marginBottom: 14 }}
      >
        Agregar ingrediente
      </button>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Insumo</th>
              {nutrientKeys.map((key) => (
                <th key={key}>{nutrientLabels[key]}</th>
              ))}
              <th>Eliminar</th>
            </tr>
          </thead>

          <tbody>
            {ingredients.map((ingredient) => (
              <tr key={ingredient.id}>
                <td>
                  <input
                    className="price-input"
                    style={{ width: 180 }}
                    type="text"
                    value={ingredient.name}
                    onChange={(event) =>
                      onUpdateName(ingredient.id, event.target.value)
                    }
                  />
                </td>

                {nutrientKeys.map((key) => (
                  <td key={key}>
                    <input
                      className="price-input"
                      type="number"
                      step={key === "energy" ? "1" : "0.01"}
                      value={ingredient.nutrients[key]}
                      onChange={(event) =>
                        onUpdateNutrient(
                          ingredient.id,
                          key,
                          Number(event.target.value || 0)
                        )
                      }
                    />
                  </td>
                ))}

                <td>
                  <button
                    type="button"
                    className="tab-button"
                    onClick={() => onDeleteIngredient(ingredient.id)}
                    style={{ color: "#a92828" }}
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
