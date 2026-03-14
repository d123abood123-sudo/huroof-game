import fs from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

// ⚠️ مهم جداً: امسح الجملة اللي تحت وحط الرابط حق قاعدة بيانات Neon الخاص بك
// (الرابط الطويل اللي يبدأ بـ postgresql://) ولا تنسى تخليه بين علامات التنصيص!
const dbUrl = "postgresql://neondb_owner:npg_pRfHJzu8Q0ZD@ep-billowing-resonance-am9q1qgy-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

const validLetters = ['أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','هـ','و','ي'];

// توحيد الحروف المتشابهة
function normalizeChar(char) {
  if (['أ', 'إ', 'آ', 'ا'].includes(char)) return 'أ';
  if (['ه', 'هـ'].includes(char)) return 'هـ';
  if (char === 'ة') return 'ت';
  if (char === 'ى') return 'ي';
  if (char === 'ؤ') return 'و';
  if (char === 'ئ') return 'ي';
  return char;
}

async function executeBossMove() {
  console.log('🚀 بدأت عملية "الكي الكيماوي" لتنظيف ورفع الأسئلة...');
  
  try {
    // قراءة الملف النصي الخاص بك
const data = fs.readFileSync('questions.csv', 'utf8');
    const lines = data.split('\n');
    
    let cleanQuestions = [];
    const uniqueCheck = new Set();
    let fixedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',');
      if (parts.length >= 3) {
        const originalLetter = parts[0].trim();
        const answer = parts[parts.length - 1].trim();
        const question = parts.slice(1, -1).join(',').trim();

        // تنظيف الإجابة من أي مسافات أو علامات تنصيص في البداية
        let cleanAnswer = answer.replace(/^["'\[\]\(\)\-\s]+/, '').trim();
        
        // إزالة "ال" أو "الـ" التعريف للوصول للحرف الأساسي
        if (cleanAnswer.startsWith('ال') && cleanAnswer.length > 2) {
          cleanAnswer = cleanAnswer.substring(2).trim();
        } else if (cleanAnswer.startsWith('الـ') && cleanAnswer.length > 3) {
          cleanAnswer = cleanAnswer.substring(3).trim();
        }
        
        if (!cleanAnswer) continue;

        // أخذ الحرف الأول الحقيقي
        const firstChar = normalizeChar(cleanAnswer.charAt(0));

        // إذا كان الحرف ضمن حروف اللعبة، نعتمد الحرف المستخرج ونصحح الخطأ
        if (validLetters.includes(firstChar)) {
          const uniqueKey = `${firstChar}-${answer}`;
          if (!uniqueCheck.has(uniqueKey)) {
            uniqueCheck.add(uniqueKey);
            // لاحظ هنا حطينا firstChar بدل originalLetter لفرض المنطق الصحيح
            cleanQuestions.push({ letter: firstChar, question, answer });
            
            if (firstChar !== originalLetter) fixedCount++;
          }
        }
      }
    }

    console.log(`✅ تم فلترة وتجهيز ${cleanQuestions.length} سؤال نظيف ومنطقي 100%.`);
    console.log(`🛠️ تم إنقاذ وتعديل حرف لـ ${fixedCount} سؤال كانت موضوعة تحت حروف خاطئة!`);

    console.log('🧹 جاري مسح قاعدة البيانات القديمة المضروبة...');
    await pool.query('TRUNCATE TABLE questions RESTART IDENTITY');
    
    console.log('📤 جاري رفع الأسئلة الذهبية للسيرفر (قد تستغرق العملية ثواني)...');
    for (let q of cleanQuestions) {
      await pool.query(
        'INSERT INTO questions (letter, question, answer) VALUES ($1, $2, $3)',
        [q.letter, q.question, q.answer]
      );
    }

    console.log('--------------------------------------------------');
    console.log('🔥 تمت المهمة بنجاح 100%! موقعك الآن خالي من أي عيب أو شطحة.');
    console.log('--------------------------------------------------');

  } catch (err) {
    console.error('❌ حدث خطأ:', err);
  } finally {
    pool.end();
  }
}

executeBossMove();