import type { Ingredient, NutrientKey } from "./ingredients";
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
};

const nutrientKeys: NutrientKey[] = [
  "energy",
  "protein",
  "lysine",
  "methionine",
  "metCys",
  "threonine",
  "tryptophan",
  "arginine",
  "isoleucine",
  "valine",
  "calcium",
  "availablePhosphorus",
  "sodium",
  "chlorine",
  "linoleicAcid"
];

const nutrientLabels: Record<NutrientKey, string> = {
  energy: "Energía",
  protein: "Proteína",
  lysine: "Lisina",
  methionine: "Metionina",
  metCys: "Met + Cist",
  threonine: "Treonina",
  tryptophan: "Triptófano",
  arginine: "Arginina",
  isoleucine: "Isoleucina",
  valine: "Valina",
  calcium: "Calcio",
  availablePhosphorus: "Fósforo disponible",
  sodium: "Sodio",
  chlorine: "Cloro",
  linoleicAcid: "Ácido linoleico"
};

function emptyNutrients(): Record<NutrientKey, number> {
  return {
    energy: 0,
    protein: 0,
    lysine: 0,
    methionine: 0,
    metCys: 0,
    threonine: 0,
    tryptophan: 0,
    arginine: 0,
    isoleucine: 0,
    valine: 0,
    calcium: 0,
    availablePhosphorus: 0,
    sodium: 0,
    chlorine: 0,
    linoleicAcid: 0
  };
}

function getRequirementValue(requirement: Requirement, key: NutrientKey) {
  return Number(requirement[key] || 0);
}

function getRequirementMaxValue(requirement: Requirement, key: NutrientKey) {
  const maxKey = `${key}Max` as keyof Requirement;
  const value = Number(requirement[maxKey] || 0);

  return Number.isFinite(value) && value > 0 ? value : undefined;
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
      label: nutrientLabels[key],
      required,
      requiredMax,
      possibleMax: maxValue,
      possibleMin: minValue,
      difference: maxValue - required
    };
  });
}

function buildFailureMessage(
  ingredients: Ingredient[],
  requirement: Requirement
) {
  const diagnostics = buildDiagnostics(ingredients, requirement);

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

  if (
    impossibleMinimums.length === 0 &&
    impossibleMaximums.length === 0 &&
    invertedRanges.length === 0
  ) {
    messages.push(
      "Los nutrientes parecen alcanzables por separado, pero la combinación de mínimos, máximos y límites de ingredientes está bloqueando la fórmula."
    );

    messages.push(
      "Revisa ingredientes que están con máximo bajo, especialmente energía, proteína, calcio, fósforo, sodio, cloro y aceite/soya/maíz."
    );
  }

  return {
    message: messages.join("\n"),
    diagnostics
  };
}

export function solveFormula(
  ingredients: Ingredient[],
  requirement: Requirement
): FormulaResult {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const solver = require("javascript-lp-solver");

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

    model.constraints[key] = {
      min: minValue
    };

    if (typeof maxValue === "number") {
      model.constraints[key].max = maxValue;
    }
  }

  for (const ingredient of ingredients) {
    model.constraints[`${ingredient.id}_min`] = { min: ingredient.min };
    model.constraints[`${ingredient.id}_max`] = { max: ingredient.max };

    const variable: SolverVariable = {
      cost: ingredient.price,
      total: 1,
      [`${ingredient.id}_min`]: 1,
      [`${ingredient.id}_max`]: 1
    };

    for (const key of nutrientKeys) {
      variable[key] = Number(ingredient.nutrients[key] || 0) / 100;
    }

    model.variables[ingredient.id] = variable;
  }

  const result = solver.Solve(model);

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
        price: ingredient.price,
        cost: amountKg100 * ingredient.price
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
    nutrients
  };
}
