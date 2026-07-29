import { useAppliedTheme } from "@/hooks/useTheme";
import { isInTelegram } from "@/lib/telegram";
import { miniApp } from "@tma.js/sdk-react";
import { type ReactNode, useLayoutEffect } from "react";

function paintTelegramBands(): void {
  if (!isInTelegram()) return;
  const color = getComputedStyle(document.documentElement).getPropertyValue("--ts-bg").trim();
  if (!color.startsWith("#")) return;
  try {
    miniApp.setBgColor.ifAvailable(color);
    if (miniApp.setHeaderColor.supports("rgb")) miniApp.setHeaderColor.ifAvailable(color);
    miniApp.setBottomBarColor.ifAvailable(color);
  } catch {}
}

export function ThemeGate({ children }: { children: ReactNode }) {
  const theme = useAppliedTheme();

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    paintTelegramBands();
  }, [theme]);

  return <>{children}</>;
}
