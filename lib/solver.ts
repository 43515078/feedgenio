import {
  nutrientFullLabels,
  nutrientKeys,
  type Ingredient,
  type NutrientKey
} from "./ingredients";

import type { Requirement } from "./requirements";

type SolverVariable = {
  cost: number;
  total: number;
  [key: string]: number;
};

type SolverModel = {
  optimize: string;
  opType: "min";
  constraints: Record<string, { min?: number; max?: number; equal?: number }>;
  variables: Record<string, SolverVariable>;
};

type NutrientDiagnostics = {
  label: string;
  required: number;
  requiredMax?: number;
  possibleMax: number;
  possibleMin: number;
  difference: number;
};

type IngredientLimitStatus = {
  id: string;
  name: string;
  amountKg100: number;
  min: number;
  max: number;
  status: "min" | "max" | "free";
  message: string;
};

type NutrientLimitStatus = {
  key: NutrientKey;
  label: string;
  obtained: number;
  min: number;
  max?: number;
  status: "below" | "nearMin" | "nearMax" | "above" | "ok";
  message: string;
};

export type FormulaResult = {
  feasible: boolean;
  costPerKg: number;
  costPer100Kg: number;
  costPer50Kg: number;
  ingredients: {
    id: string;
    name: string;
    amountKg100: number;
    amountKg50: number;
    price: number;
    cost: number;
  }[];
  nutrients: Record<NutrientKey, number>;
  message?: string;
  diagnostics?: NutrientDiagnostics[];
  ingredientLimitStatuses?: IngredientLimitStatus[];
  nutrientLimitStatuses?: NutrientLimitStatus[];
};

function emptyNutrients(): Record<NutrientKey, number> {
  const nutrients = {} as Record<NutrientKey, number>;

  for (const key of nutrientKeys) {
    nutrients[key] = 0;
  }

  return nutrients;
}

function getRequirementValue(requirement: Requirement, key: NutrientKey) {
  return Number(requirement[key] || 0);
}

function getRequirementMaxValue(requirement: Requirement, key: NutrientKey) {
  const maxKey = `${key}Max` as keyof Requirement;
  const value = Number(requirement[maxKey] || 0);

  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function decimalsForNutrient(key: NutrientKey) {
  return key === "energy" ? 0 : 2;
}

function calculateFormulaNutrients(
  result: Record<string, number | boolean>,
  ingredients: Ingredient[]
): Record<NutrientKey, number> {
  const nutrients = emptyNutrients();

  for (const ingredient of ingredients) {
    const amountKg100 = Number(result[ingredient.id] || 0);

    if (amountKg100 <= 0) continue;

    for (const key of nutrientKeys) {
      nutrients[key] +=
        (amountKg100 * Number(ingredient.nutrients[key] || 0)) / 100;
    }
  }

  return nutrients;
}

function calculatePossibleNutrients(
  ingredients: Ingredient[],
  limitType: "min" | "max"
): Record<NutrientKey, number> {
  const possible = emptyNutrients();

  for (const ingredient of ingredients) {
    const usableAmount = Math.max(0, Number(ingredient[limitType] || 0));

    for (const key of nutrientKeys) {
      possible[key] +=
        (usableAmount * Number(ingredient.nutrients[key] || 0)) / 100;
    }
  }

  return possible;
}

function buildDiagnostics(
  ingredients: Ingredient[],
  requirement: Requirement
): NutrientDiagnostics[] {
  const possibleMax = calculatePossibleNutrients(ingredients, "max");
  const possibleMin = calculatePossibleNutrients(ingredients, "min");

  return nutrientKeys.map((key) => {
    const required = getRequirementValue(requirement, key);
    const requiredMax = getRequirementMaxValue(requirement, key);
    const maxValue = Number(possibleMax[key] || 0);
    const minValue = Number(possibleMin[key] || 0);

    return {
      label: nutrientFullLabels[key],
      required,
      requiredMax,
      possibleMax: maxValue,
      possibleMin: minValue,
      difference: maxValue - required
    };
  });
}

function createModel(
  ingredients: Ingredient[],
  requirement: Requirement,
  options?: {
    skipMinNutrient?: NutrientKey;
    skipMaxNutrient?: NutrientKey;
  }
): SolverModel {
  const model: SolverModel = {
    optimize: "cost",
    opType: "min",
    constraints: {
      total: { equal: 100 }
    },
    variables: {}
  };

  for (const key of nutrientKeys) {
    const minValue = getRequirementValue(requirement, key);
    const maxValue = getRequirementMaxValue(requirement, key);

    model.constraints[key] = {};

    if (options?.skipMinNutrient !== key) {
      model.constraints[key].min = minValue;
    }

    if (typeof maxValue === "number" && options?.skipMaxNutrient !== key) {
      model.constraints[key].max = maxValue;
    }
  }

  for (const ingredient of ingredients) {
    model.constraints[`${ingredient.id}_min`] = {
      min: Number(ingredient.min || 0)
    };

    model.constraints[`${ingredient.id}_max`] = {
      max: Number(ingredient.max || 0)
    };

    const variable: SolverVariable = {
      cost: Number(ingredient.price || 0),
      total: 1,
      [`${ingredient.id}_min`]: 1,
      [`${ingredient.id}_max`]: 1
    };

    for (const key of nutrientKeys) {
      variable[key] = Number(ingredient.nutrients[key] || 0) / 100;
    }

    model.variables[ingredient.id] = variable;
  }

  return model;
}

function runSolver(
  ingredients: Ingredient[],
  requirement: Requirement,
  options?: {
    skipMinNutrient?: NutrientKey;
    skipMaxNutrient?: NutrientKey;
  }
) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const solver = require("javascript-lp-solver");

  const model = createModel(ingredients, requirement, options);
  return solver.Solve(model);
}

