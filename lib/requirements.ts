// lib/requirements.ts

import {
  nutrientKeys,
  type NutrientKey,
  type SpeciesKey
} from "./ingredients";

/* =========================================================
   TIPOS DEL NUEVO SISTEMA
   ========================================================= */

export type NutrientRequirement = {
  min: number;
  max?: number;
  enabled: boolean;
};

export type DerivedRequirementRange = {
  min?: number;
  max?: number;
  enabled: boolean;
};

export type DerivedRequirements = {
  electrolyteBalance: DerivedRequirementRange;
};

/**
 * Compatibilidad temporal con código antiguo.
 *
 * Permite que otras partes del proyecto que todavía consulten:
 *
 * requirement.energy
 * requirement.energyMax
 *
 * sigan compilando mientras FeedGenio migra completamente a:
 *
 * requirement.nutrients.energy.min
 * requirement.nutrients.energy.max
 */
type LegacyMinimumFields = Partial<
  Record<NutrientKey, number>
>;

type LegacyMaximumKey =
  `${NutrientKey}Max`;

type LegacyMaximumFields = Partial<
  Record<LegacyMaximumKey, number>
>;

export type Requirement = {
  name: string;
  species: SpeciesKey;

  nutrients: Record<
    NutrientKey,
    NutrientRequirement
  >;

  derivedRequirements: DerivedRequirements;
} & LegacyMinimumFields &
  LegacyMaximumFields;

/* =========================================================
   CREACIÓN DE REQUERIMIENTOS VACÍOS
   ========================================================= */

export function createEmptyNutrientRequirements(): Record<
  NutrientKey,
  NutrientRequirement
> {
  const nutrients = {} as Record<
    NutrientKey,
    NutrientRequirement
  >;

  for (const key of nutrientKeys) {
    nutrients[key] = {
      min: 0,
      max: undefined,
      enabled: false
    };
  }

  return nutrients;
}

export function createEmptyDerivedRequirements(): DerivedRequirements {
  return {
    electrolyteBalance: {
      min: undefined,
      max: undefined,
      enabled: false
    }
  };
}

/* =========================================================
   HELPERS
   ========================================================= */

function toFiniteNumber(
  value: unknown,
  fallback = 0
): number {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : fallback;
}

function toOptionalPositiveNumber(
  value: unknown
): number | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  const numberValue = Number(value);

  if (
    !Number.isFinite(numberValue) ||
    numberValue <= 0
  ) {
    return undefined;
  }

  return numberValue;
}

function maximumKey(
  key: NutrientKey
): LegacyMaximumKey {
  return `${key}Max` as LegacyMaximumKey;
}

/* =========================================================
   SINCRONIZACIÓN ENTRE ARQUITECTURA NUEVA Y ANTIGUA
   ========================================================= */

/**
 * Añade campos antiguos calculados:
 *
 * requirement.energy
 * requirement.energyMax
 *
 * Esto mantiene compatibilidad durante la migración.
 */
export function attachLegacyRequirementFields(
  requirement: Omit<
    Requirement,
    keyof LegacyMinimumFields | keyof LegacyMaximumFields
  > | Requirement
): Requirement {
  const normalized = {
    ...requirement
  } as Requirement;

  for (const key of nutrientKeys) {
    const range = normalized.nutrients[key];

    normalized[key] = Number(
      range?.min ?? 0
    );

    const maxKey = maximumKey(key);

    if (
      typeof range?.max === "number" &&
      range.max > 0
    ) {
      normalized[maxKey] = range.max;
    } else {
      delete normalized[maxKey];
    }
  }

  return normalized;
}

/**
 * Convierte perfiles antiguos o incompletos al nuevo formato.
 *
 * Sirve para:
 *
 * - localStorage antiguo
 * - fórmulas guardadas
 * - perfiles importados
 * - copias automáticas antiguas
 */
