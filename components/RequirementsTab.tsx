// components/RequirementsTab.tsx

"use client";

import {
  type ChangeEvent,
  useRef
} from "react";

import {
  nutrientCatalog,
  nutrientKeys,
  type NutrientKey,
  type SpeciesKey
} from "@/lib/ingredients";

import {
  normalizeRequirement,
  type Requirement
} from "@/lib/requirements";

type Props = {
  requirement: Requirement;

  requirementProfiles: Requirement[];

  activeRequirementIndex: number;

  classifierKeys: SpeciesKey[];

  classifierLabels: Record<
    SpeciesKey,
    string
  >;

  onSelectRequirement: (
    index: number
  ) => void;

  onUpdateRequirement: (
    field: keyof Requirement,
    value:
      | string
      | number
      | Requirement["nutrients"]
      | Requirement["derivedRequirements"]
  ) => void;

  onCreateRequirement: () => void;

  onDuplicateRequirement: () => void;

  onDeleteRequirement: () => void;

  onRecoverProfiles: () => void;

  onRestoreProfilesBackup: () => void;

  onExportProfiles: () => void;

  onImportProfiles: (
    file: File
  ) => void;
};

function getNutrientStep(
  key: NutrientKey
): string {
  return nutrientCatalog[key]
    .decimals === 0
    ? "1"
    : "0.001";
}

