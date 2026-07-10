import { TbCircleCheck, TbShoppingCart, TbEye, TbArrowRight } from "react-icons/tb";
import { HORIZON_DAYS, URGENT_DAYS } from "../hooks/useProcurementOutlook";
import type { TierKey } from "../hooks/useProcurementOutlook";

interface TriageCardsProps {
  counts: { orderNow: number; watch: number; stocked: number };
  tier: TierKey;
  onToggleTier: (key: TierKey) => void;
}

export default function ProcurementTriageCards({ counts, tier, onToggleTier }: TriageCardsProps) {
  const cards = [
    {
      key: "ordernow" as TierKey,
      label: `Order now (≤ ${URGENT_DAYS} days)`,
      desc: counts.orderNow === 1 ? "filter needs ordering" : "filters need ordering",
      link: "View order list",
      tone: "danger",
      Icon: TbShoppingCart,
      count: counts.orderNow,
    },
    {
      key: "watch" as TierKey,
      label: `Watch (${URGENT_DAYS + 1}–${HORIZON_DAYS} days)`,
      desc: counts.watch === 1 ? "filter to watch" : "filters to watch",
      link: "View watch list",
      tone: "warning",
      Icon: TbEye,
      count: counts.watch,
    },
    {
      key: "stocked" as TierKey,
      label: `Stocked (≥ ${HORIZON_DAYS + 1} days)`,
      desc: counts.stocked === 1 ? "filter covered" : "filters covered",
      link: "View stocked list",
      tone: "success",
      Icon: TbCircleCheck,
      count: counts.stocked,
    },
  ];

  return (
    <div className="procurement-cards">
      {cards.map(({ key, label, desc, link, tone, Icon, count }) => (
        <button
          key={key}
          type="button"
          aria-pressed={tier === key}
          data-testid={`procurement-tier-${key}`}
          className={`procurement-card procurement-card--${tone}${tier === key ? " is-active" : ""}`}
          onClick={() => onToggleTier(key)}
        >
          <span className="procurement-card-top">
            <span className="procurement-card-main">
              <span className="procurement-card-label">{label}</span>
              <span className="procurement-card-numrow">
                <span className="procurement-card-count">{count}</span>
                <span className="procurement-card-desc">{desc}</span>
              </span>
            </span>
            <span className="procurement-card-icon" aria-hidden="true">
              <Icon size={22} />
            </span>
          </span>
          <span className="procurement-card-link">
            {tier === key ? "Showing below · click to clear" : link}
            <TbArrowRight size={13} />
          </span>
        </button>
      ))}
    </div>
  );
}
