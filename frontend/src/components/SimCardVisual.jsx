import { cn } from "@/lib/utils";

export default function SimCardVisual({ card, size = "md", className }) {
  const sizeClasses = {
    sm: "w-24",
    md: "w-40",
    lg: "w-56"
  };

  return (
    <div 
      className={cn(
        "sim-card bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600",
        sizeClasses[size],
        className
      )}
      data-testid="sim-card-visual"
    >
      {/* SIM Chip */}
      <div className="sim-chip">
        <div className="sim-chip-contact" />
        <div className="sim-chip-contact" />
        <div className="sim-chip-contact" />
        <div className="sim-chip-contact" />
        <div className="sim-chip-contact" />
        <div className="sim-chip-contact" />
      </div>

      {/* Card Info Overlay */}
      <div className="absolute bottom-2 right-2 text-right">
        <p className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">
          {card?.card_type || "NANO"} SIM
        </p>
        {card?.spn && (
          <p className="text-[10px] font-semibold text-white truncate max-w-[80px]">
            {card.spn}
          </p>
        )}
      </div>

      {/* Notch corner */}
      <div className="absolute top-0 right-0 w-3 h-3 bg-background" 
        style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }} 
      />
    </div>
  );
}
