import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import styles from "../css/settings.module.css";
import Avatar from "../components/Avatar";
import ImageModal from "../components/ImageModal";

export default function SettingsPage() {
  const navigate = useNavigate();
  const me = useMemo(() => localStorage.getItem("mockUserId"), []);

  const [currentName, setCurrentName] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [profileImageUrl, setProfileImageUrl] = useState(""); // ✅ 서버에 저장된 현재 이미지
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(""); // ✅ 선택한 파일 미리보기 URL

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ 모달
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSrc, setModalSrc] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  const openModal = (src, title) => {
    if (!src) return; // 디폴트면 모달 금지
    setModalSrc(src);
    setModalTitle(title || "");
    setModalOpen(true);
  };

  const loadMe = async () => {
    if (!me) return;
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/api/users/me");
      const name = data?.displayName ?? "";
      setCurrentName(name);
      setDisplayName(name);

      const img = data?.profileImageUrl ?? "";
      setProfileImageUrl(img);
    } catch (e) {
      console.error(e);
      setError(e?.message || "유저 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  // ✅ 파일 선택 시 미리보기 URL 생성 (큰 이미지 그대로 박히는 문제 방지)
  const onSelectFile = (file) => {
    setError("");
    setSuccess("");

    // 기존 previewUrl 정리
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl("");
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  // ✅ 표시 이름 저장
  const onSaveName = async () => {
    const next = (displayName ?? "").trim();
    setError("");
    setSuccess("");

    if (!next) {
      setError("displayName은 비울 수 없습니다.");
      return;
    }
    if (next.length > 50) {
      setError("displayName은 50자 이하여야 합니다.");
      return;
    }

    try {
      setSaving(true);
      await apiFetch("/api/users/me/display-name", {
        method: "PATCH",
        body: { displayName: next },
      });
      setCurrentName(next);
      setSuccess("표시 이름을 저장했습니다.");
    } catch (e) {
      console.error(e);
      setError(e?.message || "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ 프로필 이미지 업로드
  const onUploadProfileImage = async () => {
    setError("");
    setSuccess("");

    if (!selectedFile) {
      setError("업로드할 이미지를 선택하세요.");
      return;
    }

    try {
      setUploadingImg(true);

      const form = new FormData();
      form.append("file", selectedFile);

      await apiFetch("/api/users/me/profile-image", {
        method: "POST",
        body: form, // ✅ multipart
      });

      setSuccess("프로필 사진을 변경했습니다.");

      // 선택 상태 초기화
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl("");
      }

      await loadMe(); // 변경 후 다시 불러오기
    } catch (e) {
      console.error(e);
      setError(e?.message || "업로드 실패");
    } finally {
      setUploadingImg(false);
    }
  };

  // 컴포넌트 언마운트 시 previewUrl 정리
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>설정</h1>

        <div className={styles.headerRight}>
          <button className={styles.ghostButton} onClick={() => navigate("/")}>
            돌아가기
          </button>
        </div>
      </header>

      {loading ? <div className={styles.notice}>불러오는 중...</div> : null}
      {error ? <div className={styles.noticeError}>{error}</div> : null}
      {success ? <div className={styles.noticeOk}>{success}</div> : null}

      {/* ✅ 프로필 사진 섹션 */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>프로필 사진</div>

        {/* 현재 사진(서버 저장) */}
        <div className={styles.profileRow}>
          <button
            type="button"
            className={styles.avatarButton}
            onClick={() => openModal(profileImageUrl, currentName || "프로필 사진")}
            disabled={!profileImageUrl}
            aria-label="open current profile"
          >
            <Avatar src={profileImageUrl} size={56} />
          </button>

          <div className={styles.profileMeta}>
            <div className={styles.metaTitle}>현재 사진</div>
            <div className={styles.metaDesc}>
              {profileImageUrl ? "클릭하면 확대됩니다." : "아직 업로드한 사진이 없습니다."}
            </div>
          </div>
        </div>

        {/* 파일 선택 + 미리보기 */}
        <div className={styles.uploadRow}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={uploadingImg || loading}
            onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
          />

          {previewUrl ? (
            <div className={styles.previewBox}>
              <button
                type="button"
                className={styles.previewButton}
                onClick={() => openModal(previewUrl, "선택한 사진 미리보기")}
                aria-label="open preview"
              >
                <img className={styles.previewImg} src={previewUrl} alt="preview" />
              </button>
              <div className={styles.previewHint}>
                미리보기 상태입니다. “사진 변경”을 눌러야 저장됩니다.
              </div>
            </div>
          ) : null}

          <button
            className={styles.primaryButton}
            type="button"
            onClick={onUploadProfileImage}
            disabled={uploadingImg || loading || !selectedFile}
          >
            {uploadingImg ? "업로드 중..." : "사진 변경"}
          </button>
        </div>
      </section>

      {/* ✅ 표시 이름 섹션 */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>표시 이름</div>

        <div className={styles.label}>현재 표시 이름</div>
        <div className={styles.currentName}>{currentName || "-"}</div>

        <div className={styles.label}>새 표시 이름</div>
        <input
          className={styles.input}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="최대 50자"
          maxLength={50}
          disabled={saving || loading}
        />

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            onClick={onSaveName}
            disabled={saving || loading}
            type="button"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </section>

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
