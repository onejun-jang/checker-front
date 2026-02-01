import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/sent.module.css";
import { apiFetch } from "../api/client";

export default function SentHistoryPage() {
  const navigate = useNavigate();
  const me = useMemo(() => localStorage.getItem("mockUserId"), []);

  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSent = async () => {
    if (!me) return;

    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/api/notifications/sent");
      setSent(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError(e?.message || "보낸 알림을 불러오지 못했습니다.");
      setSent([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>내가 보낸 알림</h1>
        <div className={styles.headerRight}>
          <button className={styles.ghostButton} onClick={() => navigate("/")}>
            대시보드
          </button>
          <button className={styles.primaryButton} onClick={() => navigate("/send")}>
            새 알림
          </button>
        </div>
      </header>

      {loading ? <div className={styles.empty}>불러오는 중...</div> : null}
      {error ? <div className={styles.empty}>{error}</div> : null}

      {!loading && !error && sent.length === 0 ? (
        <div className={styles.empty}>아직 보낸 알림이 없어.</div>
      ) : (
        <ul className={styles.list}>
          {sent.map((s) => (
            <li key={s.id} className={styles.card}>
              <div className={styles.meta}>
                {/* 서버 필드명 기준: toUserId, createdAt */}
                <span className={styles.to}>to @{s.toUserId}</span>
                <span className={styles.time}>{s.createdAt}</span>
              </div>

              <div className={styles.message}>{s.message}</div>

              {/* 체크 상태는 "상대방이 체크했는지"인데
                  MVP에선 sent 쪽에서 굳이 보여주지 않아도 됨.
                  만약 서버가 checked를 같이 내려주면 아래처럼 표시 가능 */}
              {"checked" in s ? (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                  상태: {s.checked ? "체크됨" : "미처리"}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