export function normalizeRequirement(
  requirement:
    | Partial<Requirement>
    | Record<string, unknown>
    | null
    | undefined,
  fallback?: Requirement
): Requirement {
  const base =
    fallback ??
    createBaseRequirement(
      "Nuevo perfil",
      "layer"
    );

  const source =
    requirement &&
    typeof requirement === "object"
      ? requirement
      : {};

  const sourceRecord =
    source as Record<string, unknown>;

  const sourceNutrients =
    sourceRecord.nutrients &&
    typeof sourceRecord.nutrients === "object"
      ? (sourceRecord.nutrients as Record<
          string,
          unknown
        >)
      : {};

  const normalizedNutrients =
    createEmptyNutrientRequirements();

  for (const key of nutrientKeys) {
    const currentRange =
      sourceNutrients[key] &&
      typeof sourceNutrients[key] === "object"
        ? (sourceNutrients[key] as Record<
            string,
            unknown
          >)
        : undefined;

    const fallbackRange =
      base.nutrients[key];

    const legacyMin =
      sourceRecord[key];

    const legacyMax =
      sourceRecord[maximumKey(key)];

    const hasNestedMinimum =
      currentRange?.min !== undefined;

    const hasLegacyMinimum =
      legacyMin !== undefined;

    const minimum = hasNestedMinimum
      ? toFiniteNumber(
          currentRange?.min,
          fallbackRange.min
        )
      : hasLegacyMinimum
        ? toFiniteNumber(
            legacyMin,
            fallbackRange.min
          )
        : fallbackRange.min;

    const nestedMaximum =
      toOptionalPositiveNumber(
        currentRange?.max
      );

    const legacyMaximum =
      toOptionalPositiveNumber(
        legacyMax
      );

    const maximum =
      nestedMaximum ??
      legacyMaximum ??
      fallbackRange.max;

    const explicitEnabled =
      typeof currentRange?.enabled ===
      "boolean"
        ? Boolean(currentRange.enabled)
        : undefined;

    const enabled =
      explicitEnabled ??
      hasNestedMinimum ??
      hasLegacyMinimum ??
      minimum > 0 ??
      fallbackRange.enabled;

    normalizedNutrients[key] = {
      min: minimum,
      max: maximum,
      enabled:
        explicitEnabled ??
        (minimum > 0 ||
          typeof maximum === "number" ||
          fallbackRange.enabled)
    };
  }

  const sourceDerived =
    sourceRecord.derivedRequirements &&
    typeof sourceRecord.derivedRequirements ===
      "object"
      ? (sourceRecord.derivedRequirements as Record<
          string,
          unknown
        >)
      : {};

  const sourceElectrolyte =
    sourceDerived.electrolyteBalance &&
    typeof sourceDerived.electrolyteBalance ===
      "object"
      ? (sourceDerived.electrolyteBalance as Record<
          string,
          unknown
        >)
      : {};

  const fallbackElectrolyte =
    base.derivedRequirements
      .electrolyteBalance;

  const derivedRequirements: DerivedRequirements =
    {
      electrolyteBalance: {
        min:
          toOptionalPositiveNumber(
            sourceElectrolyte.min
          ) ??
          fallbackElectrolyte.min,

        max:
          toOptionalPositiveNumber(
            sourceElectrolyte.max
          ) ??
          fallbackElectrolyte.max,

        enabled:
          typeof sourceElectrolyte.enabled ===
          "boolean"
            ? Boolean(
                sourceElectrolyte.enabled
              )
            : fallbackElectrolyte.enabled
      }
    };

  const normalized: Requirement = {
    name:
      typeof sourceRecord.name ===
        "string" &&
      sourceRecord.name.trim()
        ? sourceRecord.name
        : base.name,

    species:
      typeof sourceRecord.species ===
        "string" &&
      sourceRecord.species.trim()
        ? sourceRecord.species
        : base.species,

    nutrients: normalizedNutrients,

    derivedRequirements
  };

  return attachLegacyRequirementFields(
    normalized
  );
}

export function normalizeRequirementProfiles(
  profiles:
    | Partial<Requirement>[]
    | null
    | undefined
): Requirement[] {
  if (
    !Array.isArray(profiles) ||
    profiles.length === 0
  ) {
    return baseRequirementProfiles.map(
      (profile) =>
        normalizeRequirement(profile)
    );
  }

  return profiles.map((profile) =>
    normalizeRequirement(profile)
  );
}

/* =========================================================
   CREACIÓN DE PERFILES
   ========================================================= */

