import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/friends.module.css";
import { apiFetch } from "../api/client";
import Avatar from "../components/Avatar";
import ImageModal from "../components/ImageModal";

export default function FriendsPage() {
  const navigate = useNavigate();
  const me = useMemo(() => localStorage.getItem("mockUserId"), []);

  const [friends, setFriends] = useState([]);

  // 검색용 ID 입력
  const [searchIdInput, setSearchIdInput] = useState("");

  // null | { exists: boolean, userId: number|null, searchId: string, displayName: string|null, profileImageUrl?: string|null }
  const [lookupResult, setLookupResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSrc, setModalSrc] = useState("");

  const openModal = (src) => {
    if (!src) return; // 사진 없으면 아무것도 안 함
    setModalSrc(src);
    setModalOpen(true);
  };

  const loadFriends = async () => {
    if (!me) return;

    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/api/friends");
      setFriends(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError(e?.message || "友達一覧を取得できませんでした。");
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  const validateSearchId = (value) => {
    const v = (value ?? "").trim();
    if (!v) return "検索用IDを入力してください。";
    if (!/^[a-zA-Z0-9]{3,20}$/.test(v)) {
      return "検索用IDは英数字のみ、3〜20文字で入力してください。";
    }
    return "";
  };

  // 1) 검색
  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");

    const q = searchIdInput.trim();
    const msg = validateSearchId(q);
    if (msg) {
      setLookupResult(null);
      setError(msg);
      return;
    }

    try {
      setBusy(true);
      setLookupResult(null);

      const lookup = await apiFetch(
        `/api/users/lookup?searchId=${encodeURIComponent(q)}`
      );

      if (!lookup?.exists || !lookup?.userId) {
        setLookupResult({
          exists: false,
          userId: null,
          searchId: q,
          displayName: null,
          profileImageUrl: null,
        });
        return;
      }

      if (String(me) === String(lookup.userId)) {
        setLookupResult(null);
        setError("自分自身は追加できません。");
        return;
      }

      setLookupResult({
        exists: true,
        userId: lookup.userId,
        searchId: q,
        displayName: lookup.displayName,
        profileImageUrl: lookup.profileImageUrl ?? null,
      });
    } catch (e2) {
      console.error(e2);
      setLookupResult(null);
      setError(e2?.message || "検索に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  // 2) 추가
  const handleAddFoundUser = async () => {
    setError("");

    if (!lookupResult?.exists || !lookupResult.userId) {
      setError("追加するユーザーが選択されていません。まず検索してください。");
      return;
    }

    try {
      setBusy(true);

      await apiFetch("/api/friends", {
        method: "POST",
        body: { friendUserId: Number(lookupResult.userId) },
      });

      setSearchIdInput("");
      setLookupResult(null);
      await loadFriends();
    } catch (e) {
      console.error(e);
      setError(e?.message || "友達追加に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (friendUserId) => {
    try {
      setBusy(true);
      await apiFetch(`/api/friends/${friendUserId}`, { method: "DELETE" });
      await loadFriends();
    } catch (e) {
      console.error(e);
      alert(e?.message || "削除に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>友達管理</h1>
        </div>

        <div className={styles.headerRight}>
          <button className={styles.ghostButton} onClick={() => navigate("/")}>
            戻る
          </button>
        </div>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>友達追加</h2>

        <form className={styles.form} onSubmit={handleSearch}>
          <div className={styles.field}>
            <label className={styles.label}>検索用ID</label>
            <input
              className={styles.input}
              value={searchIdInput}
              onChange={(e) => {
                setSearchIdInput(e.target.value);
                setLookupResult(null);
              }}
              placeholder="IDを入力してください"
              disabled={busy}
            />
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

          <button className={styles.primaryButton} type="submit" disabled={busy}>
            {busy ? "検索中..." : "検索"}
          </button>
        </form>

        {lookupResult ? (
          <div style={{ marginTop: 12 }}>
            {lookupResult.exists ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    type="button"
                    style={{
                      border: 0,
                      background: "transparent",
                      padding: 0,
                      cursor: lookupResult.profileImageUrl ? "pointer" : "default",
                      lineHeight: 0,
                    }}
                    onClick={() =>
                      openModal(lookupResult.profileImageUrl)
                    }
                    disabled={!lookupResult.profileImageUrl}
                  >
                    <Avatar src={lookupResult.profileImageUrl} size={28} />
                  </button>

                  <div style={{ fontWeight: 600 }}>
                    {lookupResult.displayName}
                  </div>
                </div>

                <button
                  className={styles.primaryButton}
                  onClick={handleAddFoundUser}
                  disabled={busy}
                  type="button"
                >
                  {busy ? "処理中..." : "追加"}
                </button>
              </div>
            ) : (
              <div style={{ fontWeight: 600 }}>該当するIDは存在しません。</div>
            )}
          </div>
        ) : null}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>友達一覧</h2>
          <div className={styles.badge}>{friends.length}</div>
        </div>

        {loading ? <div className={styles.empty}>読み込み中...</div> : null}

        {!loading && friends.length === 0 ? (
          <div className={styles.empty}>まだ友達がいません。</div>
        ) : (
          <ul className={styles.list}>
            {friends.map((f) => (
              <li key={f.friendUserId} className={styles.card}>
                <div
                  className={styles.friendLeft}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <button
                    type="button"
                    style={{
                      border: 0,
                      background: "transparent",
                      padding: 0,
                      cursor: f.friendProfileImageUrl ? "pointer" : "default",
                      lineHeight: 0,
                    }}
                    onClick={() => openModal(f.friendProfileImageUrl)}
                    disabled={!f.friendProfileImageUrl}
                  >
                    <Avatar src={f.friendProfileImageUrl} size={28} />
                  </button>

                  <div className={styles.friendName}>{f.friendDisplayName}</div>
                </div>

                <button
                  className={styles.dangerButton}
                  onClick={() => handleRemove(f.friendUserId)}
                  disabled={busy}
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ImageModal
        open={modalOpen}
        src={modalSrc}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
