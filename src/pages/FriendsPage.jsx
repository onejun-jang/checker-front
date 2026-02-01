import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/friends.module.css";
import { apiFetch } from "../api/client";

export default function FriendsPage() {
  const navigate = useNavigate();
  const me = useMemo(() => localStorage.getItem("mockUserId"), []);

  const [friends, setFriends] = useState([]); // Friend 엔티티 리스트
  const [friendUserId, setFriendUserId] = useState(""); // 추가할 친구 id 입력
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadFriends = async () => {
    if (!me) return;

    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/api/friends");
      setFriends(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError(e?.message || "친구 목록을 불러오지 못했습니다.");
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");

    const idStr = friendUserId.trim();
    if (!idStr) {
      setError("친구 ID를 입력해줘.");
      return;
    }
    if (!/^\d+$/.test(idStr)) {
      setError("친구 ID는 숫자만 입력해줘.");
      return;
    }
    if (String(me) === idStr) {
      setError("자기 자신은 친구로 추가할 수 없어.");
      return;
    }

    try {
      setBusy(true);
      await apiFetch("/api/friends", {
        method: "POST",
        body: JSON.stringify({ friendUserId: Number(idStr) }),
      });
      setFriendUserId("");
      await loadFriends();
    } catch (e) {
      console.error(e);
      setError(e?.message || "친구 추가에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id) => {
    try {
      setBusy(true);
      await apiFetch(`/api/friends/${id}`, { method: "DELETE" });
      await loadFriends();
    } catch (e) {
      console.error(e);
      alert(e?.message || "삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Friends</h1>
          <div className={styles.subTitle}>로그인: {me ?? "-"}</div>
        </div>

        <div className={styles.headerRight}>
          <button className={styles.ghostButton} onClick={() => navigate("/")}>
            대시보드
          </button>
        </div>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>친구 추가</h2>

        <form className={styles.form} onSubmit={handleAdd}>
          <div className={styles.field}>
            <label className={styles.label}>친구 User ID (숫자)</label>
            <input
              className={styles.input}
              value={friendUserId}
              onChange={(e) => setFriendUserId(e.target.value)}
              placeholder="예: 2"
              disabled={busy}
            />
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

          <button className={styles.primaryButton} type="submit" disabled={busy}>
            {busy ? "처리 중..." : "추가"}
          </button>
        </form>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>친구 목록</h2>
          <div className={styles.badge}>{friends.length}</div>
        </div>

        {loading ? <div className={styles.empty}>불러오는 중...</div> : null}

        {!loading && friends.length === 0 ? (
          <div className={styles.empty}>아직 친구가 없어.</div>
        ) : (
          <ul className={styles.list}>
            {friends.map((f) => (
              <li key={f.id} className={styles.card}>
                <div className={styles.friendLeft}>
                  <div className={styles.friendName}>친구 ID: {f.friendUserId}</div>
                  <div className={styles.friendId}>added: {f.createdAt}</div>
                </div>

                <button
                  className={styles.dangerButton}
                  onClick={() => handleRemove(f.friendUserId)}
                  disabled={busy}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