function buildExactRestrictionDiagnosis(
  ingredients: Ingredient[],
  requirement: Requirement
): string[] {
  const messages: string[] = [];

  for (const key of nutrientKeys) {
    const testResult = runSolver(ingredients, requirement, {
      skipMinNutrient: key
    });

    if (testResult.feasible) {
      const nutrients = calculateFormulaNutrients(testResult, ingredients);
      const obtained = nutrients[key];
      const required = getRequirementValue(requirement, key);
      const decimals = decimalsForNutrient(key);

      if (obtained + 0.0001 < required) {
        messages.push(
          `- ${nutrientFullLabels[key]} mínimo: requiere ${required.toFixed(
            decimals
          )}, pero al quitar esa restricción la mejor solución queda en ${obtained.toFixed(
            decimals
          )}. Falta ${Math.abs(required - obtained).toFixed(decimals)}.`
        );
      } else {
        messages.push(
          `- ${nutrientFullLabels[key]} mínimo: al quitar esta restricción sí aparece solución. Revisa este mínimo junto con los límites de ingredientes.`
        );
      }
    }
  }

  for (const key of nutrientKeys) {
    const maxValue = getRequirementMaxValue(requirement, key);

    if (typeof maxValue !== "number") continue;

    const testResult = runSolver(ingredients, requirement, {
      skipMaxNutrient: key
    });

    if (testResult.feasible) {
      const nutrients = calculateFormulaNutrients(testResult, ingredients);
      const obtained = nutrients[key];
      const decimals = decimalsForNutrient(key);

      if (obtained - 0.0001 > maxValue) {
        messages.push(
          `- ${nutrientFullLabels[key]} máximo: permite ${maxValue.toFixed(
            decimals
          )}, pero al quitar ese techo la solución queda en ${obtained.toFixed(
            decimals
          )}. Exceso ${Math.abs(obtained - maxValue).toFixed(decimals)}.`
        );
      } else {
        messages.push(
          `- ${nutrientFullLabels[key]} máximo: al quitar este máximo sí aparece solución. Revisa este techo con los demás nutrientes.`
        );
      }
    }
  }

  return messages;
}

