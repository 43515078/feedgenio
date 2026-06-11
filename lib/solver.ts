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

type SmartDiagnosis = {
  level: "info" | "warning" | "danger";
  title: string;
  message: string;
  action: string;
};

type ShadowPriceStatus = {
  id: string;
  type: "nutrientMin" | "nutrientMax" | "ingredientMin" | "ingredientMax";
  name: string;
  currentLimit: number;
  relaxedLimit: number;
  estimatedSavingPer100Kg: number;
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
  smartDiagnostics?: SmartDiagnosis[];
  shadowPriceStatuses?: ShadowPriceStatus[];
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

function shadowDeltaForNutrient(key: NutrientKey) {
  if (key === "energy") return 10;
  return 0.01;
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

function calculateSolverCostPer100Kg(
  result: Record<string, number | boolean>,
  ingredients: Ingredient[]
) {
  return ingredients.reduce((sum, ingredient) => {
    const amountKg100 = Number(result[ingredient.id] || 0);
    return sum + amountKg100 * Number(ingredient.price || 0);
  }, 0);
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

function findFormulaIngredientAmount(
  formulaIngredients: FormulaResult["ingredients"],
  keywords: string[]
) {
  const item = formulaIngredients.find((ingredient) =>
    keywords.some((keyword) =>
      ingredient.name.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  return item?.amountKg100 || 0;
}

function hasIngredientAtMax(
  ingredientStatuses: IngredientLimitStatus[],
  keywords: string[]
) {
  return ingredientStatuses.some(
    (ingredient) =>
      ingredient.status === "max" &&
      keywords.some((keyword) =>
        ingredient.name.toLowerCase().includes(keyword.toLowerCase())
      )
  );
}

function hasNutrientStatus(
  nutrientStatuses: NutrientLimitStatus[],
  keys: NutrientKey[],
  statuses: NutrientLimitStatus["status"][]
) {
  return nutrientStatuses.some(
    (nutrient) => keys.includes(nutrient.key) && statuses.includes(nutrient.status)
  );
}

function getProfileFlags(requirementName: string) {
  const name = requirementName.toLowerCase();

  return {
    isLayer:
      name.includes("ponedora") ||
      name.includes("postura") ||
      name.includes("gallina") ||
      name.includes("hyline") ||
      name.includes("hy-line") ||
      name.includes("dekalb"),
    isBroiler:
      name.includes("cobb") ||
      name.includes("broiler") ||
      name.includes("pollo"),
    isPig: name.includes("cerdo") || name.includes("porcino"),
    isGuineaPig: name.includes("cuy"),
    isSummer: name.includes("verano")
  };
}

function buildSmartDiagnostics(
  formulaIngredients: FormulaResult["ingredients"],
  ingredientStatuses: IngredientLimitStatus[],
  nutrientStatuses: NutrientLimitStatus[],
  requirement: Requirement
): SmartDiagnosis[] {
  const diagnostics: SmartDiagnosis[] = [];
  const profile = getProfileFlags(requirement.name);

  const maxIngredients = ingredientStatuses.filter((item) => item.status === "max");
  const minIngredients = ingredientStatuses.filter((item) => item.status === "min");
  const nearMinimumNutrients = nutrientStatuses.filter(
    (item) => item.status === "nearMin" || item.status === "below"
  );
  const nearMaximumNutrients = nutrientStatuses.filter(
    (item) => item.status === "nearMax" || item.status === "above"
  );

  const oil = findFormulaIngredientAmount(formulaIngredients, ["aceite", "grasa"]);
  const corn = findFormulaIngredientAmount(formulaIngredients, ["maíz", "maiz"]);
  const soybean = findFormulaIngredientAmount(formulaIngredients, ["soya", "soja"]);
  const carbonate = findFormulaIngredientAmount(formulaIngredients, ["carbonato"]);
  const dcp = findFormulaIngredientAmount(formulaIngredients, [
    "fosfato",
    "dcp",
    "dicálcico",
    "dicalcico"
  ]);

  const energyTight = hasNutrientStatus(
    nutrientStatuses,
    ["energy"],
    ["nearMin", "below", "nearMax", "above"]
  );

  const aminoTight = hasNutrientStatus(
    nutrientStatuses,
    [
      "lysine",
      "methionine",
      "metCys",
      "threonine",
      "tryptophan",
      "arginine",
      "glycineSerine",
      "histidine",
      "isoleucine",
      "leucine",
      "phenylalanine",
      "tyrosine",
      "phenylalanineTyrosine",
      "valine"
    ],
    ["nearMin", "below"]
  );

  const mineralsTight = hasNutrientStatus(
    nutrientStatuses,
    ["calcium", "availablePhosphorus", "sodium", "chlorine"],
    ["nearMin", "below", "nearMax", "above"]
  );

  if (maxIngredients.length > 0) {
    diagnostics.push({
      level: "warning",
      title: "Ingredientes pegados al máximo",
      message: `El solver está usando al límite: ${maxIngredients
        .map((item) => item.name)
        .join(", ")}.`,
      action:
        "Si uno de esos insumos es barato o aporta el nutriente limitante, prueba subir su máximo por especie. Si es caro o riesgoso, deja el límite como está."
    });
  }

  if (minIngredients.length > 0) {
    diagnostics.push({
      level: "info",
      title: "Ingredientes obligados por mínimo",
      message: `Estos ingredientes entraron porque tienen mínimo configurado: ${minIngredients
        .map((item) => item.name)
        .join(", ")}.`,
      action:
        "Si no quieres que entren sí o sí, baja su mínimo a 0. El mínimo debe usarse solo cuando técnicamente necesitas obligar un ingrediente."
    });
  }

  if (energyTight) {
    diagnostics.push({
      level: "warning",
      title: "Energía como posible cuello de botella",
      message:
        "La energía quedó muy ajustada o cerca de un límite. Esto suele empujar aceite, maíz o ingredientes energéticos.",
      action:
        "Revisa el mínimo y máximo de energía. También revisa el máximo de aceite, maíz o grasa."
    });
  }

  if (aminoTight) {
    diagnostics.push({
      level: "warning",
      title: "Aminoácidos limitantes",
      message:
        "Uno o más aminoácidos quedaron muy cerca del mínimo. La fórmula probablemente está buscando proteína o aminoácidos sintéticos.",
      action:
        "Revisa lisina, metionina, treonina y aminoácidos secundarios. Si usas valores digestibles, asegúrate de que requerimientos e ingredientes estén en la misma base."
    });
  }

  if (mineralsTight) {
    diagnostics.push({
      level: "warning",
      title: "Minerales ajustados",
      message:
        "Calcio, fósforo disponible, sodio o cloro están actuando como restricciones importantes.",
      action:
        "Revisa límites de carbonato, DCP, sal y bicarbonato."
    });
  }

  if (hasIngredientAtMax(ingredientStatuses, ["soya", "soja"]) && aminoTight) {
    diagnostics.push({
      level: "danger",
      title: "Soya al máximo y aminoácidos ajustados",
      message:
        "La torta de soya llegó al máximo mientras los aminoácidos siguen ajustados.",
      action:
        "Prueba subir un poco el máximo de soya, permitir lisina/metionina/treonina sintética o revisar si el requerimiento está demasiado alto."
    });
  }

  if (hasIngredientAtMax(ingredientStatuses, ["maíz", "maiz"]) && energyTight) {
    diagnostics.push({
      level: "warning",
      title: "Maíz al máximo y energía ajustada",
      message: "El maíz llegó al máximo y la energía sigue siendo importante.",
      action:
        "Prueba subir el máximo de maíz, revisar la EM real del maíz o permitir aceite si la especie y el manejo lo toleran."
    });
  }

  if (hasIngredientAtMax(ingredientStatuses, ["aceite", "grasa"]) && energyTight) {
    diagnostics.push({
      level: "danger",
      title: "Aceite al máximo",
      message:
        "El aceite llegó al máximo. La fórmula probablemente necesita más energía, pero el techo de aceite la está frenando.",
      action:
        "No subas aceite automáticamente. Primero revisa mezcla, pellet, rancidez, consumo y si realmente el requerimiento energético es correcto."
    });
  }

  if (profile.isLayer && carbonate < 6) {
    diagnostics.push({
      level: "danger",
      title: "Ponedora con poco carbonato",
      message: "Para una ponedora en producción, el carbonato aparece bajo.",
      action:
        "Revisa calcio mínimo, calcio máximo, carbonato fino/grueso, DCP y consumo esperado."
    });
  }

  if (profile.isLayer && carbonate > 11.5) {
    diagnostics.push({
      level: "warning",
      title: "Carbonato alto en ponedora",
      message:
        "El carbonato está alto. Puede ser normal en ponedora, pero también puede estar forzando la fórmula.",
      action:
        "Revisa calcio total, fósforo disponible, granulometría del carbonato y consumo diario."
    });
  }

  if (profile.isPig && soybean > 28) {
    diagnostics.push({
      level: "warning",
      title: "Soya alta en cerdo",
      message: "La torta de soya está alta para cerdo.",
      action:
        "Revisa lisina digestible, treonina, energía y si conviene usar aminoácidos sintéticos para bajar proteína total."
    });
  }

  if (profile.isBroiler && oil > 5.5) {
    diagnostics.push({
      level: "warning",
      title: "Aceite alto en pollo",
      message:
        "El aceite está alto. Puede ayudar a energía, pero exige buena mezcla y control de calidad.",
      action:
        "Revisa peletizado, estabilidad, rancidez y si el consumo esperado justifica esa densidad energética."
    });
  }

  if (dcp <= 0.001 && requirement.availablePhosphorus > 0.3) {
    diagnostics.push({
      level: "info",
      title: "Fósforo sin DCP",
      message:
        "La fórmula no está usando fosfato/DCP aunque el fósforo disponible requerido no es bajo.",
      action:
        "Si estás usando fitasa como ingrediente con matriz nutricional, puede estar bien. Si no, revisa el fósforo disponible de tus insumos."
    });
  }

  if (corn > 78) {
    diagnostics.push({
      level: "info",
      title: "Fórmula muy cargada a maíz",
      message:
        "El maíz está muy alto. Esto suele bajar costo, pero puede dejar aminoácidos y fósforo más ajustados.",
      action:
        "Revisa aminoácidos, fósforo disponible y la calidad real del maíz."
    });
  }

  if (nearMinimumNutrients.length > 0) {
    diagnostics.push({
      level: "info",
      title: "Nutrientes que mandan el costo",
      message: `Los nutrientes más ajustados al mínimo son: ${nearMinimumNutrients
        .slice(0, 6)
        .map((item) => item.label)
        .join(", ")}.`,
      action:
        "Estos nutrientes son candidatos a revisar primero cuando la fórmula salga cara o no cierre."
    });
  }

  if (nearMaximumNutrients.length > 0) {
    diagnostics.push({
      level: "warning",
      title: "Techos nutricionales activos",
      message: `Los nutrientes cerca del máximo son: ${nearMaximumNutrients
        .slice(0, 6)
        .map((item) => item.label)
        .join(", ")}.`,
      action:
        "Si el solver se bloquea, estos máximos pueden estar cerrando demasiado la jaula."
    });
  }

  if (diagnostics.length === 0) {
    diagnostics.push({
      level: "info",
      title: "Fórmula sin cuello de botella fuerte",
      message:
        "No se detectó un bloqueo evidente. La fórmula parece tener margen técnico razonable.",
      action:
        "Igual revisa calidad de ingredientes, límites por especie, consumo esperado y criterio práctico antes de producir."
    });
  }

  return diagnostics;
}

function buildShadowPrices(
  ingredients: Ingredient[],
  requirement: Requirement,
  baseCostPer100Kg: number,
  nutrientStatuses: NutrientLimitStatus[],
  ingredientStatuses: IngredientLimitStatus[]
): ShadowPriceStatus[] {
  const shadowPrices: ShadowPriceStatus[] = [];

  for (const nutrient of nutrientStatuses) {
    const key = nutrient.key;
    const delta = shadowDeltaForNutrient(key);

    if (nutrient.status === "nearMin") {
      const currentLimit = getRequirementValue(requirement, key);

      if (currentLimit > 0) {
        const relaxedRequirement = {
          ...requirement,
          [key]: Math.max(0, currentLimit - delta)
        };

        const relaxedResult = runSolver(ingredients, relaxedRequirement);

        if (relaxedResult.feasible) {
          const relaxedCost = calculateSolverCostPer100Kg(
            relaxedResult,
            ingredients
          );
          const saving = baseCostPer100Kg - relaxedCost;

          if (saving > 0.0001) {
            shadowPrices.push({
              id: `nutrient_min_${key}`,
              type: "nutrientMin",
              name: nutrient.label,
              currentLimit,
              relaxedLimit: Math.max(0, currentLimit - delta),
              estimatedSavingPer100Kg: saving,
              message: `Si bajas un poquito el mínimo de ${nutrient.label}, el costo podría bajar aprox. S/ ${saving.toFixed(
                3
              )} por cada 100 kg.`
            });
          }
        }
      }
    }

    if (nutrient.status === "nearMax" && typeof nutrient.max === "number") {
      const currentLimit = nutrient.max;
      const maxKey = `${key}Max` as keyof Requirement;

      const relaxedRequirement = {
        ...requirement,
        [maxKey]: currentLimit + delta
      };

      const relaxedResult = runSolver(ingredients, relaxedRequirement);

      if (relaxedResult.feasible) {
        const relaxedCost = calculateSolverCostPer100Kg(
          relaxedResult,
          ingredients
        );
        const saving = baseCostPer100Kg - relaxedCost;

        if (saving > 0.0001) {
          shadowPrices.push({
            id: `nutrient_max_${key}`,
            type: "nutrientMax",
            name: nutrient.label,
            currentLimit,
            relaxedLimit: currentLimit + delta,
            estimatedSavingPer100Kg: saving,
            message: `Si subes un poquito el máximo de ${nutrient.label}, el costo podría bajar aprox. S/ ${saving.toFixed(
              3
            )} por cada 100 kg.`
          });
        }
      }
    }
  }

  for (const ingredientStatus of ingredientStatuses) {
    const ingredient = ingredients.find((item) => item.id === ingredientStatus.id);
    if (!ingredient) continue;

    if (ingredientStatus.status === "max") {
      const delta = 0.1;
      const relaxedIngredients = ingredients.map((item) =>
        item.id === ingredient.id
          ? {
              ...item,
              max: Number(item.max || 0) + delta
            }
          : item
      );

      const relaxedResult = runSolver(relaxedIngredients, requirement);

      if (relaxedResult.feasible) {
        const relaxedCost = calculateSolverCostPer100Kg(
          relaxedResult,
          relaxedIngredients
        );
        const saving = baseCostPer100Kg - relaxedCost;

        if (saving > 0.0001) {
          shadowPrices.push({
            id: `ingredient_max_${ingredient.id}`,
            type: "ingredientMax",
            name: ingredient.name,
            currentLimit: Number(ingredient.max || 0),
            relaxedLimit: Number(ingredient.max || 0) + delta,
            estimatedSavingPer100Kg: saving,
            message: `Si subes el máximo de ${ingredient.name} en 0.1%, el costo podría bajar aprox. S/ ${saving.toFixed(
              3
            )} por cada 100 kg.`
          });
        }
      }
    }

    if (ingredientStatus.status === "min") {
      const delta = 0.1;
      const currentMin = Number(ingredient.min || 0);

      if (currentMin > 0) {
        const relaxedIngredients = ingredients.map((item) =>
          item.id === ingredient.id
            ? {
                ...item,
                min: Math.max(0, Number(item.min || 0) - delta)
              }
            : item
        );

        const relaxedResult = runSolver(relaxedIngredients, requirement);

        if (relaxedResult.feasible) {
          const relaxedCost = calculateSolverCostPer100Kg(
            relaxedResult,
            relaxedIngredients
          );
          const saving = baseCostPer100Kg - relaxedCost;

          if (saving > 0.0001) {
            shadowPrices.push({
              id: `ingredient_min_${ingredient.id}`,
              type: "ingredientMin",
              name: ingredient.name,
              currentLimit: currentMin,
              relaxedLimit: Math.max(0, currentMin - delta),
              estimatedSavingPer100Kg: saving,
              message: `Si bajas el mínimo obligatorio de ${ingredient.name} en 0.1%, el costo podría bajar aprox. S/ ${saving.toFixed(
                3
              )} por cada 100 kg.`
            });
          }
        }
      }
    }
  }

  return shadowPrices
    .sort((a, b) => b.estimatedSavingPer100Kg - a.estimatedSavingPer100Kg)
    .slice(0, 12);
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
      message: "No hay ingredientes activos para formular.",
      smartDiagnostics: [
        {
          level: "danger",
          title: "Sin ingredientes activos",
          message: "No hay ingredientes disponibles para que el solver formule.",
          action:
            "Activa ingredientes en Formular o marca especies en la Matriz para este perfil."
        }
      ]
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
      diagnostics: failure.diagnostics,
      smartDiagnostics: [
        {
          level: "danger",
          title: "Fórmula bloqueada",
          message:
            "El solver no encontró una combinación posible con los mínimos, máximos y requerimientos actuales.",
          action:
            "Revisa primero suma de mínimos, suma de máximos, nutrientes imposibles y máximos demasiado cerrados en ingredientes clave."
        }
      ]
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

  const ingredientLimitStatuses = buildIngredientLimitStatuses(
    ingredients,
    formulaIngredients
  );

  const nutrientLimitStatuses = buildNutrientLimitStatuses(nutrients, requirement);

  const shadowPriceStatuses = buildShadowPrices(
    ingredients,
    requirement,
    costPer100Kg,
    nutrientLimitStatuses,
    ingredientLimitStatuses
  );

  return {
    feasible: true,
    costPerKg: costPer100Kg / 100,
    costPer100Kg,
    costPer50Kg: costPer100Kg / 2,
    ingredients: formulaIngredients,
    nutrients,
    ingredientLimitStatuses,
    nutrientLimitStatuses,
    shadowPriceStatuses,
    smartDiagnostics: buildSmartDiagnostics(
      formulaIngredients,
      ingredientLimitStatuses,
      nutrientLimitStatuses,
      requirement
    )
  };
}
