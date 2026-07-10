import PageShell from "../components/PageShell";
import ProcurementOutlook from "../components/ProcurementOutlook";

// SuperAdmin-only cross-building view (route-gated in App). Independent of the
// active building: the outlook always aggregates every accessible building.
export default function PortfolioPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <PageShell>
      <div className="dash">
        <div className="dash-header">
          <div>
            <h1 className="dash-building">Portfolio Outlook</h1>
            <p className="dash-date">{today}</p>
          </div>
        </div>
        <ProcurementOutlook />
      </div>
    </PageShell>
  );
}
