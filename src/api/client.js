export async function apiFetch(path, options = {}) {
  const userId = localStorage.getItem("mockUserId");

  const headers = {
    "X-Mock-User-Id": userId,
    ...(options.headers || {}),
  };

  // body가 있는 요청만 Content-Type 붙이기 (GET에도 붙이면 문제는 없지만 깔끔하게)
  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(path, { ...options, headers });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  // ✅ 여기부터가 핵심: 비어있는 응답 바디도 허용
  if (res.status === 204) return null;

  const text = await res.text().catch(() => "");
  if (!text) return null; // 바디가 없으면 그냥 null

  // JSON이면 파싱, 아니면 문자열 그대로 반환
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return JSON.parse(text);
  }
  return text;
}
