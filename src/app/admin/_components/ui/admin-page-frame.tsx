import { findSection, type AdminSectionId } from "@/app/admin/_lib/admin-sections";
import { formatTodayFull } from "@/app/admin/_lib/format";
import { errorMessages, savedMessages, type Flash } from "@/app/admin/_lib/messages";

type FrameProps = { section: AdminSectionId; flash?: Flash; loadFailed?: boolean; children: React.ReactNode };

export function AdminPageFrame({ section, flash, loadFailed, children }: FrameProps) {
  const meta = findSection(section);
  const today = formatTodayFull();
  const receiptId = flash?.receipt && /^[0-9a-f-]{36}$/i.test(flash.receipt) ? flash.receipt : null;
  return (
    <>
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">{meta?.eyebrow}</p>
          <h1>{meta?.label}</h1>
        </div>
        <div className="admin-page-header-side">
          <span>{today}</span>
          <p>{meta?.description}</p>
        </div>
      </header>
      <div className="admin-content">
        {flash?.saved && (
          <p className="admin-message admin-message-success">
            {savedMessages[flash.saved] ?? "Changes saved. The public pages now show the latest catalog."}
            {receiptId && (
              <>
                {" "}
                <a
                  className="admin-message-link"
                  href={`/admin/receipt/${receiptId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open the receipt
                </a>
              </>
            )}
          </p>
        )}
        {flash?.error && (
          <p className="admin-message admin-message-error">
            {errorMessages[flash.error] ?? "Something went wrong. Try again or check the database connection."}
          </p>
        )}
        {loadFailed && (
          <p className="admin-message admin-message-error">
            Could not load resort data. Confirm that `supabase/schema.sql` has been run in this project.
          </p>
        )}
        {children}
      </div>
    </>
  );
}
