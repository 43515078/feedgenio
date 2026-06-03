import {
  nutrientLabels,
  speciesKeys,
  speciesLabels,
  type Ingredient,
  type NutrientKey,
  type SpeciesKey
} from "@/lib/ingredients";

type EditableIngredient = Ingredient & {
  active: boolean;
};

type Props = {
  ingredients: EditableIngredient[];
  nutrientKeys: NutrientKey[];
  onAddIngredient: () => void;
  onDeleteIngredient: (id: string) => void;
  onMoveIngredient: (id: string, direction: "up" | "down") => void;
  onUpdateName: (id: string, name: string) => void;
  onUpdateSpecies: (id: string, species: SpeciesKey, value: boolean) => void;
  onUpdateLimit: (
    id: string,
    species: SpeciesKey,
    field: "min" | "max",
    value: number
  ) => void;
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
  onMoveIngredient,
  onUpdateName,
  onUpdateSpecies,
  onUpdateLimit,
  onUpdateNutrient
}: Props) {
  return (
    <section className="card">
      <h2>🧪 Matriz nutricional editable</h2>

      <div className="note" style={{ marginBottom: 14 }}>
        Aquí defines el orden maestro, especies, límites por especie y matriz nutricional.
      </div>

      <button className="action" type="button" onClick={onAddIngredient}>
        Agregar ingrediente
      </button>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Orden</th>
              <th>Insumo</th>
              {speciesKeys.map((species) => (
                <th key={species}>{speciesLabels[species]}</th>
              ))}
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
                  <button
                    type="button"
                    className="tab-button"
                    onClick={() => onMoveIngredient(ingredient.id, "up")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="tab-button"
                    onClick={() => onMoveIngredient(ingredient.id, "down")}
                  >
                    ↓
                  </button>
                </td>

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

                {speciesKeys.map((species) => (
                  <td key={species}>
                    <input
                      className="checkbox-input"
                      type="checkbox"
                      checked={Boolean(ingredient.species?.[species])}
                      onChange={(event) =>
                        onUpdateSpecies(
                          ingredient.id,
                          species,
                          event.target.checked
                        )
                      }
                    />

                    <div style={{ marginTop: 6 }}>
                      <input
                        className="price-input"
                        type="number"
                        step="0.1"
                        value={ingredient.limits?.[species]?.min ?? 0}
                        onChange={(event) =>
                          onUpdateLimit(
                            ingredient.id,
                            species,
                            "min",
                            Number(event.target.value || 0)
                          )
                        }
                        style={{ width: 70 }}
                      />
                      <input
                        className="price-input"
                        type="number"
                        step="0.1"
                        value={ingredient.limits?.[species]?.max ?? 100}
                        onChange={(event) =>
                          onUpdateLimit(
                            ingredient.id,
                            species,
                            "max",
                            Number(event.target.value || 0)
                          )
                        }
                        style={{ width: 70, marginLeft: 4 }}
                      />
                    </div>
                  </td>
                ))}

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
