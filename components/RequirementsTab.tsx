import {
  requirementFields,
  type Requirement
} from "@/lib/requirements";

type Props = {
  requirement: Requirement;
  onUpdateRequirement: (
    field: keyof Requirement,
    value: string | number
  ) => void;
};

export default function RequirementsTab({
  requirement,
  onUpdateRequirement
}: Props) {
  return (
    <section className="card">
      <h2>🎯 Requerimientos actuales</h2>

      <div className="table-wrap">
        <table>
          <tbody>
            <tr>
              <td>Nombre</td>

              <td>
                <input
                  className="price-input"
                  style={{ width: 240 }}
                  type="text"
                  value={requirement.name}
                  onChange={(event) =>
                    onUpdateRequirement(
                      "name",
                      event.target.value
                    )
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
                        Number(
                          event.target.value || 0
                        )
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="note">
        🔥 Ahora los requerimientos ya son editables.
        <br />
        <br />
        Próximamente:
        <br />
        <br />
        ✅ Perfiles múltiples
        <br />
        ✅ Cobb 500
        <br />
        ✅ Cerdos
        <br />
        ✅ Cuyes
        <br />
        ✅ Verano / invierno
        <br />
        ✅ Requerimientos automáticos
      </div>
    </section>
  );
}