export default function RequirementsTab({
  requirement: rawRequirement,

  requirementProfiles,

  activeRequirementIndex,

  classifierKeys,

  classifierLabels,

  onSelectRequirement,

  onUpdateRequirement,

  onCreateRequirement,

  onDuplicateRequirement,

  onDeleteRequirement,

  onRecoverProfiles,

  onRestoreProfilesBackup,

  onExportProfiles,

  onImportProfiles
}: Props) {
  const importInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const requirement =
    normalizeRequirement(
      rawRequirement
    );

  function handleImportChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (file) {
      onImportProfiles(file);
    }

    event.target.value = "";
  }

  function updateNutrient(
    key: NutrientKey,
    field:
      | "min"
      | "max"
      | "enabled",
    value: number | boolean
  ) {
    const currentRange =
      requirement.nutrients[key];

    const nextNutrients = {
      ...requirement.nutrients,

      [key]: {
        ...currentRange,

        [field]:
          field === "max" &&
          Number(value) <= 0
            ? undefined
            : value
      }
    };

    onUpdateRequirement(
      "nutrients",
      nextNutrients
    );
  }

  function updateElectrolyteBalance(
    field:
      | "min"
      | "max"
      | "enabled",
    value: number | boolean
  ) {
    const current =
      requirement
        .derivedRequirements
        .electrolyteBalance;

    const nextDerived = {
      ...requirement
        .derivedRequirements,

      electrolyteBalance: {
        ...current,

        [field]:
          (field === "min" ||
            field === "max") &&
          Number(value) <= 0
            ? undefined
            : value
      }
    };

    onUpdateRequirement(
      "derivedRequirements",
      nextDerived
    );
  }

  return (
    <section>
      <h2>
        🎯 Perfiles de requerimientos
      </h2>

      <div
        className="note"
        style={{
          marginBottom: 14
        }}
      >
        Cada nutriente puede activarse o
        desactivarse. Los nutrientes
        desactivados se calculan y muestran,
        pero no restringen al solver.
      </div>

      <h3>📋 Mis perfiles</h3>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 14
        }}
      >
        {requirementProfiles.map(
          (profile, index) => (
            <button
              key={`${profile.name}_${index}`}
              className={`action ${
                index ===
                activeRequirementIndex
                  ? ""
                  : "secondary"
              }`}
              type="button"
              onClick={() =>
                onSelectRequirement(
                  index
                )
              }
            >
              {index ===
              activeRequirementIndex
                ? "✅ "
                : ""}

              {profile.name ||
                `Perfil ${index + 1}`}
            </button>
          )
        )}
      </div>

      <div
        className="table-wrap"
        style={{
          marginTop: 16,
          marginBottom: 14
        }}
      >
        <table>
          <tbody>
            <tr>
              <td>
                Perfil activo
              </td>

              <td>
                <select
                  className="price-input"
                  style={{
                    width: 280,
                    maxWidth: "100%"
                  }}
                  value={
                    activeRequirementIndex
                  }
                  onChange={(event) =>
                    onSelectRequirement(
                      Number(
                        event.target
                          .value
                      )
                    )
                  }
                >
                  {requirementProfiles.map(
                    (
                      profile,
                      index
                    ) => (
                      <option
                        key={`${profile.name}_${index}`}
                        value={index}
                      >
                        {profile.name ||
                          `Perfil ${
                            index + 1
                          }`}
                      </option>
                    )
                  )}
                </select>
              </td>
            </tr>

            <tr>
              <td>Nombre</td>

              <td>
                <input
                  className="price-input"
                  style={{
                    width: 280,
                    maxWidth: "100%"
                  }}
                  type="text"
                  value={
                    requirement.name
                  }
                  onChange={(event) =>
                    onUpdateRequirement(
                      "name",
                      event.target.value
                    )
                  }
                />
              </td>
            </tr>

            <tr>
              <td>
                Clasificador
              </td>

              <td>
                <select
                  className="price-input"
                  style={{
                    width: 280,
                    maxWidth: "100%"
                  }}
                  value={
                    requirement.species
                  }
                  onChange={(event) =>
                    onUpdateRequirement(
                      "species",
                      event.target
                        .value as SpeciesKey
                    )
                  }
                >
                  {classifierKeys.map(
                    (species) => (
                      <option
                        key={species}
                        value={species}
                      >
                        {classifierLabels[
                          species
                        ] || species}
                      </option>
                    )
                  )}
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>
        🧬 Nutrientes del solver
      </h3>

      <div
        className="note"
        style={{
          marginBottom: 12
        }}
      >
        La casilla “Usar” decide si el
        nutriente entra como restricción.
        Un máximo igual a cero significa
        “sin máximo”.
      </div>

      <div
        className="table-wrap"
        style={{
          marginBottom: 14
        }}
      >
        <table
          style={{
            minWidth: 620
          }}
        >
          <thead>
            <tr>
              <th>Usar</th>

              <th>Nutriente</th>

              <th>Unidad</th>

              <th>Mínimo</th>

              <th>Máximo</th>
            </tr>
          </thead>

          <tbody>
            {nutrientKeys.map(
              (key) => {
                const definition =
                  nutrientCatalog[key];

                const range =
                  requirement
                    .nutrients[key];

                return (
                  <tr key={key}>
                    <td>
                      <input
                        className="checkbox-input"
                        type="checkbox"
                        checked={
                          range.enabled
                        }
                        onChange={(
                          event
                        ) =>
                          updateNutrient(
                            key,
                            "enabled",
                            event.target
                              .checked
                          )
                        }
                      />
                    </td>

                    <td>
                      <strong>
                        {
                          definition.fullLabel
                        }
                      </strong>

                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.7,
                          marginTop: 2
                        }}
                      >
                        {
                          definition.shortLabel
                        }
                      </div>
                    </td>

                    <td>
                      {
                        definition.unit
                      }
                    </td>

                    <td>
                      <input
                        className="price-input"
                        type="number"
                        inputMode="decimal"
                        step={getNutrientStep(
                          key
                        )}
                        value={
                          range.min
                        }
                        disabled={
                          !range.enabled
                        }
                        onChange={(
                          event
                        ) =>
                          updateNutrient(
                            key,
                            "min",
                            Number(
                              event
                                .target
                                .value ||
                                0
                            )
                          )
                        }
                        style={{
                          width: 105
                        }}
                      />
                    </td>

                    <td>
                      <input
                        className="price-input"
                        type="number"
                        inputMode="decimal"
                        step={getNutrientStep(
                          key
                        )}
                        value={
                          range.max ?? 0
                        }
                        disabled={
                          !range.enabled
                        }
                        onChange={(
                          event
                        ) =>
                          updateNutrient(
                            key,
                            "max",
                            Number(
                              event
                                .target
                                .value ||
                                0
                            )
                          )
                        }
                        style={{
                          width: 105
                        }}
                      />
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </div>

      <h3>
        🧮 Variables calculadas
      </h3>

      <div
        className="note"
        style={{
          marginBottom: 12
        }}
      >
        Estas variables se calculan a
        partir de los nutrientes. El
        balance electrolítico usa sodio,
        potasio y cloro.
      </div>

      <div
        className="table-wrap"
        style={{
          marginBottom: 14
        }}
      >
        <table
          style={{
            minWidth: 620
          }}
        >
          <thead>
            <tr>
              <th>Usar</th>

              <th>Variable</th>

              <th>Unidad</th>

              <th>Mínimo</th>

              <th>Máximo</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>
                <input
                  className="checkbox-input"
                  type="checkbox"
                  checked={
                    requirement
                      .derivedRequirements
                      .electrolyteBalance
                      .enabled
                  }
                  onChange={(event) =>
                    updateElectrolyteBalance(
                      "enabled",
                      event.target
                        .checked
                    )
                  }
                />
              </td>

              <td>
                <strong>
                  Balance electrolítico
                </strong>

                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.7,
                    marginTop: 2
                  }}
                >
                  Na + K − Cl
                </div>
              </td>

              <td>mEq/kg</td>

              <td>
                <input
                  className="price-input"
                  type="number"
                  inputMode="decimal"
                  step="1"
                  value={
                    requirement
                      .derivedRequirements
                      .electrolyteBalance
                      .min ?? 0
                  }
                  disabled={
                    !requirement
                      .derivedRequirements
                      .electrolyteBalance
                      .enabled
                  }
                  onChange={(event) =>
                    updateElectrolyteBalance(
                      "min",
                      Number(
                        event.target
                          .value || 0
                      )
                    )
                  }
                  style={{
                    width: 105
                  }}
                />
              </td>

              <td>
                <input
                  className="price-input"
                  type="number"
                  inputMode="decimal"
                  step="1"
                  value={
                    requirement
                      .derivedRequirements
                      .electrolyteBalance
                      .max ?? 0
                  }
                  disabled={
                    !requirement
                      .derivedRequirements
                      .electrolyteBalance
                      .enabled
                  }
                  onChange={(event) =>
                    updateElectrolyteBalance(
                      "max",
                      Number(
                        event.target
                          .value || 0
                      )
                    )
                  }
                  style={{
                    width: 105
                  }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8
        }}
      >
        <button
          className="action"
          type="button"
          onClick={
            onCreateRequirement
          }
        >
          Nuevo perfil vacío
        </button>

        <button
          className="action secondary"
          type="button"
          onClick={
            onDuplicateRequirement
          }
        >
          Duplicar perfil
        </button>

        <button
          className="action secondary"
          type="button"
          onClick={
            onDeleteRequirement
          }
          disabled={
            requirementProfiles.length <=
            1
          }
        >
          Eliminar perfil activo
        </button>
      </div>

      <details
        className="card"
        style={{
          marginTop: 18,
          padding: 14,
          border:
            "1px solid #d9e4dc",
          maxWidth: "100%"
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            fontWeight: 800
          }}
        >
          🩺 Centro de recuperación
        </summary>

        <div
          className="note"
          style={{
            marginTop: 12,
            marginBottom: 12
          }}
        >
          Recupera perfiles desde tus
          fórmulas guardadas, restaura una
          copia automática o guarda un
          respaldo para otro dispositivo.
        </div>

        <button
          className="action"
          type="button"
          onClick={
            onRecoverProfiles
          }
        >
          🛟 Recuperar desde fórmulas
          guardadas
        </button>

        <button
          className="action secondary"
          type="button"
          onClick={
            onRestoreProfilesBackup
          }
        >
          ♻️ Restaurar última copia
          automática
        </button>

        <button
          className="action secondary"
          type="button"
          onClick={
            onExportProfiles
          }
        >
          💾 Exportar perfiles
        </button>

        <button
          className="action secondary"
          type="button"
          onClick={() =>
            importInputRef.current?.click()
          }
        >
          📂 Importar perfiles
        </button>

        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          onChange={
            handleImportChange
          }
          style={{
            display: "none"
          }}
        />
      </details>
    </section>
  );
}
