import {
  nutrientLabels,
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
  classifierKeys: SpeciesKey[];
  classifierLabels: Record<SpeciesKey, string>;
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
  onAddClassifier: () => void;
  onRenameClassifier: (species: SpeciesKey) => void;
  onDeleteClassifier: (species: SpeciesKey) => void;
};

export default function MatrixTab({
  ingredients,
  nutrientKeys,
  classifierKeys,
  classifierLabels,
  onAddIngredient,
  onDeleteIngredient,
  onMoveIngredient,
  onUpdateName,
  onUpdateSpecies,
  onUpdateLimit,
  onUpdateNutrient,
  onAddClassifier,
  onRenameClassifier,
  onDeleteClassifier
}: Props) {
  return (
    <section className="card">
      <h2>🧪 Matriz nutricional editable</h2>

      <div className="note" style={{ marginBottom: 14 }}>
        Aquí defines ingredientes, clasificadores, límites por clasificador y
        matriz nutricional.
      </div>

      <h3>🏷️ Clasificadores</h3>

      <div className="note" style={{ marginBottom: 14 }}>
        Puedes agregar nuevos clasificadores para futuras especies, fases o
        matrices digestibles sin tocar código.
      </div>

      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        {classifierKeys.map((species) => (
          <div
            key={species}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 8,
              alignItems: "center",
              borderBottom: "1px solid #e5ece7",
              padding: "8px 0"
            }}
          >
            <strong>{classifierLabels[species] || species}</strong>

            <button
              className="tab-button"
              type="button"
              onClick={() => onRenameClassifier(species)}
            >
              Renombrar
            </button>

            <button
              className="tab-button"
              type="button"
              onClick={() => onDeleteClassifier(species)}
              style={{ color: "#a92828" }}
            >
              Borrar
            </button>
          </div>
        ))}
      </div>

      <button className="action" type="button" onClick={onAddClassifier}>
        Agregar clasificador
      </button>

      <button className="action secondary" type="button" onClick={onAddIngredient}>
        Agregar ingrediente
      </button>

      <div className="table-wrap matrix-table-wrap">
        <table className="matrix-table">
          <thead>
            <tr>
              <th>Orden</th>
              <th className="matrix-sticky-name">Insumo</th>

              {classifierKeys.map((species) => (
                <th key={species}>{classifierLabels[species] || species}</th>
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

                <td className="matrix-sticky-name">
                  <input
                    className="price-input matrix-name-input"
                    type="text"
                    value={ingredient.name}
                    onChange={(event) =>
                      onUpdateName(ingredient.id, event.target.value)
                    }
                  />
                </td>

                {classifierKeys.map((species) => (
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
                        step="0.001"
                        value={ingredient.limits?.[species]?.min ?? 0}
                        onChange={(event) =>
                          onUpdateLimit(
                            ingredient.id,
                            species,
                            "min",
                            Number(event.target.value || 0)
                          )
                        }
                        style={{ width: 76 }}
                      />

                      <input
                        className="price-input"
                        type="number"
                        step="0.001"
                        value={ingredient.limits?.[species]?.max ?? 100}
                        onChange={(event) =>
                          onUpdateLimit(
                            ingredient.id,
                            species,
                            "max",
                            Number(event.target.value || 0)
                          )
                        }
                        style={{ width: 76, marginLeft: 4 }}
                      />
                    </div>
                  </td>
                ))}

                {nutrientKeys.map((key) => (
                  <td key={key}>
                    <input
                      className="price-input"
                      type="number"
                      step={key === "energy" ? "1" : "0.001"}
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
