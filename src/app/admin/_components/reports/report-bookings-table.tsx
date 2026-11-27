import type { getDailyReport } from "@/lib/daily-report-data";
import { peso } from "@/app/admin/_lib/format";

type DailyReportResult = NonNullable<Awaited<ReturnType<typeof getDailyReport>>>;

const roleLabel = { arrival: "Arriving", inhouse: "Staying", departure: "Leaving", single: "One day" } as const;

export function ReportBookingsTable({ result }: { result: DailyReportResult }) {
  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">Bookings</p>
          <h2>Everyone on the books today</h2>
        </div>
      </div>
      {result.report.bookings.length === 0 ? (
        <p className="admin-empty-state">No confirmed bookings for this day.</p>
      ) : (
        <div className="admin-grid-scroll">
          <table className="admin-grid report-table">
            <thead>
              <tr>
                <th scope="col">Guest</th>
                <th scope="col">Booked</th>
                <th scope="col">Today</th>
                <th scope="col">Status</th>
                <th scope="col">Guests</th>
                <th scope="col">Booking total</th>
                <th scope="col">Share for today</th>
              </tr>
            </thead>
            <tbody>
              {result.report.bookings.map((row) => (
                <tr key={row.ref}>
                  <th scope="row">
                    {row.guest}
                    <br />
                    <small>{row.ref}</small>
                  </th>
                  <td>{row.title}</td>
                  <td>{roleLabel[row.role]}</td>
                  <td>{row.status.replaceAll("_", " ")}</td>
                  <td>{row.adults + row.children}</td>
                  <td>{peso.format(row.total)}</td>
                  <td>{peso.format(row.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