type NutrientOverrides = Partial<
  Record<
    NutrientKey,
    Partial<NutrientRequirement> | number
  >
>;

type LegacyProfileOverrides =
  LegacyMinimumFields &
  LegacyMaximumFields;

type RequirementOverrides = {
  name?: string;
  species?: SpeciesKey;
  nutrients?: NutrientOverrides;

  derivedRequirements?: Partial<{
    electrolyteBalance: Partial<DerivedRequirementRange>;
  }>;
} & LegacyProfileOverrides;

export function createBaseRequirement(
  name: string,
  species: SpeciesKey
): Requirement {
  return attachLegacyRequirementFields({
    name,
    species,
    nutrients:
      createEmptyNutrientRequirements(),
    derivedRequirements:
      createEmptyDerivedRequirements()
  } as Requirement);
}

export function createRequirement(
  name: string,
  species: SpeciesKey,
  overrides: RequirementOverrides = {}
): Requirement {
  const nutrients =
    createEmptyNutrientRequirements();

  for (const key of nutrientKeys) {
    const directOverride =
      overrides.nutrients?.[key];

    const legacyMinimum =
      overrides[key];

    const legacyMaximum =
      overrides[maximumKey(key)];

    if (
      typeof directOverride === "number"
    ) {
      nutrients[key] = {
        min: directOverride,
        max:
          toOptionalPositiveNumber(
            legacyMaximum
          ),
        enabled:
          directOverride > 0 ||
          typeof legacyMaximum === "number"
      };

      continue;
    }

    if (
      directOverride &&
      typeof directOverride === "object"
    ) {
      const minimum = toFiniteNumber(
        directOverride.min,
        toFiniteNumber(
          legacyMinimum,
          0
        )
      );

      const maximum =
        toOptionalPositiveNumber(
          directOverride.max
        ) ??
        toOptionalPositiveNumber(
          legacyMaximum
        );

      nutrients[key] = {
        min: minimum,
        max: maximum,
        enabled:
          typeof directOverride.enabled ===
          "boolean"
            ? directOverride.enabled
            : minimum > 0 ||
              typeof maximum === "number"
      };

      continue;
    }

    const minimum = toFiniteNumber(
      legacyMinimum,
      0
    );

    const maximum =
      toOptionalPositiveNumber(
        legacyMaximum
      );

    nutrients[key] = {
      min: minimum,
      max: maximum,
      enabled:
        minimum > 0 ||
        typeof maximum === "number"
    };
  }

  const requirement: Requirement = {
    name:
      overrides.name ??
      name,

    species:
      overrides.species ??
      species,

    nutrients,

    derivedRequirements: {
      electrolyteBalance: {
        min:
          overrides
            .derivedRequirements
            ?.electrolyteBalance
            ?.min,

        max:
          overrides
            .derivedRequirements
            ?.electrolyteBalance
            ?.max,

        enabled:
          overrides
            .derivedRequirements
            ?.electrolyteBalance
            ?.enabled ??
          false
      }
    }
  };

  return attachLegacyRequirementFields(
    requirement
  );
}

/* =========================================================
   LECTURA Y ACTUALIZACIÓN GENÉRICA
   ========================================================= */

export function getRequirementRange(
  requirement: Requirement,
  key: NutrientKey
): NutrientRequirement {
  const normalized =
    normalizeRequirement(requirement);

  return normalized.nutrients[key];
}

export function getRequirementMinimum(
  requirement: Requirement,
  key: NutrientKey
): number {
  const range =
    getRequirementRange(
      requirement,
      key
    );

  if (!range.enabled) {
    return 0;
  }

  return Number(range.min || 0);
}

export function getRequirementMaximum(
  requirement: Requirement,
  key: NutrientKey
): number | undefined {
  const range =
    getRequirementRange(
      requirement,
      key
    );

  if (!range.enabled) {
    return undefined;
  }

  return toOptionalPositiveNumber(
    range.max
  );
}

