// Shown instantly while a section loads, so clicking the sidebar never feels frozen.
export default function DashboardLoading() {
  return (
    <div className="admin-skeleton" aria-busy="true" aria-label="Loading">
      <div className="admin-skeleton-header"><span className="admin-skeleton-bar admin-skeleton-bar-sm" /><span className="admin-skeleton-bar admin-skeleton-bar-lg" /></div>
      <div className="admin-skeleton-grid">
        <span className="admin-skeleton-block" /><span className="admin-skeleton-block" /><span className="admin-skeleton-block" /><span className="admin-skeleton-block" />
      </div>
      <span className="admin-skeleton-block admin-skeleton-block-tall" />
    </div>
  );
}
