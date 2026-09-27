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
document.addEventListener("DOMContentLoaded", () => {
   loadQuestions();
   initFormEvents();
});
function loadQuestions() {
   return __awaiter(this, void 0, void 0, function* () {
      const tbody = document.getElementById("questions-table-body");
      const countSpan = document.getElementById("questions-count");
      try {
         const response = yield fetch("/api/questions");
         if (!response.ok) throw new Error("Erreur de chargement");
         const questions = yield response.json();
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
  <td><strong>${escapeHtml(q.question)}</strong></td>
  <td>${escapeHtml(q.option_a)}</td>
  <td>${escapeHtml(q.option_b)}</td>
  <td>${escapeHtml(q.option_c)}</td>
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
   });
}
function initFormEvents() {
   const form = document.getElementById("question-form");
   const btnCancel = document.getElementById("btn-cancel");
   form.addEventListener("submit", (e) =>
      __awaiter(this, void 0, void 0, function* () {
         e.preventDefault();
         const idVal = document.getElementById("input-id").value;
         const questionData = {
            question: document.getElementById("input-question").value.trim(),
            option_a: document.getElementById("input-opt-a").value.trim(),
            option_b: document.getElementById("input-opt-b").value.trim(),
            option_c: document.getElementById("input-opt-c").value.trim(),
            correct_index: parseInt(document.getElementById("select-correct").value, 10),
         };
         const isUpdate = Boolean(idVal);
         const url = isUpdate ? `/api/questions/${idVal}` : "/api/questions";
         const method = isUpdate ? "PUT" : "POST";
         try {
            const res = yield fetch(url, {
               method: method,
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(questionData),
            });
            if (res.ok) {
               resetForm();
               loadQuestions();
            } else {
               alert("Erreur lors de l'enregistrement.");
            }
         } catch (err) {
            console.error(err);
            alert("Erreur réseau.");
         }
      }),
   );
   btnCancel.addEventListener("click", () => {
      resetForm();
   });
}
function deleteQuestion(id) {
   return __awaiter(this, void 0, void 0, function* () {
      if (!confirm(`Voulez-vous vraiment supprimer la question #${id} ?`)) return;
      try {
         const res = yield fetch(`/api/questions/${id}`, { method: "DELETE" });
         if (res.ok) {
            resetForm();
            loadQuestions();
         } else {
            alert("Impossible de supprimer la question.");
         }
      } catch (err) {
         console.error(err);
      }
   });
}
function resetForm() {
   const form = document.getElementById("question-form");
   form.reset();
   document.getElementById("input-id").value = "";
   document.getElementById("form-title").textContent = "Ajouter une Question";
   document.getElementById("btn-save").textContent = "Enregistrer";
   document.getElementById("btn-cancel").classList.add("hidden");
}
function escapeHtml(str) {
   const div = document.createElement("div");
   div.textContent = str;
   return div.innerHTML;
}
