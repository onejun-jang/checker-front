import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/send.module.css";
import { apiFetch } from "../api/client";

export default function SendNotificationPage() {
  const navigate = useNavigate();
  const me = useMemo(() => localStorage.getItem("mockUserId"), []);

  const [friends, setFriends] = useState([]); // Friend 목록(서버)
  const [toUserId, setToUserId] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadFriends = async () => {
    if (!me) return;

    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/api/friends");
      const list = Array.isArray(data) ? data : [];
      setFriends(list);

      // 드롭다운 초기 선택값: 첫 친구의 friendUserId
      if (list.length > 0) {
        setToUserId(String(list[0].friendUserId));
      } else {
        setToUserId("");
      }
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

  const handleSend = async (e) => {
    e.preventDefault();
    setError("");

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
        body: JSON.stringify({
          toUserId: Number(toUserId), // 서버가 Long이면 숫자로 보내는 게 깔끔
          message: trimmed,
        }),
      });

      // 전송 성공 → sent로 이동
      navigate("/sent");
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

      {loading ? <div className={styles.empty}>친구 목록 불러오는 중...</div> : null}

      {!loading && friendCount === 0 ? (
        <div className={styles.empty}>
          친구가 없어서 보낼 수 없어.{" "}
          <button className={styles.linkButton} onClick={() => navigate("/friends")}>
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
              onChange={(e) => setToUserId(e.target.value)}
              disabled={sending}
            >
              {friends.map((f) => (
                <option key={f.id} value={String(f.friendUserId)}>
                  userId: {f.friendUserId}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>내용</label>
            <textarea
              className={styles.textarea}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="예: 확인 부탁! 체크해줘."
              rows={6}
              disabled={sending}
            />
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

          <button className={styles.primaryButton} type="submit" disabled={sending}>
            {sending ? "전송 중..." : "전송"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
