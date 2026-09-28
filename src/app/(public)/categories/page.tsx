import Link from "next/link";
import { listPublicCategories } from "@/lib/queries";
import { toneHex } from "@/lib/palette";
import { CategoryIcon } from "@/components/Icons";

export const metadata = { title: "التصنيفات" };

export default function CategoriesPage() {
  const categories = listPublicCategories();
  return (
    <div className="wrap page">
      <h1>التصنيفات</h1>
      <p className="lead">اختر بابًا وابدأ من القصص التي تحته.</p>
      {categories.length === 0 ? (
        <div className="empty">
          <h2>لا توجد قصص هنا حتى الآن.</h2>
        </div>
      ) : (
        <div className="cat-grid" style={{ marginTop: "1.2rem" }}>
          {categories.map((category) => (
            <Link key={category.id} href={`/categories/${category.slug}`} className="cat-tile" style={{ background: toneHex(category.colorToken) }}>
              <CategoryIcon name={category.icon} />
              <strong>{category.name}</strong>
              {category.description ? <span>{category.description}</span> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
