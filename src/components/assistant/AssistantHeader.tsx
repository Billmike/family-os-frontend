import { X } from "lucide-react";
import { fonts, t } from "../../ui";
import { AssistantMark } from "./AssistantMark";

interface Props {
  isTurnInFlight: boolean;
  onClose: () => void;
}

export const AssistantHeader = ({ isTurnInFlight, onClose }: Props) => {
  const handleClose = () => {
    onClose();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        borderBottom: `1px solid ${t.border}`,
        background: t.surfaceChrome,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
        }}
      >
        <AssistantMark size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              color: t.text,
              fontFamily: fonts.ui,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}
          >
            Heimdall
          </p>
          <p
            style={{
              margin: "4px 0 0",
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              fontWeight: 500,
              color: isTurnInFlight ? t.textSec : t.success,
              fontFamily: fonts.ui,
              lineHeight: 1.15,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: 9999,
                background: isTurnInFlight ? t.textTer : t.success,
                flexShrink: 0,
              }}
            />
            {isTurnInFlight ? "Thinking…" : "Ready to help"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close Heimdall"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 10,
            display: "flex",
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 9999,
          }}
        >
          <X size={18} color={t.textSec} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