export function updateRequirementNutrient(
  requirement: Requirement,
  key: NutrientKey,
  update: Partial<NutrientRequirement>
): Requirement {
  const normalized =
    normalizeRequirement(requirement);

  const current =
    normalized.nutrients[key];

  const nextRange: NutrientRequirement = {
    min:
      update.min !== undefined
        ? toFiniteNumber(
            update.min,
            current.min
          )
        : current.min,

    max:
      update.max !== undefined
        ? toOptionalPositiveNumber(
            update.max
          )
        : current.max,

    enabled:
      update.enabled !== undefined
        ? Boolean(update.enabled)
        : current.enabled
  };

  return attachLegacyRequirementFields({
    ...normalized,

    nutrients: {
      ...normalized.nutrients,
      [key]: nextRange
    }
  });
}

/* =========================================================
   PERFIL PREDETERMINADO
   ========================================================= */

export const defaultRequirement: Requirement =
  createRequirement(
    "Ponedora en producción",
    "layer",
    {
      energy: 2850,
      energyMax: 3000,

      protein: 16,
      proteinMax: 18.5,

      crudeFiber: 0,
      crudeFiberMax: 6,

      lysine: 0.87,
      lysineMax: 1.1,

      methionine: 0.43,
      methionineMax: 0.55,

      metCys: 0.82,
      metCysMax: 1,

      threonine: 0.65,
      threonineMax: 0.85,

      tryptophan: 0.21,
      tryptophanMax: 0.3,

      arginine: 0.88,
      arginineMax: 1.2,

      glycineSerine: 0,
      glycineSerineMax: 0,

      histidine: 0.25,
      histidineMax: 0.45,

      isoleucine: 0.7,
      isoleucineMax: 0.95,

      leucine: 1.1,
      leucineMax: 1.8,

      phenylalanine: 0.65,
      phenylalanineMax: 1,

      tyrosine: 0.45,
      tyrosineMax: 0.8,

      phenylalanineTyrosine: 1.1,
      phenylalanineTyrosineMax: 1.7,

      valine: 0.79,
      valineMax: 1.05,

      calcium: 3.7,
      calciumMax: 4.2,

      availablePhosphorus: 0.38,
      availablePhosphorusMax: 0.5,

      sodium: 0.16,
      sodiumMax: 0.23,

      potassium: 0,
      potassiumMax: 0,

      chlorine: 0.16,
      chlorineMax: 0.25,

      linoleicAcid: 1.8,
      linoleicAcidMax: 2.5,

      derivedRequirements: {
        electrolyteBalance: {
          min: 180,
          max: 280,
          enabled: false
        }
      }
    }
  );

/* =========================================================
   PERFIL BASADO EN OTRO PERFIL
   ========================================================= */

function withDefaults(
  profile: RequirementOverrides & {
    name: string;
  }
): Requirement {
  const nutrients =
    Object.fromEntries(
      nutrientKeys.map((key) => {
        const defaultRange =
          defaultRequirement
            .nutrients[key];

        const directOverride =
          profile.nutrients?.[key];

        const legacyMinimum =
          profile[key];

        const legacyMaximum =
          profile[maximumKey(key)];

        if (
          typeof directOverride ===
          "number"
        ) {
          return [
            key,
            {
              min: directOverride,
              max:
                toOptionalPositiveNumber(
                  legacyMaximum
                ) ??
                defaultRange.max,
              enabled: true
            }
          ];
        }

        if (
          directOverride &&
          typeof directOverride ===
            "object"
        ) {
          return [
            key,
            {
              min:
                directOverride.min ??
                defaultRange.min,

              max:
                directOverride.max ??
                toOptionalPositiveNumber(
                  legacyMaximum
                ) ??
                defaultRange.max,

              enabled:
                directOverride.enabled ??
                defaultRange.enabled
            }
          ];
        }

        return [
          key,
          {
            min:
              legacyMinimum !==
              undefined
                ? toFiniteNumber(
                    legacyMinimum
                  )
                : defaultRange.min,

            max:
              legacyMaximum !==
              undefined
                ? toOptionalPositiveNumber(
                    legacyMaximum
                  )
                : defaultRange.max,

            enabled:
              legacyMinimum !==
                undefined ||
              legacyMaximum !==
                undefined
                ? true
                : defaultRange.enabled
          }
        ];
      })
    ) as Record<
      NutrientKey,
      NutrientRequirement
    >;

  const requirement: Requirement = {
    name: profile.name,

    species:
      profile.species ??
      defaultRequirement.species,

    nutrients,

    derivedRequirements: {
      electrolyteBalance: {
        ...defaultRequirement
          .derivedRequirements
          .electrolyteBalance,

        ...profile
          .derivedRequirements
          ?.electrolyteBalance
      }
    }
  };

  return attachLegacyRequirementFields(
    requirement
  );
}

