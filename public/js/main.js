"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const trigger = document.getElementById("trigger");
let count = 0;
function loadHomeTimerSetting() {
    return __awaiter(this, void 0, void 0, function* () {
        const timerDisplay = document.getElementById("time-per-question-display");
        if (!timerDisplay)
            return;
        try {
            const response = yield fetch("/api/settings/time-per-question");
            if (!response.ok)
                throw new Error("Erreur de chargement du chrono");
            const setting = yield response.json();
            if (Number.isInteger(setting.seconds) && setting.seconds >= 1 && setting.seconds <= 120) {
                timerDisplay.textContent = `${setting.seconds}s`;
            }
        }
        catch (error) {
            console.error("Utilisation du chrono par défaut:", error);
        }
    });
}
loadHomeTimerSetting();
trigger.addEventListener("click", () => {
    count++;
    console.log(`Trigger clicked ${count} times`);
    if (count >= 3) {
        window.location.href = "admin.html";
    }
});
