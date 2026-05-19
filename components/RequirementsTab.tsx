import type { Requirement } from "@/lib/requirements";

type Props = {
  requirement: Requirement;
};

export default function RequirementsTab({ requirement }: Props) {
  return (
    <section className="card">
      <h2>🎯 Requerimientos actuales</h2>

      <div className="table-wrap">
        <table>
          <tbody>
            <tr>
              <td>Energía</td>
              <td>{requirement.energy} kcal/kg</td>
            </tr>

            <tr>
              <td>Proteína</td>
              <td>{requirement.protein}%</td>
            </tr>

            <tr>
              <td>Lisina</td>
              <td>{requirement.lysine}%</td>
            </tr>

            <tr>
              <td>Metionina</td>
              <td>{requirement.methionine}%</td>
            </tr>

            <tr>
              <td>Met + Cist</td>
              <td>{requirement.metCys}%</td>
            </tr>

            <tr>
              <td>Calcio</td>
              <td>{requirement.calcium}%</td>
            </tr>

            <tr>
              <td>Fósforo disponible</td>
              <td>{requirement.availablePhosphorus}%</td>
            </tr>

            <tr>
              <td>Sodio</td>
              <td>{requirement.sodium}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="note">
        Más adelante aquí podrás:
        <br />
        <br />
        ✅ Crear fases
        <br />
        ✅ Duplicar perfiles
        <br />
        ✅ Manejar Cobb, cerdos, cuyes y ponedoras
        <br />
        ✅ Requerimientos verano / invierno
      </div>
    </section>
  );
}
