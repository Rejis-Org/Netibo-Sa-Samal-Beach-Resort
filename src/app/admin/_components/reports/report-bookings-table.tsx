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
                <th scope="col" className="num">Guests</th>
                <th scope="col" className="num">Booking total</th>
                <th scope="col" className="num">Share for today</th>
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
                  <td className="report-status">{row.status.replaceAll("_", " ")}</td>
                  <td className="num">{row.adults + row.children}</td>
                  <td className="num">{peso.format(row.total)}</td>
                  <td className="num">{peso.format(row.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
