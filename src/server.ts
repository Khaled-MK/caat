/** @format */

import express from "express";
import Database from "better-sqlite3";
import path from "path";
import { resourceLimits } from "worker_threads";

const app = express();
const PORT = 3000;

// Middleware pour analyser le JSON
app.use(express.json());

// Service des fichiers statiques (html, css, js client)
app.use(express.static(path.join(__dirname, "./public")));

const CONFIG_GAME = {
   SCORE_TO_WIN: 5, // Exige un sans-faute (5/5) pour gagner
   DAILY_MAX_WINNERS: 20, // Limite quotidienne de lots distribués
};

interface SubmitPayload {
   firstname: string;
   phone: string;
   score: number;
   total: number;
   answers: Array<{ question_id: number; selected_index: number }>;
}
// ---------------------------------------------------------
// INITIALISATION DE LA BASE DE DONNÉES SQLITE
// ---------------------------------------------------------
const db = new Database("caat_sprint_quiz.sqlite3");

// Optimisation des performances SQLite en local
db.pragma("journal_mode = WAL");

function initDatabase() {
   db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prenom TEXT NOT NULL,
      telephone TEXT NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      est_gagnant INTEGER NOT NULL,
      code_validation TEXT UNIQUE,
      reponses_json TEXT,
      date_horodatage DATETIME DEFAULT CURRENT_TIMESTAMP
    );

  

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      correct_index INTEGER NOT NULL
    );

      CREATE TABLE IF NOT EXISTS settings (
         key TEXT PRIMARY KEY,
         value TEXT NOT NULL
      );
  `);

   db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run("time_per_question", "8");

   // Vérification et population initiale
   const countStmt = db.prepare("SELECT COUNT(*) as total FROM questions");
   const result = countStmt.get() as { total: number };

   // const parti = db.prepare("SELECT * FROM questions ");
   // const result2 = parti.all();
   // console.log("result2 : ", result2);

   // console.log("Participants : ", result2);

   if (result.total === 0) {
      const insertStmt = db.prepare(`
      INSERT INTO questions (question, option_a, option_b, option_c, correct_index) 
      VALUES (?, ?, ?, ?, ?)
    `);

      const defaultQuestions = [
         ["في مجال التجارة الإلكترونية، ماذا يُقصد بـ «متوسط السلة» (Panier Moyen)؟", "متوسط المبلغ الذي ينفقه الزبون في الطلبية الواحدة", "عدد المنتجات المضافة التي لم يتم شراؤها", "متوسط تكلفة توصيل الطرد", 0],
         ["ماذا يعني الاختصار «MVP» بالنسبة للشركات الناشئة؟", "الشخص الأكثر قيمة (Most Valuable Person)", "المنتج الأدنى القابل للنمو (Minimum Viable Product)", "عميلة الحجم الأقصى (Maximum Volume Process)", 1],
         ["ما المقصود بتوصيل «الميل الأخير» (Dernier Kilomètre)؟", "المسافة بين مستودعين إقليميين", "المرحلة النهائية لنقل الطرد حتى تسليمه للمستلم", "التوصيل الذي يتم مشياً على الأقدام فقط", 1],
         ["ما هو الهدف الرئيسي من اختبار «A/B Testing» في التسويق الرقمي؟", "اختبار سرعة خادم الويب", "مقارنة نسختين من صفحة لقياس الأفضل في معدل التحويل", "دفع نصف سعر الإعلانات", 1],
         ["ما هو المبسط الأساسي لنموذج «الدروب شيبينج» (Dropshipping)؟", "يخزن البائع البضاعة في متجره", "يقوم الزبون بتصنيع منتجه بنفسه", "يبيع البائع بدون مخزون ويقوم المورد بالتحشين مباشرة", 2],
         ["ما هو «معدل التحويل» (Taux de Conversion) في موقع التجارة الإلكترونية؟", "نسبة الزوار الذين يقومون بعملية شراء", "التكلفة الإجمالية لتصميم موقع الويب", "عدد الأشخاص الذين يزورون الموقع شهرياً", 0],
         ["في مجال الشركات الناشئة، ما هو «العرض الترويجي» (Pitch)؟", "توقيع عقد مع البنك", "عرض التقديمي قصير ومؤثر لإقناع المستثمرين", "الإنخفاض الحاد في رقم الأعمال", 1],
         ["إلى ماذا يشير الاختصار «SEO» في التسويق الرقمي؟", "نظام تبادل الخيارات", "خدمة الشحن العادي", "تحسين محركات البحث (الظهور الطبيعي)", 2],
         ["ماذا يسمى «تخلي عن السلة» (Abandon de panier)؟", "عندما يضيف الزبون منتجات لسلتها ثم يغادر الموقع دون شراء", "عندما يفقد عامل التوصيل طرد الزبون", "منتج تم سحبه نهائياً من الكتالوج", 0],
         ["ماذا يعني مصطلح «نمو الهدم» (Growth Hacking)؟", "اختراق خوادم المنافسين الإلكترونية", "استخدام تقنيات سريعة ومبتكرة لتحقيق نمو سريع للشركة", "التوظيف المكثف للمطورين الجدد", 1],
         ["ما هو مفهوم «اضغط واستلم» (Click and Collect)؟", "الشراء عبر الإنترنت واستلام المنتج مباشرة من المتجر", "النقر عدة مرات على إعلان للحصول على تخفيض", "دفع ثمن المنتج نقداً عند التسليم في المنزل", 0],
         ["في التجارة الإلكترونية، ماذا يعني المؤشر «CAC»؟", "رقم الأعمال التراكمي", "تكلفة الاستحواذ على الزبون (Coût d'Acquisition Client)", "الحساب التلقائي للسلة", 1],
         ["ما هو نموذج العمل القائم على «الاشتراك» (SaaS)؟", "دفع مبلغ دوري للوصول المنتظم إلى خدمة", "شراء لمرة واحدة مع توصيل مجاني مدى الحياة", "قرض بنكي بفائدة صفر لتمويل الشراء", 0],
         ["في اللوجستيات، ما هو «التلافي» (Cross-docking)؟", "التوصيل الدولي عبر سفن الحاويات", "النقل المباشر للبضائع من رصيف الوصول إلى رصيف المغادرة دون تخزين", "إعادة المنتجات المعيبة إلى المصنع", 1],
         ["إلام يشير «معدل التخلي/إلغاء الاشتراك» (Churn Rate) في التجارة الإلكترونية؟", "عدد المشتركين الجدد كل شهر", "سرعة تحميل الصور على الموقع", "نسبة الزبائن المفقودين أو ملغي الاشتراك خلال فترة معينة", 2],

         ["Dans le domaine du e-commerce, qu'appelle-t-on le « Panier Moyen » ?", "Le montant moyen dépensé par un client lors d'une commande", "Le nombre d'articles ajoutés mais non achetés", "Le coût moyen de livraison d'un colis", 0],
         ["Que signifie l'acronyme « MVP » pour une startup ?", "Most Valuable Person", "Minimum Viable Product", "Maximum Volume Process", 1],
         ["Qu'est-ce que la livraison du « Dernier Kilomètre » ?", "Le trajet entre deux entrepôts régionaux", "L'étape finale d'acheminement du colis jusqu'au destinataire", "La livraison effectuée uniquement à pied", 1],
         ["Quel est l'objectif principal de l'A/B Testing en marketing digital ?", "Tester la vitesse du serveur web", "Comparer deux versions d'une page pour mesurer la meilleure conversion", "Payer ses publicités deux fois moins cher", 1],
         ["Quel est le principe fondamental du modèle « Dropshipping » ?", "Le vendeur stocke la marchandise dans son magasin", "Le client fabrique lui-même son produit", "Le vendeur vend sans stock et le fournisseur expédie directement", 2],
         ["Qu'est-ce que le « Taux de Conversion » sur un site e-commerce ?", "Le pourcentage de visiteurs qui réalisent un achat", "Le coût total de conception du site web", "Le nombre de personnes qui visitent le site chaque mois", 0],
         ["Dans le domaine des startups, qu'est-ce que le « Pitch » ?", "La signature d'un contrat avec la banque", "Une présentation courte et percutante pour convaincre des investisseurs", "La baisse brutale du chiffre d'affaires", 1],
         ["Que désigne l'acronyme « SEO » en marketing digital ?", "Système d'Échange d'Options", "Service d'Expédition Ordinaire", "L'optimisation pour les moteurs de recherche (référencement naturel)", 2],
         ["Qu'appelle-t-on l'abandon de panier ?", "Lorsqu'un client ajoute des articles à son panier mais quitte le site sans acheter", "Lorsqu'un livreur perd le colis d'un client", "Un produit retiré définitivement du catalogue", 0],
         ["Que signifie le terme « Growth Hacking » ?", "Le piratage informatique des serveurs concurrents", "L'utilisation de techniques rapides et innovantes pour faire croître une entreprise", "Le recrutement massif de nouveaux développeurs", 1],
         ["Qu'est-ce que le « Click and Collect » ?", "Acheter en ligne et aller retirer son produit directement en magasin", "Cliquer plusieurs fois sur une pub pour obtenir une réduction", "Payer son produit en cash lors de la livraison à domicile", 0],
         ["Dans le e-commerce, que signifie l'indicateur « CAC » ?", "Chiffre d'Affaires Cumulé", "Coût d'Acquisition Client", "Calcul Automatique du Panier", 1],
         ["Qu'est-ce qu'un modèle économique d'« Abonnement » (SaaS) ?", "Le paiement d'un montant récurrent pour accéder régulièrement à un service", "Un achat unique avec livraison gratuite à vie", "Un prêt bancaire à taux zéro pour financer un achat", 0],
         ["En logistique, qu'est-ce que le « Cross-docking » ?", "La livraison internationale par bateau à conteneurs", "Le passage direct des marchandises du quai d'arrivée au quai de départ sans stockage", "Le retour des produits défectueux à l'usine", 1],
         ["Que désigne le « Churn Rate » (ou taux d'attrition) pour un service e-commerce ?", "Le nombre de nouveaux abonnés chaque mois", "La vitesse de chargement des images sur le site", "Le pourcentage de clients perdus ou désabonnés sur une période donnée", 2],
      ];

      const insertMany = db.transaction((questions) => {
         for (const q of questions) insertStmt.run(...q);
      });

      insertMany(defaultQuestions);
      console.log("[SQLite] Base initialisée avec les questions par défaut.");
   } else {
      console.log("[SQLite] Base de données prête.");
   }
}

// Lancement de l'initialisation BDD
initDatabase();

// ---------------------------------------------------------
// ROUTES API EXPRESS (Exemples légers)
// ---------------------------------------------------------

// Récupérer toutes les questions

app.get("/", (req, res) => {
   res.sendFile(path.join(__dirname, "./public/index.html"));
});
app.get("/questionsPage", (req, res) => {
   res.sendFile(path.join(__dirname, "./public/questions.html"));
});

app.get("/quizPage", (req, res) => {
   res.sendFile(path.join(__dirname, "./public/quiz.html"));
});

app.get("/api/questions", async (req, res) => {
   const stmt = db.prepare("SELECT * FROM questions");
   console.log("questions trouvées :", stmt);
   res.json(stmt.all());
});

app.get("/api/settings/time-per-question", (req, res) => {
   const setting = db.prepare("SELECT value FROM settings WHERE key = ?").get("time_per_question") as { value: string };
   res.json({ seconds: Number(setting.value) });
});

app.put("/api/settings/time-per-question", (req, res) => {
   const { seconds } = req.body as { seconds: number };
   if (!Number.isInteger(seconds) || seconds < 1 || seconds > 120) {
      return res.status(400).json({ error: "La durée doit être un nombre entier entre 1 et 120 secondes." });
   }

   db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run("time_per_question", seconds.toString());
   return res.json({ success: true, seconds });
});

// Ajouter un participant
// app.post("/api/participants", (req, res) => {
//    const { prenom, telephone, score, est_gagnant, code_validation } = req.body;
//    const stmt = db.prepare(`
//     INSERT INTO participants (prenom, telephone, score, est_gagnant, code_validation)
//     VALUES (?, ?, ?, ?, ?)
//   `);
//    const info = stmt.run(prenom, telephone, score, est_gagnant, code_validation);
//    res.json({ success: true, id: info.lastInsertRowid });
// });

