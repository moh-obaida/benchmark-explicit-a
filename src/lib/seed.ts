import fs from "fs";
import path from "path";
import type { DatabaseSync } from "node:sqlite";
import { mediaDir } from "./paths";
import { hashPassword } from "./password";
import { toneHex } from "./palette";

type Sql = DatabaseSync;

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function coverSvg(tone: string, variant: number) {
  const bg = toneHex(tone);
  const ink = "#3C3538";
  const motifs = [
    `<path d="M300 150c46 86 46 150 0 230" fill="none" stroke="${ink}" stroke-width="10" opacity=".55"/>
     <path d="M300 380c-78 28-132 96-156 150" fill="none" stroke="${ink}" stroke-width="10" opacity=".5"/>
     <path d="M246 205h108" stroke="${ink}" stroke-width="10" opacity=".4"/>`,
    `<circle cx="300" cy="320" r="110" fill="none" stroke="${ink}" stroke-width="10" opacity=".45"/>
     <circle cx="340" cy="296" r="86" fill="${bg}"/>`,
    `<rect x="190" y="170" width="220" height="280" fill="none" stroke="${ink}" stroke-width="10" opacity=".45"/>
     <path d="M300 170v280M190 310h220" stroke="${ink}" stroke-width="8" opacity=".35"/>`,
    `<path d="M70 540c90-90 150-90 230 0s150 90 240 0" fill="none" stroke="${ink}" stroke-width="10" opacity=".45"/>
     <path d="M50 630c110-70 170-70 260 0s170 70 270 0" fill="none" stroke="${ink}" stroke-width="10" opacity=".32"/>`,
    `<path d="M300 150c90 90-90 170 0 260s-90 170 0 250" fill="none" stroke="${ink}" stroke-width="10" opacity=".5"/>`,
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <rect width="600" height="800" fill="${bg}"/>
  <rect x="36" y="36" width="528" height="728" fill="none" stroke="${ink}" stroke-opacity=".18"/>
  ${motifs[variant % motifs.length]}
</svg>`;
}

function writeCover(svg: string, alt: string, db: Sql) {
  const id = crypto.randomUUID();
  const filename = `${id}.svg`;
  const dir = mediaDir();
  const buf = Buffer.from(svg, "utf8");
  fs.writeFileSync(path.join(dir, filename), buf);
  db.prepare(
    `INSERT INTO media (id, filename, mime, bytes, width, height, alt, created_at) VALUES (?, ?, 'image/svg+xml', ?, 600, 800, ?, ?)`,
  ).run(id, filename, buf.length, alt, new Date().toISOString());
  return id;
}

export function ensureSeed(db: Sql) {
  const existing = db.prepare(`SELECT value FROM settings WHERE key = 'seeded'`).get() as { value: string } | undefined;
  if (existing?.value === "1") return;

  const now = new Date().toISOString();
  const email = (process.env.ADMIN_EMAIL || "admin@yara3.local").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "yara3-local-admin";
  const adminId = crypto.randomUUID();

  db.exec("BEGIN");
  try {
    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, 'admin', ?)`,
    ).run(adminId, "إدارة يراع", email, hashPassword(password), now);

    const settings: Record<string, string> = {
      seeded: "1",
      site_name: "يراع",
      description: "مكان هادئ لاكتشاف القصص والروايات.",
      contact_email: "",
      instagram: "",
      social_links: "[]",
      seo_title: "يراع — اكتشف قصتك القادمة",
      seo_description: "يراع مكان مريح تكتشف فيه قصتك القادمة: تصنيفات، بحث، واقتراحات.",
      social_image_id: "",
      logo_id: "",
      default_display_count: "12",
      recent_days: "45",
      density: "comfortable",
      weights: JSON.stringify({
        category: 4,
        tag: 3,
        author: 2,
        popularity: 2,
        recency: 2,
        featured: 3,
        priority: 4,
        viewedPenalty: 5,
      }),
    };
    const put = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)`);
    for (const [key, value] of Object.entries(settings)) put.run(key, value);

    const authors = [
      ["لمى الحسن", "لمى-الحسن", "تكتب قصصًا قصيرة للأطفال بلغة قريبة، وتترك الجملة الأخيرة هادئة بما يكفي للنوم.", 1],
      ["يوسف قاسم", "يوسف-قاسم", "يبدأ مغامراته من سؤال صغير، ثم يترك الشخصيات تجد الطريق بنفسها.", 1],
      ["هديل مرعي", "هديل-مرعي", "تهتم بالقصص التي تعلّم من دون أن تبدو كدرس.", 1],
      ["سامي العبدالله", "سامي-العبدالله", "يكتب عن البيوت والرسائل والأشياء التي تبقى بعد انتهاء الحكاية.", 1],
      ["نورا فهد", "نورا-فهد", "قصصها القصيرة ورواياتها الهادئة مكتوبة لمن كبر قليلًا وما زال يحب السؤال.", 0],
    ] as const;
    const authorIds: Record<string, string> = {};
    for (const [name, slug, bio, featured] of authors) {
      const id = crypto.randomUUID();
      authorIds[name] = id;
      db.prepare(
        `INSERT INTO authors (id, name, slug, bio, image_id, featured, origin, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, 'demo', ?, ?)`,
      ).run(id, name, slug, bio, featured, now, now);
    }

    const categories = [
      ["قصص للأطفال", "قصص-للأطفال", "حكايات قصيرة تُقرأ معًا، بجمل واضحة وصور قريبة.", "leaf", "sage", 1, 1, 1, 1],
      ["قصص قصيرة", "قصص-قصيرة", "نصوص موجزة تُقرأ في جلسة واحدة.", "book", "cream", 2, 1, 1, 0],
      ["روايات", "روايات", "أعمال أطول، لمن يريد أن يبقى مع الشخصيات وقتًا أطول.", "book", "blue", 3, 1, 1, 1],
      ["قصص قبل النوم", "قصص-قبل-النوم", "إيقاع هادئ وختام لا يرفع الصوت.", "moon", "brand", 4, 1, 1, 1],
      ["قصص تعليمية", "قصص-تعليمية", "معرفة تمرّ من داخل موقف، لا من قائمة معلومات.", "leaf", "sage", 5, 1, 0, 0],
      ["قصص خيالية", "قصص-خيالية", "أبواب ومدن وأشياء تحدث خارج العادة، من دون ضجيج.", "path", "blush", 6, 1, 1, 0],
      ["مغامرات", "مغامرات", "خروج من المكان المألوف، ثم عودة أو طريق جديد.", "path", "blue", 7, 1, 1, 1],
      ["قصص عائلية", "قصص-عائلية", "بيوت، رسائل، وموائد تجمع أكثر من جيل.", "home", "cream", 8, 1, 1, 0],
      ["قصص مشوقة", "قصص-مشوقة", "سؤال يظل مفتوحًا حتى الصفحة الأخيرة، بهدوء.", "reed", "stone", 9, 1, 0, 0],
    ] as const;
    const categoryIds: Record<string, string> = {};
    for (const [name, slug, description, icon, color, order, home, nav, featured] of categories) {
      const id = crypto.randomUUID();
      categoryIds[name] = id;
      db.prepare(
        `INSERT INTO categories
          (id, name, slug, description, image_id, icon, color_token, sort_order, published, show_on_home, show_in_nav, featured, origin, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 1, ?, ?, ?, 'demo', ?, ?)`,
      ).run(id, name, slug, description, icon, color, order, home, nav, featured, now, now);
    }

    const stories: Array<{
      title: string;
      slug: string;
      short: string;
      full: string;
      author: string;
      category: string;
      extra: string[];
      tags: string[];
      ageMin: number;
      ageMax: number;
      type: string;
      genre: string;
      minutes: number;
      featured: number;
      popularity: number;
      priority: number;
      days: number;
      tone: string;
      variant: number;
      narrator?: string;
      series?: string;
      episode?: number;
      notes?: string;
    }> = [
      {
        title: "ريشة القمر",
        slug: "ريشة-القمر",
        short: "طفلة تجد ريشة فاتحة اللون، فتكتب بها أمنية واحدة قبل النوم.",
        full: "في الليلة التي تأخر فيها القمر، وجدت سلمى ريشة على حافة النافذة. لم تكن الريشة تلمع، لكنها كانت أخف من أن تُترك في الهواء. كتبت سلمى جملة قصيرة: أن ينام أخوها من دون أن يسأل مرة أخرى عن الظلام.\n\nحين استيقظت، كانت الريشة ما تزال على الدفتر، والجملة صارت مرتبة كأنها قُرئت بهدوء. لم تحدث معجزة كبيرة. حدث شيء أصغر: البيت صار أقل ضجيجًا، وعرفت سلمى أن بعض الأمنيات تُكتب كي نهدأ نحن ونحن نكتبها.",
        author: "لمى الحسن",
        category: "قصص قبل النوم",
        extra: ["قصص للأطفال"],
        tags: ["نوم", "قمر", "أمنية"],
        ageMin: 4,
        ageMax: 7,
        type: "قصة قبل النوم",
        genre: "خيال هادئ",
        minutes: 6,
        featured: 0,
        popularity: 4,
        priority: 2,
        days: 30,
        tone: "brand",
        variant: 0,
        narrator: "لمى الحسن",
      },
      {
        title: "الباب الذي يفتح على البحر",
        slug: "الباب-الذي-يفتح-على-البحر",
        short: "باب قديم في آخر الزقاق يقود إلى شاطئ لا يظهر على خريطة الحي.",
        full: "قال الجيران إن الباب الخشبي في آخر الزقاق لا يفتح، لأنه لا يخص أحدًا. جرّبه كريم بعد المدرسة، فوجد مفتاحًا معلّقًا بخيط من الداخل، لا من الخارج. خلف الباب لم يكن بيتًا. كانت ريحًا مالحة ودرجًا ينزل نحو ماء ساكن.\n\nلم يبقَ كريم طويلًا. أخذ حجرًا صغيرًا ليثبت أنه ذهب، ثم أغلق الباب حتى لا يضيع المكان. في اليوم التالي لم يظهر الحجر في جيبه، لكن رائحة الملح بقيت على كمه. فهم أن بعض الأبواب لا تُروى كاملة، بل تُترك لمن يحتاج أن يصدقها بنفسه.",
        author: "يوسف قاسم",
        category: "مغامرات",
        extra: ["قصص خيالية"],
        tags: ["بحر", "باب", "زقاق"],
        ageMin: 8,
        ageMax: 12,
        type: "قصة",
        genre: "مغامرة",
        minutes: 11,
        featured: 0,
        popularity: 8,
        priority: 1,
        days: 26,
        tone: "blue",
        variant: 4,
      },
      {
        title: "حديقة الأسماء",
        slug: "حديقة-الأسماء",
        short: "في الحديقة نباتات تحمل أسماء المشاعر، وعلى الأطفال أن يعرفوها من شكلها لا من لافتة.",
        full: "اصطحبت المعلمة الصف إلى حديقة المدرسة بعد أن أزالت اللافتات. قالت: كل نبتة هنا اسمها شعور، ومن يعرف الاسم يسقيها. وقف التلاميذ حائرين أمام ورقة عريضة وأخرى منكمشة.\n\nلم تعطهم هديل الجواب. تركتهم يلاحظون: النبتة التي تميل نحو الضوء، والنبتة التي تحمي جارتها من الريح. في آخر الحصة كتبوا الأسماء بأنفسهم: صبر، حذر، أنس. لم يكن الدرس قائمة كلمات. كان طريقة للنظر قبل التسمية.",
        author: "هديل مرعي",
        category: "قصص تعليمية",
        extra: ["قصص للأطفال"],
        tags: ["حديقة", "مشاعر", "مدرسة"],
        ageMin: 6,
        ageMax: 9,
        type: "قصة",
        genre: "تعليمي",
        minutes: 7,
        featured: 0,
        popularity: 3,
        priority: 6,
        days: 18,
        tone: "sage",
        variant: 3,
      },
      {
        title: "رسالة من جدتي",
        slug: "رسالة-من-جدتي",
        short: "رسالة تصل متأخرة، وفيها طريقة لصنع خبز يوم المطر.",
        full: "وصلت الرسالة بعد أسابيع من سفر الجدة، وكانت الورقة ما تزال تحمل رائحة الدرج الذي خُبئت فيه. لم تكن الرسالة طويلة. فيها خطوات لخبز يُعمل حين يشتد المطر، وتحذير صغير: لا تُستعجل الخميرة.\n\nجمع رامي إخوته في المطبخ وقرأ الجملة الأخيرة مرتين: «إذا التصق العجين باليد، فأنتم تسرعون.» ضحكوا، ثم أبطأوا. حين خرج الخبز، لم يكن مطابقًا لذاكرة أمهم، لكنه كان كافيًا ليجلسوا حوله ويتحدثوا عن الجدة بصوت عادي، لا بصوت الشوق الثقيل.",
        author: "سامي العبدالله",
        category: "قصص عائلية",
        extra: ["قصص قصيرة"],
        tags: ["جدة", "رسالة", "خبز"],
        ageMin: 7,
        ageMax: 11,
        type: "قصة",
        genre: "عائلي",
        minutes: 9,
        featured: 1,
        popularity: 7,
        priority: 2,
        days: 22,
        tone: "cream",
        variant: 2,
      },
      {
        title: "القطار الذي نسي محطته",
        slug: "القطار-الذي-نسي-محطته",
        short: "قطار صغير يضيّع اسم محطته، فيسأل الركاب ماذا يعني أن يصل الإنسان.",
        full: "توقف القطار بين محطتين ولم يعد يتذكر أيهما بيته. فتح السائق النافذة وسأل الركاب، فأعطاه كل واحد جوابًا مختلفًا: البيت حيث الحقيبة، حيث ينتظر أحد، حيث ينتهي التعب.\n\nأكمل القطار طريقه ببطء، لا لأنه وجد الاسم، بل لأن الركاب اتفقوا على النزول حيث يوجد مقعد فارغ وضوء. بقيت المحطة من دون لافتة. صار الوصول شيئًا يفعلونه معًا، لا كلمة مكتوبة على الجدار.",
        author: "نورا فهد",
        category: "قصص خيالية",
        extra: ["قصص قصيرة"],
        tags: ["قطار", "وصول", "طريق"],
        ageMin: 6,
        ageMax: 10,
        type: "قصة",
        genre: "خيال",
        minutes: 10,
        featured: 0,
        popularity: 5,
        priority: 5,
        days: 14,
        tone: "blush",
        variant: 4,
      },
      {
        title: "ظل الشجرة الكبيرة",
        slug: "ظل-الشجرة-الكبيرة",
        short: "في الظهيرة يختفي ظل الشجرة، فيخرج الأطفال ليبحثوا أين ذهب.",
        full: "كانت الشجرة في وسط الساحة ظلًا كافيًا للجميع. في يوم حار نظر الأطفال تحتها فلم يجدوا الظل في مكانه المعتاد. داروا حول الجذع، ثم حول الساحة، ثم جلسوا لأن الجري زاد الحر.\n\nجاءت الظهيرة ومالت الشمس، فعاد الظل من الجهة الأخرى، أوسع قليلًا. فهمت ليلى أن الظل لم يضع، لكنه لا يبقى حيث نتركه. شربوا الماء وانتظروا الجهة الجديدة، وصارت اللعبة أن يعرفوا أين سيكون الظل قبل أن يصلوا إليه.",
        author: "لمى الحسن",
        category: "قصص للأطفال",
        extra: ["قصص تعليمية"],
        tags: ["شجرة", "ظل", "ساحة"],
        ageMin: 3,
        ageMax: 6,
        type: "قصة",
        genre: "يومي",
        minutes: 5,
        featured: 0,
        popularity: 9,
        priority: 1,
        days: 34,
        tone: "sage",
        variant: 3,
      },
      {
        title: "دفتر الأسرار الصغير",
        slug: "دفتر-الأسرار-الصغير",
        short: "دفتر لا يفتح إلا إذا قال صاحبه ما يعرفه فعلًا، لا ما يريد أن يُقال عنه.",
        full: "وجد مازن الدفتر في درج المكتبة، وعلى غلافه جملة: لا تكتب ما لم تقله بصوت مسموع مرة واحدة. جرّب أن يكتب أنه لا يخاف من الظلام، فلم يقبل الدفتر الحبر. حين كتب أنه يخاف من السؤال أمام الصف، انفتح السطر.\n\nلم ينتشر السر. بقي في الدفتر، وصار مازن أخف حين خرج من المكتبة. القصة لا تعد بمعجزة، بل بفرق صغير بين الجملة التي تُعجب الناس والجملة التي تشبه ما حدث فعلًا.",
        author: "يوسف قاسم",
        category: "قصص مشوقة",
        extra: ["قصص قصيرة"],
        tags: ["دفتر", "صدق", "مدرسة"],
        ageMin: 10,
        ageMax: 14,
        type: "قصة قصيرة",
        genre: "تشويق هادئ",
        minutes: 13,
        featured: 0,
        popularity: 8,
        priority: 3,
        days: 11,
        tone: "stone",
        variant: 2,
        notes: "مناسبة لقسم التشويق. لا تُعرض كقصة رعب.",
      },
      {
        title: "ليلة المطر الهادئ",
        slug: "ليلة-المطر-الهادئ",
        short: "مطر يتنقل على أطراف الأزقة كي لا يوقظ أحدًا.",
        full: "قرر المطر تلك الليلة أن يكون خفيفًا. مرّ على السطوح المعدنية من طرفها، وتجنب النافذة المفتوحة في بيت الطفلة التي كانت تعد حتى العشرة.\n\nسمعته جدتها رغم ذلك، لأنها تعرف الفرق بين المطر المستعجل والمطر الذي يعتذر. أغلقت النافذة قليلًا وتركت الستارة تتحرك. نامت الطفلة عند الرقم سبعة. بقي المطر يعمل بهدوء حتى الصباح، كأنه أنهى مهمته من دون أن يطلب أن يُشكر.",
        author: "هديل مرعي",
        category: "قصص قبل النوم",
        extra: ["قصص للأطفال"],
        tags: ["مطر", "ليل", "نوم"],
        ageMin: 4,
        ageMax: 8,
        type: "قصة قبل النوم",
        genre: "هادئ",
        minutes: 6,
        featured: 0,
        popularity: 4,
        priority: 7,
        days: 6,
        tone: "blue",
        variant: 1,
        narrator: "هديل مرعي",
      },
      {
        title: "مدينة من ورق",
        slug: "مدينة-من-ورق",
        short: "رواية قصيرة عن فتاة تبني مدينة من الرسائل التي كُتبت ولم تُرسل.",
        full: "تحتفظ هدى بصندوق الرسائل التي لم يرسلها أفراد عائلتها: اعتذار أبيها، دعوة خالتها، وورقة كتبتها هي ثم طوتها. في عطلة طويلة فرغت الصندوق على الأرض وبدأت ترتب الأوراق كأنها شوارع.\n\nليست هذه الرواية لغزًا يُحل. هي إقامة بين جمل لم تجد مستلمًا. كلما أكملت هدى حيًا من الورق، اكتشفت أن بعض الرسائل لا تحتاج عنوانًا جديدًا، بل قارئة واحدة تصبر عليها. الجزء الأول يقف عند أول شارع تقدر أن تمشي فيه من دون أن تخبئ الورقة.",
        author: "سامي العبدالله",
        category: "روايات",
        extra: ["قصص قصيرة"],
        tags: ["رسائل", "مدينة", "عائلة"],
        ageMin: 13,
        ageMax: 17,
        type: "رواية",
        genre: "رواية هادئة",
        minutes: 22,
        featured: 1,
        popularity: 6,
        priority: 3,
        days: 16,
        tone: "cream",
        variant: 2,
        series: "مدينة من ورق",
        episode: 1,
      },
      {
        title: "السؤال الذي مشى",
        slug: "السؤال-الذي-مشى",
        short: "سؤال يغادر صفحة التمرين ويمشي في السوق حتى يجد جوابًا يعيشه الناس.",
        full: "كان السؤال في كتاب نورا: لماذا يتغير سعر البرتقال؟ لم يعجبها الفراغ المخصص للجواب، فخرجت إلى السوق وسألت البائعة بدل أن تسأل الهامش.\n\nسمعت عن المطر، وعن الصندوق الذي تأخر، وعن زبونة تأخذ حبتين فقط. عادت وكتبت ما رأته، لا ما توقعته المعلمة. لم يكن الجواب كاملًا، لكنه كان لها. القصة قصيرة عن الفرق بين إجابة تُحفظ وإجابة تُمشى.",
        author: "نورا فهد",
        category: "قصص قصيرة",
        extra: ["قصص تعليمية"],
        tags: ["سؤال", "سوق", "مدرسة"],
        ageMin: 12,
        ageMax: 16,
        type: "قصة قصيرة",
        genre: "تأملي",
        minutes: 11,
        featured: 0,
        popularity: 2,
        priority: 2,
        days: 2,
        tone: "blush",
        variant: 4,
      },
      {
        title: "مفتاح المطبخ",
        slug: "مفتاح-المطبخ",
        short: "مفتاح قديم يفتح المطبخ حين تجتمع العائلة على حكاية واحدة، لا على عجلة.",
        full: "المفتاح لا يعمل إذا كان أحدهم واقفًا وبيده الهاتف. اكتشف ذلك سليم مصادفة، حين جلس الجميع ليسمعوا كيف ضاع خاتم الأم ثم وُجد في علبة الأرز. دار المفتاح في القفل بهدوء.\n\nصار الدخول إلى المطبخ اتفاقًا صغيرًا: نحكي أولًا، ثم نفتح. لم يكن المفتاح سحرًا ظاهرًا. كان طريقة ليتوقف البيت دقيقة قبل أن يبدأ التقطيع والغلي. وفي تلك الدقيقة كانت الحكاية تكفي لتغيير مزاج المساء.",
        author: "لمى الحسن",
        category: "قصص عائلية",
        extra: ["قصص للأطفال"],
        tags: ["مفتاح", "مطبخ", "عائلة"],
        ageMin: 5,
        ageMax: 9,
        type: "قصة",
        genre: "عائلي",
        minutes: 8,
        featured: 0,
        popularity: 7,
        priority: 1,
        days: 20,
        tone: "cream",
        variant: 2,
      },
      {
        title: "النهر يعرف الطريق",
        slug: "النهر-يعرف-الطريق",
        short: "أطفال يتبعون نهرًا ضيّع خريطته، فيتعلمون أن الماء يحفظ الاتجاه.",
        full: "أخذ الأصدقاء خريطة قديمة إلى الوادي، فوجدوا أن النهر غيّر منحنى صغيرًا لم يعد مرسومًا. خافوا أن يعودوا من طريق خطأ، ثم لاحظت ميرا أن العشب منحنٍ دائمًا مع الجريان، لا مع الخط على الورق.\n\nمشوا مع العشب حتى ظهر الجسر الذي يعرفونه. لم تُمزق الخريطة. طُويت ووُضع بجانبها سهم صغير رسموه بأنفسهم. المغامرة هنا ليست في الضياع، بل في قبول أن الأرض تحدّث الخريطة عندما تكبر.",
        author: "هديل مرعي",
        category: "مغامرات",
        extra: ["قصص تعليمية"],
        tags: ["نهر", "خريطة", "رفقة"],
        ageMin: 8,
        ageMax: 12,
        type: "قصة",
        genre: "مغامرة",
        minutes: 12,
        featured: 1,
        popularity: 5,
        priority: 4,
        days: 4,
        tone: "blue",
        variant: 3,
      },
    ];

    const storyIds: Record<string, string> = {};
    const insertStory = db.prepare(
      `INSERT INTO stories (
        id, title, slug, short_description, full_description, author_id, cover_id, primary_category_id,
        age_min, age_max, story_type, genre, reading_minutes, featured, published, publish_at,
        popularity, view_count, favorite_count, admin_notes, display_order, narrator, series_name,
        episode_number, external_source, audio_url, video_url, priority, origin, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0, 0, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, 'demo', ?, ?)`,
    );
    stories.forEach((story, index) => {
      const id = crypto.randomUUID();
      storyIds[story.slug] = id;
      const cover = writeCover(coverSvg(story.tone, story.variant), `غلاف: ${story.title}`, db);
      insertStory.run(
        id,
        story.title,
        story.slug,
        story.short,
        story.full,
        authorIds[story.author],
        cover,
        categoryIds[story.category],
        story.ageMin,
        story.ageMax,
        story.type,
        story.genre,
        story.minutes,
        story.featured,
        daysAgo(story.days),
        story.popularity,
        story.notes ?? null,
        index + 1,
        story.narrator ?? null,
        story.series ?? null,
        story.episode ?? null,
        story.priority,
        now,
        now,
      );
      const extras = new Set([story.category, ...story.extra]);
      for (const name of extras) {
        db.prepare(`INSERT INTO story_categories (story_id, category_id) VALUES (?, ?)`).run(id, categoryIds[name]);
      }
      for (const tag of story.tags) {
        const found = db.prepare(`SELECT id FROM tags WHERE name = ?`).get(tag) as { id: string } | undefined;
        const tagId = found?.id ?? crypto.randomUUID();
        if (!found) db.prepare(`INSERT INTO tags (id, name) VALUES (?, ?)`).run(tagId, tag);
        db.prepare(`INSERT INTO story_tags (story_id, tag_id) VALUES (?, ?)`).run(id, tagId);
      }
    });

    const relations: Array<[string, string]> = [
      ["ريشة-القمر", "ليلة-المطر-الهادئ"],
      ["ليلة-المطر-الهادئ", "ريشة-القمر"],
      ["الباب-الذي-يفتح-على-البحر", "النهر-يعرف-الطريق"],
      ["النهر-يعرف-الطريق", "الباب-الذي-يفتح-على-البحر"],
      ["رسالة-من-جدتي", "مفتاح-المطبخ"],
      ["مفتاح-المطبخ", "رسالة-من-جدتي"],
      ["ظل-الشجرة-الكبيرة", "ريشة-القمر"],
      ["مدينة-من-ورق", "السؤال-الذي-مشى"],
      ["دفتر-الأسرار-الصغير", "القطار-الذي-نسي-محطته"],
    ];
    for (const [from, to] of relations) {
      db.prepare(`INSERT INTO story_relations (story_id, related_id) VALUES (?, ?)`).run(storyIds[from], storyIds[to]);
    }

    const section = db.prepare(
      `INSERT INTO homepage_sections
        (id, section_type, title, subtitle, enabled, sort_order, mode, source, category_id, item_limit, layout, accent_token, body, image_id, link_href, link_label, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    );
    const sections: Array<[string, string, string, number, string, string, string | null, number, string, string, string, string, string]> = [
      ["hero", "قصص وروايات", "ابحث بعنوان، أو اختر تصنيفًا، أو ابدأ مما يُقترح لك.", 1, "auto", "", null, 1, "with-search", "brand", "مكان هادئ للقصة التالية. التصفّح لا يحتاج حسابًا.", "", ""],
      ["categories", "استكشف التصنيفات", "كل تصنيف باب. الأسماء والألوان من إعدادات يراع.", 2, "auto", "", null, 8, "tiles", "brand", "", "/categories", "كل التصنيفات"],
      ["stories", "مقترحة لك", "تبدأ من القصص البارزة، ثم تراعي ما قرأتَه وما حفظتَه.", 3, "auto", "recommended", null, 4, "rail", "brand", "", "/explore", "تصفح المزيد"],
      ["stories", "الأكثر رواجًا", "ترتيب تحريري حسب درجة الرواج، ثم الحفظ والمشاهدة.", 4, "auto", "popular", null, 4, "rail", "sage", "", "/explore?sort=popular", "المزيد"],
      ["stories", "وصل حديثًا", "آخر القصص التي نُشرت على يراع.", 5, "auto", "recent", null, 4, "grid", "blue", "", "/explore?sort=new", "الأحدث"],
      ["stories", "اختيارات يراع", "قصص ثبتها التحرير لهذا القسم.", 6, "manual", "picks", null, 4, "feature", "blush", "", "", ""],
      ["stories", "قصص مميزة", "ما وُضع عليه تمييز من لوحة الإدارة.", 7, "auto", "featured", null, 3, "grid", "cream", "", "/explore?sort=picks", "المزيد"],
      ["stories", "مساء هادئ", "مجموعة قصيرة لمن يريد قصة قبل النوم.", 8, "manual", "category", null, 4, "grid", "brand", "", "", ""],
      ["authors", "المؤلفون", "من يكتب هذه القصص.", 9, "auto", "", null, 4, "row", "stone", "", "", ""],
    ];
    const sectionIds: Record<string, string> = {};
    sections.forEach((item, index) => {
      const id = crypto.randomUUID();
      if (item[1] === "اختيارات يراع") sectionIds.picks = id;
      if (item[1] === "مساء هادئ") sectionIds.evening = id;
      section.run(
        id,
        item[0],
        item[1],
        item[2],
        1,
        index + 1,
        item[4],
        item[5] || null,
        item[6],
        item[7],
        item[8],
        item[9],
        item[10] || null,
        item[11] || null,
        item[12] || null,
        now,
        now,
      );
    });

    const pin = db.prepare(
      `INSERT INTO section_stories (section_id, story_id, pinned, sort_order, excluded) VALUES (?, ?, 1, ?, 0)`,
    );
    ["حديقة-الأسماء", "القطار-الذي-نسي-محطته", "ليلة-المطر-الهادئ", "النهر-يعرف-الطريق"].forEach((slug, index) => {
      pin.run(sectionIds.picks, storyIds[slug], index + 1);
    });
    ["ريشة-القمر", "ليلة-المطر-الهادئ", "ظل-الشجرة-الكبيرة", "مفتاح-المطبخ"].forEach((slug, index) => {
      pin.run(sectionIds.evening, storyIds[slug], index + 1);
    });

    db.prepare(
      `INSERT INTO admin_log (id, actor_id, action, entity, entity_id, created_at) VALUES (?, ?, ?, ?, '', ?)`,
    ).run(crypto.randomUUID(), adminId, "أُضيف المحتوى التجريبي", "seed", now);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
