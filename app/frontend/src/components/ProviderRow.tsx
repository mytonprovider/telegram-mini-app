import { CopyButton } from "@/components/CopyButton";
import { StatusDot } from "@/components/StatusDot";
import type { Provider } from "@/data/types";
import { useT } from "@/i18n";
import type { Dict } from "@/i18n/types";
import { EMPTY, amount, formatPrice, formatTime, shorten } from "@/lib/format";
import { describeStatus } from "@/lib/status";
import type { ReactNode } from "react";
import styles from "./ProviderRow.module.css";

interface ProviderRowProps {
  provider: Provider;
  onOpen: () => void;
  trailing: ReactNode;
}

function withUnits(text: string): ReactNode {
  return text.split(/([\d.,]+)/).map((part, index) =>
    !part || /^[\d.,]/.test(part) ? (
      part
    ) : (
      <span key={index} className={styles.unit}>
        {part}
      </span>
    ),
  );
}

function freeSpace(provider: Provider, t: Dict): string {
  const { totalSpace, usedSpace } = provider.telemetry;
  if (!provider.hasTelemetry || totalSpace === null || usedSpace === null) return EMPTY;
  return t.gb(amount(Math.max(totalSpace - usedSpace, 0)));
}

export function ProviderRow({ provider, onOpen, trailing }: ProviderRowProps) {
  const t = useT();
  const status = describeStatus(provider, t);
  const hasChecks = status.total > 0 && provider.status === 0;
  const place = provider.location?.country || provider.location?.countryIso || EMPTY;
  const working = provider.workingTime > 0 ? formatTime(provider.workingTime, t, true) : EMPTY;

  const cell = (label: string, value: ReactNode) => (
    <span className={styles.cell}>
      <span className={styles.cellLabel}>{label}</span>
      <span className={styles.cellValue}>{value}</span>
    </span>
  );

  return (
    <div className={styles.row} onClick={onOpen}>
      <div className={styles.head}>
        {trailing}
        <span className={styles.pk}>{shorten(provider.pubkey, 12).toUpperCase()}</span>
        <CopyButton value={provider.pubkey} />
        <span className={styles.spacer} />
        <span className={styles.status} style={{ color: status.color }}>
          {status.label}
          {hasChecks && ` ${(status.ratio * 100).toFixed(1)}%`}
        </span>
        <StatusDot color={status.color} size={8} />
      </div>
      <div className={styles.cells}>
        {cell(t.rating, provider.rating.toFixed(2))}
        {cell(t.uptime, `${provider.uptime.toFixed(2)}%`)}
        {cell(t.price, withUnits(`${formatPrice(provider.price)} GRAM`))}
        {cell(t.freeLabel, withUnits(freeSpace(provider, t)))}
        {cell(t.workingTime, withUnits(working))}
        {cell(t.location, place)}
      </div>
    </div>
  );
}
