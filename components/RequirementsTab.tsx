import { baseRequirementProfiles, type Requirement } from "@/lib/requirements";

type Props = {
  requirement: Requirement;
  requirementProfiles: Requirement[];
  activeRequirementIndex: number;
  onSelectRequirement: (index: number) => void;
  onUpdateRequirement: (
    field: keyof Requirement,
    value: string | number
  ) => void;
  onCreateRequirement: () => void;
  onDuplicateRequirement: () => void;
  onDeleteRequirement: () => void;
  onResetRequirement: () => void;
  onLoadBaseRequirement: (profile: Requirement) => void;
};

type RequirementRow = {
  label: string;
  minKey: keyof Requirement;
  maxKey: keyof Requirement;
  step: string;
};

const requirementRows: RequirementRow[] = [
  {
    label: "Energía",
    minKey: "energy",
    maxKey: "energyMax",
    step: "1"
  },
  {
    label: "Proteína",
    minKey: "protein",
    maxKey: "proteinMax",
    step: "0.01"
  },
  {
    label: "Lisina",
    minKey: "lysine",
    maxKey: "lysineMax",
    step: "0.01"
  },
  {
    label: "Metionina",
    minKey: "methionine",
    maxKey: "methionineMax",
    step: "0.01"
  },
  {
    label: "Met + Cist",
    minKey: "metCys",
    maxKey: "metCysMax",
    step: "0.01"
  },
  {
    label: "Treonina",
    minKey: "threonine",
    maxKey: "threonineMax",
    step: "0.01"
  },
  {
    label: "Triptófano",
    minKey: "tryptophan",
    maxKey: "tryptophanMax",
    step: "0.01"
  },
  {
    label: "Arginina",
    minKey: "arginine",
    maxKey: "arginineMax",
    step: "0.01"
  },
  {
    label: "Isoleucina",
    minKey: "isoleucine",
    maxKey: "isoleucineMax",
    step: "0.01"
  },
  {
    label: "Valina",
    minKey: "valine",
    maxKey: "valineMax",
    step: "0.01"
  },
  {
    label: "Calcio",
    minKey: "calcium",
    maxKey: "calciumMax",
    step: "0.01"
  },
  {
    label: "Fósforo disp",
    minKey: "availablePhosphorus",
    maxKey: "availablePhosphorusMax",
    step: "0.01"
  },
  {
    label: "Sodio",
    minKey: "sodium",
    maxKey: "sodiumMax",
    step: "0.01"
  },
  {
    label: "Cloro",
    minKey: "chlorine",
    maxKey: "chlorineMax",
    step: "0.01"
  },
  {
    label: "Ácido linoleico",
    minKey: "linoleicAcid",
    maxKey: "linoleicAcidMax",
    step: "0.01"
  }
];

function getNumberValue(value: Requirement[keyof Requirement]) {
  if (typeof value === "number") return value;
  return 0;
}

export default function RequirementsTab({
  requirement,
  requirementProfiles,
  activeRequirementIndex,
  onSelectRequirement,
  onUpdateRequirement,
  onCreateRequirement,
  onDuplicateRequirement,
  onDeleteRequirement,
  onResetRequirement,
  onLoadBaseRequirement
}: Props) {
  return (
    <section className="card">
      <h2>🎯 Perfiles de requerimientos</h2>

      <div className="note" style={{ marginBottom: 14 }}>
        Crea varios perfiles nutricionales y define rangos mínimos y máximos.
      </div>

      <div className="table-wrap" style={{ marginBottom: 14 }}>
        <table>
          <tbody>
            <tr>
              <td>Perfil activo</td>
              <td>
                <select
                  className="price-input"
                  style={{ width: 260 }}
                  value={activeRequirementIndex}
                  onChange={(event) =>
                    onSelectRequirement(Number(event.target.value))
                  }
                >
                  {requirementProfiles.map((profile, index) => (
                    <option key={`${profile.name}_${index}`} value={index}>
                      {profile.name || `Perfil ${index + 1}`}
                    </option>
                  ))}
                </select>
              </td>
            </tr>

            <tr>
              <td>Nombre</td>
              <td>
                <input
                  className="price-input"
                  style={{ width: 260 }}
                  type="text"
                  value={requirement.name}
                  onChange={(event) =>
                    onUpdateRequirement("name", event.target.value)
                  }
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="table-wrap" style={{ marginBottom: 14 }}>
        <table style={{ minWidth: 0 }}>
          <thead>
            <tr>
              <th>Nutriente</th>
              <th>Mín</th>
              <th>Máx</th>
            </tr>
          </thead>

          <tbody>
            {requirementRows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>

                <td>
                  <input
                    className="price-input"
                    type="number"
                    step={row.step}
                    value={getNumberValue(requirement[row.minKey])}
                    onChange={(event) =>
                      onUpdateRequirement(
                        row.minKey,
                        Number(event.target.value || 0)
                      )
                    }
                    style={{ width: 95 }}
                  />
                </td>

                <td>
                  <input
                    className="price-input"
                    type="number"
                    step={row.step}
                    value={getNumberValue(requirement[row.maxKey])}
                    onChange={(event) =>
                      onUpdateRequirement(
                        row.maxKey,
                        Number(event.target.value || 0)
                      )
                    }
                    style={{ width: 95 }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>📚 Cargar perfil base</h3>

      {baseRequirementProfiles.map((profile) => (
        <button
          key={profile.name}
          className="action secondary"
          type="button"
          onClick={() => onLoadBaseRequirement(profile)}
        >
          Cargar {profile.name}
        </button>
      ))}

      <button className="action" type="button" onClick={onCreateRequirement}>
        Nuevo perfil vacío
      </button>

      <button
        className="action secondary"
        type="button"
        onClick={onDuplicateRequirement}
      >
        Duplicar perfil
      </button>

      <button
        className="action secondary"
        type="button"
        onClick={onDeleteRequirement}
      >
        Eliminar perfil activo
      </button>

      <button
        className="action secondary"
        type="button"
        onClick={onResetRequirement}
      >
        Reiniciar perfiles
      </button>

      <div className="note" style={{ marginTop: 14 }}>
        Los perfiles base son puntos de partida. Luego los afinamos con tus
        valores reales según especie, fase, clima e insumos disponibles.
      </div>
    </section>
  );
}
