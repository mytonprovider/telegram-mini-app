import { endSession } from "@/app/session";
import { BottomSheet } from "@/components/BottomSheet";
import { Icon } from "@/components/Icon/Icon";
import { SegmentControl } from "@/components/SegmentControl";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";
import { setExplorer, setLanguage, setTheme } from "@/data/sync";
import { useAppliedTheme } from "@/hooks/useTheme";
import { useAppliedLang, useT } from "@/i18n";
import type { Lang } from "@/i18n/types";
import { isInTelegram } from "@/lib/telegram";
import { useAuth } from "@/stores/auth";
import { type Explorer, type Theme, useSettings } from "@/stores/settings";
import { useNavigate } from "react-router-dom";
import styles from "./MenuSheet.module.css";

export function MenuSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const navigate = useNavigate();

  const theme = useAppliedTheme();
  const lang = useAppliedLang();
  const explorer = useSettings((s) => s.explorer);

  const loggedIn = useAuth((s) => s.loggedIn);
  const user = useAuth((s) => s.user);
  const inTelegram = isInTelegram();

  return (
    <BottomSheet onClose={onClose}>
      {(close) => (
        <>
          <div className={styles.accountSlot}>
            {loggedIn && user ? (
              <div className={styles.account}>
                {user.photoUrl ? (
                  <img className={styles.avatar} src={user.photoUrl} alt="" />
                ) : (
                  <div className={styles.avatar}>{user.initials}</div>
                )}
                <div className={styles.accountInfo}>
                  <div className={styles.accountName}>{user.name}</div>
                  {user.username && <div className={styles.accountUser}>@{user.username}</div>}
                </div>
                {!inTelegram && (
                  <button
                    type="button"
                    aria-label={t.logout}
                    className={styles.logout}
                    onClick={() => {
                      close();
                      endSession();
                    }}
                  >
                    <Icon glyph="logout" size={20} color="var(--ts-danger)" />
                  </button>
                )}
              </div>
            ) : (
              !inTelegram && (
                <div className={styles.login}>
                  <TelegramLoginButton />
                </div>
              )
            )}
          </div>

          <div className={styles.separator} />

          <div className={styles.label}>{t.language}</div>
          <SegmentControl<Lang>
            options={[
              { value: "en", label: "English" },
              { value: "ru", label: "Русский" },
            ]}
            value={lang}
            onChange={setLanguage}
          />

          <div className={styles.label}>{t.appearance}</div>
          <SegmentControl<Theme>
            options={[
              { value: "light", label: t.light },
              { value: "dark", label: t.dark },
            ]}
            value={theme}
            onChange={setTheme}
          />

          <div className={styles.label}>{t.explorerLabel}</div>
          <SegmentControl<Explorer>
            options={[
              { value: "tonviewer", label: "Tonviewer" },
              { value: "tonscan", label: "Tonscan" },
            ]}
            value={explorer}
            onChange={setExplorer}
          />

          <button
            type="button"
            className={styles.row}
            onClick={() => {
              onClose();
              navigate("/bags");
            }}
          >
            {t.explorerTitle}
          </button>
        </>
      )}
    </BottomSheet>
  );
}
