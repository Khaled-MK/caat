/** @format */

/** @format */

const trigger = document.getElementById("trigger") as HTMLDivElement;

let count = 0;

async function loadHomeTimerSetting(): Promise<void> {
   const timerDisplay = document.getElementById("time-per-question-display");
   if (!timerDisplay) return;

   try {
      const response = await fetch("/api/settings/time-per-question");
      if (!response.ok) throw new Error("Erreur de chargement du chrono");
      const setting = await response.json();
      if (Number.isInteger(setting.seconds) && setting.seconds >= 1 && setting.seconds <= 120) {
         timerDisplay.textContent = `${setting.seconds}s`;
      }
   } catch (error) {
      console.error("Utilisation du chrono par défaut:", error);
   }
}

loadHomeTimerSetting();

trigger.addEventListener("click", () => {
   count++;
   console.log(`Trigger clicked ${count} times`);
   if (count >= 3) {
      window.location.href = "admin.html";
   }
});
