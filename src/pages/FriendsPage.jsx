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
  const [modalTitle, setModalTitle] = useState("");

  const openModal = (src, title) => {
    if (!src) return; // 사진 없으면 아무것도 안 함
    setModalSrc(src);
    setModalTitle(title || "");
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

  const validateSearchId = (value) => {
    const v = (value ?? "").trim();
    if (!v) return "검색용 ID를 입력해줘.";
    if (!/^[a-zA-Z0-9]{3,20}$/.test(v)) {
      return "검색용 ID는 영문과 숫자만, 3~20자로 입력해줘.";
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
      // lookup: { exists: boolean, userId: number|null, displayName: string|null, profileImageUrl?: string|null }

      // ✅ 검색 결과 없음
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

      // ✅ 자기 자신 방지
      if (String(me) === String(lookup.userId)) {
        setLookupResult(null);
        setError("자기 자신은 친구로 추가할 수 없어.");
        return;
      }

      // ✅ 검색 결과 있음
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
      setError(e2?.message || "검색에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  // 2) 추가
  const handleAddFoundUser = async () => {
    setError("");

    if (!lookupResult?.exists || !lookupResult.userId) {
      setError("추가할 유저가 선택되지 않았어. 먼저 검색해줘.");
      return;
    }

    try {
      setBusy(true);

      await apiFetch("/api/friends", {
        method: "POST",
        body: { friendUserId: Number(lookupResult.userId) }, // apiFetch가 JSON stringify 처리
      });

      setSearchIdInput("");
      setLookupResult(null);
      await loadFriends();
    } catch (e) {
      console.error(e);
      setError(e?.message || "친구 추가에 실패했습니다.");
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
      alert(e?.message || "삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>친구관리</h1>
        </div>

        <div className={styles.headerRight}>
          <button className={styles.ghostButton} onClick={() => navigate("/")}>
            대시보드
          </button>
        </div>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>친구추가</h2>

        <form className={styles.form} onSubmit={handleSearch}>
          <div className={styles.field}>
            <label className={styles.label}>검색용 ID</label>
            <input
              className={styles.input}
              value={searchIdInput}
              onChange={(e) => {
                setSearchIdInput(e.target.value);
                setLookupResult(null);
              }}
              placeholder="ID를 입력해주세요"
              disabled={busy}
            />
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

          <button className={styles.primaryButton} type="submit" disabled={busy}>
            {busy ? "검색 중..." : "검색"}
          </button>
        </form>

        {/* 검색 결과 */}
        {lookupResult ? (
          <div style={{ marginTop: 12 }}>
            {lookupResult.exists ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
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
                      openModal(lookupResult.profileImageUrl, lookupResult.displayName)
                    }
                    disabled={!lookupResult.profileImageUrl}
                    aria-label="open profile"
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
                  {busy ? "처리 중..." : "추가"}
                </button>
              </div>
            ) : (
              <div style={{ fontWeight: 600 }}>해당ID가 없습니다</div>
            )}
          </div>
        ) : null}
      </section>

      {/* 친구 목록 */}
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
                    onClick={() => openModal(f.friendProfileImageUrl, f.friendDisplayName)}
                    disabled={!f.friendProfileImageUrl}
                    aria-label="open profile"
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
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ImageModal
        open={modalOpen}
        src={modalSrc}
        title={modalTitle}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
