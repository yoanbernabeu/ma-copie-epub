import { LAW_URL, PAPER_EDITION } from "./src/config.js";

document.getElementById("law").href = LAW_URL;

const paper = document.getElementById("paper");
paper.href = PAPER_EDITION.url;
paper.textContent = PAPER_EDITION.label;

// La popup se ferme dès qu'on clique ailleurs : la génération se fait dans
// un onglet dédié.
document.getElementById("go").addEventListener("click", async () => {
  await chrome.tabs.create({ url: chrome.runtime.getURL("generator.html") });
  window.close();
});
