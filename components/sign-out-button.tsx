export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="w-full rounded-card border border-line px-4 py-3 font-medium"
      >
        ออกจากระบบ
      </button>
    </form>
  );
}