/* =========================================================
   PERFILES INICIALES
   ========================================================= */

const cobbInicio = {
  energy: 3000,
  energyMax: 3100,
  protein: 22,
  proteinMax: 24,
  crudeFiberMax: 5,
  lysine: 1.28,
  lysineMax: 1.5,
  methionine: 0.5,
  methionineMax: 0.65,
  metCys: 0.95,
  metCysMax: 1.15,
  threonine: 0.86,
  threonineMax: 1.05,
  tryptophan: 0.23,
  tryptophanMax: 0.32,
  arginine: 1.35,
  arginineMax: 1.65,
  glycineSerine: 1.55,
  glycineSerineMax: 2.3,
  histidine: 0.42,
  histidineMax: 0.65,
  isoleucine: 0.85,
  isoleucineMax: 1.05,
  leucine: 1.4,
  leucineMax: 2.3,
  phenylalanine: 0.75,
  phenylalanineMax: 1.2,
  tyrosine: 0.6,
  tyrosineMax: 1,
  phenylalanineTyrosine: 1.35,
  phenylalanineTyrosineMax: 2,
  valine: 0.95,
  valineMax: 1.15,
  calcium: 0.95,
  calciumMax: 1.1,
  availablePhosphorus: 0.48,
  availablePhosphorusMax: 0.6,
  sodium: 0.2,
  sodiumMax: 0.25,
  potassium: 0,
  potassiumMax: 0,
  chlorine: 0.2,
  chlorineMax: 0.28,
  linoleicAcid: 1.2,
  linoleicAcidMax: 2.5
} satisfies RequirementOverrides;

const cobbCrecimiento = {
  energy: 3100,
  energyMax: 3200,
  protein: 20,
  proteinMax: 22,
  crudeFiberMax: 5,
  lysine: 1.15,
  lysineMax: 1.35,
  methionine: 0.47,
  methionineMax: 0.6,
  metCys: 0.88,
  metCysMax: 1.08,
  threonine: 0.77,
  threonineMax: 0.95,
  tryptophan: 0.2,
  tryptophanMax: 0.3,
  arginine: 1.22,
  arginineMax: 1.5,
  glycineSerine: 1.4,
  glycineSerineMax: 2.1,
  histidine: 0.38,
  histidineMax: 0.6,
  isoleucine: 0.78,
  isoleucineMax: 1,
  leucine: 1.28,
  leucineMax: 2.15,
  phenylalanine: 0.7,
  phenylalanineMax: 1.15,
  tyrosine: 0.55,
  tyrosineMax: 0.95,
  phenylalanineTyrosine: 1.25,
  phenylalanineTyrosineMax: 1.9,
  valine: 0.86,
  valineMax: 1.1,
  calcium: 0.85,
  calciumMax: 1,
  availablePhosphorus: 0.42,
  availablePhosphorusMax: 0.55,
  sodium: 0.19,
  sodiumMax: 0.25,
  potassium: 0,
  potassiumMax: 0,
  chlorine: 0.19,
  chlorineMax: 0.28,
  linoleicAcid: 1.1,
  linoleicAcidMax: 2.5
} satisfies RequirementOverrides;

