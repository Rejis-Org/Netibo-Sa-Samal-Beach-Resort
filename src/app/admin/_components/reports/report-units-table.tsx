import type { getDailyReport } from "@/lib/daily-report-data";

type DailyReportResult = NonNullable<Awaited<ReturnType<typeof getDailyReport>>>;

export function ReportUnitsTable({ result }: { result: DailyReportResult }) {
  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">Rooms and cottages</p>
          <h2>What was booked</h2>
        </div>
      </div>
      <div className="admin-grid-scroll">
        <table className="admin-grid report-table">
          <thead>
            <tr>
              <th scope="col">Place</th>
              <th scope="col">Type</th>
              <th scope="col">Status</th>
              <th scope="col">Guest</th>
              <th scope="col">Reference</th>
            </tr>
          </thead>
          <tbody>
            {result.report.units.map((unit) => (
              <tr key={unit.id} className={unit.state === "booked" ? "admin-cell-booked" : "admin-cell-free"}>
                <th scope="row">{unit.name}</th>
                <td>{unit.type}</td>
                <td>{unit.state === "booked" ? (unit.wholeResort ? "Whole resort" : "Booked") : "Vacant"}</td>
                <td>{unit.guest ?? ""}</td>
                <td>{unit.ref ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
