import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/dashboard.module.css";
import { apiFetch } from "../api/client";
import Avatar from "../components/Avatar";
import ImageModal from "../components/ImageModal";

export default function Dashboard() {
  const navigate = useNavigate();
  const me = useMemo(() => localStorage.getItem("mockUserId"), []);

  const [displayName, setDisplayName] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");

  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // ✅ 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSrc, setModalSrc] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  const openModal = (src, title) => {
    if (!src) return; // ✅ 디폴트(업로드 없음)면 모달 금지
    setModalSrc(src);
    setModalTitle(title || "");
    setModalOpen(true);
  };

  const loadMe = async () => {
    if (!me) return;
    try {
      const data = await apiFetch("/api/users/me");
      setDisplayName(data?.displayName ?? "");
      setProfileImageUrl(data?.profileImageUrl ?? "");
    } catch (e) {
      console.error(e);
      setDisplayName("");
      setProfileImageUrl("");
    }
  };

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
    loadMe();
    loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  const handleLogout = () => {
    localStorage.removeItem("mockUserId");
    navigate("/login", { replace: true });
  };

  // ✅ 체크는 "한 번만" (body 없음)
  const handleCheck = async (itemId) => {
    try {
      setBusy(true);
      await apiFetch(`/api/notifications/${itemId}/check`, {
        method: "PATCH",
      });
      await loadInbox();
    } catch (e) {
      console.error(e);
      alert(e?.message || "체크 처리에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  // ✅ checkedAt으로 판단
  const incoming = inbox.filter((x) => !x.checkedAt);
  const history = inbox.filter((x) => !!x.checkedAt);

  const headerTitle = displayName ? displayName : "Dashboard";

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          {/* ✅ displayName + 아바타(클릭 시 확대) */}
          <div className={styles.titleRow}>
            <button
              type="button"
              className={styles.avatarButton}
              onClick={() => openModal(profileImageUrl, headerTitle)}
              disabled={!profileImageUrl}
              aria-label="open my profile"
            >
              <Avatar src={profileImageUrl} size={32} />
            </button>

            <h1 className={styles.title}>{headerTitle}</h1>
          </div>
        </div>

        <div className={styles.headerRight}>
          <button
            className={styles.ghostButton}
            onClick={() => navigate("/friends")}
          >
            친구
          </button>

          <button
            className={styles.ghostButton}
            onClick={() => navigate("/settings")}
          >
            설정
          </button>

          <button
            className={styles.primaryButton}
            onClick={() => navigate("/send")}
          >
            새 알림 보내기
          </button>

          <button className={styles.logoutButton} onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <section className={styles.quickActions}>
        <button
          className={styles.actionCard}
          onClick={() => navigate("/friends")}
        >
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

        <button
          className={styles.actionCard}
          onClick={() => navigate("/inbox")}
        >
          <div className={styles.actionTitle}>내가 받은 알림</div>
          <div className={styles.actionDesc}>수신 이력 확인</div>
        </button>

        <button
          className={styles.actionCard}
          onClick={() => navigate("/settings")}
        >
          <div className={styles.actionTitle}>설정</div>
          <div className={styles.actionDesc}>표시 이름/프로필 사진 변경</div>
        </button>
      </section>

      {/* 상태 표시 */}
      {loading ? <div className={styles.empty}>불러오는 중...</div> : null}
      {error ? <div className={styles.empty}>{error}</div> : null}

      {/* ✅ 미처리 알림 */}
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
                    disabled={busy}
                    onChange={() => handleCheck(item.id)}
                  />
                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}>
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

      {/* ✅ 체크된 알림 이력 */}
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
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ✅ 내 아바타 확대 모달 */}
      <ImageModal
        open={modalOpen}
        src={modalSrc}
        title={modalTitle}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
