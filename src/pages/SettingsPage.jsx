// src/pages/SettingsPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import styles from "../css/settings.module.css";
import Avatar from "../components/Avatar";
import ImageModal from "../components/ImageModal";

export default function SettingsPage() {
    const navigate = useNavigate();
    const me = useMemo(() => localStorage.getItem("mockUserId"), []);

    const [displayName, setDisplayName] = useState("");
    const [searchId, setSearchId] = useState("");

    const [profileImageUrl, setProfileImageUrl] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingImg, setUploadingImg] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // ✅ 모달
    const [modalOpen, setModalOpen] = useState(false);
    const [modalSrc, setModalSrc] = useState("");

    const [skipConfirm, setSkipConfirm] = useState(false);
    const [savingPref, setSavingPref] = useState(false);


    const fileInputRef = useRef(null);

    const openModal = (src) => {
        if (!src) return;
        setModalSrc(src);
        setModalOpen(true);
    };

    const loadMe = async () => {
        if (!me) return;
        try {
            setLoading(true);
            setError("");
            const data = await apiFetch("/api/users/me");
            setDisplayName(data?.displayName ?? "");
            setSearchId(data?.searchId ?? "");
            setProfileImageUrl(data?.profileImageUrl ?? "");
        } catch (e) {
            setError(e?.message || "ユーザー情報を取得できませんでした。");
        } finally {
            setLoading(false);
        }
    };

    const loadSettings = async () => {
        try {
            const s = await apiFetch("/api/users/me/settings");
            setSkipConfirm(!!s?.skipConfirm);
        } catch (e) {
            setSkipConfirm(false);
        }
    };


    useEffect(() => {
        loadMe();
        loadSettings();
        // eslint-disable-next-line
    }, [me]);

    // 파일 선택
    const onSelectFile = (file) => {
        setError("");
        setSuccess("");

        if (previewUrl) URL.revokeObjectURL(previewUrl);

        if (!file) {
            setSelectedFile(null);
            setPreviewUrl("");
            return;
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const resetHiddenFileInput = () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const onUploadProfileImage = async () => {
        if (!selectedFile) return;

        try {
            setUploadingImg(true);

            const form = new FormData();
            form.append("file", selectedFile);

            await apiFetch("/api/users/me/profile-image", {
                method: "POST",
                body: form,
            });

            setSuccess("プロフィール画像を変更しました。");
            setSelectedFile(null);
            setPreviewUrl("");
            resetHiddenFileInput();

            await loadMe();
        } catch (e) {
            setError(e?.message || "アップロードに失敗しました。");
        } finally {
            setUploadingImg(false);
        }
    };

    const onResetProfileImage = async () => {
        try {
            setUploadingImg(true);
            await apiFetch("/api/users/me/profile-image", { method: "DELETE" });
            setSuccess("デフォルト画像に戻しました。");
            await loadMe();
        } catch (e) {
            setError(e?.message || "変更に失敗しました。");
        } finally {
            setUploadingImg(false);
        }
    };

    const onClearSelected = () => {
        setSelectedFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl("");
        resetHiddenFileInput();
    };

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    // ✅ 핵심: preview가 있으면 그걸 먼저 보여줌
    const currentAvatar = previewUrl || profileImageUrl || "/default-avatar.png";

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>設定</h1>
                <button className={styles.ghostButton} onClick={() => navigate("/")}>
                    戻る
                </button>
            </header>

            {loading && <div className={styles.notice}>読み込み中...</div>}
            {error && <div className={styles.noticeError}>{error}</div>}
            {success && <div className={styles.noticeOk}>{success}</div>}

            {/* 검색용 아이디 */}
            <section className={styles.section}>
                <div className={styles.sectionTitle}>検索用ID</div>
                <div className={styles.displayName}>{searchId || "-"}</div>
            </section>

            <section className={styles.section}>
                <div className={styles.sectionTitle}>通知設定</div>

                <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                        type="checkbox"
                        checked={skipConfirm}
                        disabled={savingPref || loading}
                        onChange={async (e) => {
                            const next = e.target.checked;
                            setSkipConfirm(next);

                            try {
                                setSavingPref(true);
                                setError("");
                                setSuccess("");

                                await apiFetch("/api/users/me/settings", {
                                    method: "PATCH",
                                    body: { skipConfirm: next },
                                });

                                setSuccess("設定を保存しました。");
                            } catch (err) {
                                setSkipConfirm(!next); // 롤백
                                setError(err?.message || "設定の保存に失敗しました。");
                            } finally {
                                setSavingPref(false);
                            }
                        }}
                    />
                    確認ダイアログを表示しない（タップで即確認）
                </label>
            </section>


            {/* 프로필 사진 */}
            <section className={styles.section}>
                <div className={styles.sectionTitle}>プロフィール画像</div>

                <div className={styles.profileRow}>
                    {/* ✅ 프리뷰가 있으면 기존 자리에서 바로 교체 */}
                    <button
                        type="button"
                        className={styles.avatarButton}
                        onClick={() => openModal(currentAvatar)}
                    >
                        <Avatar src={currentAvatar} size={64} />
                    </button>

                    <div className={styles.profileControls}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            style={{ display: "none" }}
                            onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
                        />

                        <div className={styles.profileActions}>
                            <button
                                type="button"
                                className={styles.ghostButton}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                ファイルを選択
                            </button>

                            {selectedFile ? (
                                <>
                                    <button
                                        type="button"
                                        className={styles.primaryButton}
                                        onClick={onUploadProfileImage}
                                        disabled={uploadingImg}
                                    >
                                        {uploadingImg ? "アップロード中..." : "画像を変更"}
                                    </button>

                                    <button
                                        type="button"
                                        className={styles.ghostButton}
                                        onClick={onClearSelected}
                                    >
                                        クリア
                                    </button>
                                </>
                            ) : (
                                // ✅ 파일이 선택되지 않았을 때만 디폴트 버튼 표시
                                <button
                                    type="button"
                                    className={styles.ghostButton}
                                    onClick={onResetProfileImage}
                                    disabled={!profileImageUrl}
                                >
                                    デフォルト
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* 표시 이름 */}
            <section className={styles.section}>
                <div className={styles.sectionTitle}>表示名</div>
                <div className={styles.label}>表示名を変更</div>

                <input
                    className={styles.input}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={50}
                />

                <div className={styles.actions}>
                    <button className={styles.primaryButton}>
                        保存
                    </button>
                </div>
            </section>

            <ImageModal
                open={modalOpen}
                src={modalSrc}
                onClose={() => setModalOpen(false)}
            />
        </div>
    );
}
