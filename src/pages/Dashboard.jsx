// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/dashboard.module.css";
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

function makeId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const me = useMemo(() => localStorage.getItem("mockUserId"), []);

  const [displayName, setDisplayName] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");

  const [inbox, setInbox] = useState([]);
  const [userMap, setUserMap] = useState({}); // fromUserId -> { displayName, profileImageUrl }

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // ✅ 이미지 모달
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSrc, setModalSrc] = useState("");

  // ✅ 확인 모달(체크 컨펌)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTargetId, setConfirmTargetId] = useState(null);
  const [confirmTargetName, setConfirmTargetName] = useState("");
  const [confirmTargetMessage, setConfirmTargetMessage] = useState("");
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [savingSkipConfirm, setSavingSkipConfirm] = useState(false);

  // =========================
  // ✅ 대시보드 인라인 알림 작성(Composer)
  // =========================
  const [showComposer, setShowComposer] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const [toUserId, setToUserId] = useState("");
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const [composerError, setComposerError] = useState("");
  const [composerSuccess, setComposerSuccess] = useState("");

  // ✅ 계속 작성 모드(송신 후 창 유지)
  const [keepComposerOpen, setKeepComposerOpen] = useState(false);

  // =========================
  // ✅ SIMPLE / MULTI 선택 + MULTI 입력들 + MULTI 제목
  // =========================
  const [sendKind, setSendKind] = useState("SIMPLE"); // "SIMPLE" | "MULTI"
  const [multiTitle, setMultiTitle] = useState("");
  const [multiItems, setMultiItems] = useState([{ id: makeId(), text: "" }]);

  const addMultiItem = useCallback(() => {
    setMultiItems((prev) => [...prev, { id: makeId(), text: "" }]);
  }, []);

  const removeMultiItem = useCallback((id) => {
    setMultiItems((prev) => {
      const next = prev.filter((x) => x.id !== id);
      return next.length > 0 ? next : [{ id: makeId(), text: "" }];
    });
  }, []);

  const updateMultiItem = useCallback((id, text) => {
    setMultiItems((prev) => prev.map((x) => (x.id === id ? { ...x, text } : x)));
  }, []);

  // =========================
  // ✅ 더보기 드롭다운
  // =========================
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // =========================
  // ✅ MULTI 인라인 확장 상세
  // =========================
  const [expandedId, setExpandedId] = useState(null);
  const [detailMap, setDetailMap] = useState({});
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [detailErrorMap, setDetailErrorMap] = useState({});
  const [submitLoadingId, setSubmitLoadingId] = useState(null);

  const openModal = (src) => {
    if (!src) return;
    setModalSrc(src);
    setModalOpen(true);
  };

  const openConfirm = (item, fromName) => {
    setConfirmTargetId(item.id);
    setConfirmTargetName(fromName || "");
    setConfirmTargetMessage(item?.message || "");
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setConfirmTargetId(null);
    setConfirmTargetName("");
    setConfirmTargetMessage("");
  };

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (e) => {
      const el = menuRef.current;
      if (!el) return;
      if (!el.contains(e.target)) closeMenu();
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeMenu();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, closeMenu]);

  const loadMe = useCallback(async () => {
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
  }, [me]);

  const loadSettings = useCallback(async () => {
    if (!me) return;
    try {
      const s = await apiFetch("/api/users/me/settings");
      setSkipConfirm(!!s?.skipConfirm);
    } catch {
      setSkipConfirm(false);
    }
  }, [me]);

  const saveSkipConfirm = useCallback(
    async (next) => {
      if (!me) return;

      try {
        setSavingSkipConfirm(true);
        await apiFetch("/api/users/me/settings", {
          method: "PATCH",
          body: { skipConfirm: next },
        });
        setSkipConfirm(next);
      } catch (e) {
        console.error(e);
        alert(e?.message || "設定の保存に失敗しました。");
      } finally {
        setSavingSkipConfirm(false);
      }
    },
    [me],
  );

  const loadInbox = useCallback(async () => {
    if (!me) return;
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/api/notifications/inbox");
      setInbox(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError(e?.message || "通知を取得できませんでした。");
      setInbox([]);
    } finally {
      setLoading(false);
    }
  }, [me]);

  const loadUsersForInbox = useCallback(async (list) => {
    const ids = Array.from(new Set(list.map((x) => x.fromUserId).filter(Boolean)));
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

  const loadFriends = useCallback(async () => {
    if (!me) return;

    try {
      setFriendsLoading(true);
      const data = await apiFetch("/api/friends");
      const friendList = Array.isArray(data) ? data : [];

      const meData = await apiFetch("/api/users/me");
      const myselfOption = {
        friendUserId: meData.id,
        friendDisplayName: `${meData.displayName} (自分)`,
        friendProfileImageUrl: meData.profileImageUrl,
      };

      setFriends([myselfOption, ...friendList]);
    } catch (e) {
      console.error(e);
      setFriends([]);
    } finally {
      setFriendsLoading(false);
    }
  }, [me]);

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
        [notificationId]: e?.message || "詳細を取得できませんでした。",
      }));
      return null;
    } finally {
      setDetailLoadingId((current) => (current === notificationId ? null : current));
    }
  }, []);

  // ✅ item.checkedAt 즉시 토글
  const toggleMultiItem = useCallback(
    async (notificationId, itemId) => {
      const detail = detailMap[notificationId];
      if (detail?.checkedAt) return;

      try {
        setBusy(true);

        const d = await apiFetch(`/api/notifications/${notificationId}/items/${itemId}/toggle`, {
          method: "PATCH",
        });

        setDetailMap((prev) => ({
          ...prev,
          [notificationId]: d,
        }));

        await loadInbox();
      } catch (e) {
        console.error(e);
        alert(e?.message || "チェックの更新に失敗しました。");
      } finally {
        setBusy(false);
      }
    },
    [detailMap, loadInbox],
  );

  // ✅ notification.checkedAt 최종 송신
  // 백엔드 예시:
  // PATCH /api/notifications/{notificationId}/submit
  // body 없음
  // 응답: 최신 detail
  const submitMultiNotification = useCallback(
    async (notificationId) => {
      const detail = detailMap[notificationId];
      if (!detail || detail.checkedAt) return;

      try {
        setSubmitLoadingId(notificationId);

        const updated = await apiFetch(`/api/notifications/${notificationId}/submit`, {
          method: "PATCH",
        });

        setDetailMap((prev) => ({
          ...prev,
          [notificationId]: updated,
        }));

        await loadInbox();
      } catch (e) {
        console.error(e);
        alert(e?.message || "送信に失敗しました。");
      } finally {
        setSubmitLoadingId(null);
      }
    },
    [detailMap, loadInbox],
  );

  useEffect(() => {
    loadMe();
    loadInbox();
    loadSettings();
  }, [loadMe, loadInbox, loadSettings]);

  useEffect(() => {
    if (inbox.length > 0) loadUsersForInbox(inbox);
  }, [inbox, loadUsersForInbox]);

  const handleLogout = () => {
    localStorage.removeItem("mockUserId");
    navigate("/login", { replace: true });
  };

  const handleCheck = async (notificationId) => {
    try {
      setBusy(true);
      await apiFetch(`/api/notifications/${notificationId}/check`, { method: "PATCH" });
      await loadInbox();
    } catch (e) {
      console.error(e);
      alert(e?.message || "確認処理に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  const incoming = inbox.filter((x) => !x.checkedAt);
  const history = inbox.filter((x) => !!x.checkedAt);

  const headerTitle = displayName ? displayName : "Dashboard";
  const myModalSrc = profileImageUrl || "/default-avatar.png";

  useEffect(() => {
    if (!confirmOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = async (e) => {
      if (e.key === "Escape") {
        closeConfirm();
      }
      if (e.key === "Enter") {
        if (confirmTargetId && !busy) {
          await handleCheck(confirmTargetId);
        }
        closeConfirm();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmOpen, confirmTargetId, busy]);

  const handleComposerSend = useCallback(async () => {
    setComposerError("");
    setComposerSuccess("");

    if (!toUserId) {
      setComposerError("宛先を選択してください。");
      return;
    }

    try {
      setSending(true);

      if (sendKind === "SIMPLE") {
        const trimmed = (message ?? "").trim();
        if (!trimmed) {
          setComposerError("内容を入力してください。");
          return;
        }

        await apiFetch("/api/notifications", {
          method: "POST",
          body: { toUserId: Number(toUserId), message: trimmed },
        });
      } else {
        const title = (multiTitle ?? "").trim();
        if (!title) {
          setComposerError("タイトルを入力してください。");
          return;
        }

        const items = (multiItems ?? [])
          .map((x) => ({ text: (x.text ?? "").trim(), checked: false }))
          .filter((x) => x.text.length > 0);

        if (items.length === 0) {
          setComposerError("チェック項目を1つ以上入力してください。");
          return;
        }

        await apiFetch("/api/notifications/multi", {
          method: "POST",
          body: {
            toUserId: Number(toUserId),
            title,
            items,
          },
        });
      }

      setComposerSuccess("送信しました。");

      setToUserId("");
      setMessage("");
      setSendKind("SIMPLE");
      setMultiTitle("");
      setMultiItems([{ id: makeId(), text: "" }]);

      await loadInbox();

      setTimeout(() => {
        if (!keepComposerOpen) {
          setShowComposer(false);
        }
        setComposerSuccess("");
      }, 2000);
    } catch (e) {
      console.error(e);
      setComposerError(e?.message || "送信に失敗しました。");
    } finally {
      setSending(false);
    }
  }, [toUserId, message, loadInbox, keepComposerOpen, sendKind, multiTitle, multiItems]);

  const selectedFriend = friends.find((f) => String(f.friendUserId) === String(toUserId));

  const renderExpandedDetail = (itemId) => {
    const detail = detailMap[itemId];
    const isDetailLoading = detailLoadingId === itemId;
    const detailError = detailErrorMap[itemId];
    const submitted = !!detail?.checkedAt;
    const canEdit = detail && String(me) === String(detail.toUserId) && !submitted;
    const isSubmitLoading = submitLoadingId === itemId;

    return (
      <div className={styles.inlineDetailBox}>
        {isDetailLoading ? <div className={styles.empty}>読み込み中...</div> : null}
        {!isDetailLoading && detailError ? <div className={styles.empty}>{detailError}</div> : null}

        {!isDetailLoading && !detailError && detail ? (
          <>
            {Array.isArray(detail.items) && detail.items.length > 0 ? (
              <div className={styles.inlineMultiList}>
                {detail.items.map((it) => {
                  const checked = !!it.checkedAt;

                  return (
                    <label key={it.id} className={styles.inlineMultiRow}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!canEdit || busy || isSubmitLoading}
                        onChange={() => toggleMultiItem(detail.id, it.id)}
                      />
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
              <div className={styles.empty}>項目がありません。</div>
            )}

            <div className={styles.inlineDetailActions}>
              {!submitted && String(me) === String(detail.toUserId) ? (
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={busy || isSubmitLoading}
                  onClick={() => submitMultiNotification(detail.id)}
                >
                  {isSubmitLoading ? "送信中..." : "送信"}
                </button>
              ) : null}

              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => setExpandedId(null)}
              >
                閉じる
              </button>
            </div>

            {submitted ? (
              <div className={styles.confirmHint}>※ 送信済みのため、これ以上修正できません</div>
            ) : String(me) !== String(detail.toUserId) ? (
              <div className={styles.confirmHint}>※ 受信者のみ編集できます</div>
            ) : (
              <div className={styles.confirmHint}>
                ※ 項目を選択した後、「送信」を押すと最終確定されます
              </div>
            )}
          </>
        ) : null}
      </div>
    );
  };

  const renderInboxCard = (item, mode) => {
    const from = userMap[item.fromUserId];
    const fromName = from?.displayName ?? `user#${item.fromUserId}`;
    const fromImg = from?.profileImageUrl ?? "";

    const cardClass = mode === "incoming" ? styles.inboxCard : styles.inboxCardMuted;
    const isExpanded = expandedId === item.id;

    const toggleExpanded = async () => {
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

    const handleIncomingAction = async () => {
      if (busy) return;

      const cached = detailMap[item.id];
      if (cached && String(cached.kind) === "MULTI") {
        setExpandedId((prev) => (prev === item.id ? null : item.id));
        return;
      }

      const d = await loadDetail(item.id);
      if (!d) return;

      if (String(d.kind) === "MULTI") {
        setExpandedId((prev) => (prev === item.id ? null : item.id));
        return;
      }

      if (skipConfirm) {
        await handleCheck(item.id);
        return;
      }

      openConfirm(item, fromName);
    };

    const handleHistoryAction = async () => {
      await toggleExpanded();
    };

    const handleCardKeyDown = async (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();

      if (mode === "incoming") {
        await handleIncomingAction();
      } else {
        await handleHistoryAction();
      }
    };

    return (
      <li key={item.id} className={styles.cardBlock}>
        <div
          className={cardClass}
          onClick={mode === "incoming" ? handleIncomingAction : handleHistoryAction}
          role="button"
          tabIndex={0}
          onKeyDown={handleCardKeyDown}
          aria-label={mode === "incoming" ? "通知を確認" : "通知詳細を表示"}
          aria-expanded={isExpanded}
        >
          <div className={styles.inboxCardHeader}>
            <div className={styles.userBlock}>
              <button
                type="button"
                className={styles.avatarButton}
                onClick={(e) => {
                  e.stopPropagation();
                  openModal(fromImg || "/default-avatar.png");
                }}
                aria-label="open sender profile"
              >
                <Avatar src={fromImg} size={24} alt={fromName} />
              </button>

              <span className={styles.fromName}>{fromName}</span>
            </div>

            <span className={styles.time}>{formatTime(item.createdAt)}</span>
          </div>

          <div className={styles.message}>{item.message}</div>

          {mode === "incoming" ? null : (
            <div className={styles.checkedInfo}>確認済み: {formatTime(item.checkedAt)}</div>
          )}
        </div>

        {isExpanded ? renderExpandedDetail(item.id) : null}
      </li>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <button
            type="button"
            className={styles.avatarButton}
            onClick={() => openModal(myModalSrc)}
            aria-label="open my profile"
          >
            <Avatar src={profileImageUrl} size={32} alt={headerTitle} />
          </button>

          <h1 className={styles.title}>{headerTitle}</h1>
        </div>

        <div className={styles.headerRight}>
          <button
            className={styles.sendButton}
            onClick={async () => {
              const next = !showComposer;
              setShowComposer(next);

              if (next) {
                setComposerError("");
                setComposerSuccess("");
                setToUserId("");
                setMessage("");
                setKeepComposerOpen(false);

                setSendKind("SIMPLE");
                setMultiTitle("");
                setMultiItems([{ id: makeId(), text: "" }]);

                await loadFriends();
              }
            }}
          >
            新規通知
          </button>

          <div className={styles.menuWrap} ref={menuRef}>
            <button
              type="button"
              className={styles.moreButton}
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              メニュー
            </button>

            {menuOpen ? (
              <div className={styles.menuDropdown} role="menu">
                <button
                  type="button"
                  className={styles.menuItem}
                  role="menuitem"
                  onClick={() => {
                    closeMenu();
                    navigate("/settings");
                  }}
                >
                  設定
                </button>

                <button
                  type="button"
                  className={styles.menuItem}
                  role="menuitem"
                  onClick={() => {
                    closeMenu();
                    navigate("/friends");
                  }}
                >
                  友達追加
                </button>

                <button
                  type="button"
                  className={styles.menuItem}
                  role="menuitem"
                  onClick={() => {
                    closeMenu();
                    navigate("/sent");
                  }}
                >
                  送信履歴
                </button>

                <div className={styles.menuDivider} />

                <button
                  type="button"
                  className={styles.menuItemDanger}
                  role="menuitem"
                  onClick={() => {
                    closeMenu();
                    handleLogout();
                  }}
                >
                  ログアウト
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {showComposer ? (
        <section className={styles.composerCard}>
          <div className={styles.composerHeader}></div>

          {friendsLoading ? (
            <div className={styles.empty}>友達一覧を読み込み中...</div>
          ) : friends.length === 0 ? (
            <div className={styles.empty}>送信できる友達が存在しません。</div>
          ) : (
            <>
              <div className={styles.field}>
                <label className={styles.label}>宛先（友達）</label>

                <select
                  className={styles.select}
                  value={toUserId}
                  onChange={(e) => {
                    setToUserId(e.target.value);
                    setComposerError("");
                    setComposerSuccess("");
                  }}
                  disabled={sending}
                >
                  <option value="">- 選択 -</option>
                  {friends.map((f) => (
                    <option key={f.friendUserId} value={String(f.friendUserId)}>
                      {f.friendDisplayName}
                    </option>
                  ))}
                </select>

                {selectedFriend ? (
                  <div className={styles.selectedRow}>
                    <button
                      type="button"
                      className={styles.avatarButton}
                      onClick={() =>
                        openModal(selectedFriend.friendProfileImageUrl || "/default-avatar.png")
                      }
                      aria-label="open profile"
                    >
                      <Avatar
                        src={selectedFriend.friendProfileImageUrl}
                        size={32}
                        alt={selectedFriend.friendDisplayName}
                      />
                    </button>

                    <div className={styles.selectedName}>{selectedFriend.friendDisplayName}</div>
                  </div>
                ) : null}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>送信タイプ</label>
                <select
                  className={styles.select}
                  value={sendKind}
                  onChange={(e) => {
                    setSendKind(e.target.value);
                    setComposerError("");
                    setComposerSuccess("");
                  }}
                  disabled={sending}
                >
                  <option value="SIMPLE">SIMPLE（単文）</option>
                  <option value="MULTI">MULTI（チェック項目）</option>
                </select>
              </div>

              {sendKind === "MULTI" ? (
                <div className={styles.field}>
                  <label className={styles.label}>タイトル</label>
                  <input
                    className={styles.multiInput}
                    value={multiTitle}
                    onChange={(e) => setMultiTitle(e.target.value)}
                    placeholder="例：今日の確認"
                    disabled={sending}
                  />
                </div>
              ) : null}

              {sendKind === "SIMPLE" ? (
                <div className={styles.field}>
                  <label className={styles.label}>内容（Ctrl+Enterで送信）</label>
                  <textarea
                    className={styles.textarea}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        e.preventDefault();
                        handleComposerSend();
                      }
                    }}
                    placeholder="例：確認お願いします。チェックしてね。"
                    rows={4}
                    disabled={sending}
                  />
                </div>
              ) : null}

              {sendKind === "MULTI" ? (
                <div className={styles.field}>
                  <label className={styles.label}>チェック項目（＋で追加 / －で削除）</label>

                  <div className={styles.multiList}>
                    {multiItems.map((it, idx) => (
                      <div key={it.id} className={styles.multiRow}>
                        <input
                          className={styles.multiInput}
                          value={it.text}
                          onChange={(e) => updateMultiItem(it.id, e.target.value)}
                          placeholder={`項目 ${idx + 1}`}
                          disabled={sending}
                        />

                        <button
                          type="button"
                          className={styles.iconButton}
                          onClick={addMultiItem}
                          disabled={sending}
                          aria-label="add item"
                          title="追加"
                        >
                          ＋
                        </button>

                        <button
                          type="button"
                          className={styles.iconButtonDanger}
                          onClick={() => removeMultiItem(it.id)}
                          disabled={sending}
                          aria-label="remove item"
                          title="削除"
                        >
                          －
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className={styles.hint}>※ すべて空欄の項目は送信できません</div>
                </div>
              ) : null}

              <div className={styles.field}>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={keepComposerOpen}
                    onChange={(e) => setKeepComposerOpen(e.target.checked)}
                    disabled={sending}
                  />
                  送信後もこの画面を閉じない
                </label>
              </div>

              {composerError ? <div className={styles.error}>{composerError}</div> : null}
              {composerSuccess ? (
                <div className={styles.success} role="status" aria-live="polite">
                  {composerSuccess}
                </div>
              ) : null}

              <div className={styles.composerActions}>
                <button
                  className={styles.primaryButton}
                  type="button"
                  disabled={sending}
                  onClick={handleComposerSend}
                >
                  {sending ? "送信中..." : "送信"}
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => setShowComposer(false)}
                  disabled={sending}
                >
                  閉じる
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}

      {loading ? <div className={styles.empty}>読み込み中...</div> : null}
      {error ? <div className={styles.empty}>{error}</div> : null}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>受信した通知</h2>
          <h2 className={styles.badge}>（{incoming.length}件）</h2>
        </div>

        {!loading && !error && incoming.length === 0 ? (
          <div className={styles.empty}>新しい通知はありません。</div>
        ) : (
          <ul className={styles.list}>{incoming.map((item) => renderInboxCard(item, "incoming"))}</ul>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>受信履歴（確認済み）</h2>
        </div>

        {!loading && !error && history.length === 0 ? (
          <div className={styles.empty}>まだ確認した通知はありません。</div>
        ) : (
          <ul className={styles.list}>{history.map((item) => renderInboxCard(item, "history"))}</ul>
        )}
      </section>

      <ImageModal open={modalOpen} src={modalSrc} onClose={() => setModalOpen(false)} />

      {confirmOpen && (
        <div className={styles.confirmOverlay} onClick={closeConfirm} role="presentation">
          <div
            className={styles.confirmBox}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="確認モーダル"
          >
            <div className={styles.confirmTitle}>確認した？</div>

            {confirmTargetName ? (
              <div className={styles.confirmSub}>
                from <b>{confirmTargetName}</b>
              </div>
            ) : null}

            {confirmTargetMessage ? (
              <div className={styles.confirmPreview}>{confirmTargetMessage}</div>
            ) : null}

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={busy}
                onClick={async () => {
                  if (confirmTargetId && !busy) {
                    await handleCheck(confirmTargetId);
                  }
                  closeConfirm();
                }}
              >
                {busy ? "処理中..." : "はい"}
              </button>

              <button type="button" className={styles.ghostButton} onClick={closeConfirm}>
                いいえ
              </button>
            </div>

            <div className={styles.confirmOptionRow}>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={skipConfirm}
                  disabled={savingSkipConfirm}
                  onChange={(e) => saveSkipConfirm(e.target.checked)}
                />
                次回から確認せずに即チェックする
              </label>
            </div>

            <div className={styles.confirmHint}>Enter = はい · Esc = 閉じる</div>
          </div>
        </div>
      )}
    </div>
  );
}