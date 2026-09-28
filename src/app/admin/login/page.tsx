import { loginAdmin } from "@/server/actions";
import { Notice } from "@/components/Notice";
import { Reed } from "@/components/Icons";

export const metadata = { title: "دخول الإدارة", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return (
    <div className="wrap page" style={{ maxWidth: 440 }}>
      <p className="brand">
        <Reed /> يراع
      </p>
      <h1>دخول الإدارة</h1>
      <Notice error={query.error} />
      <form action={loginAdmin} className="stack">
        <label>
          البريد
          <input name="email" type="email" dir="ltr" autoComplete="username" required />
        </label>
        <label>
          كلمة المرور
          <input name="password" type="password" dir="ltr" autoComplete="current-password" required />
        </label>
        <button type="submit">دخول</button>
      </form>
    </div>
  );
}
