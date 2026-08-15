export default function Loading() {
  return (
    <section
      role="status"
      aria-live="polite"
      style={{
        minHeight: "45vh",
        display: "grid",
        placeItems: "center",
        padding: "32px 18px",
        textAlign: "center",
      }}
    >
      <div>
        <strong style={{ display: "block", fontSize: 18 }}>Загружаю личный кабинет…</strong>
        <span style={{ display: "block", marginTop: 8, opacity: 0.72 }}>
          Обычно это занимает несколько секунд.
        </span>
      </div>
    </section>
  );
}
