const fs = require('fs');

// حط اسم ملف الأسئلة حقك هنا
const inputFile = 'questions.csv'; 
// الملف الجديد اللي بتنحفظ فيه الأسئلة النظيفة (عشان ما نخرب ملفك الأصلي)
const outputFile = 'cleaned_questions.csv';

try {
    // نقرأ الملف
    let data = fs.readFileSync(inputFile, 'utf8');

    // السطر السحري المزبوط:
    // \s* -> تحذف أي مسافة زايدة قبل القوس
    // \([^)]*(جمع|جوامع)[^)]*\) -> تصيد القوسين وما بينهما بشرط يكون داخلهم كلمة "جمع" أو "جوامع"
    let cleanedData = data.replace(/\s*\([^)]*(جمع|جوامع)[^)]*\)/g, '');

    // نحفظ النتيجة في ملف جديد
    fs.writeFileSync(outputFile, cleanedData, 'utf8');

    console.log('✅ تم تنظيف الأقواس من قلب! الأسئلة باقية وصارت جاهزة، شيك على ملف cleaned_questions.csv');
} catch (err) {
    console.error('❌ أوف! صار فيه خطأ:', err);
}