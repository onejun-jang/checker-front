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
    } catch { }
    return iso;
}

export default function SendHistoryPage() {
    const navigate = useNavigate();
    const me = useMemo(() => localStorage.getItem("mockUserId"), []);

    const [sent, setSent] = useState([]);
    const [userMap, setUserMap] = useState({});

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // ✅ Dashboard와 동일한 모달 상태
    const [modalOpen, setModalOpen] = useState(false);
    const [modalSrc, setModalSrc] = useState("");

    const openModal = (src, title) => {
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
        const ids = Array.from(new Set(list.map((x) => x.toUserId)));
        if (ids.length === 0) return;

        try {
            const users = await apiFetch("/api/users"); // 개발용 전체 유저
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

    useEffect(() => {
        loadSent();
    }, [loadSent]);

    useEffect(() => {
        if (sent.length > 0) {
            loadUsers(sent);
        }
    }, [sent, loadUsers]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>送信履歴</h1>

                <div className={styles.headerRight}>
                    <button
                        className={styles.ghostButton}
                        onClick={() => navigate("/")}
                    >
                        戻る
                    </button>
                </div>
            </header>

            {loading && <div className={styles.empty}>불러오는 중...</div>}
            {error && <div className={styles.empty}>{error}</div>}

            {!loading && !error && sent.length === 0 ? (
                <div className={styles.empty}>아직 보낸 알림이 없어.</div>
            ) : (
                <ul className={styles.list}>
                    {sent.map((item) => {
                        const user = userMap[item.toUserId];
                        const displayName = user?.displayName ?? `user#${item.toUserId}`;
                        const profileImageUrl = user?.profileImageUrl ?? "";

                        return (
                            <li key={item.id} className={styles.card}>
                                <div className={styles.cardMeta}>
                                    {/* ✅ Dashboard 스타일 동일 패턴 */}
                                    <div className={styles.userBlock}>
                                        <button
                                            type="button"
                                            className={styles.avatarButton}
                                            onClick={() =>
                                                openModal(profileImageUrl)
                                            }
                                            disabled={!profileImageUrl}
                                            aria-label="open profile"
                                        >
                                            <Avatar src={profileImageUrl} size={24} />
                                        </button>

                                        <span className={styles.to}>
                                            {displayName}
                                        </span>
                                    </div>

                                    <span className={styles.time}>
                                        {formatTime(item.createdAt)}
                                    </span>
                                </div>

                                <div className={styles.message}>
                                    {item.message}
                                </div>

                                <div className={styles.status}>
                                    {item.checkedAt
                                        ? `確認(${formatTime(item.checkedAt)})`
                                        : ""}
                                </div>

                            </li>
                        );
                    })}
                </ul>
            )}

            {/* ✅ Dashboard와 동일한 위치 */}
            <ImageModal
                open={modalOpen}
                src={modalSrc}
                onClose={() => setModalOpen(false)}
            />
        </div>
    );
}
