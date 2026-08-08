"use client";

export default function ClientError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section
      role="alert"
      style={{
        minHeight: "45vh",
        display: "grid",
        placeItems: "center",
        padding: "32px 18px",
        textAlign: "center",
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Не удалось загрузить кабинет</h1>
        <p style={{ margin: "10px 0 18px", opacity: 0.76 }}>
          Соединение временно прервалось. Данные сохранены — просто повтори загрузку.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            border: 0,
            borderRadius: 12,
            padding: "12px 18px",
            fontWeight: 800,
            cursor: "pointer",
            background: "#d6b34f",
            color: "#18211f",
          }}
        >
          Повторить
        </button>
      </div>
    </section>
  );
}
