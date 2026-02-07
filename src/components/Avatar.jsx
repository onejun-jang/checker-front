export default function Avatar({ src, size = 28, alt = "" }) {
  const finalSrc = src || "/default-avatar.png";

  return (
    <img
      src={finalSrc}
      alt={alt}
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        objectFit: "cover",
        border: "1px solid #ddd",
        background: "#f3f3f3",
        flex: "0 0 auto",
      }}
      onError={(e) => {
        e.currentTarget.src = "/default-avatar.png";
      }}
    />
  );
}
