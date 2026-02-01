import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/dashboard.module.css";
import { apiFetch } from "../api/client";

export default function Dashboard() {
  const navigate = useNavigate();
  const me = useMemo(() => localStorage.getItem("mockUserId"), []);

  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadInbox = async () => {
    if (!me) return;

    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/api/notifications/inbox");
      setInbox(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError(e?.message || "알림을 불러오지 못했습니다.");
      setInbox([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  const handleLogout = () => {
    localStorage.removeItem("mockUserId");
    navigate("/login", { replace: true });
  };

  const handleCheck = async (itemId, nextChecked) => {
    try {
      await apiFetch(`/api/notifications/${itemId}/check`, {
        method: "PATCH",
        body: JSON.stringify({ checked: nextChecked }),
      });

      // 가장 확실한 방식: 다시 불러오기 (체크하면 아래로 내려감)
      await loadInbox();
    } catch (e) {
      console.error(e);
      alert(e?.message || "체크 처리에 실패했습니다.");
    }
  };

  // 서버 응답 필드명 기준: checked(boolean)
  const incoming = inbox.filter((x) => !x.checked);
  const history = inbox.filter((x) => x.checked);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <div className={styles.subTitle}>로그인: {me ?? "-"}</div>
        </div>

        <div className={styles.headerRight}>
          <button className={styles.ghostButton} onClick={() => navigate("/friends")}>
            친구
          </button>
          <button className={styles.primaryButton} onClick={() => navigate("/send")}>
            새 알림 보내기
          </button>
          <button className={styles.logoutButton} onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <section className={styles.quickActions}>
        <button className={styles.actionCard} onClick={() => navigate("/friends")}>
          <div className={styles.actionTitle}>친구추가</div>
          <div className={styles.actionDesc}>추가된 친구에게만 알림 전송</div>
        </button>

        <button className={styles.actionCard} onClick={() => navigate("/send")}>
          <div className={styles.actionTitle}>새 알림 보내기</div>
          <div className={styles.actionDesc}>작성 화면으로 이동</div>
        </button>

        <button className={styles.actionCard} onClick={() => navigate("/sent")}>
          <div className={styles.actionTitle}>내가 보낸 알림</div>
          <div className={styles.actionDesc}>전송 이력 확인</div>
        </button>

        <button className={styles.actionCard} onClick={() => navigate("/inbox")}>
          <div className={styles.actionTitle}>내가 받은 알림</div>
          <div className={styles.actionDesc}>수신 이력 확인</div>
        </button>
      </section>

      {/* 상태 표시 */}
      {loading ? <div className={styles.empty}>불러오는 중...</div> : null}
      {error ? <div className={styles.empty}>{error}</div> : null}

      {/* ✅ 가장 눈에 띄는 곳: 미처리 알림 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>나한테 온 알림</h2>
          <div className={styles.badge}>{incoming.length}</div>
        </div>

        {!loading && !error && incoming.length === 0 ? (
          <div className={styles.empty}>새로 온 알림이 없어.</div>
        ) : (
          <ul className={styles.list}>
            {incoming.map((item) => (
              <li key={item.id} className={styles.card}>
                <label className={styles.cardRow}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={false}
                    onChange={(e) => handleCheck(item.id, e.target.checked)}
                  />
                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}>
                      {/* ✅ 서버 필드명 기준: fromUserId, createdAt */}
                      <span className={styles.from}>from @{item.fromUserId}</span>
                      <span className={styles.time}>{item.createdAt}</span>
                    </div>
                    <div className={styles.message}>{item.message}</div>
                  </div>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ✅ 체크한 건 아래로 내려간 것처럼 표시 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>받은 알림 이력 (체크됨)</h2>
          <div className={styles.badgeMuted}>{history.length}</div>
        </div>

        {!loading && !error && history.length === 0 ? (
          <div className={styles.empty}>아직 체크한 알림이 없어.</div>
        ) : (
          <ul className={styles.list}>
            {history.map((item) => (
              <li key={item.id} className={styles.cardMuted}>
                <div className={styles.cardMeta}>
                  <span className={styles.from}>from @{item.fromUserId}</span>
                  <span className={styles.time}>{item.createdAt}</span>
                </div>
                <div className={styles.message}>{item.message}</div>

                <button
                  className={styles.ghostButtonSmall}
                  onClick={() => handleCheck(item.id, false)}
                >
                  체크 해제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
