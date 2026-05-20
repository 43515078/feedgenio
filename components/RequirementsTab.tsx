import {
  baseRequirementProfiles,
  requirementFields,
  type Requirement
} from "@/lib/requirements";

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
        Crea varios perfiles nutricionales y elige cuál usar para formular.
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

            {requirementFields.map((field) => (
              <tr key={field.key}>
                <td>{field.label}</td>
                <td>
                  <input
                    className="price-input"
                    type="number"
                    step={field.step}
                    value={requirement[field.key]}
                    onChange={(event) =>
                      onUpdateRequirement(
                        field.key,
                        Number(event.target.value || 0)
                      )
                    }
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
