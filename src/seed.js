import pg from 'pg';
const { Client } = pg;

// هذا رابطك زاهب وموجود
const DATABASE_URL = "postgresql://neondb_owner:npg_pRfHJzu8Q0ZD@ep-billowing-resonance-am9q1qgy-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false } // ضروري عشان Neon يقبل الاتصال
});

// أسئلة تجريبية عشان نختبر الماصورة
const questionsData = [
  ['أ', 'حيوان مائي ضخم يعتبر من الثدييات؟', 'الحوت'],
  ['أ', 'أكبر قارة في العالم من حيث المساحة؟', 'آسيا'],
  ['ب', 'مدينة سعودية تلقب بعروس البحر الأحمر؟', 'جدة'],
  ['ب', 'مادة سائلة لونها أسود تستخرج من الأرض وتسمى الذهب الأسود؟', 'البترول'],
  ['ت', 'فاكهة صيفية لونها أحمر من الداخل وأخضر من الخارج؟', 'البطيخ'],
  ['ث', 'حيوان مفترس ماكر يضرب به المثل في الخداع؟', 'الثعلب'],
  ['ج', 'حيوان يتحمل العطش ويلقب بسفينة الصحراء؟', 'الجمل']
];

async function seedDatabase() {
  try {
    console.log("جاري الشبك على قاعدة البيانات...");
    await client.connect();

    // ندخل الأسئلة واحد ورا الثاني
    for (const row of questionsData) {
      await client.query(
        "INSERT INTO questions (letter, question, answer) VALUES ($1, $2, $3)",
        row
      );
    }

    console.log("يا ذيبان! تم إدخال الأسئلة بنجاح لقاعدة البيانات 🎉");
  } catch (error) {
    console.error("أفا، فيه مشكلة بالربط شف وشي:", error);
  } finally {
    await client.end();
  }
}

seedDatabase();