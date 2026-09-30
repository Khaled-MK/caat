/** @format */

// Interface souple pour s'adapter au format renvoyé par l'API
interface Question {
   id: number;
   question: string;
   option_a: string;
   option_b: string;
   option_c: string;
   answers: string[]; // Fallback si le serveur renvoie un tableau d'options
   correct_index: number;
   language: 0 | 1;
}

// Configuration du Quiz
const CONFIG = {
   TIME_PER_QUESTION: 8, // Temps en secondes par question
   QUESTIONS_LIMIT: 5, // Nombre de questions tirées au sort
};

// État global du Quiz
let selectedQuestions: Question[] = [];
let currentQuestionIndex: number = 0;
let userScore: number = 0;
let timerInterval: any = null;
let userAnswersHistory: UserAnswer[] = [];
/**
 * Mélange un tableau de manière aléatoire (Algorithme de Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
   const arr = [...array];
   for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
   }
   return arr;
}

/**
 * Récupère les questions depuis l'API Node.js
 */
async function fetchQuestions(): Promise<Question[]> {
   try {
      const language = document.documentElement.lang === "ar" ? 0 : 1;
      const response = await fetch(`/api/questions?language=${language}`);
      if (!response.ok) {
         throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data = await response.json();
      return data;
   } catch (error) {
      console.error("Erreur lors du chargement des questions:", error);
      return [];
   }
}

/**
 * Initialise le quiz au chargement
 */
async function initQuiz(): Promise<void> {
   const [allQuestions] = await Promise.all([fetchQuestions(), loadQuizTimerSetting()]);

   if (!allQuestions || allQuestions.length === 0) {
      const container = document.getElementById("quiz-container");
      if (container) {
         container.innerHTML = '<p class="text-center">Impossible de charger les questions.</p>';
      }
      return;
   }

   const language = document.documentElement.lang === "ar" ? 0 : 1;
   const matchingQuestions = allQuestions.filter((question) => question.language === language);
   if (matchingQuestions.length === 0) {
      const container = document.getElementById("quiz-container");
      if (container) {
         container.innerHTML = '<p class="text-center">Impossible de charger les questions.</p>';
      }
      return;
   }

   // Sélection aléatoire de 5 questions
   const shuffled = shuffleArray(matchingQuestions);
   selectedQuestions = shuffled.slice(0, CONFIG.QUESTIONS_LIMIT);

   currentQuestionIndex = 0;
   userScore = 0;
   userAnswersHistory = [];

   renderQuestion();
}

async function loadQuizTimerSetting(): Promise<void> {
   try {
      const response = await fetch("/api/settings/time-per-question");
      if (!response.ok) throw new Error("Erreur de chargement du chrono");
      const setting = await response.json();
      if (Number.isInteger(setting.seconds) && setting.seconds >= 1 && setting.seconds <= 120) {
         CONFIG.TIME_PER_QUESTION = setting.seconds;
      }
   } catch (error) {
      console.error("Utilisation du chrono par défaut:", error);
   }
}

/**
 * Affiche la question courante et démarre le chrono
 */
function renderQuestion(): void {
   // Réinitialiser le minuteur précédent
   clearInterval(timerInterval);

   const q = selectedQuestions[currentQuestionIndex];
   if (!q) return;

   // Mise à jour des textes et numéros dans le DOM
   const qNumElem = document.getElementById("current-question-num");
   const qTotalElem = document.getElementById("total-questions-num");
   const qTextElem = document.getElementById("question-text");
   const optionsContainer = document.getElementById("answers-container");

   if (qNumElem) qNumElem.textContent = (currentQuestionIndex + 1).toString();
   if (qTotalElem) qTotalElem.textContent = selectedQuestions.length.toString();
   if (qTextElem) {
      qTextElem.dataset.noTranslate = "true";
      qTextElem.textContent = q.question;
   }

   // Extraire les 3 options (compatible format BDD 'option_a' ou tableau 'answers')
   let optionsList: string[] = [];
   if (q.option_a !== undefined && q.option_b !== undefined && q.option_c !== undefined) {
      optionsList = [q.option_a, q.option_b, q.option_c];
   } else if (Array.isArray(q.answers)) {
      optionsList = q.answers;
   }

   // Génération des boutons d'options
   if (optionsContainer) {
      optionsContainer.innerHTML = "";

      optionsList.forEach((textOption, idx) => {
         const btn = document.createElement("button");
         btn.type = "button";
         btn.className = "answer-btn";
         btn.dataset.noTranslate = "true";
         const optionLabel = document.documentElement.lang === "ar" ? ["أ", "ب", "ج"][idx] : String.fromCharCode(65 + idx);
         btn.textContent = `${optionLabel}. ${textOption}`;
         btn.addEventListener("click", () => handleAnswer(idx, btn));
         optionsContainer.appendChild(btn);
      });
   }

   // Démarrer le compte à rebours
   startTimer();
}

/**
 * Gère le compte à rebours de la durée configurée
 */
function startTimer(): void {
   const timerBar = document.getElementById("timer-bar");
   const timerText = document.getElementById("timer-text");

   if (timerBar) timerBar.style.width = "100%";
   if (timerText) timerText.textContent = `${CONFIG.TIME_PER_QUESTION < 10 ? "0" : ""}${CONFIG.TIME_PER_QUESTION}s`;

   const intervalTime = 100; // Mise à jour toutes les 100ms pour la fluidité
   const totalSteps = (CONFIG.TIME_PER_QUESTION * 1000) / intervalTime;
   let step = 0;

   timerInterval = setInterval(() => {
      step++;
      const percent = Math.max(0, 100 - (step / totalSteps) * 100);

      if (timerBar) {
         timerBar.style.width = `${percent}%`;
      }

      const remainingSec = Math.ceil(CONFIG.TIME_PER_QUESTION - (step * intervalTime) / 1000);
      if (timerText) {
         timerText.textContent = `${remainingSec < 10 ? "0" : ""}${Math.max(0, remainingSec)}s`;
      }

      // Temps écoulé
      if (step >= totalSteps) {
         clearInterval(timerInterval);
         handleTimeout();
      }
   }, intervalTime);
}

/**
 * Traite le choix de réponse par le joueur
 */
function handleAnswer(selectedIndex: number, selectedBtn: HTMLButtonElement): void {
   clearInterval(timerInterval);

   const q = selectedQuestions[currentQuestionIndex];
   const allBtns = document.querySelectorAll<HTMLButtonElement>(".btn-option");

   userAnswersHistory.push({
      question_id: q.id,
      selected_index: selectedIndex,
   });

   // Désactiver tous les boutons
   allBtns.forEach((btn) => (btn.disabled = true));

   if (selectedIndex === q.correct_index) {
      userScore++;
      selectedBtn.classList.add("correct");
   } else {
      selectedBtn.classList.add("incorrect");
      // Mettre en évidence la bonne réponse
      if (allBtns[q.correct_index]) {
         allBtns[q.correct_index].classList.add("correct");
      }
   }

   setTimeout(() => {
      nextQuestion();
   }, 1200);
}

/**
 * Gestion du dépassement de temps
 */
function handleTimeout(): void {
   const q = selectedQuestions[currentQuestionIndex];
   const allBtns = document.querySelectorAll<HTMLButtonElement>(".btn-option");

   userAnswersHistory.push({
      question_id: q.id,
      selected_index: -1,
   });

   allBtns.forEach((btn) => (btn.disabled = true));

   // Révéler la bonne réponse en rouge/vert
   if (allBtns[q.correct_index]) {
      allBtns[q.correct_index].classList.add("correct");
   }

   setTimeout(() => {
      nextQuestion();
   }, 1200);
}

/**
 * Passe à la question suivante ou termine la partie
 */
function nextQuestion(): void {
   currentQuestionIndex++;
   if (currentQuestionIndex < selectedQuestions.length) {
      renderQuestion();
   } else {
      finishQuiz();
   }
}

/**
 * Enregistrement du résultat et redirection
 */
function finishQuiz(): void {
   clearInterval(timerInterval);
   sessionStorage.setItem("last_score", userScore.toString());
   sessionStorage.setItem("total_questions", selectedQuestions.length.toString());
   sessionStorage.setItem("user_answers", JSON.stringify(userAnswersHistory));

   window.location.href = "result.html";
}

// Initialisation au chargement du DOM
document.addEventListener("DOMContentLoaded", () => {
   initQuiz();
});

document.addEventListener("app-language-changed", () => {
   initQuiz();
});
