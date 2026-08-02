export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : "";
  return (
    <main className="login">
      <div className="loginCard">
        <div className="logoMark">AI</div>
        <h1>Новый пароль</h1>
        <p className="muted">Используй не менее 10 символов.</p>
        {error ? <div className="notice">Ссылка устарела или пароль слишком короткий.</div> : null}
        <form action="/api/auth/password/update" method="post" className="loginBlock">
          <input name="password" type="password" minLength={10} autoComplete="new-password" placeholder="Новый пароль" required />
          <button className="primary">Сохранить пароль</button>
        </form>
      </div>
    </main>
  );
}
