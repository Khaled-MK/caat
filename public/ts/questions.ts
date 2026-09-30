/** @format */

// Types
interface Question {
   id: number;
   question: string;
   option_a: string;
   option_b: string;
   option_c: string;
   correct_index: number;
   language: 0 | 1;
}

function translateQuestionMessage(message: string): string {
   return (window as Window & { AppI18n?: { translate: (value: string) => string } }).AppI18n?.translate(message) ?? message;
}

document.addEventListener("DOMContentLoaded", () => {
   loadQuestions();
   initFormEvents();
   loadTimerSetting();
   initTimerForm();
});

async function loadTimerSetting(): Promise<void> {
   const input = document.getElementById("time-per-question") as HTMLInputElement;

   try {
      const response = await fetch("/api/settings/time-per-question");
      if (!response.ok) throw new Error("Erreur de chargement du chrono");
      const setting = await response.json();
      input.value = setting.seconds.toString();
   } catch (err) {
      console.error(err);
   }
}

function initTimerForm(): void {
   const form = document.getElementById("timer-settings-form") as HTMLFormElement;
   const input = document.getElementById("time-per-question") as HTMLInputElement;
   const status = document.getElementById("timer-settings-status") as HTMLElement;

   form.addEventListener("submit", async (event) => {
      event.preventDefault();
      status.textContent = "";

      try {
         const response = await fetch("/api/settings/time-per-question", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seconds: input.valueAsNumber }),
         });

         if (!response.ok) throw new Error("Erreur lors de l'enregistrement du chrono");
         status.textContent = "Chrono enregistré.";
      } catch (err) {
         console.error(err);
         status.textContent = "Impossible d'enregistrer le chrono.";
      }
   });
}

/**
 * Récupère et affiche la liste des questions depuis l'API Express
 */
async function loadQuestions(): Promise<void> {
   const tbody = document.getElementById("questions-table-body") as HTMLTableSectionElement;
   const countSpan = document.getElementById("questions-count") as HTMLElement;

   try {
      const response = await fetch("/api/questions");
      if (!response.ok) throw new Error("Erreur de chargement");

      const questions: Question[] = await response.json();
      console.log("Questions reçue : ", questions);
      countSpan.textContent = questions.length.toString();

      if (questions.length === 0) {
         tbody.innerHTML = '<tr><td colspan="7" class="text-center">Aucune question enregistrée.</td></tr>';
         return;
      }

      tbody.innerHTML = "";

      questions.forEach((q) => {
         const tr = document.createElement("tr");
         const optLabels = ["Option A", "Option B", "Option C"];
         const correctText = optLabels[q.correct_index] || "Inconnu";

         tr.innerHTML = `
    <td>${q.id}</td>
   <td data-no-translate><strong>${escapeHtml(q.question)}</strong></td>
   <td data-no-translate>${escapeHtml(q.option_a)}</td>
   <td data-no-translate>${escapeHtml(q.option_b)}</td>
   <td data-no-translate>${escapeHtml(q.option_c)}</td>
  <td><span class="badge badge-success">${correctText}</span></td>
  <td class="action-cells">
    <button class="btn-sm btn-delete" onclick="deleteQuestion(${q.id})" title="Supprimer">🗑️</button>
  </td>
`;

         tbody.appendChild(tr);
      });
   } catch (err) {
      console.error(err);
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">Erreur lors de la récupération des données.</td></tr>';
   }
}

/**
 * Gestion de la soumission (Création / Modification) et de l'annulation
 */
function initFormEvents(): void {
   const form = document.getElementById("question-form") as HTMLFormElement;
   const btnCancel = document.getElementById("btn-cancel") as HTMLButtonElement;

   form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const idVal = (document.getElementById("input-id") as HTMLInputElement).value;
      const questionData = {
         question: (document.getElementById("input-question") as HTMLTextAreaElement).value.trim(),
         option_a: (document.getElementById("input-opt-a") as HTMLInputElement).value.trim(),
         option_b: (document.getElementById("input-opt-b") as HTMLInputElement).value.trim(),
         option_c: (document.getElementById("input-opt-c") as HTMLInputElement).value.trim(),
         correct_index: parseInt((document.getElementById("select-correct") as HTMLSelectElement).value, 10),
      };

      const isUpdate = Boolean(idVal);
      const url = isUpdate ? `/api/questions/${idVal}` : "/api/questions";
      const method = isUpdate ? "PUT" : "POST";

      try {
         const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(questionData),
         });

         if (res.ok) {
            resetForm();
            loadQuestions();
         } else {
            alert(translateQuestionMessage("Erreur lors de l'enregistrement."));
         }
      } catch (err) {
         console.error(err);
         alert(translateQuestionMessage("Erreur réseau."));
      }
   });

   btnCancel.addEventListener("click", () => {
      resetForm();
   });
}

/**
 * Supprime une question
 */
async function deleteQuestion(id: number): Promise<void> {
   if (!confirm(translateQuestionMessage(`Voulez-vous vraiment supprimer la question #${id} ?`))) return;

   try {
      const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
      if (res.ok) {
         resetForm();
         loadQuestions();
      } else {
         alert(translateQuestionMessage("Impossible de supprimer la question."));
      }
   } catch (err) {
      console.error(err);
   }
}

function resetForm(): void {
   const form = document.getElementById("question-form") as HTMLFormElement;
   form.reset();
   (document.getElementById("input-id") as HTMLInputElement).value = "";
   document.getElementById("form-title")!.textContent = "Ajouter une Question";
   document.getElementById("btn-save")!.textContent = "Enregistrer";
   document.getElementById("btn-cancel")!.classList.add("hidden");
}

function escapeHtml(str: string): string {
   const div = document.createElement("div");
   div.textContent = str;
   return div.innerHTML;
}
