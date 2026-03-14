import fs from 'fs';
import path from 'path';
import * as fastcsv from 'fast-csv';
import pg from 'pg';

const { Client } = pg;
const DATABASE_URL = "postgresql://neondb_owner:npg_pRfHJzu8Q0ZD@ep-billowing-resonance-am9q1qgy-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function wipeAndUpload() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("تم الشبك.. جاري مسح القاعدة القديمة بالكامل 🧹");

  try {
    // هذي التعليمة تمسح كل شيء من الجذور وتصفر الأرقام
    await client.query('TRUNCATE TABLE questions RESTART IDENTITY');
    console.log("انمسحت كل الأسئلة! القاعدة الحين فاضية وجاهزة ✨");

    const questions = [];
    const filePath = path.resolve('src', 'questions.csv');

    fs.createReadStream(filePath)
      .pipe(fastcsv.parse({ headers: true, trim: true }))
      .on('data', (row) => {
        if (row.letter && row.question && row.answer) {
          questions.push([row.letter, row.question, row.answer]);
        }
      })
      .on('end', async () => {
        console.log(`لقينا ${questions.length} سؤال بملفك الجديد. جاري الرفع..`);
        
        for (let i = 0; i < questions.length; i += 1000) {
          const batch = questions.slice(i, i + 1000);
          const valuePlaceholders = batch.map((_, j) => `($${j * 3 + 1}, $${j * 3 + 2}, $${j * 3 + 3})`).join(',');
          const query = `INSERT INTO questions (letter, question, answer) VALUES ${valuePlaceholders}`;
          await client.query(query, batch.flat());
        }
        console.log("كفو! تم رفع أسئلتك الجديدة بنجاح 🎉");
        await client.end();
      });

  } catch (err) {
    console.error("حصل خطأ:", err.message);
    await client.end();
  }
}

wipeAndUpload();