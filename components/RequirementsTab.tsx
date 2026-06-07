import type { Requirement } from "@/lib/requirements";

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
};

type RequirementRow = {
  label: string;
  minKey: keyof Requirement;
  maxKey: keyof Requirement;
  step: string;
};

const requirementRows: RequirementRow[] = [
  { label: "Energía", minKey: "energy", maxKey: "energyMax", step: "1" },
  { label: "Proteína", minKey: "protein", maxKey: "proteinMax", step: "0.01" },
  { label: "Lisina", minKey: "lysine", maxKey: "lysineMax", step: "0.01" },
  { label: "Metionina", minKey: "methionine", maxKey: "methionineMax", step: "0.01" },
  { label: "Met + Cist", minKey: "metCys", maxKey: "metCysMax", step: "0.01" },
  { label: "Treonina", minKey: "threonine", maxKey: "threonineMax", step: "0.01" },
  { label: "Triptófano", minKey: "tryptophan", maxKey: "tryptophanMax", step: "0.01" },
  { label: "Arginina", minKey: "arginine", maxKey: "arginineMax", step: "0.01" },
  { label: "Glicina + Serina", minKey: "glycineSerine", maxKey: "glycineSerineMax", step: "0.01" },
  { label: "Histidina", minKey: "histidine", maxKey: "histidineMax", step: "0.01" },
  { label: "Isoleucina", minKey: "isoleucine", maxKey: "isoleucineMax", step: "0.01" },
  { label: "Leucina", minKey: "leucine", maxKey: "leucineMax", step: "0.01" },
  { label: "Fenilalanina", minKey: "phenylalanine", maxKey: "phenylalanineMax", step: "0.01" },
  { label: "Tirosina", minKey: "tyrosine", maxKey: "tyrosineMax", step: "0.01" },
  { label: "Fen + Tir", minKey: "phenylalanineTyrosine", maxKey: "phenylalanineTyrosineMax", step: "0.01" },
  { label: "Valina", minKey: "valine", maxKey: "valineMax", step: "0.01" },
  { label: "Calcio", minKey: "calcium", maxKey: "calciumMax", step: "0.01" },
  { label: "Fósforo disp", minKey: "availablePhosphorus", maxKey: "availablePhosphorusMax", step: "0.01" },
  { label: "Sodio", minKey: "sodium", maxKey: "sodiumMax", step: "0.01" },
  { label: "Cloro", minKey: "chlorine", maxKey: "chlorineMax", step: "0.01" },
  { label: "Ácido linoleico", minKey: "linoleicAcid", maxKey: "linoleicAcidMax", step: "0.01" }
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
  onResetRequirement
}: Props) {
  return (
    <section className="card">
      <h2>🎯 Perfiles de requerimientos</h2>

      <div className="note" style={{ marginBottom: 14 }}>
        Aquí solo aparecen tus perfiles creados. Nada de perfiles base molestando la vista.
      </div>

      <h3>📋 Mis perfiles</h3>

      {requirementProfiles.map((profile, index) => (
        <button
          key={`${profile.name}_${index}`}
          className={`action ${index === activeRequirementIndex ? "" : "secondary"}`}
          type="button"
          onClick={() => onSelectRequirement(index)}
        >
          {index === activeRequirementIndex ? "✅ " : ""}
          {profile.name || `Perfil ${index + 1}`}
        </button>
      ))}

      <div className="table-wrap" style={{ marginTop: 16, marginBottom: 14 }}>
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

      <button className="action" type="button" onClick={onCreateRequirement}>
        Nuevo perfil vacío
      </button>

      <button className="action secondary" type="button" onClick={onDuplicateRequirement}>
        Duplicar perfil
      </button>

      <button className="action secondary" type="button" onClick={onDeleteRequirement}>
        Eliminar perfil activo
      </button>

      <button className="action secondary" type="button" onClick={onResetRequirement}>
        Reiniciar perfiles
      </button>
    </section>
  );
}
