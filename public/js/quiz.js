/** @format */

"use strict";
var __awaiter =
   (this && this.__awaiter) ||
   function (thisArg, _arguments, P, generator) {
      function adopt(value) {
         return value instanceof P
            ? value
            : new P(function (resolve) {
                 resolve(value);
              });
      }
      return new (P || (P = Promise))(function (resolve, reject) {
         function fulfilled(value) {
            try {
               step(generator.next(value));
            } catch (e) {
               reject(e);
            }
         }
         function rejected(value) {
            try {
               step(generator["throw"](value));
            } catch (e) {
               reject(e);
            }
         }
         function step(result) {
            result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
         }
         step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
   };
const CONFIG = {
   TIME_PER_QUESTION: 8,
   QUESTIONS_LIMIT: 5,
};
let selectedQuestions = [];
let currentQuestionIndex = 0;
let userScore = 0;
let timerInterval = null;
let userAnswersHistory = [];
function shuffleArray(array) {
   const arr = [...array];
   for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
   }
   return arr;
}
function fetchQuestions() {
   return __awaiter(this, void 0, void 0, function* () {
      try {
         const response = yield fetch("/api/questions");
         if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
         }
         const data = yield response.json();
         return data;
      } catch (error) {
         console.error("Erreur lors du chargement des questions:", error);
         return [];
      }
   });
}
function initQuiz() {
   return __awaiter(this, void 0, void 0, function* () {
      const [allQuestions] = yield Promise.all([fetchQuestions(), loadQuizTimerSetting()]);
      if (!allQuestions || allQuestions.length === 0) {
         const container = document.getElementById("quiz-container");
         if (container) {
            container.innerHTML = '<p class="text-center">Impossible de charger les questions.</p>';
         }
         return;
      }
      const shuffled = shuffleArray(allQuestions);
      selectedQuestions = shuffled.slice(0, CONFIG.QUESTIONS_LIMIT);
      currentQuestionIndex = 0;
      userScore = 0;
      renderQuestion();
   });
}
function loadQuizTimerSetting() {
   return __awaiter(this, void 0, void 0, function* () {
      try {
         const response = yield fetch("/api/settings/time-per-question");
         if (!response.ok) throw new Error("Erreur de chargement du chrono");
         const setting = yield response.json();
         if (Number.isInteger(setting.seconds) && setting.seconds >= 1 && setting.seconds <= 120) {
            CONFIG.TIME_PER_QUESTION = setting.seconds;
         }
      } catch (error) {
         console.error("Utilisation du chrono par défaut:", error);
      }
   });
}
function renderQuestion() {
   clearInterval(timerInterval);
   const q = selectedQuestions[currentQuestionIndex];
   if (!q) return;
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
   let optionsList = [];
   if (q.option_a !== undefined && q.option_b !== undefined && q.option_c !== undefined) {
      optionsList = [q.option_a, q.option_b, q.option_c];
   } else if (Array.isArray(q.answers)) {
      optionsList = q.answers;
   }
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
   startTimer();
}
function startTimer() {
   const timerBar = document.getElementById("timer-bar");
   const timerText = document.getElementById("timer-text");
   if (timerBar) timerBar.style.width = "100%";
   if (timerText) timerText.textContent = `${CONFIG.TIME_PER_QUESTION < 10 ? "0" : ""}${CONFIG.TIME_PER_QUESTION}s`;
   const intervalTime = 100;
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
      if (step >= totalSteps) {
         clearInterval(timerInterval);
         handleTimeout();
      }
   }, intervalTime);
}
function handleAnswer(selectedIndex, selectedBtn) {
   clearInterval(timerInterval);
   const q = selectedQuestions[currentQuestionIndex];
   const allBtns = document.querySelectorAll(".btn-option");
   userAnswersHistory.push({
      question_id: q.id,
      selected_index: selectedIndex,
   });
   allBtns.forEach((btn) => (btn.disabled = true));
   if (selectedIndex === q.correct_index) {
      userScore++;
      selectedBtn.classList.add("correct");
   } else {
      selectedBtn.classList.add("incorrect");
      if (allBtns[q.correct_index]) {
         allBtns[q.correct_index].classList.add("correct");
      }
   }
   setTimeout(() => {
      nextQuestion();
   }, 1200);
}
function handleTimeout() {
   const q = selectedQuestions[currentQuestionIndex];
   const allBtns = document.querySelectorAll(".btn-option");
   userAnswersHistory.push({
      question_id: q.id,
      selected_index: -1,
   });
   allBtns.forEach((btn) => (btn.disabled = true));
   if (allBtns[q.correct_index]) {
      allBtns[q.correct_index].classList.add("correct");
   }
   setTimeout(() => {
      nextQuestion();
   }, 1200);
}
function nextQuestion() {
   currentQuestionIndex++;
   if (currentQuestionIndex < selectedQuestions.length) {
      renderQuestion();
   } else {
      finishQuiz();
   }
}
function finishQuiz() {
   clearInterval(timerInterval);
   sessionStorage.setItem("last_score", userScore.toString());
   sessionStorage.setItem("total_questions", selectedQuestions.length.toString());
   sessionStorage.setItem("user_answers", JSON.stringify(userAnswersHistory));
   window.location.href = "result.html";
}
document.addEventListener("DOMContentLoaded", () => {
   initQuiz();
});
