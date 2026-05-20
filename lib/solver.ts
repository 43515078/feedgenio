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
  possibleMax: number;
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

function calculateMaxPossibleNutrients(
  ingredients: Ingredient[]
): Record<NutrientKey, number> {
  const maxPossible = emptyNutrients();

  for (const ingredient of ingredients) {
    const usableMax = Math.max(0, Number(ingredient.max || 0));

    for (const key of nutrientKeys) {
      maxPossible[key] +=
        (usableMax * Number(ingredient.nutrients[key] || 0)) / 100;
    }
  }

  return maxPossible;
}

function buildDiagnostics(
  ingredients: Ingredient[],
  requirement: Requirement
): NutrientDiagnostics[] {
  const maxPossible = calculateMaxPossibleNutrients(ingredients);

  return nutrientKeys.map((key) => {
    const required = getRequirementValue(requirement, key);
    const possibleMax = Number(maxPossible[key] || 0);

    return {
      label: nutrientLabels[key],
      required,
      possibleMax,
      difference: possibleMax - required
    };
  });
}

function buildFailureMessage(
  ingredients: Ingredient[],
  requirement: Requirement
) {
  const diagnostics = buildDiagnostics(ingredients, requirement);

  const impossibleNutrients = diagnostics.filter(
    (item) => item.possibleMax + 0.0001 < item.required
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

  if (impossibleNutrients.length > 0) {
    messages.push("Nutrientes posiblemente imposibles con los máximos actuales:");

    for (const item of impossibleNutrients) {
      const decimals = item.label === "Energía" ? 0 : 2;

      messages.push(
        `- ${item.label}: requerido ${item.required.toFixed(
          decimals
        )}, máximo posible aprox. ${item.possibleMax.toFixed(decimals)}`
      );
    }
  } else {
    messages.push(
      "Los nutrientes parecen alcanzables por separado, pero la combinación de límites mínimos/máximos puede estar bloqueando la fórmula."
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
    model.constraints[key] = {
      min: getRequirementValue(requirement, key)
    };
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
