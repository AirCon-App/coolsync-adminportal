import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  SlInfo,
  SlEnvolopeLetter,
  SlCalender,
  SlBell,
} from "react-icons/sl";
import { TbLayoutList, TbClockHour4, TbAlertTriangle } from "react-icons/tb";
import PageShell from "../components/PageShell";
import { useBuilding } from "../context/BuildingContext";
import { SettingsStyles, BuildingRequired } from "./settings/shared";
import { OverviewTab } from "./settings/OverviewTab";
import { RecipientsTab } from "./settings/RecipientsTab";
import { ScheduleTab } from "./settings/ScheduleTab";
import { JobsTab } from "./settings/JobsTab";
import { MessagesTab } from "./settings/MessagesTab";
import { AreasTab } from "./settings/AreasTab";
import { AlertsTab } from "./settings/AlertsTab";

const TABS = [
  { key: "general",    label: "Overview",         icon: SlInfo,             needsBuilding: false },
  { key: "recipients", label: "Report Recipients", icon: SlEnvolopeLetter,  needsBuilding: true  },
  { key: "schedule",   label: "Report Schedule",   icon: SlCalender,        needsBuilding: true  },
  { key: "alerts",     label: "Alerts",            icon: TbAlertTriangle,   needsBuilding: true  },
  { key: "jobs",       label: "Job Cadence",       icon: TbClockHour4,      needsBuilding: false },
  { key: "messages",   label: "Messages",          icon: SlBell,            needsBuilding: true  },
  { key: "areas",      label: "Areas",             icon: TbLayoutList,      needsBuilding: false },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { activeBuilding } = useBuilding();
  const [tab, setTab] = useState("general");

  const activeTabDef = TABS.find((t) => t.key === tab);
  const needsBuilding = activeTabDef?.needsBuilding && !activeBuilding;

  return (
    <PageShell>
      <SettingsStyles />
      <div className="inventory-container settings-shell">
        <header className="settings-header">
          <h1>Settings</h1>
          <p>
            {activeBuilding
              ? <>Configuration for <strong style={{ color: "var(--text-primary)" }}>{activeBuilding.name}</strong></>
              : "System and per-building configuration."}
          </p>
        </header>

        <div className="settings-tabbar" role="tablist" aria-label="Settings sections">
          {TABS.map((t) => {
            const Icon = t.icon;
            const selected = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={selected}
                aria-controls={`settings-panel-${t.key}`}
                id={`settings-tab-${t.key}`}
                tabIndex={selected ? 0 : -1}
                className="settings-tab"
                onClick={() => setTab(t.key)}
              >
                <Icon className="settings-tab-icon" aria-hidden="true" />
                {t.label}
              </button>
            );
          })}
        </div>

        <section
          role="tabpanel"
          id={`settings-panel-${tab}`}
          aria-labelledby={`settings-tab-${tab}`}
          className="settings-section"
        >
          {needsBuilding && <BuildingRequired />}

          {!needsBuilding && tab === "general"    && <OverviewTab activeBuilding={activeBuilding} setTab={setTab} navigate={navigate} />}
          {!needsBuilding && tab === "recipients" && <RecipientsTab buildingId={activeBuilding!.buildingId} />}
          {!needsBuilding && tab === "schedule"   && <ScheduleTab buildingId={activeBuilding!.buildingId} />}
          {!needsBuilding && tab === "alerts"     && <AlertsTab buildingId={activeBuilding!.buildingId} />}
          {!needsBuilding && tab === "jobs"       && <JobsTab />}
          {!needsBuilding && tab === "messages"   && <MessagesTab buildingId={activeBuilding!.buildingId} />}
          {!needsBuilding && tab === "areas"      && <AreasTab activeBuilding={activeBuilding} navigate={navigate} />}
        </section>
      </div>
    </PageShell>
  );
}
