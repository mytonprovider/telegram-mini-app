import { BottomNav } from "@/components/BottomNav";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon/Icon";
import { LoadMore } from "@/components/LoadMore";
import { MenuSheet } from "@/components/MenuSheet";
import { ProviderRow } from "@/components/ProviderRow";
import { RoundToggle } from "@/components/RoundToggle";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";
import { countActiveFilters, selectCatalog } from "@/data/query";
import { useT } from "@/i18n";
import { cx } from "@/lib/cx";
import { isInTelegram } from "@/lib/telegram";
import { useAlerts } from "@/stores/alerts";
import { useAuth } from "@/stores/auth";
import { useCatalog } from "@/stores/catalog";
import { PAGE_SIZE, useCatalogQuery } from "@/stores/catalogQuery";
import { hydrateFromServer, setAlertsEnabled, toggleBell, toggleFavorite } from "@/data/sync";
import { useFavorites } from "@/stores/favorites";
import { useSubscriptions } from "@/stores/subscriptions";
import { useUi } from "@/stores/ui";
import { type UIEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";
import { TonLogo } from "./TonLogo";

const RELOAD_SPIN_MS = 1100;
const SCROLL_TOP_THRESHOLD = 360;
const FOOTER_SAFE_ZONE = 120;
const SKELETON_MIN = 3;
const LIST_SKELETON_MIN = 6;
const CELL_COUNT = 6;

export function Home() {
  const t = useT();
  const navigate = useNavigate();

  const providers = useCatalog((s) => s.providers);
  const bounds = useCatalog((s) => s.bounds);
  const status = useCatalog((s) => s.status);
  const errorStatus = useCatalog((s) => s.errorStatus);
  const load = useCatalog((s) => s.load);
  const reload = useCatalog((s) => s.reload);

  const tab = useCatalogQuery((s) => s.tab);
  const search = useCatalogQuery((s) => s.search);
  const sort = useCatalogQuery((s) => s.sort);
  const filters = useCatalogQuery((s) => s.filters);
  const visible = useCatalogQuery((s) => s.visible);
  const setSearch = useCatalogQuery((s) => s.setSearch);
  const setSortField = useCatalogQuery((s) => s.setSortField);
  const loadMore = useCatalogQuery((s) => s.loadMore);

  const favorites = useFavorites((s) => s.favorites);


  const loggedIn = useAuth((s) => s.loggedIn);

  const subscribed = useSubscriptions((s) => s.subscribed);
  const alertsOff = useSubscriptions((s) => s.alertsOff);


  const alertEnabled = useAlerts((s) => s.enabled);
  const menuOpen = useUi((s) => s.menuOpen);
  const setMenuOpen = useUi((s) => s.setMenuOpen);

  const scrollRef = useRef<HTMLDivElement>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(reloadTimer.current), []);
  const [showTop, setShowTop] = useState(false);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const favTab = tab === "fav" && !search;
  const isSubsTab = tab === "subs" && !search;

  const catalog = useMemo(
    () => selectCatalog(providers, { favTab, search, filters, sort, favorites, bounds }),
    [providers, favTab, search, filters, sort, favorites, bounds],
  );
  const items = isSubsTab ? [] : catalog;
  const shown = items.slice(0, visible);

  const subProviders = useMemo(() => {
    if (!loggedIn) return [];
    const query = search.trim().toLowerCase();
    return providers.filter(
      (p) => subscribed.includes(p.pubkey) && (!query || p.pubkey.toLowerCase().includes(query)),
    );
  }, [loggedIn, providers, subscribed, search]);

  const activeFilters = countActiveFilters(filters);
  const initialLoading = status !== "ready" && status !== "error";
  const showSkeleton = (spinning || initialLoading) && (isSubsTab ? loggedIn : true);
  const isError = status === "error" && providers.length === 0;

  const onReload = () => {
    setSpinning(true);
    void reload();
    if (useAuth.getState().token) {
      hydrateFromServer().catch((error: unknown) => console.error("reload sync failed", error));
    }
    clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => setSpinning(false), RELOAD_SPIN_MS);
  };

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
    const atBottom = scrollTop + clientHeight > scrollHeight - FOOTER_SAFE_ZONE;
    setShowTop(scrollTop > SCROLL_TOP_THRESHOLD && !atBottom);
  };

  const scrollToTop = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const skeletonCount = isSubsTab
    ? Math.max(subProviders.length, SKELETON_MIN)
    : Math.min(Math.max(shown.length, LIST_SKELETON_MIN), PAGE_SIZE);

  const showToolbar = tab === "list" && providers.length > 0;
  const showCount = isSubsTab ? loggedIn && subProviders.length > 0 : items.length > 0;
  const homeCount = isSubsTab
    ? t.showing(subProviders.length, subProviders.length)
    : t.showing(shown.length, items.length);

  const showSubsRows = !showSkeleton && isSubsTab && loggedIn && subProviders.length > 0;
  const showSubsToolbar = showSubsRows;
  const showSubsLogin = isSubsTab && !loggedIn;
  const showError = isError && !showSubsLogin && !showSkeleton;
  const showSubsEmpty = !showSkeleton && isSubsTab && loggedIn && subProviders.length === 0 && !showError;
  const showRows = !showSkeleton && !isSubsTab && shown.length > 0;
  const showEmpty = !showSkeleton && !isSubsTab && !isError && items.length === 0;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        {!isInTelegram() && <div className={styles.headerTitle}>{t.appName}</div>}
        <div className={styles.headerActions}>
          <button type="button" aria-label="Refresh" className={styles.headerBtn} onClick={onReload}>
            <span className={spinning ? styles.spin : undefined}>
              <Icon glyph="reload" size={18} color="var(--ts-hint)" />
            </span>
          </button>
          <button type="button" aria-label={t.settings} className={styles.headerBtn} onClick={() => setMenuOpen(true)}>
            <Icon glyph="menu" size={20} color="var(--ts-hint)" />
          </button>
        </div>
      </header>

      <div className={styles.scroll} ref={scrollRef} onScroll={onScroll}>
        <div className={styles.hero}>
          <span className={styles.heroLogo}>
            <TonLogo />
          </span>
          <div className={styles.heroTitle}>{t.mainTitle}</div>
          <div className={styles.heroDesc}>{t.mainDesc}</div>
        </div>

        <div className={styles.search}>
          <Icon glyph="search" size={16} color="var(--ts-hint)" />
          <input
            className={styles.searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.searchPlaceholder}
          />
          {search && (
            <button type="button" aria-label="Clear" className={styles.searchClear} onClick={() => setSearch("")}>
              <Icon glyph="close" size={16} color="var(--ts-hint)" stroke={2} />
            </button>
          )}
        </div>

        {showSubsToolbar && (
          <div className={styles.toolbar}>
            <button type="button" className={styles.toolbarBtn} onClick={() => setAlertsEnabled(!alertEnabled)}>
              {alertEnabled ? (
                <Icon glyph="bell" size={16} color="var(--ts-accent)" filled />
              ) : (
                <Icon glyph="bellOff" size={16} color="var(--ts-hint)" />
              )}
              {t.notifBtn}
            </button>
            <button type="button" className={styles.toolbarBtn} onClick={() => navigate("/alerts")}>
              <Icon glyph="sliders" size={16} />
              {t.settingsBtn}
            </button>
          </div>
        )}

        {showToolbar && (
          <div className={styles.toolbar}>
            <button type="button" className={styles.toolbarBtn} onClick={() => setSortField(sort.field)}>
              <span className={cx(styles.sortChevron, sort.dir === "asc" && styles.sortChevronUp)}>
                <Icon glyph="chevronDown" size={13} color="var(--ts-accent)" />
              </span>
              {t.sortField[sort.field]}
            </button>
            <button type="button" className={styles.toolbarBtn} onClick={() => navigate("/filters")}>
              <Icon glyph="sliders" size={16} />
              {t.filters}
              {activeFilters > 0 && <span className={styles.filterDot} />}
            </button>
          </div>
        )}

        {showCount ? (
          <div className={styles.count}>{homeCount}</div>
        ) : showSkeleton ? (
          <div className={styles.count}>{"\u00A0"}</div>
        ) : null}

        {showError && (
          <div className={styles.errorBlock}>
            <Icon glyph="close" size={42} color="var(--ts-hint)" />
            <div>
              <div className={styles.errorText}>{t.loadError}</div>
              {errorStatus !== null && <div className={styles.errorCode}>HTTP {errorStatus}</div>}
            </div>
            <button type="button" className={styles.retryBtn} onClick={onReload}>
              {t.retry}
            </button>
          </div>
        )}

        {showSubsRows && (
          <div className={styles.list}>
            {subProviders.map((provider) => (
              <ProviderRow
                key={provider.pubkey}
                provider={provider}
                onOpen={() => navigate(`/provider/${provider.pubkey}`)}
                trailing={
                  <RoundToggle
                    glyph="bell"
                    size={17}
                    active={!alertsOff.includes(provider.pubkey)}
                    ariaLabel={t.notifBtn}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleBell(provider.pubkey);
                    }}
                  />
                }
              />
            ))}
          </div>
        )}

        {showSubsEmpty && (
          <EmptyState
            glyph="bell"
            iconColor="var(--ts-star)"
            title={t.subsEmptyTitle}
            desc={t.subsEmptyDesc}
          />
        )}

        {showSubsLogin && (
          <div className={styles.loginBlock}>
            <Icon glyph="telegram" size={44} color="var(--ts-tg)" />
            <div className={styles.loginTitle}>{t.loginTg}</div>
            <div className={styles.loginDesc}>{t.loginHint}</div>
            <div className={styles.loginButtonWrap}>
              <TelegramLoginButton />
            </div>
          </div>
        )}

        {showSkeleton && (
          <div className={styles.list}>
            {Array.from({ length: skeletonCount }, (_, index) => (
              <div key={index} className={styles.skeleton}>
                <div className={styles.skHead}>
                  <span className={styles.skToggle} />
                  <span className={styles.skKey} />
                  <span className={styles.skSpacer} />
                  <span className={styles.skStatus} />
                </div>
                <div className={styles.skCells}>
                  {Array.from({ length: CELL_COUNT }, (_, cell) => (
                    <span key={cell} className={styles.skCell}>
                      <span className={styles.skLabel} />
                      <span className={styles.skValue} />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {showRows && (
          <div className={styles.list}>
            {shown.map((provider) => (
              <ProviderRow
                key={provider.pubkey}
                provider={provider}
                onOpen={() => navigate(`/provider/${provider.pubkey}`)}
                trailing={
                  <RoundToggle
                    glyph="star"
                    size={18}
                    active={favorites.includes(provider.pubkey)}
                    ariaLabel={t.fav}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleFavorite(provider.pubkey);
                    }}
                  />
                }
              />
            ))}
          </div>
        )}

        {showEmpty && (
          <EmptyState
            glyph={favTab ? "star" : "search"}
            iconColor="var(--ts-star)"
            title={favTab ? t.favEmptyTitle : t.providersNotFound}
            desc={favTab ? t.favEmptyDesc : undefined}
          />
        )}

        {!showSkeleton && !isSubsTab && items.length > visible && <LoadMore onClick={loadMore} />}

        <div className={styles.footer}>
          <div className={styles.footerLinks}>
            <a
              className={styles.footerLink}
              href="https://github.com/igroman787/mytonprovider"
              target="_blank"
              rel="noopener noreferrer"
            >
              <TonLogo size={17} disc="var(--ts-hint)" mark="var(--ts-bg)" />
              {t.becomeProvider}
            </a>
            <a
              className={styles.footerLink}
              href="https://t.me/mytonprovider_chat"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className={styles.footerMark} viewBox="0 0 240 240" width={17} height={17}>
                <circle cx="120" cy="120" r="120" fill="var(--ts-hint)" />
                <path
                  fill="var(--ts-bg)"
                  d="M53.2 118.8c34.9-15.2 58.2-25.2 69.8-30.1 33.2-13.8 40.1-16.2 44.6-16.3 1 0 3.2.2 4.7 1.4 1.2 1 1.5 2.3 1.7 3.3.2 1 .4 3.1.2 4.8-1.8 19.3-9.7 66.1-13.7 87.7-1.7 9.1-5 12.2-8.2 12.5-7 .6-12.3-4.6-19-9-10.5-6.9-16.5-11.2-26.7-17.9-11.8-7.8-4.2-12.1 2.6-19.1 1.8-1.8 32.5-29.8 33.1-32.3.1-.3.1-1.5-.6-2.1-.7-.6-1.7-.4-2.4-.2-1 .2-17.1 10.9-48.2 32-4.6 3.1-8.7 4.7-12.4 4.6-4.1-.1-11.9-2.3-17.8-4.2-7.2-2.3-12.9-3.5-12.4-7.4.3-2 3.1-4.1 8.7-6.7z"
                />
              </svg>
              {t.support}
            </a>
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label="Scroll to top"
        aria-hidden={!showTop}
        tabIndex={showTop ? 0 : -1}
        className={cx(styles.fab, showTop && styles.fabVisible)}
        onClick={scrollToTop}
      >
        <Icon glyph="arrowUp" size={22} color="#fff" />
      </button>

      <BottomNav />

      {menuOpen && <MenuSheet onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
