import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const validLetters = ['أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','هـ','و','ي'];

function normalizeChar(char) {
  if (['أ', 'إ', 'آ', 'ا'].includes(char)) return 'أ';
  if (['ه', 'هـ'].includes(char)) return 'هـ';
  if (char === 'ة') return 'ت';
  if (char === 'ى') return 'ي';
  return char;
}

async function rescueDatabase() {
  console.log('🚑 عملية الإنقاذ والترميم بدأت...');
  try {
    const res = await pool.query('SELECT id, letter, question, answer FROM questions');
    let fixedCount = 0;
    let deletedCount = 0;
    let keptCount = 0;

    for (let row of res.rows) {
      let originalAnswer = row.answer.trim();
      let cleanAnswer = originalAnswer;

      // إزالة أل التعريف للبحث عن الحرف الأساسي الفعلي
      if (cleanAnswer.startsWith('ال') && cleanAnswer.length > 2) {
        cleanAnswer = cleanAnswer.substring(2);
      } else if (cleanAnswer.startsWith('الـ') && cleanAnswer.length > 3) {
        cleanAnswer = cleanAnswer.substring(3);
      }

      cleanAnswer = cleanAnswer.trim();

      // لو الإجابة فاضية احذفها
      if (!cleanAnswer) {
        await pool.query('DELETE FROM questions WHERE id = $1', [row.id]);
        deletedCount++;
        continue;
      }

      let firstChar = normalizeChar(cleanAnswer.charAt(0));

      // التحقق هل الحرف صالح ضمن حروف اللعبة؟
      if (validLetters.includes(firstChar)) {
        // هل الحرف المسجل في القاعدة يختلف عن الحرف المستخرج الفعلي؟
        if (row.letter !== firstChar) {
          // هنا الإنقاذ: نحدث الحرف في القاعدة ليتطابق مع الإجابة!
          await pool.query('UPDATE questions SET letter = $1 WHERE id = $2', [firstChar, row.id]);
          console.log(`🛠️ إنقاذ: [${originalAnswer}] -> نقلت من (${row.letter}) إلى حرفها الصحيح (${firstChar})`);
          fixedCount++;
        } else {
          keptCount++;
        }
      } else {
        // إجابة غير منطقية تماماً (تبدأ برقم أو رمز أو حرف إنجليزي)
        await pool.query('DELETE FROM questions WHERE id = $1', [row.id]);
        console.log(`💥 تفجير (حذف نهائي): الإجابة [${originalAnswer}] غير منطقية!`);
        deletedCount++;
      }
    }

    console.log('-----------------------------------');
    console.log(`🎉 انتهت عملية الإنقاذ بنجاح!`);
    console.log(`✅ أسئلة سليمة لم تحتاج تعديل: ${keptCount}`);
    console.log(`🛠️ أسئلة تم إنقاذها ونقلها للحرف الصحيح: ${fixedCount}`);
    console.log(`🗑️ أسئلة ميؤوس منها تم حذفها: ${deletedCount}`);
    console.log(`📊 إجمالي الأسئلة النظيفة والجاهزة للعب: ${keptCount + fixedCount}`);

  } catch (err) {
    console.error('❌ خطأ أثناء العملية:', err);
  } finally {
    pool.end();
  }
}

rescueDatabase();