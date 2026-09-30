/** @format */

interface DailyStat {
   date: string;
   participants: number;
   winners: number;
   avgScore: number;
}

interface HourlyStat {
   hour: string;
   participants: number;
   winners: number;
   avgScore: number;
}

interface TopQuestion {
   id: number;
   question: string;
   totalAsked: number;
   correctCount: number;
   successRate: number;
}

interface ParticipantEntry {
   prenom: string;
   telephone: string;
   score: number;
   total: number;
   dateHorodatage: string;
}

interface AdminDashboardStats {
   totalParticipants: number;
   totalWinners: number;
   globalAvgScore: number;
   dailyStats: DailyStat[];
   hourlyStats: HourlyStat[];
   topQuestions: TopQuestion[];
   participants: ParticipantEntry[];
}

const ADMIN_PIN = "1234";

function translateAdminMessage(message: string): string {
   return (window as Window & { AppI18n?: { translate: (value: string) => string } }).AppI18n?.translate(message) ?? message;
}

document.addEventListener("DOMContentLoaded", () => {
   const pinInput = document.getElementById("admin-pin") as HTMLInputElement;
   const pinError = document.getElementById("admin-pin-error") as HTMLElement;
   const adminLock = document.getElementById("admin-lock") as HTMLElement;
   const adminContent = document.getElementById("admin-content") as HTMLElement;

   pinInput.focus();

   const clearPinError = (): void => {
      pinError.hidden = true;
      pinInput.classList.remove("pin-input-error");
   };

   const unlockAdmin = (): void => {
      if (pinInput.value === ADMIN_PIN) {
         clearPinError();
         adminLock.remove();
         adminContent.style.display = "flex";
         fetchDashboardStats();
      } else if (pinInput.value.length === 4) {
         // pinError.hidden = false;
         pinInput.classList.add("pin-input-error");
         pinInput.value = "";
      }
   };

   pinInput.addEventListener("input", () => {
      clearPinError();
      unlockAdmin();
   });

   document.querySelectorAll<HTMLButtonElement>("[data-pin-key]").forEach((button) => {
      button.addEventListener("click", () => {
         const key = button.dataset.pinKey;

         if (key === "clear") {
            pinInput.value = "";
         } else if (key === "backspace") {
            pinInput.value = pinInput.value.slice(0, -1);
         } else if (pinInput.value.length < 4 && key) {
            pinInput.value += key;
         }

         clearPinError();
         pinInput.focus();
         unlockAdmin();
      });
   });
});

async function fetchDashboardStats(): Promise<void> {
   try {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) throw new Error("Erreur de récupération des données.");

      const stats: AdminDashboardStats = await response.json();
      renderKPIs(stats);
      renderTopQuestions(stats.topQuestions);
      renderDailyTable(stats.dailyStats);
      renderHourlyTable(stats.hourlyStats);
      renderParticipantsTable(stats.participants);
   } catch (error) {
      console.error("Erreur Admin Stats:", error);
      alert(translateAdminMessage("Impossible de charger les statistiques d'administration."));
   }
}

function renderKPIs(stats: AdminDashboardStats): void {
   const totalPartEl = document.getElementById("total-participants");
   const totalWinEl = document.getElementById("total-winners");
   const avgScoreEl = document.getElementById("global-avg-score");

   if (totalPartEl) totalPartEl.textContent = stats.totalParticipants.toString();
   if (totalWinEl) totalWinEl.textContent = stats.totalWinners.toString();
   if (avgScoreEl) avgScoreEl.textContent = `${stats.globalAvgScore.toFixed(2)} pts`;
}

function renderTopQuestions(topQuestions: TopQuestion[]): void {
   const container = document.getElementById("top-questions-list");
   if (!container) return;

   if (!topQuestions || topQuestions.length === 0) {
      container.innerHTML = `<div class="loading">Aucune donnée disponible.</div>`;
      return;
   }

   container.innerHTML = topQuestions
      .slice(0, 3)
      .map(
         (q, idx) => `
         <div class="question-card">
            <span class="question-rank">#${idx + 1}</span>
            <div class="question-text" data-no-translate>${q.question}</div>
            <div class="progress-bar-bg">
               <div class="progress-bar-fill" style="width: ${q.successRate.toFixed(1)}%;"></div>
            </div>
            <div class="success-rate">${q.successRate.toFixed(1)}% de réussite (${q.correctCount}/${q.totalAsked})</div>
         </div>
      `,
      )
      .join("");
}

function renderDailyTable(dailyStats: DailyStat[]): void {
   const tbody = document.getElementById("daily-stats-body");
   if (!tbody) return;

   if (!dailyStats || dailyStats.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="loading">Aucune donnée.</td></tr>`;
      return;
   }

   tbody.innerHTML = dailyStats
      .map(
         (row) => `
      <tr>
         <td><strong>${row.date}</strong></td>
         <td>${row.participants}</td>
         <td>${row.winners}</td>
         <td>${row.avgScore.toFixed(2)}</td>
      </tr>
   `,
      )
      .join("");
}

function renderHourlyTable(hourlyStats: HourlyStat[]): void {
   const tbody = document.getElementById("hourly-stats-body");
   if (!tbody) return;

   if (!hourlyStats || hourlyStats.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="loading">Aucune donnée.</td></tr>`;
      return;
   }

   tbody.innerHTML = hourlyStats
      .map(
         (row) => `
      <tr>
         <td><strong>${row.hour}</strong></td>
         <td>${row.participants}</td>
         <td>${row.winners}</td>
         <td>${row.avgScore.toFixed(2)}</td>
      </tr>
   `,
      )
      .join("");
}

function renderParticipantsTable(participants: ParticipantEntry[]): void {
   const tbody = document.getElementById("participants-stats-body");
   if (!tbody) return;

   if (!participants || participants.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="loading">Aucune participation.</td></tr>`;
      return;
   }

   tbody.replaceChildren();
   participants.forEach((participant) => {
      const row = document.createElement("tr");
      const playedAt = new Date(`${participant.dateHorodatage.replace(" ", "T")}Z`);
      const formattedDate = Number.isNaN(playedAt.getTime())
         ? participant.dateHorodatage
         : new Intl.DateTimeFormat(document.documentElement.lang === "ar" ? "ar-DZ" : "fr-FR", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
           }).format(playedAt);

      [participant.prenom, participant.telephone, `${participant.score} / ${participant.total}`, formattedDate].forEach((value) => {
         const cell = document.createElement("td");
         cell.textContent = value;
         row.appendChild(cell);
      });
      tbody.appendChild(row);
   });
}