// Enregistrer un score

app.post("/api/save-answers", (req, res) => {
   const { firstname, phone, score, total, answers } = req.body as SubmitPayload;

   // if (!firstname?.trim() || !phone?.trim() || !Number.isInteger(score) || !Number.isInteger(total) || !Array.isArray(answers)) {
   //    res.status(400).json({ success: false, error: "Données de participation invalides." });
   //    console.log("Données invalides reçues :", req.body);
   //    return;
   // }

   const stmt = db.prepare(`
      INSERT INTO participants (prenom, telephone, score, total, est_gagnant, reponses_json)
      VALUES (?, ?, ?, ?, ?, ?)
   `);
   const info = stmt.run(firstname.trim(), phone.trim(), score, total, score === total ? 1 : 0, JSON.stringify(answers));
   console.log("Participation enregistrée :", { firstname, phone, score, total, answers });

   res.status(201).json({ success: true, id: info.lastInsertRowid });
});

app.get("/api/admin/stats", (req, res) => {
   try {
      // 1. Métriques globales
      const globalRow = db
         .prepare(
            `
         SELECT 
            COUNT(*) as totalParticipants,
            SUM(CASE WHEN est_gagnant = 1 THEN 1 ELSE 0 END) as totalWinners,
            AVG(score) as globalAvgScore
         FROM participants
      `,
         )
         .get() as { totalParticipants: number; totalWinners: number; globalAvgScore: number };

      // 2. Statistiques par jour
      const dailyStats = db
         .prepare(
            `
         SELECT 
            DATE(date_horodatage) as date,
            COUNT(*) as participants,
            SUM(CASE WHEN est_gagnant = 1 THEN 1 ELSE 0 END) as winners,
            AVG(score) as avgScore
         FROM participants
         GROUP BY DATE(date_horodatage)
         ORDER BY date DESC
      `,
         )
         .all();

      // 3. Statistiques par heure (Format HH:00)
      const hourlyStats = db
         .prepare(
            `
         SELECT 
            STRFTIME('%H:00', date_horodatage) as hour,
            COUNT(*) as participants,
            SUM(CASE WHEN est_gagnant = 1 THEN 1 ELSE 0 END) as winners,
            AVG(score) as avgScore
         FROM participants
         GROUP BY hour
         ORDER BY hour ASC
      `,
         )
         .all();

      const participants = db
         .prepare(
            `
         SELECT prenom, telephone, score, total, date_horodatage as dateHorodatage
         FROM participants
         ORDER BY date_horodatage DESC, id DESC
      `,
         )
         .all();

      // 4. Calcul du Top 3 des questions avec le taux de réussite le plus élevé
      const allParticipants = db.prepare(`SELECT reponses_json FROM participants WHERE reponses_json IS NOT NULL`).all() as Array<{ reponses_json: string }>;
      const questionsList = db.prepare(`SELECT id, question, correct_index FROM questions`).all() as Array<{ id: number; question: string; correct_index: number }>;

      const questionStatsMap: { [id: number]: { question: string; totalAsked: number; correctCount: number } } = {};

      questionsList.forEach((q) => {
         questionStatsMap[q.id] = { question: q.question, totalAsked: 0, correctCount: 0 };
      });

      allParticipants.forEach((p) => {
         try {
            const answers: Array<{ question_id: number; selected_index: number }> = JSON.parse(p.reponses_json);
            answers.forEach((ans) => {
               const qInfo = questionsList.find((q) => q.id === ans.question_id);
               if (qInfo && questionStatsMap[ans.question_id]) {
                  questionStatsMap[ans.question_id].totalAsked++;
                  if (ans.selected_index === qInfo.correct_index) {
                     questionStatsMap[ans.question_id].correctCount++;
                  }
               }
            });
         } catch (e) {
            // Ignorer les entrées JSON invalides
         }
      });

      const topQuestions = Object.keys(questionStatsMap)
         .map((id) => {
            const item = questionStatsMap[Number(id)];
            const successRate = item.totalAsked > 0 ? (item.correctCount / item.totalAsked) * 100 : 0;
            return {
               id: Number(id),
               question: item.question,
               totalAsked: item.totalAsked,
               correctCount: item.correctCount,
               successRate: successRate,
            };
         })
         .filter((q) => q.totalAsked > 0)
         .sort((a, b) => b.successRate - a.successRate)
         .slice(0, 3);

      return res.status(200).json({
         totalParticipants: globalRow.totalParticipants || 0,
         totalWinners: globalRow.totalWinners || 0,
         globalAvgScore: globalRow.globalAvgScore || 0,
         dailyStats: dailyStats,
         hourlyStats: hourlyStats,
         topQuestions: topQuestions,
         participants: participants,
      });
   } catch (error) {
      console.error("Erreur calcul stats admin:", error);
      return res.status(500).json({ error: "Erreur lors de la génération des statistiques." });
   }
});

// ---------------------------------------------------------
// DÉMARRAGE DU SERVEUR
// ---------------------------------------------------------
app.listen(PORT, () => {
   console.log(`🚀 Serveur démarré sur : http://localhost:${PORT}`);
});
