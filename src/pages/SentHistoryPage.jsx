import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/sent.module.css";
import { apiFetch } from "../api/client";
import Avatar from "../components/Avatar";
import ImageModal from "../components/ImageModal";

function formatTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString("ja-JP");
  } catch {}
  return iso;
}

export default function SendHistoryPage() {
  const navigate = useNavigate();
  const me = useMemo(() => localStorage.getItem("mockUserId"), []);

  const [sent, setSent] = useState([]);
  const [userMap, setUserMap] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalSrc, setModalSrc] = useState("");

  // ✅ MULTI 상세
  const [expandedId, setExpandedId] = useState(null);
  const [detailMap, setDetailMap] = useState({});
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [detailErrorMap, setDetailErrorMap] = useState({});

  const openModal = (src) => {
    if (!src) return;
    setModalSrc(src);
    setModalOpen(true);
  };

  const loadSent = useCallback(async () => {
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
  }, [me]);

  const loadUsers = useCallback(async (list) => {
    const ids = Array.from(new Set(list.map((x) => x.toUserId).filter(Boolean)));
    if (ids.length === 0) return;

    try {
      const users = await apiFetch("/api/users");
      const map = {};
      users.forEach((u) => {
        map[u.id] = {
          displayName: u.displayName,
          profileImageUrl: u.profileImageUrl,
        };
      });
      setUserMap(map);
    } catch (e) {
      console.warn("user load failed", e);
    }
  }, []);

  const loadDetail = useCallback(async (notificationId) => {
    try {
      setDetailLoadingId(notificationId);
      setDetailErrorMap((prev) => ({ ...prev, [notificationId]: "" }));

      const d = await apiFetch(`/api/notifications/${notificationId}`);

      setDetailMap((prev) => ({
        ...prev,
        [notificationId]: d,
      }));

      return d;
    } catch (e) {
      console.error(e);
      setDetailErrorMap((prev) => ({
        ...prev,
        [notificationId]: e?.message || "상세를 불러오지 못했습니다.",
      }));
      return null;
    } finally {
      setDetailLoadingId((current) => (current === notificationId ? null : current));
    }
  }, []);

  useEffect(() => {
    loadSent();
  }, [loadSent]);

  useEffect(() => {
    if (sent.length > 0) {
      loadUsers(sent);
    }
  }, [sent, loadUsers]);

  const renderExpandedDetail = (notificationId) => {
    const detail = detailMap[notificationId];
    const isLoading = detailLoadingId === notificationId;
    const detailError = detailErrorMap[notificationId];

    return (
      <div className={styles.inlineDetailBox}>
        {isLoading ? <div className={styles.empty}>불러오는 중...</div> : null}
        {!isLoading && detailError ? <div className={styles.empty}>{detailError}</div> : null}

        {!isLoading && !detailError && detail ? (
          <>
            {Array.isArray(detail.items) && detail.items.length > 0 ? (
              <div className={styles.inlineMultiList}>
                {detail.items.map((it) => {
                  const checked = !!it.checkedAt;

                  return (
                    <label key={it.id} className={styles.inlineMultiRow}>
                      <input type="checkbox" checked={checked} disabled readOnly />
                      <div className={styles.inlineMultiTextWrap}>
                        <div
                          className={
                            checked ? styles.inlineMultiTextChecked : styles.inlineMultiText
                          }
                        >
                          {it.text}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className={styles.empty}>항목이 없습니다.</div>
            )}

            <div className={styles.inlineDetailActions}>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => setExpandedId(null)}
              >
                閉じる
              </button>
            </div>
          </>
        ) : null}
      </div>
    );
  };

  const renderSentCard = (item) => {
    const user = userMap[item.toUserId];
    const displayName = user?.displayName ?? `user#${item.toUserId}`;
    const profileImageUrl = user?.profileImageUrl ?? "";
    const isExpanded = expandedId === item.id;

    const handleOpenDetail = async () => {
      const cached = detailMap[item.id];

      if (cached && String(cached.kind) === "MULTI") {
        setExpandedId((prev) => (prev === item.id ? null : item.id));
        return;
      }

      const d = await loadDetail(item.id);
      if (d && String(d.kind) === "MULTI") {
        setExpandedId((prev) => (prev === item.id ? null : item.id));
      }
    };

    return (
      <li key={item.id} className={styles.cardBlock}>
        <div
          className={styles.card}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          onClick={handleOpenDetail}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              await handleOpenDetail();
            }
          }}
        >
          <div className={styles.cardMeta}>
            <div className={styles.userBlock}>
              <button
                type="button"
                className={styles.avatarButton}
                onClick={(e) => {
                  e.stopPropagation();
                  openModal(profileImageUrl);
                }}
                disabled={!profileImageUrl}
                aria-label="open profile"
              >
                <Avatar src={profileImageUrl} size={24} />
              </button>

              <span className={styles.to}>{displayName}</span>
            </div>

            <span className={styles.time}>{formatTime(item.createdAt)}</span>
          </div>

          <div className={styles.message}>{item.message}</div>

          <div className={styles.status}>
            {item.checkedAt ? `確認(${formatTime(item.checkedAt)})` : ""}
          </div>
        </div>

        {isExpanded ? renderExpandedDetail(item.id) : null}
      </li>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>送信履歴</h1>

        <div className={styles.headerRight}>
          <button className={styles.ghostButton} onClick={() => navigate("/")}>
            戻る
          </button>
        </div>
      </header>

      {loading && <div className={styles.empty}>불러오는 중...</div>}
      {error && <div className={styles.empty}>{error}</div>}

      {!loading && !error && sent.length === 0 ? (
        <div className={styles.empty}>아직 보낸 알림이 없어.</div>
      ) : (
        <ul className={styles.list}>{sent.map((item) => renderSentCard(item))}</ul>
      )}

      <ImageModal open={modalOpen} src={modalSrc} onClose={() => setModalOpen(false)} />
    </div>
  );
}