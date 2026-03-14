import fs from 'fs';

const ALPHABET = ['أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','هـ','و','ي'];
const filename = 'questions.csv';

if (!fs.existsSync(filename)) {
    fs.writeFileSync(filename, 'letter,question,answer\n', 'utf8');
}

// قائمة الكلمات الممنوعة (عشان ما نجيب أسئلة غبية)
const FORBIDDEN_WORDS = [
    'تحويلة', 'صفحة', 'إملائي', 'ترقيم', 'ينتهي', 'صيغة', 'علم',
    'الاسم', 'مذكورة', 'تحوّل', 'متعلق', 'نكرة', 'تصنيف', 'قالب', 'بذرة'
];

async function fetchFromWikipedia(letter) {
    let count = 0;
    // حروف عشوائية عشان نطلع مقالات مختلفة كل مرة
    const randomChars = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي";
    const prefix = letter + randomChars.charAt(Math.floor(Math.random() * randomChars.length));

    try {
        const listUrl = `https://ar.wikipedia.org/w/api.php?action=query&list=allpages&apfrom=${encodeURIComponent(prefix)}&aplimit=20&format=json`;
        const listRes = await fetch(listUrl);
        const listData = await listRes.json();
        
        if (!listData.query) return 0; // إذا ويكيبيديا ردت بـ خطأ، نتجاهله ونكمل
        
        const pages = listData.query.allpages;

        for (const page of pages) {
            // نستبعد اللي فيها أقواس وأرقام وإنجليزي
            if (page.title.includes('(') || page.title.match(/[a-zA-Z0-9]/)) continue;

            const detailUrl = `https://ar.wikipedia.org/w/api.php?action=query&prop=extracts&exsentences=1&exintro=1&explaintext=1&titles=${encodeURIComponent(page.title)}&format=json`;
            const detailRes = await fetch(detailUrl);
            const detailData = await detailRes.json();
            
            const pagesObj = detailData.query.pages;
            const pageId = Object.keys(pagesObj)[0];
            const extract = pagesObj[pageId].extract;

            if (extract && extract.length > 30 && extract.length < 200) { 
                
                let isBad = false;
                for (const word of FORBIDDEN_WORDS) {
                    if (extract.includes(word)) { isBad = true; break; }
                }

                if (!isBad) {
                    const regex = new RegExp(page.title, 'gi');
                    let hiddenQuestion = extract.replace(regex, '(...)');
                    
                    hiddenQuestion = hiddenQuestion.replace(/\n/g, ' ').replace(/,/g, '،');
                    let cleanAnswer = page.title.replace(/,/g, '،');
                    
                    let finalQuestion = `أكمل الفراغ: ${hiddenQuestion}؟`;
                    
                    fs.appendFileSync(filename, `${letter},${finalQuestion},${cleanAnswer}\n`, 'utf8');
                    count++;
                }
            }
        }
    } catch (error) {
        // لو صار أي خطأ بالاتصال، نسكت ونكمل عشان ما يوقف السكريبت
    }
    return count;
}

async function startWikiScraper() {
    console.log("🚀 تشغيل حفّارة ويكيبيديا (النسخة المضادة للحظر)...");
    let total = 0;

    // 100 لفة بتجيب لك آلاف الأسئلة بإذن الله
    for(let loop = 0; loop < 100; loop++) { 
         for (const letter of ALPHABET) {
             const count = await fetchFromWikipedia(letter);
             total += count;
             
             if (count > 0) {
                 console.log(`✅ حرف (${letter}): جمعنا ${count} | الإجمالي للحين: ${total} سؤال`);
             }
             
             // ⏳ السر هنا: نريّح السكريبت ثانية ونص بعد كل حرف عشان ما ننحظر!
             await new Promise(resolve => setTimeout(resolve, 1500));
         }
    }
    console.log(`🎉 انتهينا! جمعنا ${total} سؤال ثقافي حقيقي ونظيف 100%`);
}

startWikiScraper();