import { SlArrowRight } from "react-icons/sl";
import { useNavigate } from "react-router-dom";

interface AirHandlerCardProps {
  name: string;
  subtitle: string;
  guid: string;
}

export default function AirHandlerCard({ name, subtitle, guid }: AirHandlerCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className="inventory-item"
      style={{ cursor: "pointer" }}
      onClick={() => navigate(`/airhandlers/${guid}`)}
      data-testid={`airhandler-card-${guid}`}
    >
      <div>
        <h1 className="inventory-title">{name}</h1>
        <p className="inventory-subtitle">{subtitle}</p>
      </div>
      <SlArrowRight className="inventory-arrow" />
    </div>
  );
}
