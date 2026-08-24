// lib/solver.ts

import {
  calculateAllDerivedMetrics,
  calculateElectrolyteBalance,
  nutrientDecimals,
  nutrientFullLabels,
  nutrientKeys,
  solverNutrientKeys,
  type DerivedMetricKey,
  type Ingredient,
  type NutrientKey
} from "./ingredients";

import {
  getRequirementMaximum,
  getRequirementMinimum,
  normalizeRequirement,
  type Requirement
} from "./requirements";

type SolverVariable = {
  cost: number;
  total: number;
  [key: string]: number;
};

type SolverConstraint = {
  min?: number;
  max?: number;
  equal?: number;
};

type SolverModel = {
  optimize: string;
  opType: "min";
  constraints: Record<
    string,
    SolverConstraint
  >;
  variables: Record<
    string,
    SolverVariable
  >;
};

type SolverResponse = {
  feasible?: boolean;
  result?: number;
  [key: string]:
    | number
    | boolean
    | undefined;
};

export type NutrientDiagnostics = {
  key: NutrientKey;
  label: string;
  required: number;
  requiredMax?: number;
  possibleMax: number;
  possibleMin: number;
  difference: number;
};

export type IngredientLimitStatus = {
  id: string;
  name: string;
  amountKg100: number;
  min: number;
  max: number;
  status: "min" | "max" | "free";
  message: string;
};

export type NutrientLimitStatus = {
  key: NutrientKey;
  label: string;
  obtained: number;
  min: number;
  max?: number;
  enabled: boolean;

  status:
    | "disabled"
    | "below"
    | "nearMin"
    | "nearMax"
    | "above"
    | "ok";

  message: string;
};

export type DerivedMetricStatus = {
  key: DerivedMetricKey;
  label: string;
  value: number;
  min?: number;
  max?: number;
  enabled: boolean;

  status:
    | "disabled"
    | "below"
    | "nearMin"
    | "nearMax"
    | "above"
    | "ok";

  message: string;
};

export type SmartDiagnosis = {
  level: "info" | "warning" | "danger";
  title: string;
  message: string;
  action: string;
};

export type ShadowPriceStatus = {
  id: string;

  type:
    | "nutrientMin"
    | "nutrientMax"
    | "ingredientMin"
    | "ingredientMax";

  name: string;
  currentLimit: number;
  relaxedLimit: number;
  estimatedSavingPer100Kg: number;
  message: string;
};

export type SafetyStatus = {
  id: string;
  level: "info" | "warning" | "danger";
  title: string;
  message: string;
  action: string;
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

  nutrients: Record<
    NutrientKey,
    number
  >;

  derivedMetrics: Record<
    DerivedMetricKey,
    number
  >;

  message?: string;

  diagnostics?: NutrientDiagnostics[];

  ingredientLimitStatuses?: IngredientLimitStatus[];

  nutrientLimitStatuses?: NutrientLimitStatus[];

  derivedMetricStatuses?: DerivedMetricStatus[];

  smartDiagnostics?: SmartDiagnosis[];

  shadowPriceStatuses?: ShadowPriceStatus[];

  safetyStatuses?: SafetyStatus[];
};

/* =========================================================
   HELPERS
   ========================================================= */

function emptyNutrients(): Record<
  NutrientKey,
  number
> {
  const nutrients = {} as Record<
    NutrientKey,
    number
  >;

  for (const key of nutrientKeys) {
    nutrients[key] = 0;
  }

  return nutrients;
}

function emptyDerivedMetrics(): Record<
  DerivedMetricKey,
  number
> {
  return {
    electrolyteBalance: 0
  };
}

function decimalsForNutrient(
  key: NutrientKey
): number {
  return nutrientDecimals[key] ?? 3;
}

function shadowDeltaForNutrient(
  key: NutrientKey
): number {
  if (key === "energy") {
    return 10;
  }

  return 0.01;
}

function getResultAmount(
  result: SolverResponse,
  ingredientId: string
): number {
  return Number(
    result[ingredientId] || 0
  );
}

function practicalMinimumForIngredient(
  ingredientName: string
): number {
  const name =
    ingredientName.toLowerCase();

  if (
    name.includes("lisina") ||
    name.includes("metionina") ||
    name.includes("treonina") ||
    name.includes("valina") ||
    name.includes("isoleucina") ||
    name.includes("triptófano") ||
    name.includes("triptofano") ||
    name.includes("histidina")
  ) {
    return 0.05;
  }

  if (name.includes("sal")) {
    return 0.05;
  }

  if (
    name.includes("aceite") ||
    name.includes("grasa")
  ) {
    return 0.1;
  }

  if (
    name.includes("fosfato") ||
    name.includes("dcp") ||
    name.includes("carbonato")
  ) {
    return 0.1;
  }

  return 0;
}

function isTinyTechnicalIngredient(
  ingredientName: string,
  amountOrLimit: number
): boolean {
  const name =
    ingredientName.toLowerCase();

  const isAdditive =
    name.includes("premix") ||
    name.includes("premezcla") ||
    name.includes("vit") ||
    name.includes("enzima") ||
    name.includes("zyme") ||
    name.includes("hiphorius") ||
    name.includes("hyphorius") ||
    name.includes("fitasa") ||
    name.includes("aflaban") ||
    name.includes("fungiban") ||
    name.includes("secuestrante") ||
    name.includes("micotox") ||
    name.includes("colina");

  return (
    isAdditive &&
    amountOrLimit <= 0.25
  );
}

/* =========================================================
   CÁLCULOS NUTRICIONALES
   ========================================================= */

function calculateFormulaNutrients(
  result: SolverResponse,
  ingredients: Ingredient[]
): Record<NutrientKey, number> {
  const nutrients =
    emptyNutrients();

  for (const ingredient of ingredients) {
    const amountKg100 =
      getResultAmount(
        result,
        ingredient.id
      );

    if (amountKg100 <= 0) {
      continue;
    }

    for (const key of nutrientKeys) {
      nutrients[key] +=
        (amountKg100 *
          Number(
            ingredient.nutrients?.[key] ??
              0
          )) /
        100;
    }
  }

  return nutrients;
}

