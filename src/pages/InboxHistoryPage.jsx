import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/inbox.module.css";

const inboxKey = (userId) => `mockInbox_${userId}`;

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export default function InboxHistoryPage() {
  const navigate = useNavigate();
  const me = useMemo(() => localStorage.getItem("mockUserId"), []);
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("all"); // all | pending | done

  useEffect(() => {
    if (!me) return;
    setItems(loadJSON(inboxKey(me), []));
  }, [me]);

  const updateCheck = (id, checked) => {
    const next = items.map((x) =>
      x.id === id ? { ...x, checked, checkedAt: checked ? new Date().toISOString() : null } : x
    );
    setItems(next);
    saveJSON(inboxKey(me), next);
  };

  const filtered =
    tab === "pending" ? items.filter((x) => !x.checked)
    : tab === "done" ? items.filter((x) => x.checked)
    : items;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>내가 받은 알림</h1>
        <div className={styles.headerRight}>
          <button className={styles.ghostButton} onClick={() => navigate("/")}>
            대시보드
          </button>
        </div>
      </header>

      <div className={styles.tabs}>
        <button className={tab === "all" ? styles.tabActive : styles.tab} onClick={() => setTab("all")}>
          전체
        </button>
        <button className={tab === "pending" ? styles.tabActive : styles.tab} onClick={() => setTab("pending")}>
          미처리
        </button>
        <button className={tab === "done" ? styles.tabActive : styles.tab} onClick={() => setTab("done")}>
          체크됨
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>표시할 알림이 없어.</div>
      ) : (
        <ul className={styles.list}>
          {filtered.map((x) => (
            <li key={x.id} className={styles.card}>
              <div className={styles.cardTop}>
                <label className={styles.checkLine}>
                  <input
                    type="checkbox"
                    checked={!!x.checked}
                    onChange={(e) => updateCheck(x.id, e.target.checked)}
                  />
                  <span className={styles.checkText}>{x.checked ? "체크됨" : "미처리"}</span>
                </label>

                <div className={styles.meta}>
                  <span className={styles.from}>from @{x.from}</span>
                  <span className={styles.time}>{x.createdAt}</span>
                </div>
              </div>

              <div className={styles.message}>{x.message}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
