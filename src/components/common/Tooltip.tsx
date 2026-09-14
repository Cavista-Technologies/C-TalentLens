import { Info } from "lucide-react";
import "../../styles/Tooltip.css";
 
type TooltipProps = {
  text: string;
};
 
export function Tooltip({ text }: TooltipProps) {
  return (
<span className="field-tooltip" tabIndex={0}>
<Info size={14} aria-hidden="true" />
<span className="field-tooltip-bubble" role="tooltip">
        {text}
</span>
</span>
  );
}