"use client";

export default function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button type="submit" className="logoutButton">Выйти</button>
    </form>
  );
}
