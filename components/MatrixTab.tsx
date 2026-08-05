import { useRef } from "react";

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
  const classifiersSectionRef = useRef<HTMLDivElement>(null);

  function scrollToClassifiers() {
    classifiersSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  return (
    <section className="card">
      <h2>🧪 Matrices y Clasificadores</h2>

      <div className="note" style={{ marginBottom: 14 }}>
        Aquí defines ingredientes, clasificadores, límites por clasificador y
        matriz nutricional.
      </div>

      <div className="matrix-main-actions">
        <button
          className="action secondary"
          type="button"
          onClick={onAddIngredient}
        >
          Agregar ingrediente
        </button>

        <button
          className="action"
          type="button"
          onClick={scrollToClassifiers}
        >
          Agregar clasificador
        </button>
      </div>

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

      <div
        ref={classifiersSectionRef}
        className="matrix-classifiers-section"
      >
        <h3>🏷️ Clasificadores</h3>

        <div className="note" style={{ marginBottom: 14 }}>
          Puedes agregar nuevos clasificadores para futuras especies, fases o
          matrices digestibles sin tocar código.
        </div>

        <div className="matrix-classifier-list">
          {classifierKeys.map((species) => (
            <div key={species} className="matrix-classifier-row">
              <strong>{classifierLabels[species] || species}</strong>

              <div className="matrix-classifier-actions">
                <button
                  className="matrix-icon-button"
                  type="button"
                  onClick={() => onRenameClassifier(species)}
                  aria-label={`Renombrar ${classifierLabels[species] || species}`}
                  title="Renombrar clasificador"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    focusable="false"
                  >
                    <path d="M4 16.5V20h3.5L18.1 9.4l-3.5-3.5L4 16.5Zm16.8-9.9a1 1 0 0 0 0-1.4l-2-2a1 1 0 0 0-1.4 0l-1.6 1.6 3.5 3.5 1.5-1.7Z" />
                  </svg>
                </button>

                <button
                  className="matrix-icon-button matrix-icon-button-danger"
                  type="button"
                  onClick={() => onDeleteClassifier(species)}
                  aria-label={`Borrar ${classifierLabels[species] || species}`}
                  title="Borrar clasificador"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    focusable="false"
                  >
                    <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.8 11H7.8L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <button className="action" type="button" onClick={onAddClassifier}>
          Agregar clasificador
        </button>
      </div>
    </section>
  );
}
