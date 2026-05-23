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

type MatrixAlert = {
  level: "warning" | "danger" | "info";
  message: string;
};

function alertClass(level: MatrixAlert["level"]) {
  if (level === "danger") return "warning";
  if (level === "warning") return "warning";
  return "note";
}

function lowerText(value: string) {
  return value.toLowerCase();
}

function isKnownLowNutrientAdditive(name: string) {
  return (
    name.includes("premix") ||
    name.includes("premezcla") ||
    name.includes("vit min") ||
    name.includes("vitamina") ||
    name.includes("mineral") ||
    name.includes("colina") ||
    name.includes("bacitracina") ||
    name.includes("zincbacitracina") ||
    name.includes("bmd") ||
    name.includes("aflaban") ||
    name.includes("fungiban") ||
    name.includes("antifúngico") ||
    name.includes("antifungico") ||
    name.includes("secuestrante") ||
    name.includes("toxina") ||
    name.includes("toxinas") ||
    name.includes("enzima") ||
    name.includes("enzimas") ||
    name.includes("fitasa") ||
    name.includes("superzyme") ||
    name.includes("ronozyme")
  );
}

function buildMatrixAlerts(ingredients: EditableIngredient[]): MatrixAlert[] {
  const alerts: MatrixAlert[] = [];

  ingredients.forEach((ingredient) => {
    if (!ingredient.active) return;

    const name = lowerText(ingredient.name);
    const energy = Number(ingredient.nutrients.energy || 0);
    const protein = Number(ingredient.nutrients.protein || 0);
    const calcium = Number(ingredient.nutrients.calcium || 0);
    const availablePhosphorus = Number(
      ingredient.nutrients.availablePhosphorus || 0
    );
    const sodium = Number(ingredient.nutrients.sodium || 0);
    const chlorine = Number(ingredient.nutrients.chlorine || 0);
    const linoleicAcid = Number(ingredient.nutrients.linoleicAcid || 0);

    const looksLikeCorn = name.includes("maíz") || name.includes("maiz");
    const looksLikeSoy = name.includes("soya") || name.includes("soja");
    const looksLikeOil = name.includes("aceite") || name.includes("grasa");

    const looksLikeCarbonate =
      name.includes("carbonato") && !name.includes("bicarbonato");

    const looksLikeBicarbonate = name.includes("bicarbonato");

    const looksLikeDcp =
      name.includes("fosfato") ||
      name.includes("dcp") ||
      name.includes("dicálcico") ||
      name.includes("dicalcico");

    const looksLikeSalt =
      name === "sal" ||
      name.includes("sal común") ||
      name.includes("sal comun");

    const isAdditive = isKnownLowNutrientAdditive(name);

    if (!ingredient.name.trim()) {
      alerts.push({
        level: "warning",
        message: "Hay un ingrediente activo sin nombre."
      });
    }

    if (looksLikeCorn && energy < 3000) {
      alerts.push({
        level: "danger",
        message: `${ingredient.name}: la energía parece baja para maíz (${energy}). Revisa si faltó un cero.`
      });
    }

    if (looksLikeSoy && energy < 1800) {
      alerts.push({
        level: "warning",
        message: `${ingredient.name}: la energía parece baja para torta de soya (${energy}).`
      });
    }

    if (looksLikeOil && energy < 7000) {
      alerts.push({
        level: "danger",
        message: `${ingredient.name}: la energía parece muy baja para aceite (${energy}). Normalmente debería estar cerca de 8800-9000.`
      });
    }

    if (looksLikeOil && linoleicAcid <= 0) {
      alerts.push({
        level: "info",
        message: `${ingredient.name}: ácido linoleico en 0. Si usas aceite de soya/vegetal, revisa este valor.`
      });
    }

    if (looksLikeSoy && protein < 35) {
      alerts.push({
        level: "warning",
        message: `${ingredient.name}: proteína baja para torta de soya (${protein}%).`
      });
    }

    if (looksLikeCarbonate && calcium < 30) {
      alerts.push({
        level: "danger",
        message: `${ingredient.name}: calcio bajo para carbonato (${calcium}%). Revisa si faltó un número.`
      });
    }

    if (looksLikeBicarbonate && sodium < 20) {
      alerts.push({
        level: "warning",
        message: `${ingredient.name}: sodio bajo para bicarbonato (${sodium}%). Revisa si la matriz está completa.`
      });
    }

    if (looksLikeDcp && availablePhosphorus < 10) {
      alerts.push({
        level: "warning",
        message: `${ingredient.name}: fósforo disponible bajo para fosfato/DCP (${availablePhosphorus}%).`
      });
    }

    if (looksLikeDcp && calcium < 15) {
      alerts.push({
        level: "warning",
        message: `${ingredient.name}: calcio bajo para fosfato/DCP (${calcium}%).`
      });
    }

    if (looksLikeSalt && sodium < 30) {
      alerts.push({
        level: "danger",
        message: `${ingredient.name}: sodio bajo para sal común (${sodium}%).`
      });
    }

    if (looksLikeSalt && chlorine < 45) {
      alerts.push({
        level: "warning",
        message: `${ingredient.name}: cloro bajo para sal común (${chlorine}%).`
      });
    }

    if (
      !isAdditive &&
      energy <= 0 &&
      protein <= 0 &&
      calcium <= 0 &&
      availablePhosphorus <= 0 &&
      sodium <= 0 &&
      chlorine <= 0 &&
      linoleicAcid <= 0
    ) {
      alerts.push({
        level: "info",
        message: `${ingredient.name}: tiene casi toda la matriz en 0. Si es un aditivo sin aporte nutricional, puedes ignorarlo.`
      });
    }
  });

  if (alerts.length === 0) {
    alerts.push({
      level: "info",
      message:
        "✅ Matriz revisada. No se detectaron errores típicos de formulación."
    });
  }

  return alerts;
}

export default function MatrixTab({
  ingredients,
  nutrientKeys,
  onAddIngredient,
  onDeleteIngredient,
  onUpdateName,
  onUpdateNutrient
}: Props) {
  const matrixAlerts = buildMatrixAlerts(ingredients);

  return (
    <section className="card">
      <h2>🧪 Matriz nutricional editable</h2>

      <div className="note" style={{ marginBottom: 14 }}>
        Aquí puedes editar nombres y nutrientes. Todo se guarda automáticamente
        en este navegador.
      </div>

      <div style={{ marginBottom: 14 }}>
        {matrixAlerts.map((alert, index) => (
          <div
            key={`${alert.message}_${index}`}
            className={alertClass(alert.level)}
            style={{ marginTop: index === 0 ? 0 : 10 }}
          >
            {alert.message}
          </div>
        ))}
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