function calculatePossibleNutrients(
  ingredients: Ingredient[],
  limitType: "min" | "max"
): Record<NutrientKey, number> {
  const possible =
    emptyNutrients();

  for (const ingredient of ingredients) {
    const usableAmount = Math.max(
      0,
      Number(
        ingredient[limitType] || 0
      )
    );

    for (const key of nutrientKeys) {
      possible[key] +=
        (usableAmount *
          Number(
            ingredient.nutrients?.[key] ??
              0
          )) /
        100;
    }
  }

  return possible;
}

function calculateSolverCostPer100Kg(
  result: SolverResponse,
  ingredients: Ingredient[]
): number {
  return ingredients.reduce(
    (sum, ingredient) => {
      const amountKg100 =
        getResultAmount(
          result,
          ingredient.id
        );

      return (
        sum +
        amountKg100 *
          Number(
            ingredient.price || 0
          )
      );
    },
    0
  );
}

/* =========================================================
   MODELO LINEAL
   ========================================================= */

function createModel(
  ingredients: Ingredient[],
  rawRequirement: Requirement,
  options?: {
    skipMinNutrient?: NutrientKey;
    skipMaxNutrient?: NutrientKey;
  }
): SolverModel {
  const requirement =
    normalizeRequirement(
      rawRequirement
    );

  const model: SolverModel = {
    optimize: "cost",
    opType: "min",

    constraints: {
      total: {
        equal: 100
      }
    },

    variables: {}
  };

  for (const key of solverNutrientKeys) {
    const range =
      requirement.nutrients[key];

    if (!range.enabled) {
      continue;
    }

    const minValue =
      getRequirementMinimum(
        requirement,
        key
      );

    const maxValue =
      getRequirementMaximum(
        requirement,
        key
      );

    const constraint: SolverConstraint =
      {};

    if (
      options?.skipMinNutrient !==
        key &&
      minValue > 0
    ) {
      constraint.min = minValue;
    }

    if (
      options?.skipMaxNutrient !==
        key &&
      typeof maxValue === "number"
    ) {
      constraint.max = maxValue;
    }

    if (
      constraint.min !== undefined ||
      constraint.max !== undefined
    ) {
      model.constraints[key] =
        constraint;
    }
  }

  const electrolyteRange =
    requirement.derivedRequirements
      .electrolyteBalance;

  const electrolyteConstraintKey =
    "derived_electrolyteBalance";

  if (electrolyteRange.enabled) {
    const electrolyteConstraint: SolverConstraint = {};

    if (
      typeof electrolyteRange.min === "number"
    ) {
      electrolyteConstraint.min =
        electrolyteRange.min;
    }

    if (
      typeof electrolyteRange.max === "number"
    ) {
      electrolyteConstraint.max =
        electrolyteRange.max;
    }

    if (
      electrolyteConstraint.min !== undefined ||
      electrolyteConstraint.max !== undefined
    ) {
      model.constraints[electrolyteConstraintKey] =
        electrolyteConstraint;
    }
  }

  for (const ingredient of ingredients) {
    const minimum = Number(
      ingredient.min || 0
    );

    const maximum = Number(
      ingredient.max || 0
    );

    model.constraints[
      `${ingredient.id}_min`
    ] = {
      min: minimum
    };

    model.constraints[
      `${ingredient.id}_max`
    ] = {
      max: maximum
    };

    const variable: SolverVariable = {
      cost: Number(
        ingredient.price || 0
      ),

      total: 1,

      [`${ingredient.id}_min`]: 1,

      [`${ingredient.id}_max`]: 1
    };

    for (const key of solverNutrientKeys) {
      if (!model.constraints[key]) {
        continue;
      }

      variable[key] =
        Number(
          ingredient.nutrients?.[key] ??
            0
        ) / 100;
    }

    if (
      model.constraints[electrolyteConstraintKey]
    ) {
      variable[electrolyteConstraintKey] =
        calculateElectrolyteBalance(
          Number(
            ingredient.nutrients?.sodium ?? 0
          ),
          Number(
            ingredient.nutrients?.potassium ?? 0
          ),
          Number(
            ingredient.nutrients?.chlorine ?? 0
          )
        ) / 100;
    }

    model.variables[ingredient.id] =
      variable;
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
): SolverResponse {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const solver =
    require("javascript-lp-solver");

  const model = createModel(
    ingredients,
    requirement,
    options
  );

  return solver.Solve(
    model
  ) as SolverResponse;
}

/* =========================================================
   DIAGNÓSTICO DE FÓRMULA IMPOSIBLE
   ========================================================= */

function buildDiagnostics(
  ingredients: Ingredient[],
  rawRequirement: Requirement
): NutrientDiagnostics[] {
  const requirement =
    normalizeRequirement(
      rawRequirement
    );

  const possibleMax =
    calculatePossibleNutrients(
      ingredients,
      "max"
    );

  const possibleMin =
    calculatePossibleNutrients(
      ingredients,
      "min"
    );

  return solverNutrientKeys
    .filter(
      (key) =>
        requirement.nutrients[key]
          .enabled
    )
    .map((key) => {
      const required =
        getRequirementMinimum(
          requirement,
          key
        );

      const requiredMax =
        getRequirementMaximum(
          requirement,
          key
        );

      const maximumPossible =
        Number(
          possibleMax[key] || 0
        );

      const minimumPossible =
        Number(
          possibleMin[key] || 0
        );

      return {
        key,
        label:
          nutrientFullLabels[key],
        required,
        requiredMax,
        possibleMax:
          maximumPossible,
        possibleMin:
          minimumPossible,
        difference:
          maximumPossible - required
      };
    });
}

function buildExactRestrictionDiagnosis(
  ingredients: Ingredient[],
  rawRequirement: Requirement
): string[] {
  const requirement =
    normalizeRequirement(
      rawRequirement
    );

  const messages: string[] = [];

  for (const key of solverNutrientKeys) {
    const range =
      requirement.nutrients[key];

    if (
      !range.enabled ||
      range.min <= 0
    ) {
      continue;
    }

    const testResult = runSolver(
      ingredients,
      requirement,
      {
        skipMinNutrient: key
      }
    );

    if (!testResult.feasible) {
      continue;
    }

    const nutrients =
      calculateFormulaNutrients(
        testResult,
        ingredients
      );

    const obtained =
      nutrients[key];

    const required =
      getRequirementMinimum(
        requirement,
        key
      );

    const decimals =
      decimalsForNutrient(key);

    if (
      obtained + 0.0001 <
      required
    ) {
      messages.push(
        `- ${nutrientFullLabels[key]} mínimo: requiere ${required.toFixed(
          decimals
        )}, pero al quitar esa restricción la solución queda en ${obtained.toFixed(
          decimals
        )}. Falta ${Math.abs(
          required - obtained
        ).toFixed(decimals)}.`
      );
    } else {
      messages.push(
        `- ${nutrientFullLabels[key]} mínimo: al quitar esta restricción aparece solución. Revisa este mínimo junto con los límites de ingredientes.`
      );
    }
  }

  for (const key of solverNutrientKeys) {
    const range =
      requirement.nutrients[key];

    if (!range.enabled) {
      continue;
    }

    const maxValue =
      getRequirementMaximum(
        requirement,
        key
      );

    if (
      typeof maxValue !== "number"
    ) {
      continue;
    }

    const testResult = runSolver(
      ingredients,
      requirement,
      {
        skipMaxNutrient: key
      }
    );

    if (!testResult.feasible) {
      continue;
    }

    const nutrients =
      calculateFormulaNutrients(
        testResult,
        ingredients
      );

    const obtained =
      nutrients[key];

    const decimals =
      decimalsForNutrient(key);

    if (
      obtained - 0.0001 >
      maxValue
    ) {
      messages.push(
        `- ${nutrientFullLabels[key]} máximo: permite ${maxValue.toFixed(
          decimals
        )}, pero al quitar ese máximo la solución queda en ${obtained.toFixed(
          decimals
        )}. Exceso ${Math.abs(
          obtained - maxValue
        ).toFixed(decimals)}.`
      );
    } else {
      messages.push(
        `- ${nutrientFullLabels[key]} máximo: al quitar este techo aparece solución. Revisa este máximo junto con los demás nutrientes.`
      );
    }
  }

  return messages;
}

function buildFailureMessage(
  ingredients: Ingredient[],
  rawRequirement: Requirement
): {
  message: string;
  diagnostics: NutrientDiagnostics[];
} {
  const requirement =
    normalizeRequirement(
      rawRequirement
    );

  const diagnostics =
    buildDiagnostics(
      ingredients,
      requirement
    );

  const exactRestrictions =
    buildExactRestrictionDiagnosis(
      ingredients,
      requirement
    );

  const impossibleMinimums =
    diagnostics.filter(
      (item) =>
        item.required > 0 &&
        item.possibleMax + 0.0001 <
          item.required
    );

  const impossibleMaximums =
    diagnostics.filter(
      (item) =>
        typeof item.requiredMax ===
          "number" &&
        item.possibleMin - 0.0001 >
          item.requiredMax
    );

  const invertedRanges =
    diagnostics.filter(
      (item) =>
        typeof item.requiredMax ===
          "number" &&
        item.requiredMax + 0.0001 <
          item.required
    );

  const totalMin =
    ingredients.reduce(
      (sum, ingredient) =>
        sum +
        Number(
          ingredient.min || 0
        ),
      0
    );

  const totalMax =
    ingredients.reduce(
      (sum, ingredient) =>
        sum +
        Number(
          ingredient.max || 0
        ),
      0
    );

  const messages: string[] = [
    "No se encontró una fórmula posible con estos límites y requerimientos."
  ];

  if (totalMin > 100) {
    messages.push(
      `La suma de mínimos es ${totalMin.toFixed(
        3
      )}%, supera 100%. Baja algunos mínimos.`
    );
  }

  if (totalMax < 100) {
    messages.push(
      `La suma de máximos es ${totalMax.toFixed(
        3
      )}%, no llega a 100%. Sube algunos máximos o activa más ingredientes.`
    );
  }

  if (invertedRanges.length > 0) {
    messages.push(
      "Hay requerimientos con máximo menor que el mínimo:"
    );

    for (const item of invertedRanges) {
      const decimals =
        decimalsForNutrient(
          item.key
        );

      messages.push(
        `- ${item.label}: mínimo ${item.required.toFixed(
          decimals
        )}, máximo ${Number(
          item.requiredMax
        ).toFixed(decimals)}`
      );
    }
  }

  if (impossibleMinimums.length > 0) {
    messages.push(
      "Nutrientes que no llegan al mínimo con los máximos actuales:"
    );

    for (
      const item of impossibleMinimums
    ) {
      const decimals =
        decimalsForNutrient(
          item.key
        );

      messages.push(
        `- ${item.label}: mínimo requerido ${item.required.toFixed(
          decimals
        )}, máximo posible aproximado ${item.possibleMax.toFixed(
          decimals
        )}`
      );
    }
  }

  if (impossibleMaximums.length > 0) {
    messages.push(
      "Nutrientes que ya superan el máximo debido a los mínimos actuales:"
    );

    for (
      const item of impossibleMaximums
    ) {
      const decimals =
        decimalsForNutrient(
          item.key
        );

      messages.push(
        `- ${item.label}: máximo permitido ${Number(
          item.requiredMax
        ).toFixed(
          decimals
        )}, mínimo obligado aproximado ${item.possibleMin.toFixed(
          decimals
        )}`
      );
    }
  }

  if (exactRestrictions.length > 0) {
    messages.push(
      "Restricciones que desbloquean el solver:"
    );

    messages.push(
      ...exactRestrictions
    );
  }

  if (
    impossibleMinimums.length === 0 &&
    impossibleMaximums.length === 0 &&
    invertedRanges.length === 0 &&
    exactRestrictions.length === 0
  ) {
    messages.push(
      "No se encontró una única restricción que destrabe la fórmula. El bloqueo parece provenir de una combinación de dos o más restricciones."
    );

    messages.push(
      "Prueba ampliar límites de ingredientes clave o revisar requerimientos demasiado cerrados."
    );
  }

  return {
    message: messages.join("\n"),
    diagnostics
  };
}

/* =========================================================
   ESTADO DE LÍMITES DE INGREDIENTES
   ========================================================= */

function buildIngredientLimitStatuses(
  ingredients: Ingredient[],
  formulaIngredients: FormulaResult["ingredients"]
): IngredientLimitStatus[] {
  const statuses: IngredientLimitStatus[] =
    [];

  for (const ingredient of ingredients) {
    const formulaItem =
      formulaIngredients.find(
        (item) =>
          item.id === ingredient.id
      );

    const amountKg100 =
      formulaItem?.amountKg100 || 0;

    if (amountKg100 <= 0.0001) {
      continue;
    }

    const min = Number(
      ingredient.min || 0
    );

    const max = Number(
      ingredient.max || 0
    );

    const isAtMin =
      min > 0 &&
      Math.abs(
        amountKg100 - min
      ) <= 0.01;

    const isAtMax =
      max > 0 &&
      Math.abs(
        amountKg100 - max
      ) <= 0.01;

    if (
      isTinyTechnicalIngredient(
        ingredient.name,
        Math.max(
          amountKg100,
          min,
          max
        )
      )
    ) {
      statuses.push({
        id: ingredient.id,
        name: ingredient.name,
        amountKg100,
        min,
        max,
        status: "free",
        message: `${ingredient.name} es un insumo técnico de baja inclusión.`
      });

      continue;
    }

    if (isAtMax) {
      statuses.push({
        id: ingredient.id,
        name: ingredient.name,
        amountKg100,
        min,
        max,
        status: "max",
        message: `${ingredient.name} quedó pegado al máximo (${max.toFixed(
          3
        )}%).`
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
          3
        )}%).`
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

/* =========================================================
   ESTADO DE NUTRIENTES
   ========================================================= */

function buildNutrientLimitStatuses(
  nutrients: Record<
    NutrientKey,
    number
  >,
  rawRequirement: Requirement
): NutrientLimitStatus[] {
  const requirement =
    normalizeRequirement(
      rawRequirement
    );

  return nutrientKeys.map((key) => {
    const range =
      requirement.nutrients[key];

    const obtained = Number(
      nutrients[key] || 0
    );

    const min = range.enabled
      ? Number(range.min || 0)
      : 0;

    const max = range.enabled
      ? range.max
      : undefined;

    const decimals =
      decimalsForNutrient(key);

    const label =
      nutrientFullLabels[key];

    if (!range.enabled) {
      return {
        key,
        label,
        obtained,
        min,
        max,
        enabled: false,
        status: "disabled",
        message: `${label} se muestra, pero no está restringido en este perfil.`
      };
    }

    if (
      min > 0 &&
      obtained < min - 0.0001
    ) {
      return {
        key,
        label,
        obtained,
        min,
        max,
        enabled: true,
        status: "below",
        message: `${label} quedó por debajo del mínimo: ${obtained.toFixed(
          decimals
        )} frente a ${min.toFixed(
          decimals
        )}.`
      };
    }

    if (
      typeof max === "number" &&
      obtained > max + 0.0001
    ) {
      return {
        key,
        label,
        obtained,
        min,
        max,
        enabled: true,
        status: "above",
        message: `${label} superó el máximo: ${obtained.toFixed(
          decimals
        )} frente a ${max.toFixed(
          decimals
        )}.`
      };
    }

    if (
      min > 0 &&
      obtained - min <=
        Math.max(
          min * 0.01,
          0.0001
        )
    ) {
      return {
        key,
        label,
        obtained,
        min,
        max,
        enabled: true,
        status: "nearMin",
        message: `${label} quedó ajustado al mínimo.`
      };
    }

    if (
      typeof max === "number" &&
      max > 0 &&
      max - obtained <=
        Math.max(
          max * 0.01,
          0.0001
        )
    ) {
      return {
        key,
        label,
        obtained,
        min,
        max,
        enabled: true,
        status: "nearMax",
        message: `${label} quedó ajustado al máximo.`
      };
    }

    return {
      key,
      label,
      obtained,
      min,
      max,
      enabled: true,
      status: "ok",
      message: `${label} tiene margen correcto.`
    };
  });
}

/* =========================================================
   VARIABLES CALCULADAS
   ========================================================= */

function buildDerivedMetricStatuses(
  derivedMetrics: Record<
    DerivedMetricKey,
    number
  >,
  rawRequirement: Requirement
): DerivedMetricStatus[] {
  const requirement =
    normalizeRequirement(
      rawRequirement
    );

  const range =
    requirement
      .derivedRequirements
      .electrolyteBalance;

  const value =
    derivedMetrics
      .electrolyteBalance;

  const min = range.min;
  const max = range.max;

  if (!range.enabled) {
    return [
      {
        key: "electrolyteBalance",
        label:
          "Balance electrolítico",
        value,
        min,
        max,
        enabled: false,
        status: "disabled",
        message:
          "El balance electrolítico se calcula y muestra, pero no está configurado como objetivo."
      }
    ];
  }

  if (
    typeof min === "number" &&
    value < min
  ) {
    return [
      {
        key: "electrolyteBalance",
        label:
          "Balance electrolítico",
        value,
        min,
        max,
        enabled: true,
        status: "below",
        message: `Balance electrolítico bajo: ${value.toFixed(
          0
        )} mEq/kg frente a un mínimo de ${min.toFixed(
          0
        )}.`
      }
    ];
  }

  if (
    typeof max === "number" &&
    value > max
  ) {
    return [
      {
        key: "electrolyteBalance",
        label:
          "Balance electrolítico",
        value,
        min,
        max,
        enabled: true,
        status: "above",
        message: `Balance electrolítico alto: ${value.toFixed(
          0
        )} mEq/kg frente a un máximo de ${max.toFixed(
          0
        )}.`
      }
    ];
  }

  if (
    typeof min === "number" &&
    value - min <= 5
  ) {
    return [
      {
        key: "electrolyteBalance",
        label:
          "Balance electrolítico",
        value,
        min,
        max,
        enabled: true,
        status: "nearMin",
        message:
          "El balance electrolítico está cerca del mínimo configurado."
      }
    ];
  }

  if (
    typeof max === "number" &&
    max - value <= 5
  ) {
    return [
      {
        key: "electrolyteBalance",
        label:
          "Balance electrolítico",
        value,
        min,
        max,
        enabled: true,
        status: "nearMax",
        message:
          "El balance electrolítico está cerca del máximo configurado."
      }
    ];
  }

  return [
    {
      key: "electrolyteBalance",
      label:
        "Balance electrolítico",
      value,
      min,
      max,
      enabled: true,
      status: "ok",
      message:
        "El balance electrolítico está dentro del rango configurado."
    }
  ];
}

/* =========================================================
   DIAGNÓSTICOS PRÁCTICOS
   ========================================================= */

function findFormulaIngredientAmount(
  formulaIngredients: FormulaResult["ingredients"],
  keywords: string[]
): number {
  const item =
    formulaIngredients.find(
      (ingredient) =>
        keywords.some((keyword) =>
          ingredient.name
            .toLowerCase()
            .includes(
              keyword.toLowerCase()
            )
        )
    );

  return item?.amountKg100 || 0;
}

function getProfileFlags(
  requirementName: string
) {
  const name =
    requirementName.toLowerCase();

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

    isPig:
      name.includes("cerdo") ||
      name.includes("porcino"),

    isGuineaPig:
      name.includes("cuy"),

    isSummer:
      name.includes("verano")
  };
}

function buildSmartDiagnostics(
  formulaIngredients: FormulaResult["ingredients"],
  ingredientStatuses: IngredientLimitStatus[],
  nutrientStatuses: NutrientLimitStatus[],
  derivedStatuses: DerivedMetricStatus[],
  rawRequirement: Requirement
): SmartDiagnosis[] {
  const requirement =
    normalizeRequirement(
      rawRequirement
    );

  const diagnostics: SmartDiagnosis[] =
    [];

  const profile =
    getProfileFlags(
      requirement.name
    );

  const maxIngredients =
    ingredientStatuses.filter(
      (item) =>
        item.status === "max"
    );

  const minIngredients =
    ingredientStatuses.filter(
      (item) =>
        item.status === "min"
    );

  const oil =
    findFormulaIngredientAmount(
      formulaIngredients,
      ["aceite", "grasa"]
    );

  const corn =
    findFormulaIngredientAmount(
      formulaIngredients,
      ["maíz", "maiz"]
    );

  const soybean =
    findFormulaIngredientAmount(
      formulaIngredients,
      ["soya", "soja"]
    );

  const carbonate =
    findFormulaIngredientAmount(
      formulaIngredients,
      ["carbonato"]
    );

  const dcp =
    findFormulaIngredientAmount(
      formulaIngredients,
      [
        "fosfato",
        "dcp",
        "dicálcico",
        "dicalcico"
      ]
    );

  const microIngredients =
    formulaIngredients.filter(
      (ingredient) => {
        const practicalMinimum =
          practicalMinimumForIngredient(
            ingredient.name
          );

        return (
          practicalMinimum > 0 &&
          ingredient.amountKg100 > 0 &&
          ingredient.amountKg100 <
            practicalMinimum
        );
      }
    );

  if (microIngredients.length > 0) {
    diagnostics.push({
      level: "warning",
      title:
        "Ingredientes en microinclusión",

      message: `Estos insumos entraron por debajo del mínimo práctico: ${microIngredients
        .map(
          (item) =>
            `${item.name} (${item.amountKg100.toFixed(
              3
            )} kg)`
        )
        .join(", ")}.`,

      action:
        "Considera subir su mínimo, desactivarlos o preparar una premezcla."
    });
  }

  if (maxIngredients.length > 0) {
    diagnostics.push({
      level: "warning",
      title:
        "Ingredientes pegados al máximo",

      message: `El solver está usando al límite: ${maxIngredients
        .map((item) => item.name)
        .join(", ")}.`,

      action:
        "Revisa si esos límites pueden ampliarse sin crear riesgo nutricional o práctico."
    });
  }

  if (minIngredients.length > 0) {
    diagnostics.push({
      level: "info",
      title:
        "Ingredientes obligados por mínimo",

      message: `Estos ingredientes entraron obligados: ${minIngredients
        .map((item) => item.name)
        .join(", ")}.`,

      action:
        "Usa mínimos mayores que cero solamente cuando realmente quieras forzar un ingrediente."
    });
  }

  if (
    profile.isLayer &&
    carbonate < 6
  ) {
    diagnostics.push({
      level: "danger",
      title:
        "Ponedora con poco carbonato",

      message:
        "El carbonato aparece bajo para una ponedora en producción.",

      action:
        "Revisa calcio, consumo diario, DCP y proporción de calcio fino y grueso."
    });
  }

  if (
    profile.isLayer &&
    carbonate > 11.5
  ) {
    diagnostics.push({
      level: "warning",
      title:
        "Carbonato alto en ponedora",

      message:
        "El carbonato está alto y puede estar desplazando otros ingredientes.",

      action:
        "Revisa calcio total, fósforo disponible, granulometría y consumo."
    });
  }

  if (
    profile.isPig &&
    soybean > 28
  ) {
    diagnostics.push({
      level: "warning",
      title:
        "Soya alta en cerdo",

      message:
        "La torta de soya está alta para el perfil porcino.",

      action:
        "Revisa aminoácidos digestibles y si conviene usar aminoácidos sintéticos."
    });
  }

  if (
    profile.isBroiler &&
    oil > 5.5
  ) {
    diagnostics.push({
      level: "warning",
      title:
        "Aceite alto en pollo",

      message:
        "La fórmula contiene bastante aceite.",

      action:
        "Revisa mezcla, peletizado, rancidez y consumo esperado."
    });
  }

  if (
    dcp <= 0.001 &&
    getRequirementMinimum(
      requirement,
      "availablePhosphorus"
    ) > 0.3
  ) {
    diagnostics.push({
      level: "info",
      title:
        "Fósforo sin DCP",

      message:
        "La fórmula no usa fosfato aunque el fósforo disponible requerido no es bajo.",

      action:
        "Puede ser correcto con fitasa y matriz nutricional. Sin fitasa, revisa los valores de fósforo."
    });
  }

  if (corn > 78) {
    diagnostics.push({
      level: "info",
      title:
        "Fórmula muy cargada a maíz",

      message:
        "El maíz está por encima de 78%.",

      action:
        "Revisa aminoácidos, fósforo disponible y calidad real del maíz."
    });
  }

  const electrolyteStatus =
    derivedStatuses.find(
      (item) =>
        item.key ===
        "electrolyteBalance"
    );

  if (
    electrolyteStatus?.enabled &&
    electrolyteStatus.status ===
      "below"
  ) {
    diagnostics.push({
      level: "warning",
      title:
        "Balance electrolítico bajo",

      message:
        electrolyteStatus.message,

      action:
        "Revisa sodio, potasio, cloro, bicarbonato y calidad del agua."
    });
  }

  if (
    electrolyteStatus?.enabled &&
    electrolyteStatus.status ===
      "above"
  ) {
    diagnostics.push({
      level: "warning",
      title:
        "Balance electrolítico alto",

      message:
        electrolyteStatus.message,

      action:
        "Revisa excesos de sodio o potasio y la relación con el cloro."
    });
  }

  const fiberStatus =
    nutrientStatuses.find(
      (item) =>
        item.key === "crudeFiber"
    );

  if (
    fiberStatus?.enabled &&
    fiberStatus.status === "above"
  ) {
    diagnostics.push({
      level: "warning",
      title:
        "Fibra cruda por encima del máximo",

      message:
        fiberStatus.message,

      action:
        "Revisa afrecho, polvillo, algodón, forrajes y otros ingredientes fibrosos."
    });
  }

  if (diagnostics.length === 0) {
    diagnostics.push({
      level: "info",
      title:
        "Sin alertas técnicas fuertes",

      message:
        "No se detectaron bloqueos evidentes ni señales prácticas fuertes.",

      action:
        "Valida calidad de ingredientes, consumo esperado y experiencia de campo antes de producir."
    });
  }

  return diagnostics;
}

/* =========================================================
   SEGURIDAD
   ========================================================= */

function buildSafetyStatuses(
  formulaIngredients: FormulaResult["ingredients"],
  nutrientStatuses: NutrientLimitStatus[],
  derivedStatuses: DerivedMetricStatus[],
  rawRequirement: Requirement
): SafetyStatus[] {
  const requirement =
    normalizeRequirement(
      rawRequirement
    );

  const safety: SafetyStatus[] =
    [];

  const profile =
    getProfileFlags(
      requirement.name
    );

  const belowNutrients =
    nutrientStatuses.filter(
      (item) =>
        item.enabled &&
        item.status === "below"
    );

  const aboveNutrients =
    nutrientStatuses.filter(
      (item) =>
        item.enabled &&
        item.status === "above"
    );

  const oil =
    findFormulaIngredientAmount(
      formulaIngredients,
      ["aceite", "grasa"]
    );

  const salt =
    findFormulaIngredientAmount(
      formulaIngredients,
      ["sal"]
    );

  const carbonate =
    findFormulaIngredientAmount(
      formulaIngredients,
      ["carbonato"]
    );

  const soybean =
    findFormulaIngredientAmount(
      formulaIngredients,
      ["soya", "soja"]
    );

  if (belowNutrients.length > 0) {
    safety.push({
      id:
        "nutrients_below_minimum",

      level: "danger",

      title:
        "Nutrientes por debajo del mínimo",

      message: `Hay nutrientes debajo del mínimo: ${belowNutrients
        .map((item) => item.label)
        .join(", ")}.`,

      action:
        "No producir hasta corregir estos nutrientes."
    });
  }

  if (aboveNutrients.length > 0) {
    safety.push({
      id:
        "nutrients_above_maximum",

      level: "danger",

      title:
        "Nutrientes por encima del máximo",

      message: `Hay nutrientes sobre el máximo: ${aboveNutrients
        .map((item) => item.label)
        .join(", ")}.`,

      action:
        "No producir sin revisar. Un exceso también puede causar problemas."
    });
  }

  if (
    profile.isLayer &&
    carbonate < 6
  ) {
    safety.push({
      id:
        "layer_low_carbonate",

      level: "danger",

      title:
        "Ponedora con carbonato bajo",

      message:
        "El carbonato aparece bajo para una ponedora en producción.",

      action:
        "Revisa calcio, DCP, consumo y calcio fino/grueso."
    });
  }

  if (
    profile.isLayer &&
    carbonate > 12
  ) {
    safety.push({
      id:
        "layer_high_carbonate",

      level: "warning",

      title:
        "Carbonato muy alto",

      message:
        "El carbonato está muy alto.",

      action:
        "Revisa calcio total, fósforo disponible y consumo."
    });
  }

  if (
    (profile.isBroiler ||
      profile.isPig) &&
    soybean > 35
  ) {
    safety.push({
      id:
        "soybean_high_non_layer",

      level: "warning",

      title:
        "Soya muy alta",

      message:
        "La torta de soya está muy alta.",

      action:
        "Revisa aminoácidos, energía y posibilidad de aminoácidos sintéticos."
    });
  }

  if (oil > 5.5) {
    safety.push({
      id: "oil_high",
      level: "warning",
      title: "Aceite alto",
      message:
        "El aceite está alto y exige buen mezclado y control de rancidez.",
      action:
        "Revisa mezcla, pellet, almacenamiento y calidad del aceite."
    });
  }

  if (salt > 0.5) {
    safety.push({
      id: "salt_high",
      level: "danger",
      title: "Sal alta",
      message:
        "La sal está alta y puede aumentar el consumo de agua, cama húmeda o diarrea.",
      action:
        "Revisa sodio, cloro, bicarbonato, sal y calidad del agua."
    });
  }

  const dangerousDerived =
    derivedStatuses.filter(
      (item) =>
        item.enabled &&
        (item.status === "below" ||
          item.status === "above")
    );

  if (
    dangerousDerived.length > 0
  ) {
    safety.push({
      id:
        "derived_metric_outside_range",

      level: "warning",

      title:
        "Variable calculada fuera de rango",

      message: dangerousDerived
        .map((item) => item.message)
        .join(" "),

      action:
        "Revisa los nutrientes que participan en el cálculo antes de producir."
    });
  }

  if (safety.length === 0) {
    safety.push({
      id: "safety_ok",
      level: "info",
      title:
        "Control de seguridad sin alertas fuertes",
      message:
        "No se detectaron señales críticas de seguridad nutricional.",
      action:
        "Valida calidad de insumos y experiencia de campo antes de producir."
    });
  }

  return safety;
}

/* =========================================================
   PRECIOS SOMBRA
   ========================================================= */

function buildShadowPrices(
  ingredients: Ingredient[],
  rawRequirement: Requirement,
  baseCostPer100Kg: number,
  nutrientStatuses: NutrientLimitStatus[],
  ingredientStatuses: IngredientLimitStatus[]
): ShadowPriceStatus[] {
  const requirement =
    normalizeRequirement(
      rawRequirement
    );

  const shadowPrices: ShadowPriceStatus[] =
    [];

  for (const nutrient of nutrientStatuses) {
    if (!nutrient.enabled) {
      continue;
    }

    const key =
      nutrient.key;

    const delta =
      shadowDeltaForNutrient(key);

    if (
      nutrient.status ===
      "nearMin"
    ) {
      const currentLimit =
        getRequirementMinimum(
          requirement,
          key
        );

      if (currentLimit > 0) {
        const relaxedRequirement =
          normalizeRequirement({
            ...requirement,

            nutrients: {
              ...requirement.nutrients,

              [key]: {
                ...requirement
                  .nutrients[key],

                min: Math.max(
                  0,
                  currentLimit -
                    delta
                )
              }
            }
          });

        const relaxedResult =
          runSolver(
            ingredients,
            relaxedRequirement
          );

        if (relaxedResult.feasible) {
          const relaxedCost =
            calculateSolverCostPer100Kg(
              relaxedResult,
              ingredients
            );

          const saving =
            baseCostPer100Kg -
            relaxedCost;

          if (saving > 0.01) {
            shadowPrices.push({
              id:
                `nutrient_min_${key}`,

              type:
                "nutrientMin",

              name:
                nutrient.label,

              currentLimit,

              relaxedLimit:
                Math.max(
                  0,
                  currentLimit -
                    delta
                ),

              estimatedSavingPer100Kg:
                saving,

              message:
                `Si bajas ligeramente el mínimo de ${nutrient.label}, el costo podría bajar aproximadamente S/ ${saving.toFixed(
                  3
                )} por cada 100 kg.`
            });
          }
        }
      }
    }

    if (
      nutrient.status ===
        "nearMax" &&
      typeof nutrient.max ===
        "number"
    ) {
      const currentLimit =
        nutrient.max;

      const relaxedRequirement =
        normalizeRequirement({
          ...requirement,

          nutrients: {
            ...requirement.nutrients,

            [key]: {
              ...requirement
                .nutrients[key],

              max:
                currentLimit +
                delta
            }
          }
        });

      const relaxedResult =
        runSolver(
          ingredients,
          relaxedRequirement
        );

      if (relaxedResult.feasible) {
        const relaxedCost =
          calculateSolverCostPer100Kg(
            relaxedResult,
            ingredients
          );

        const saving =
          baseCostPer100Kg -
          relaxedCost;

        if (saving > 0.01) {
          shadowPrices.push({
            id:
              `nutrient_max_${key}`,

            type:
              "nutrientMax",

            name:
              nutrient.label,

            currentLimit,

            relaxedLimit:
              currentLimit +
              delta,

            estimatedSavingPer100Kg:
              saving,

            message:
              `Si subes ligeramente el máximo de ${nutrient.label}, el costo podría bajar aproximadamente S/ ${saving.toFixed(
                3
              )} por cada 100 kg.`
          });
        }
      }
    }
  }

  for (
    const ingredientStatus of ingredientStatuses
  ) {
    const ingredient =
      ingredients.find(
        (item) =>
          item.id ===
          ingredientStatus.id
      );

    if (!ingredient) {
      continue;
    }

    if (
      isTinyTechnicalIngredient(
        ingredient.name,
        Math.max(
          ingredientStatus.amountKg100,
          ingredientStatus.min,
          ingredientStatus.max
        )
      )
    ) {
      continue;
    }

    if (
      ingredientStatus.status ===
      "max"
    ) {
      const delta = 0.1;

      const relaxedIngredients =
        ingredients.map((item) =>
          item.id === ingredient.id
            ? {
                ...item,

                max:
                  Number(
                    item.max || 0
                  ) + delta
              }
            : item
        );

      const relaxedResult =
        runSolver(
          relaxedIngredients,
          requirement
        );

      if (relaxedResult.feasible) {
        const relaxedCost =
          calculateSolverCostPer100Kg(
            relaxedResult,
            relaxedIngredients
          );

        const saving =
          baseCostPer100Kg -
          relaxedCost;

        if (saving > 0.01) {
          shadowPrices.push({
            id:
              `ingredient_max_${ingredient.id}`,

            type:
              "ingredientMax",

            name:
              ingredient.name,

            currentLimit:
              Number(
                ingredient.max || 0
              ),

            relaxedLimit:
              Number(
                ingredient.max || 0
              ) + delta,

            estimatedSavingPer100Kg:
              saving,

            message:
              `Si subes el máximo de ${ingredient.name} en 0.100%, el costo podría bajar aproximadamente S/ ${saving.toFixed(
                3
              )} por cada 100 kg.`
          });
        }
      }
    }

    if (
      ingredientStatus.status ===
      "min"
    ) {
      const delta = 0.1;

      const currentMin =
        Number(
          ingredient.min || 0
        );

      if (currentMin <= 0) {
        continue;
      }

      const relaxedIngredients =
        ingredients.map((item) =>
          item.id === ingredient.id
            ? {
                ...item,

                min: Math.max(
                  0,
                  Number(
                    item.min || 0
                  ) - delta
                )
              }
            : item
        );

      const relaxedResult =
        runSolver(
          relaxedIngredients,
          requirement
        );

      if (relaxedResult.feasible) {
        const relaxedCost =
          calculateSolverCostPer100Kg(
            relaxedResult,
            relaxedIngredients
          );

        const saving =
          baseCostPer100Kg -
          relaxedCost;

        if (saving > 0.01) {
          shadowPrices.push({
            id:
              `ingredient_min_${ingredient.id}`,

            type:
              "ingredientMin",

            name:
              ingredient.name,

            currentLimit:
              currentMin,

            relaxedLimit:
              Math.max(
                0,
                currentMin -
                  delta
              ),

            estimatedSavingPer100Kg:
              saving,

            message:
              `Si bajas el mínimo de ${ingredient.name} en 0.100%, el costo podría bajar aproximadamente S/ ${saving.toFixed(
                3
              )} por cada 100 kg.`
          });
        }
      }
    }
  }

  return shadowPrices
    .sort(
      (a, b) =>
        b.estimatedSavingPer100Kg -
        a.estimatedSavingPer100Kg
    )
    .slice(0, 6);
}

/* =========================================================
   FUNCIÓN PRINCIPAL
   ========================================================= */

export function solveFormula(
  ingredients: Ingredient[],
  rawRequirement: Requirement
): FormulaResult {
  const requirement =
    normalizeRequirement(
      rawRequirement
    );

  if (ingredients.length === 0) {
    return {
      feasible: false,

      costPerKg: 0,
      costPer100Kg: 0,
      costPer50Kg: 0,

      ingredients: [],

      nutrients:
        emptyNutrients(),

      derivedMetrics:
        emptyDerivedMetrics(),

      message:
        "No hay ingredientes activos para formular.",

      smartDiagnostics: [
        {
          level: "danger",
          title:
            "Sin ingredientes activos",
          message:
            "No hay ingredientes disponibles para que el solver formule.",
          action:
            "Activa ingredientes en Formular o marca especies en la Matriz."
        }
      ],

      safetyStatuses: [
        {
          id:
            "no_active_ingredients",
          level: "danger",
          title:
            "Sin ingredientes activos",
          message:
            "No hay ingredientes activos para formular.",
          action:
            "Activa ingredientes y revisa su clasificador."
        }
      ]
    };
  }

  const result =
    runSolver(
      ingredients,
      requirement
    );

  if (!result.feasible) {
    const failure =
      buildFailureMessage(
        ingredients,
        requirement
      );

    return {
      feasible: false,

      costPerKg: 0,
      costPer100Kg: 0,
      costPer50Kg: 0,

      ingredients: [],

      nutrients:
        emptyNutrients(),

      derivedMetrics:
        emptyDerivedMetrics(),

      message:
        failure.message,

      diagnostics:
        failure.diagnostics,

      smartDiagnostics: [
        {
          level: "danger",
          title:
            "Fórmula bloqueada",
          message:
            "El solver no encontró una combinación posible con los límites y requerimientos actuales.",
          action:
            "Revisa suma de mínimos, suma de máximos, nutrientes imposibles y límites cerrados."
        }
      ],

      safetyStatuses: [
        {
          id:
            "formula_not_feasible",
          level: "danger",
          title:
            "No producir",
          message:
            "La fórmula no cerró.",
          action:
            "Corrige límites o requerimientos antes de producir."
        }
      ]
    };
  }

  const formulaIngredients =
    ingredients
      .map((ingredient) => {
        const amountKg100 =
          getResultAmount(
            result,
            ingredient.id
          );

        return {
          id: ingredient.id,
          name: ingredient.name,

          amountKg100,

          amountKg50:
            amountKg100 / 2,

          price: Number(
            ingredient.price || 0
          ),

          cost:
            amountKg100 *
            Number(
              ingredient.price || 0
            )
        };
      })
      .filter(
        (item) =>
          item.amountKg100 >
          0.0001
      );

  const nutrients =
    calculateFormulaNutrients(
      result,
      ingredients
    );

  const derivedMetrics =
    calculateAllDerivedMetrics(
      nutrients
    );

  const costPer100Kg =
    formulaIngredients.reduce(
      (sum, item) =>
        sum + item.cost,
      0
    );

  const ingredientLimitStatuses =
    buildIngredientLimitStatuses(
      ingredients,
      formulaIngredients
    );

  const nutrientLimitStatuses =
    buildNutrientLimitStatuses(
      nutrients,
      requirement
    );

  const derivedMetricStatuses =
    buildDerivedMetricStatuses(
      derivedMetrics,
      requirement
    );

  const shadowPriceStatuses =
    buildShadowPrices(
      ingredients,
      requirement,
      costPer100Kg,
      nutrientLimitStatuses,
      ingredientLimitStatuses
    );

  const safetyStatuses =
    buildSafetyStatuses(
      formulaIngredients,
      nutrientLimitStatuses,
      derivedMetricStatuses,
      requirement
    );

  const smartDiagnostics =
    buildSmartDiagnostics(
      formulaIngredients,
      ingredientLimitStatuses,
      nutrientLimitStatuses,
      derivedMetricStatuses,
      requirement
    );

  return {
    feasible: true,

    costPerKg:
      costPer100Kg / 100,

    costPer100Kg,

    costPer50Kg:
      costPer100Kg / 2,

    ingredients:
      formulaIngredients,

    nutrients,

    derivedMetrics,

    ingredientLimitStatuses,

    nutrientLimitStatuses,

    derivedMetricStatuses,

    shadowPriceStatuses,

    safetyStatuses,

    smartDiagnostics
  };
}