function buildFailureMessage(
  ingredients: Ingredient[],
  requirement: Requirement
) {
  const diagnostics = buildDiagnostics(ingredients, requirement);

  const exactRestrictions = buildExactRestrictionDiagnosis(
    ingredients,
    requirement
  );

  const impossibleMinimums = diagnostics.filter(
    (item) => item.possibleMax + 0.0001 < item.required
  );

  const impossibleMaximums = diagnostics.filter(
    (item) =>
      typeof item.requiredMax === "number" &&
      item.possibleMin - 0.0001 > item.requiredMax
  );

  const invertedRanges = diagnostics.filter(
    (item) =>
      typeof item.requiredMax === "number" &&
      item.requiredMax + 0.0001 < item.required
  );

  const totalMin = ingredients.reduce(
    (sum, ingredient) => sum + Number(ingredient.min || 0),
    0
  );

  const totalMax = ingredients.reduce(
    (sum, ingredient) => sum + Number(ingredient.max || 0),
    0
  );

  const messages: string[] = [
    "No se encontró una fórmula posible con estos límites y requerimientos."
  ];

  if (totalMin > 100) {
    messages.push(
      `La suma de mínimos es ${totalMin.toFixed(
        2
      )}%, supera 100%. Baja algunos mínimos.`
    );
  }

  if (totalMax < 100) {
    messages.push(
      `La suma de máximos es ${totalMax.toFixed(
        2
      )}%, no llega a 100%. Sube algunos máximos o activa más ingredientes.`
    );
  }

  if (invertedRanges.length > 0) {
    messages.push("Hay requerimientos con máximo menor que el mínimo:");

    for (const item of invertedRanges) {
      const decimals = item.label === "Energía" ? 0 : 2;

      messages.push(
        `- ${item.label}: mínimo ${item.required.toFixed(
          decimals
        )}, máximo ${Number(item.requiredMax).toFixed(decimals)}`
      );
    }
  }

  if (impossibleMinimums.length > 0) {
    messages.push("Nutrientes que no llegan al mínimo con los máximos actuales:");

    for (const item of impossibleMinimums) {
      const decimals = item.label === "Energía" ? 0 : 2;

      messages.push(
        `- ${item.label}: mínimo requerido ${item.required.toFixed(
          decimals
        )}, máximo posible aprox. ${item.possibleMax.toFixed(decimals)}`
      );
    }
  }

  if (impossibleMaximums.length > 0) {
    messages.push("Nutrientes que ya superan el máximo por los mínimos actuales:");

    for (const item of impossibleMaximums) {
      const decimals = item.label === "Energía" ? 0 : 2;

      messages.push(
        `- ${item.label}: máximo permitido ${Number(item.requiredMax).toFixed(
          decimals
        )}, mínimo obligado aprox. ${item.possibleMin.toFixed(decimals)}`
      );
    }
  }

  if (exactRestrictions.length > 0) {
    messages.push("Restricción exacta que desbloquea el solver:");

    for (const item of exactRestrictions) {
      messages.push(item);
    }
  }

  if (
    impossibleMinimums.length === 0 &&
    impossibleMaximums.length === 0 &&
    invertedRanges.length === 0 &&
    exactRestrictions.length === 0
  ) {
    messages.push(
      "No se encontró una única restricción que destrabe la fórmula. El bloqueo viene de una combinación de dos o más restricciones al mismo tiempo."
    );

    messages.push(
      "Prueba ampliar ligeramente máximos de proteína, energía, calcio, fósforo, sodio/cloro o subir máximos de ingredientes clave como soya, maíz, aceite, carbonato o DCP."
    );
  }

  return {
    message: messages.join("\n"),
    diagnostics
  };
}

function buildIngredientLimitStatuses(
  ingredients: Ingredient[],
  formulaIngredients: FormulaResult["ingredients"]
): IngredientLimitStatus[] {
  const statuses: IngredientLimitStatus[] = [];

  for (const ingredient of ingredients) {
    const formulaItem = formulaIngredients.find((item) => item.id === ingredient.id);
    const amountKg100 = formulaItem?.amountKg100 || 0;

    if (amountKg100 <= 0.0001) continue;

    const min = Number(ingredient.min || 0);
    const max = Number(ingredient.max || 0);

    const isAtMin = Math.abs(amountKg100 - min) <= 0.01 && min > 0;
    const isAtMax = Math.abs(amountKg100 - max) <= 0.01 && max > 0;

    if (isAtMax) {
      statuses.push({
        id: ingredient.id,
        name: ingredient.name,
        amountKg100,
        min,
        max,
        status: "max",
        message: `${ingredient.name} quedó pegado al máximo (${max.toFixed(
          2
        )}%). Si la fórmula necesita más de este insumo, ese límite puede estar bloqueando.`
      });

      continue;
    }

    if (isAtMin) {
      statuses.push({
        id: ingredient.id,
        name: ingredient.name,
        amountKg100,
        min,
        max,
        status: "min",
        message: `${ingredient.name} quedó pegado al mínimo (${min.toFixed(
          2
        )}%). Puede estar entrando obligado por el límite mínimo.`
      });

      continue;
    }

    statuses.push({
      id: ingredient.id,
      name: ingredient.name,
      amountKg100,
      min,
      max,
      status: "free",
      message: `${ingredient.name} quedó libre dentro de sus límites.`
    });
  }

  return statuses;
}