const cobbEngorde = {
  energy: 3200,
  energyMax: 3300,
  protein: 18.5,
  proteinMax: 20.5,
  crudeFiberMax: 5,
  lysine: 1.05,
  lysineMax: 1.25,
  methionine: 0.43,
  methionineMax: 0.55,
  metCys: 0.82,
  metCysMax: 1,
  threonine: 0.7,
  threonineMax: 0.9,
  tryptophan: 0.18,
  tryptophanMax: 0.28,
  arginine: 1.1,
  arginineMax: 1.4,
  glycineSerine: 1.25,
  glycineSerineMax: 2,
  histidine: 0.34,
  histidineMax: 0.55,
  isoleucine: 0.72,
  isoleucineMax: 0.95,
  leucine: 1.18,
  leucineMax: 2,
  phenylalanine: 0.65,
  phenylalanineMax: 1.1,
  tyrosine: 0.5,
  tyrosineMax: 0.9,
  phenylalanineTyrosine: 1.15,
  phenylalanineTyrosineMax: 1.8,
  valine: 0.8,
  valineMax: 1,
  calcium: 0.78,
  calciumMax: 0.95,
  availablePhosphorus: 0.38,
  availablePhosphorusMax: 0.5,
  sodium: 0.18,
  sodiumMax: 0.24,
  potassium: 0,
  potassiumMax: 0,
  chlorine: 0.18,
  chlorineMax: 0.26,
  linoleicAcid: 1,
  linoleicAcidMax: 2.3
} satisfies RequirementOverrides;

const cerdoCrecimiento = {
  energy: 3250,
  energyMax: 3400,
  protein: 18,
  proteinMax: 20,
  crudeFiberMax: 6,
  lysine: 1.05,
  lysineMax: 1.3,
  methionine: 0.32,
  methionineMax: 0.5,
  metCys: 0.6,
  metCysMax: 0.8,
  threonine: 0.68,
  threonineMax: 0.9,
  tryptophan: 0.19,
  tryptophanMax: 0.28,
  arginine: 0.75,
  arginineMax: 1.2,
  glycineSerine: 0,
  glycineSerineMax: 0,
  histidine: 0.36,
  histidineMax: 0.6,
  isoleucine: 0.6,
  isoleucineMax: 0.85,
  leucine: 1.05,
  leucineMax: 1.8,
  phenylalanine: 0.6,
  phenylalanineMax: 1,
  tyrosine: 0.45,
  tyrosineMax: 0.85,
  phenylalanineTyrosine: 1.05,
  phenylalanineTyrosineMax: 1.6,
  valine: 0.7,
  valineMax: 0.95,
  calcium: 0.75,
  calciumMax: 0.95,
  availablePhosphorus: 0.35,
  availablePhosphorusMax: 0.5,
  sodium: 0.18,
  sodiumMax: 0.25,
  potassium: 0,
  potassiumMax: 0,
  chlorine: 0.18,
  chlorineMax: 0.28,
  linoleicAcid: 1,
  linoleicAcidMax: 2.5
} satisfies RequirementOverrides;

const cerdoEngorde = {
  energy: 3250,
  energyMax: 3400,
  protein: 16,
  proteinMax: 18.5,
  crudeFiberMax: 7,
  lysine: 0.85,
  lysineMax: 1.1,
  methionine: 0.27,
  methionineMax: 0.45,
  metCys: 0.52,
  metCysMax: 0.75,
  threonine: 0.55,
  threonineMax: 0.8,
  tryptophan: 0.16,
  tryptophanMax: 0.25,
  arginine: 0.65,
  arginineMax: 1.1,
  glycineSerine: 0,
  glycineSerineMax: 0,
  histidine: 0.3,
  histidineMax: 0.55,
  isoleucine: 0.5,
  isoleucineMax: 0.75,
  leucine: 0.9,
  leucineMax: 1.6,
  phenylalanine: 0.5,
  phenylalanineMax: 0.9,
  tyrosine: 0.38,
  tyrosineMax: 0.75,
  phenylalanineTyrosine: 0.88,
  phenylalanineTyrosineMax: 1.45,
  valine: 0.6,
  valineMax: 0.85,
  calcium: 0.65,
  calciumMax: 0.85,
  availablePhosphorus: 0.3,
  availablePhosphorusMax: 0.45,
  sodium: 0.16,
  sodiumMax: 0.24,
  potassium: 0,
  potassiumMax: 0,
  chlorine: 0.16,
  chlorineMax: 0.26,
  linoleicAcid: 0.8,
  linoleicAcidMax: 2.3
} satisfies RequirementOverrides;

