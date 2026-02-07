import { useEffect } from "react";
import styles from "./imageModal.module.css";

export default function ImageModal({ open, src, title, onClose }) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>{title || ""}</div>
          <button className={styles.close} onClick={onClose} aria-label="close">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <img className={styles.image} src={src} alt={title || ""} />
        </div>
      </div>
    </div>
  );
}
