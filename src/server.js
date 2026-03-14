import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Client } = pg;
const app = express();

app.use(cors());
app.use(express.json()); // مهم جداً عشان نستقبل البيانات من اللعبة

const DATABASE_URL = process.env.DATABASE_URL;
const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => console.log("🟢 تم الشبك مع قاعدة البيانات بنجاح!"))
  .catch(err => console.error("أفا، فيه خطأ:", err));

// غيرنا الرابط لـ POST عشان اللعبة تقدر ترسل لنا "الأسئلة المحروقة"
app.post('/api/question', async (req, res) => {
  try {
    const { letter, usedIds } = req.body;
    
    // كود الفهرسة السريعة: يجيب سؤال عشوائي، ويستثني الأسئلة اللي طلعت قبل
    const query = `
      SELECT id, question, answer 
      FROM questions 
      WHERE letter = $1 AND id != ALL($2::int[]) 
      ORDER BY RANDOM() 
      LIMIT 1
    `;
    
    // نمرر الحرف، ومصفوفة الأرقام المحروقة (إذا كانت فاضية نعطيه مصفوفة فارغة [])
    const result = await client.query(query, [letter, usedIds || []]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]); // يرجع السؤال الجديد
    } else {
      res.json({ id: null, question: `خلصت كل أسئلة حرف (${letter}) يا بطل!`, answer: "لا يوجد" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطأ في السيرفر" });
  }
});

app.listen(3000, () => {
  console.log("🚀 السيرفر الخارق شغال ومستعد لنص مليون سؤال!");
});