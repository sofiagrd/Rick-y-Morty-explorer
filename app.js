
const API = "https://rickandmortyapi.com/api";

const $ = (selector) => document.querySelector(selector);

const grid = $("#characterGrid");
const dialog = $("#characterDialog");

let currentPage = 1;
let totalPages = 1;
let requestNumber = 0;
let toastTimer;
let planner = readPlanner();

const searchInput = $("#searchInput");
const statusFilter = $("#statusFilter");
const speciesFilter = $("#speciesFilter");
const genderFilter = $("#genderFilter");

// Escapar datos antes de insertarlos en HTML.
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function readPlanner() {
  try {
    const value = JSON.parse(localStorage.getItem("rm-planner") || "[]");
    return Array.isArray(value) ? value.filter(
      item => item && Number.isInteger(item.id) &&
        typeof item.name === "string" &&
        typeof item.image === "string"
    ) : [];
  } catch {
    return [];
  }
}

function savePlanner() {
  try {
    localStorage.setItem("rm-planner", JSON.stringify(planner));
    renderPlanner();
  } catch {
    showToast("No se pudo guardar. Comprueba el almacenamiento.");
  }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function statusLabel(status) {
  return ({
    Alive: "Vivo",
    Dead: "Muerto",
    unknown: "Desconocido"
  })[status] || status;
}

function genderLabel(gender) {
  return ({
    Female: "Femenino",
    Male: "Masculino",
    Genderless: "Sin género",
    unknown: "Desconocido"
  })[gender] || gender;
}

function statusClass(status) {
  if (status === "Alive") return "alive";
  if (status === "Dead") return "dead";
  return "unknown";
}

async function getJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    const error = new Error(`Error HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function getFilters() {
  const params = new URLSearchParams();

  const name = searchInput.value.trim();
  if (name) params.set("name", name);
  if (statusFilter.value) params.set("status", statusFilter.value);
  if (speciesFilter.value) params.set("species", speciesFilter.value);
  if (genderFilter.value) params.set("gender", genderFilter.value);

  params.set("page", String(currentPage));
  return params;
}

function isSaved(id) {
  return planner.some(character => character.id === id);
}

function characterCard(character) {
  return `
    <article class="character-card">
      <img class="character-image"
        src="${escapeHTML(character.image)}"
        alt="Retrato de ${escapeHTML(character.name)}"
        loading="lazy">
      <div class="card-content">
        <h3>${escapeHTML(character.name)}</h3>
        <div class="card-meta">
          <span class="tag ${statusClass(character.status)}">
            ● ${escapeHTML(statusLabel(character.status))}
          </span>
          <span class="tag">${escapeHTML(character.species)}</span>
        </div>
        <p class="card-origin">
          <strong>Origen:</strong>
          ${escapeHTML(character.origin?.name || "Desconocido")}
        </p>
        <div class="card-actions">
          <button class="primary-btn detail-btn"
            data-id="${character.id}">Ver ficha ↗</button>
          <button class="save-btn" data-save="${character.id}">
            ${isSaved(character.id) ? "✓ Guardado" : "+ Planificar"}
          </button>
        </div>
      </div>
    </article>
  `;
}

async function loadCharacters() {
  const myRequest = ++requestNumber;
  grid.innerHTML = '<div class="loading">Abriendo portal interdimensional...</div>';
  $("#resultLabel").textContent = "Consultando la API...";
  $("#prevPage").disabled = true;
  $("#nextPage").disabled = true;

  const params = getFilters();

  try {
    const data = await getJSON(`${API}/character/?${params}`);

    // Evita que una búsqueda antigua sobrescriba la más reciente.
    if (myRequest !== requestNumber) return;

    totalPages = data.info.pages;
    $("#totalCount").textContent = data.info.count.toLocaleString("es");
    $("#resultLabel").textContent =
      `${data.info.count} resultado${data.info.count === 1 ? "" : "s"}`;
    $("#pageInfo").textContent = `Página ${currentPage} de ${totalPages}`;

    $("#prevPage").disabled = currentPage <= 1;
    $("#nextPage").disabled = currentPage >= totalPages;

    grid.innerHTML = data.results.map(characterCard).join("");
  } catch (error) {
    if (myRequest !== requestNumber) return;

    if (error.status === 404) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>¡Wubba lubba dub dub!</h3>
          <p>No encontramos personajes con esos filtros.</p>
          <p>Prueba con otro nombre o limpia los filtros.</p>
        </div>`;
      $("#resultLabel").textContent = "Sin resultados";
    } else {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>Portal fuera de servicio</h3>
          <p>No pudimos conectar con la API.</p>
          <button class="primary-btn" id="retryBtn">Reintentar</button>
        </div>`;
      $("#resultLabel").textContent = "Error de conexión";
      $("#retryBtn").addEventListener("click", loadCharacters);
    }

    $("#totalCount").textContent = "—";
    $("#pageInfo").textContent = "Sin resultados";
  }
}

function searchCharacters() {
  currentPage = 1;
  loadCharacters();
}

$("#searchBtn").addEventListener("click", searchCharacters);
searchInput.addEventListener("keydown", event => {
  if (event.key === "Enter") searchCharacters();
});

[statusFilter, speciesFilter, genderFilter].forEach(filter => {
  filter.addEventListener("change", searchCharacters);
});

$("#clearFilters").addEventListener("click", () => {
  searchInput.value = "";
  statusFilter.value = "";
  speciesFilter.value = "";
  genderFilter.value = "";
  currentPage = 1;
  loadCharacters();
});

$("#prevPage").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    loadCharacters();
    $("#explorar").scrollIntoView({ behavior: "smooth" });
  }
});

$("#nextPage").addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage++;
    loadCharacters();
    $("#explorar").scrollIntoView({ behavior: "smooth" });
  }
});

// Delegación de eventos: funciona también con tarjetas nuevas.
grid.addEventListener("click", event => {
  const detailButton = event.target.closest("[data-id]");
  const saveButton = event.target.closest("[data-save]");

  if (detailButton) {
    openCharacter(Number(detailButton.dataset.id));
  }

  if (saveButton) {
    const id = Number(saveButton.dataset.save);
    const card = saveButton.closest(".character-card");
    const image = card.querySelector("img").src;
    const name = card.querySelector("h3").textContent;

    togglePlanner({ id, name, image });
    loadCharacters();
  }
});

function togglePlanner(character) {
  if (isSaved(character.id)) {
    planner = planner.filter(item => item.id !== character.id);
    showToast(`${character.name} eliminado de tu planificación.`);
  } else {
    planner.push(character);
    showToast(`${character.name} añadido a tu planificación.`);
  }

  savePlanner();
}

function renderPlanner() {
  $("#planCount").textContent =
    `${planner.length} personaje${planner.length === 1 ? "" : "s"}`;

  $("#clearPlan").hidden = planner.length === 0;

  if (planner.length === 0) {
    $("#plannerList").innerHTML = `
      <div class="empty-state">
        <h3>Tu próxima aventura empieza aquí</h3>
        <p>Guarda personajes con el botón «Planificar».</p>
      </div>`;
    return;
  }

  $("#plannerList").innerHTML = planner.map(character => `
    <article class="planner-item">
      <img src="${escapeHTML(character.image)}"
        alt="${escapeHTML(character.name)}" loading="lazy">
      <div class="planner-info">
        <strong>${escapeHTML(character.name)}</strong>
        <small>Objetivo de exploración #${character.id}</small>
      </div>
      <button class="remove-btn" data-remove="${character.id}">
        Quitar
      </button>
    </article>
  `).join("");
}

$("#plannerList").addEventListener("click", event => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;

  const id = Number(button.dataset.remove);
  planner = planner.filter(character => character.id !== id);
  savePlanner();
  loadCharacters();
  showToast("Personaje eliminado.");
});

$("#clearPlan").addEventListener("click", () => {
  if (planner.length === 0) return;
  if (!confirm("¿Quieres vaciar toda tu planificación?")) return;

  planner = [];
  savePlanner();
  loadCharacters();
  showToast("Planificación vaciada.");
});

// Ficha detallada y episodios reales.
async function openCharacter(id) {
  $("#characterDetails").innerHTML =
    '<div class="loading">Descifrando datos interdimensionales...</div>';
  dialog.showModal();

  try {
    const character = await getJSON(`${API}/character/${id}`);

    const episodeIds = character.episode.map(url => Number(url.split("/").pop()));
    const episodes = episodeIds.length
      ? await getJSON(`${API}/episode/${episodeIds.join(",")}`)
      : [];

    const episodeList = Array.isArray(episodes) ? episodes : [episodes];

    $("#characterDetails").innerHTML = `
      <div class="detail-layout">
        <img src="${escapeHTML(character.image)}"
          alt="${escapeHTML(character.name)}">
        <div>
          <span class="eyebrow">ARCHIVO #${character.id}</span>
          <h2>${escapeHTML(character.name)}</h2>
          <div class="card-meta">
            <span class="tag ${statusClass(character.status)}">
              ● ${escapeHTML(statusLabel(character.status))}
            </span>
            <span class="tag">${escapeHTML(character.species)}</span>
          </div>
          <p class="detail-fact"><strong>Tipo:</strong>
            ${escapeHTML(character.type || "No especificado")}</p>
          <p class="detail-fact"><strong>Género:</strong>
            ${escapeHTML(genderLabel(character.gender))}</p>
          <p class="detail-fact"><strong>Planeta de origen:</strong>
            ${escapeHTML(character.origin?.name || "Desconocido")}</p>
          <p class="detail-fact"><strong>Última ubicación:</strong>
            ${escapeHTML(character.location?.name || "Desconocida")}</p>
          <p class="detail-fact"><strong>Episodios:</strong>
            ${episodeIds.length}</p>
          <div class="episode-list">
            ${episodeList.map(episode => `
              <span class="episode-chip"
                title="${escapeHTML(episode.name)}">
                ${escapeHTML(episode.episode)}
              </span>
            `).join("")}
          </div>
          <button id="detailSave" class="primary-btn">
            ${isSaved(character.id) ? "✓ Ya está en mi plan" : "+ Añadir al plan"}
          </button>
        </div>
      </div>`;

    $("#detailSave").addEventListener("click", () => {
      togglePlanner({
        id: character.id,
        name: character.name,
        image: character.image
      });
      $("#detailSave").textContent = isSaved(character.id)
        ? "✓ Ya está en mi plan"
        : "+ Añadir al plan";
      loadCharacters();
    });
  } catch {
    $("#characterDetails").innerHTML = `
      <div class="empty-state">
        No pudimos cargar la ficha. Intenta abrirla de nuevo.
      </div>`;
  }
}

$("#closeDialog").addEventListener("click", () => dialog.close());

dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});

// Recomendaciones aleatorias del multiverso.
async function loadRecommendations() {
  const container = $("#recommendationGrid");
  container.innerHTML = '<div class="loading">Buscando señales...</div>';

  try {
    const ids = new Set();
    while (ids.size < 3) {
      ids.add(Math.floor(Math.random() * 826) + 1);
    }

    const data = await getJSON(
      `${API}/character/${Array.from(ids).join(",")}`
    );
    const characters = Array.isArray(data) ? data : [data];

    container.innerHTML = characters.map(character => `
      <button class="recommendation-card" data-rec="${character.id}">
        <img src="${escapeHTML(character.image)}"
          alt="" loading="lazy">
        <span>
          <h3>${escapeHTML(character.name)}</h3>
          <p>${escapeHTML(character.species)} ·
            ${escapeHTML(statusLabel(character.status))}</p>
          <p style="margin-top:8px;color:var(--cyan)">Explorar ficha ↗</p>
        </span>
      </button>
    `).join("");
  } catch {
    container.innerHTML = `
      <div class="empty-state">
        No recibimos señales. Pulsa para volver a intentarlo.
      </div>`;
  }
}

$("#recommendationGrid").addEventListener("click", event => {
  const card = event.target.closest("[data-rec]");
  if (card) openCharacter(Number(card.dataset.rec));
});

$("#randomBtn").addEventListener("click", loadRecommendations);

// Tema claro/oscuro.
function applyTheme(theme) {
  document.body.classList.toggle("light-theme", theme === "light");
  $("#themeToggle").textContent = theme === "light" ? "🌙 Noche" : "☀️ Día";
  $("#themeToggle").setAttribute(
    "aria-label",
    theme === "light" ? "Activar modo noche" : "Activar modo día"
  );
}

let savedTheme = "dark";
try {
  savedTheme = localStorage.getItem("rm-theme") || "dark";
} catch {}

applyTheme(savedTheme);

$("#themeToggle").addEventListener("click", () => {
  const theme = document.body.classList.contains("light-theme")
    ? "dark"
    : "light";

  applyTheme(theme);
  try {
    localStorage.setItem("rm-theme", theme);
  } catch {}
});

// Inicio.
renderPlanner();
loadCharacters();
loadRecommendations();
