import type { Ingredient } from "./ingredients";
import type { Requirement } from "./requirements";

type SolverVariable = {
  cost: number;
  total: number;
  energy: number;
  protein: number;
  lysine: number;
  methionine: number;
  metCys: number;
  calcium: number;
  availablePhosphorus: number;
  sodium: number;
  [key: string]: number;
};

type SolverModel = {
  optimize: string;
  opType: "min";
  constraints: Record<string, { min?: number; max?: number; equal?: number }>;
  variables: Record<string, SolverVariable>;
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
  nutrients: {
    energy: number;
    protein: number;
    lysine: number;
    methionine: number;
    metCys: number;
    calcium: number;
    availablePhosphorus: number;
    sodium: number;
  };
  message?: string;
};

export function solveFormula(
  ingredients: Ingredient[],
  requirement: Requirement
): FormulaResult {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const solver = require("javascript-lp-solver");

  const model: SolverModel = {
    optimize: "cost",
    opType: "min",
    constraints: {
      total: { equal: 100 },
      energy: { min: requirement.energy },
      protein: { min: requirement.protein },
      lysine: { min: requirement.lysine },
      methionine: { min: requirement.methionine },
      metCys: { min: requirement.metCys },
      calcium: { min: requirement.calcium },
      availablePhosphorus: { min: requirement.availablePhosphorus },
      sodium: { min: requirement.sodium }
    },
    variables: {}
  };

  for (const ingredient of ingredients) {
    model.constraints[`${ingredient.id}_min`] = { min: ingredient.min };
    model.constraints[`${ingredient.id}_max`] = { max: ingredient.max };

    model.variables[ingredient.id] = {
      cost: ingredient.price,
      total: 1,
      energy: ingredient.nutrients.energy / 100,
      protein: ingredient.nutrients.protein / 100,
      lysine: ingredient.nutrients.lysine / 100,
      methionine: ingredient.nutrients.methionine / 100,
      metCys: ingredient.nutrients.metCys / 100,
      calcium: ingredient.nutrients.calcium / 100,
      availablePhosphorus: ingredient.nutrients.availablePhosphorus / 100,
      sodium: ingredient.nutrients.sodium / 100,
      [`${ingredient.id}_min`]: 1,
      [`${ingredient.id}_max`]: 1
    };
  }

  const result = solver.Solve(model);

  if (!result.feasible) {
    return {
      feasible: false,
      costPerKg: 0,
      costPer100Kg: 0,
      costPer50Kg: 0,
      ingredients: [],
      nutrients: {
        energy: 0,
        protein: 0,
        lysine: 0,
        methionine: 0,
        metCys: 0,
        calcium: 0,
        availablePhosphorus: 0,
        sodium: 0
      },
      message:
        "No se encontró una fórmula posible con estos límites y requerimientos."
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

  const nutrients = {
    energy: 0,
    protein: 0,
    lysine: 0,
    methionine: 0,
    metCys: 0,
    calcium: 0,
    availablePhosphorus: 0,
    sodium: 0
  };

  for (const item of formulaIngredients) {
    const ingredient = ingredients.find((i) => i.id === item.id);
    if (!ingredient) continue;

    nutrients.energy += (item.amountKg100 * ingredient.nutrients.energy) / 100;
    nutrients.protein += (item.amountKg100 * ingredient.nutrients.protein) / 100;
    nutrients.lysine += (item.amountKg100 * ingredient.nutrients.lysine) / 100;
    nutrients.methionine +=
      (item.amountKg100 * ingredient.nutrients.methionine) / 100;
    nutrients.metCys += (item.amountKg100 * ingredient.nutrients.metCys) / 100;
    nutrients.calcium +=
      (item.amountKg100 * ingredient.nutrients.calcium) / 100;
    nutrients.availablePhosphorus +=
      (item.amountKg100 * ingredient.nutrients.availablePhosphorus) / 100;
    nutrients.sodium += (item.amountKg100 * ingredient.nutrients.sodium) / 100;
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