export const baseRequirementProfiles: Requirement[] =
  [
    withDefaults({
      name: "Ponedora producción",
      species: "layer"
    }),

    withDefaults({
      name: "Ponedora producción dig",
      species: "layerDig"
    }),

    withDefaults({
      name: "Ponedora verano",
      species: "layer",
      energy: 3150,
      energyMax: 3250,
      protein: 16.5,
      sodium: 0.2,
      sodiumMax: 0.25,
      calcium: 3.64,
      availablePhosphorus: 0.39,
      linoleicAcid: 1.9,
      linoleicAcidMax: 2.6,

      derivedRequirements: {
        electrolyteBalance: {
          min: 200,
          max: 300,
          enabled: false
        }
      }
    }),

    withDefaults({
      name: "Cobb 500 inicio",
      species: "broiler",
      ...cobbInicio
    }),

    withDefaults({
      name: "Cobb 500 inicio dig",
      species: "broilerDig",
      ...cobbInicio
    }),

    withDefaults({
      name: "Cobb 500 inicio SE",
      species: "broilerSE",
      ...cobbInicio
    }),

    withDefaults({
      name: "Cobb 500 crecimiento",
      species: "broiler",
      ...cobbCrecimiento
    }),

    withDefaults({
      name: "Cobb 500 crecimiento dig",
      species: "broilerDig",
      ...cobbCrecimiento
    }),

    withDefaults({
      name: "Cobb 500 crecimiento SE",
      species: "broilerSE",
      ...cobbCrecimiento
    }),

    withDefaults({
      name: "Cobb 500 engorde",
      species: "broiler",
      ...cobbEngorde
    }),

    withDefaults({
      name: "Cobb 500 engorde dig",
      species: "broilerDig",
      ...cobbEngorde
    }),

    withDefaults({
      name: "Cobb 500 engorde SE",
      species: "broilerSE",
      ...cobbEngorde
    }),

    withDefaults({
      name: "Cerdo crecimiento",
      species: "pig",
      ...cerdoCrecimiento
    }),

    withDefaults({
      name: "Cerdo crecimiento dig",
      species: "pigDig",
      ...cerdoCrecimiento
    }),

    withDefaults({
      name: "Cerdo crecimiento SE",
      species: "pigSE",
      ...cerdoCrecimiento
    }),

    withDefaults({
      name: "Cerdo engorde",
      species: "pig",
      ...cerdoEngorde
    }),

    withDefaults({
      name: "Cerdo engorde dig",
      species: "pigDig",
      ...cerdoEngorde
    }),

    withDefaults({
      name: "Cerdo engorde SE",
      species: "pigSE",
      ...cerdoEngorde
    }),

    withDefaults({
      name: "Cuy engorde",
      species: "guineaPig",

      energy: 2800,
      energyMax: 3000,

      protein: 17,
      proteinMax: 19,

      crudeFiber: 8,
      crudeFiberMax: 18,

      lysine: 0.8,
      lysineMax: 1.1,

      methionine: 0.28,
      methionineMax: 0.45,

      metCys: 0.55,
      metCysMax: 0.8,

      threonine: 0.55,
      threonineMax: 0.8,

      tryptophan: 0.16,
      tryptophanMax: 0.25,

      arginine: 0.8,
      arginineMax: 1.2,

      glycineSerine: 0,
      glycineSerineMax: 0,

      histidine: 0.28,
      histidineMax: 0.5,

      isoleucine: 0.55,
      isoleucineMax: 0.8,

      leucine: 0.95,
      leucineMax: 1.6,

      phenylalanine: 0.55,
      phenylalanineMax: 0.95,

      tyrosine: 0.4,
      tyrosineMax: 0.75,

      phenylalanineTyrosine: 0.95,
      phenylalanineTyrosineMax: 1.5,

      valine: 0.62,
      valineMax: 0.9,

      calcium: 0.8,
      calciumMax: 1.1,

      availablePhosphorus: 0.35,
      availablePhosphorusMax: 0.5,

      sodium: 0.18,
      sodiumMax: 0.25,

      potassium: 0,
      potassiumMax: 0,

      chlorine: 0.18,
      chlorineMax: 0.28,

      linoleicAcid: 0.8,
      linoleicAcidMax: 2.3
    })
  ];
