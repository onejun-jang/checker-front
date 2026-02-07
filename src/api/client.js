export async function apiFetch(path, options = {}) {
  const userId = localStorage.getItem("mockUserId");

  const isFormData = options.body instanceof FormData;

  // Headers로 다루면 delete/set이 깔끔함
  const headers = new Headers(options.headers || {});

  if (userId) headers.set("X-Mock-User-Id", userId);

  const hasBody = options.body !== undefined && options.body !== null;

  // ✅ FormData면 Content-Type을 절대 지정하지 말기 (브라우저가 boundary 포함해서 자동 지정)
  if (isFormData) {
    headers.delete("Content-Type");
  } else {
    // body가 있는 요청만 기본 Content-Type 보강
    if (hasBody && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  // ✅ JSON은 여기서 stringify까지 해주면 사용하기 편함(단, FormData/문자열은 그대로)
  const bodyToSend =
    !hasBody
      ? undefined
      : isFormData
        ? options.body
        : typeof options.body === "string"
          ? options.body
          : headers.get("Content-Type")?.includes("application/json")
            ? JSON.stringify(options.body)
            : options.body;

  const res = await fetch(path, {
    ...options,
    headers,
    body: bodyToSend,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (res.status === 204) return null;

  const text = await res.text().catch(() => "");
  if (!text) return null;

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return JSON.parse(text);
  }
  return text;
}
