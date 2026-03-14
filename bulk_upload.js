import fs from 'fs';
import path from 'path';
import * as fastcsv from 'fast-csv';
import pg from 'pg';

const { Client } = pg;

// رابط قاعدتك في Neon (موجود وجاهز)
const DATABASE_URL = "postgresql://neondb_owner:npg_pRfHJzu8Q0ZD@ep-billowing-resonance-am9q1qgy-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function uploadQuestions() {
  const client = new Client({ 
    connectionString: DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
  });
  
  await client.connect();
  console.log("تم الشبك مع القاعدة.. جاري قراءة الملف 🚀");

  const questions = [];
  // المسار لملف الأسئلة داخل مجلد src
  const filePath = path.resolve('src', 'questions.csv');

  if (!fs.existsSync(filePath)) {
    console.error("أفا! ملف questions.csv مالقيته داخل مجلد src. تأكد من مكانه!");
    process.exit(1);
  }

  fs.createReadStream(filePath)
    .pipe(fastcsv.parse({ headers: true, trim: true }))
    .on('data', (row) => {
      // نتأكد إن السطر فيه بيانات كاملة
      if (row.letter && row.question && row.answer) {
        questions.push([row.letter, row.question, row.answer]);
      }
    })
    .on('end', async () => {
      console.log(`لقينا ${questions.length} سؤال بالملف. جاري الرفع..`);
      
      try {
        // نرفع الأسئلة على دفعات (batches) عشان ما نضغط السيرفر
        for (let i = 0; i < questions.length; i += 1000) {
          const batch = questions.slice(i, i + 1000);
          
          // بناء استعلام الإدخال المتعدد
          const valuePlaceholders = batch.map((_, j) => `($${j * 3 + 1}, $${j * 3 + 2}, $${j * 3 + 3})`).join(',');
          const query = `INSERT INTO questions (letter, question, answer) VALUES ${valuePlaceholders}`;
          
          await client.query(query, batch.flat());
          console.log(`تم رفع ${Math.min(i + 1000, questions.length)} سؤال...`);
        }
        console.log("كفو والله! تم رفع جميع الأسئلة بنجاح 🎉");
      } catch (err) {
        console.error("حصلت مشكلة أثناء الرفع:", err.message);
      } finally {
        await client.end();
      }
    });
}

uploadQuestions();