import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/login.module.css";

export default function LoginPage() {
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/users")
      .then((r) => {
        if (!r.ok) throw new Error("유저 목록 로딩 실패");
        return r.json();
      })
      .then((data) => {
        setUsers(data);
        if (data.length > 0) setSelectedId(String(data[0].id));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const onLogin = () => {
    if (!selectedId) return;
    localStorage.setItem("mockUserId", selectedId);

    const picked = users.find((u) => String(u.id) === String(selectedId));
    if (picked) localStorage.setItem("mockUserName", picked.name);

    navigate("/", { replace: true });
  };

  if (loading) return <div className={styles.status}>로딩중...</div>;
  if (error) return <div className={`${styles.status} ${styles.error}`}>{error}</div>;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h2 className={styles.title}>Mock Login</h2>

        <label className={styles.label}>멤버 선택</label>
        <select
          className={styles.select}
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}{u.email ? ` (${u.email})` : ""}
            </option>
          ))}
        </select>

        <button
          className={styles.button}
          onClick={onLogin}
          disabled={!selectedId}
        >
          로그인
        </button>
      </div>
    </div>
  );
}
