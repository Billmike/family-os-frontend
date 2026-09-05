import { X } from "lucide-react";
import { fonts, t } from "../../ui";
import { AssistantMark } from "./AssistantMark";

interface Props {
  isTurnInFlight: boolean;
  compact?: boolean;
  onClose: () => void;
}

export const AssistantHeader = ({
  isTurnInFlight,
  compact = false,
  onClose,
}: Props) => {
  const handleClose = () => {
    onClose();
  };
  const markSize = compact ? 24 : 36;
  const titleSize = compact ? 14 : 16;
  const statusSize = compact ? 11 : 12;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        borderBottom: `1px solid ${t.border}`,
        background: t.surfaceChrome,
        marginBottom: 12,
      }}
    >
      {compact && (
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 6,
            paddingBottom: 2,
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 9999,
              background: t.border,
            }}
          />
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: compact ? 8 : 12,
          padding: compact ? "0 6px 4px 12px" : "12px 16px",
        }}
      >
        <AssistantMark size={markSize} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: titleSize,
              fontWeight: 600,
              color: t.text,
              fontFamily: fonts.ui,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}
          >
            FamilyOS AI
          </p>
          <p
            style={{
              margin: compact ? "2px 0 0" : "4px 0 0",
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: statusSize,
              fontWeight: 500,
              color: isTurnInFlight ? t.textSec : t.success,
              fontFamily: fonts.ui,
              lineHeight: 1.15,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: compact ? 6 : 7,
                height: compact ? 6 : 7,
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
          aria-label="Close assistant"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 10,
            display: "flex",
            minWidth: 44,
            minHeight: 44,
            margin: compact ? "-8px 0" : 0,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 9999,
          }}
        >
          <X size={compact ? 16 : 18} color={t.textSec} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