function buildNutrientLimitStatuses(
  nutrients: Record<NutrientKey, number>,
  requirement: Requirement
): NutrientLimitStatus[] {
  return nutrientKeys.map((key) => {
    const obtained = Number(nutrients[key] || 0);
    const min = getRequirementValue(requirement, key);
    const max = getRequirementMaxValue(requirement, key);
    const decimals = decimalsForNutrient(key);
    const label = nutrientFullLabels[key];

    if (obtained < min - 0.0001) {
      return {
        key,
        label,
        obtained,
        min,
        max,
        status: "below",
        message: `${label} quedó por debajo del mínimo: ${obtained.toFixed(
          decimals
        )} vs ${min.toFixed(decimals)}.`
      };
    }

    if (typeof max === "number" && obtained > max + 0.0001) {
      return {
        key,
        label,
        obtained,
        min,
        max,
        status: "above",
        message: `${label} superó el máximo: ${obtained.toFixed(
          decimals
        )} vs ${max.toFixed(decimals)}.`
      };
    }

    if (obtained - min <= Math.max(min * 0.01, 0.0001)) {
      return {
        key,
        label,
        obtained,
        min,
        max,
        status: "nearMin",
        message: `${label} quedó muy cerca del mínimo: ${obtained.toFixed(
          decimals
        )} vs ${min.toFixed(decimals)}. Es un nutriente limitante de costo.`
      };
    }

    if (
      typeof max === "number" &&
      max - obtained <= Math.max(max * 0.01, 0.0001)
    ) {
      return {
        key,
        label,
        obtained,
        min,
        max,
        status: "nearMax",
        message: `${label} quedó muy cerca del máximo: ${obtained.toFixed(
          decimals
        )} vs ${max.toFixed(decimals)}. Ese techo puede estar limitando.`
      };
    }

    return {
      key,
      label,
      obtained,
      min,
      max,
      status: "ok",
      message: `${label} tiene margen correcto.`
    };
  });
}

export function solveFormula(
  ingredients: Ingredient[],
  requirement: Requirement
): FormulaResult {
  if (ingredients.length === 0) {
    return {
      feasible: false,
      costPerKg: 0,
      costPer100Kg: 0,
      costPer50Kg: 0,
      ingredients: [],
      nutrients: emptyNutrients(),
      message: "No hay ingredientes activos para formular."
    };
  }

  const result = runSolver(ingredients, requirement);

  if (!result.feasible) {
    const failure = buildFailureMessage(ingredients, requirement);

    return {
      feasible: false,
      costPerKg: 0,
      costPer100Kg: 0,
      costPer50Kg: 0,
      ingredients: [],
      nutrients: emptyNutrients(),
      message: failure.message,
      diagnostics: failure.diagnostics
    };
  }

  const formulaIngredients = ingredients
    .map((ingredient) => {
      const amountKg100 = Number(result[ingredient.id] || 0);

      return {
        id: ingredient.id,
        name: ingredient.name,
        amountKg100,
        amountKg50: amountKg100 / 2,
        price: Number(ingredient.price || 0),
        cost: amountKg100 * Number(ingredient.price || 0)
      };
    })
    .filter((item) => item.amountKg100 > 0.0001);

  const nutrients = emptyNutrients();

  for (const item of formulaIngredients) {
    const ingredient = ingredients.find((i) => i.id === item.id);
    if (!ingredient) continue;

    for (const key of nutrientKeys) {
      nutrients[key] +=
        (item.amountKg100 * Number(ingredient.nutrients[key] || 0)) / 100;
    }
  }

  const costPer100Kg = formulaIngredients.reduce(
    (sum, item) => sum + item.cost,
    0
  );

  return {
    feasible: true,
    costPerKg: costPer100Kg / 100,
    costPer100Kg,
    costPer50Kg: costPer100Kg / 2,
    ingredients: formulaIngredients,
    nutrients,
    ingredientLimitStatuses: buildIngredientLimitStatuses(
      ingredients,
      formulaIngredients
    ),
    nutrientLimitStatuses: buildNutrientLimitStatuses(nutrients, requirement)
  };
}
