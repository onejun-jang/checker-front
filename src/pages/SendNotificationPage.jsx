import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/send.module.css";
import { apiFetch } from "../api/client";
import Avatar from "../components/Avatar";
import ImageModal from "../components/ImageModal"; // ✅ 추가

export default function SendNotificationPage() {
  const navigate = useNavigate();
  const me = useMemo(() => localStorage.getItem("mockUserId"), []);

  const [friends, setFriends] = useState([]);
  const [toUserId, setToUserId] = useState(""); // 기본은 선택 안 함
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSrc, setModalSrc] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  const openModal = (src, title) => {
    if (!src) return;
    setModalSrc(src);
    setModalTitle(title || "");
    setModalOpen(true);
  };

  const loadFriends = async () => {
    if (!me) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const data = await apiFetch("/api/friends");
      const list = Array.isArray(data) ? data : [];
      setFriends(list);

      // 자동 선택 안 함
      setToUserId("");
    } catch (e) {
      console.error(e);
      setError(e?.message || "친구 목록을 불러오지 못했습니다.");
      setFriends([]);
      setToUserId("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  const selectedFriend = friends.find(
    (f) => String(f.friendUserId) === String(toUserId)
  );

  const handleSend = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!toUserId) {
      setError("받는 사람을 선택해줘.");
      return;
    }

    const trimmed = message.trim();
    if (!trimmed) {
      setError("내용을 입력해줘.");
      return;
    }

    try {
      setSending(true);

      await apiFetch("/api/notifications", {
        method: "POST",
        body: {
          toUserId: Number(toUserId),
          message: trimmed,
        },
      });

      setSuccess("전송이 완료되었습니다.");
      setMessage("");
    } catch (e) {
      console.error(e);
      setError(e?.message || "전송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  };

  const friendCount = friends.length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>새 알림 보내기</h1>
        <div className={styles.headerRight}>
          <button className={styles.ghostButton} onClick={() => navigate("/")}>
            대시보드
          </button>
        </div>
      </header>

      {loading ? (
        <div className={styles.empty}>친구 목록 불러오는 중...</div>
      ) : null}

      {!loading && friendCount === 0 ? (
        <div className={styles.empty}>
          친구가 없어서 보낼 수 없어.{" "}
          <button
            className={styles.linkButton}
            onClick={() => navigate("/friends")}
          >
            친구 추가
          </button>
          를 먼저 해줘.
        </div>
      ) : null}

      {!loading && friendCount > 0 ? (
        <form className={styles.form} onSubmit={handleSend}>
          <div className={styles.field}>
            <label className={styles.label}>받는 사람 (친구)</label>
            <select
              className={styles.select}
              value={toUserId}
              onChange={(e) => {
                setToUserId(e.target.value);
                setError("");
                setSuccess("");
              }}
              disabled={sending}
            >
              <option value="">- 선택 -</option>

              {friends.map((f) => (
                <option key={f.friendUserId} value={String(f.friendUserId)}>
                  {f.friendDisplayName}
                </option>
              ))}
            </select>

            {/* ✅ 선택된 친구 미리보기 + 클릭 확대 */}
            {selectedFriend ? (
              <div className={styles.selectedRow}>
                <button
                  type="button"
                  className={styles.avatarButton}
                  onClick={() =>
                    openModal(
                      selectedFriend.friendProfileImageUrl,
                      selectedFriend.friendDisplayName
                    )
                  }
                  disabled={!selectedFriend.friendProfileImageUrl}
                  aria-label="open profile"
                >
                  <Avatar
                    src={selectedFriend.friendProfileImageUrl}
                    size={32}
                  />
                </button>

                <div className={styles.selectedName}>
                  {selectedFriend.friendDisplayName}
                </div>
              </div>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>내용 (Ctrl+Enter시 전송)</label>
            <textarea
              className={styles.textarea}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="예: 확인 부탁! 체크해줘."
              rows={6}
              disabled={sending}
            />
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}
          {success ? (
            <div className={styles.success} role="status" aria-live="polite">
              {success}
            </div>
          ) : null}

          <button className={styles.primaryButton} type="submit" disabled={sending}>
            {sending ? "전송 중..." : "전송"}
          </button>
        </form>
      ) : null}

      {/* ✅ 모달 */}
      <ImageModal
        open={modalOpen}
        src={modalSrc}
        title={modalTitle}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
