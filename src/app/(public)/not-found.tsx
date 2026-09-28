import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap page">
      <h1>ما لقينا هذه الصفحة.</h1>
      <p className="lead">يمكن أن يكون الرابط قديمًا، أو أن القصة لم تُنشر.</p>
      <Link href="/">العودة إلى الرئيسية</Link>
    </div>
  );
}
