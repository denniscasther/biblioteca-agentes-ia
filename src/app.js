const grid = document.querySelector('#book-grid');
const count = document.querySelector('#result-count');
const search = document.querySelector('#search');
const chips = [...document.querySelectorAll('.chip')];
const clear = document.querySelector('#clear-filters');
const empty = document.querySelector('#empty-state');
const dialog = document.querySelector('#book-dialog');
const dialogContent = document.querySelector('#dialog-content');
const dialogClose = document.querySelector('#dialog-close');

const categories = {
  fundamentos: 'Fundamentos', construccion: 'Construcción', arquitectura: 'Arquitectura',
  herramientas: 'Herramientas', conocimiento: 'Conocimiento', produccion: 'Producción',
  desarrollo: 'Desarrollo'
};
const routes = {
  entender: ['01_agentes_idea_produccion', '03_guia_ilustrada', '10_maquina_predecir'],
  construir: ['02_construyendo_agentes', '04_patrones_multiagente', '05_mcp', '06_en_accion', '07_en_la_practica'],
  organizar: ['08_segundo_cerebro', '09_federacion_cerebros', 'R1_castor_y_el_plano']
};
let books = [];
let activeFilter = 'todos';
let activeRoute = null;

const norm = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const elt = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function matches(book) {
  const term = norm(search.value.trim());
  const haystack = norm([book.title, book.animal, book.angle, book.description, categories[book.category], book.number].join(' '));
  return (!term || haystack.includes(term)) &&
    (activeFilter === 'todos' || book.category === activeFilter) &&
    (!activeRoute || routes[activeRoute].includes(book.id));
}

function render() {
  const visible = books.filter(matches);
  grid.replaceChildren(...visible.map(makeCard));
  count.textContent = `${visible.length} ${visible.length === 1 ? 'libro' : 'libros'} para explorar`;
  empty.hidden = visible.length !== 0;
  clear.hidden = !search.value && activeFilter === 'todos' && !activeRoute;
  chips.forEach(chip => {
    const selected = !activeRoute && chip.dataset.filter === activeFilter;
    chip.classList.toggle('active', selected);
    chip.setAttribute('aria-pressed', String(selected));
  });
  document.querySelectorAll('.route').forEach(route => route.setAttribute('aria-pressed', String(route.dataset.route === activeRoute)));
}

function makeCard(book) {
  const card = elt('article', 'book-card');
  card.style.setProperty('--cover-accent', book.accent);
  card.style.setProperty('--cover-bg', book.volume && book.volume <= 7 ? '#e8e2d7' : '#e8ebea');
  const art = elt('div', 'book-cover-wrap');
  const image = elt('img');
  image.src = book.cover;
  image.alt = `Portada de ${book.title}`;
  image.loading = 'eager';
  image.width = 170;
  image.height = 240;
  art.append(image, elt('span', 'book-badge', book.volume ? `VOL. ${book.number}` : 'LIBRO RELACIONADO'));
  const info = elt('div', 'book-info');
  info.append(elt('p', 'book-kicker', categories[book.category]), elt('h3', '', book.title), elt('p', 'book-description', book.description));
  const bottom = elt('div', 'book-bottom');
  bottom.append(elt('span', '', `${book.animal} · ${book.pages} páginas`));
  const open = elt('button', 'book-open');
  open.type = 'button';
  open.setAttribute('aria-label', `Ver detalles de ${book.title}`);
  open.innerHTML = 'Explorar <span aria-hidden="true">↗</span>';
  open.addEventListener('click', () => showBook(book));
  bottom.append(open); info.append(bottom); card.append(art, info);
  card.addEventListener('click', event => { if (!event.target.closest('button, a')) showBook(book); });
  return card;
}

function showBook(book) {
  dialogContent.replaceChildren();
  const layout = elt('div', 'dialog-layout');
  layout.style.setProperty('--dialog-accent', book.accentDark);
  layout.style.setProperty('--dialog-bg', book.volume && book.volume <= 7 ? '#e8e2d7' : '#e8ebea');
  const art = elt('div', 'dialog-art');
  const image = elt('img'); image.src = book.cover; image.alt = `Portada de ${book.title}`;
  art.append(image);
  const body = elt('div', 'dialog-body');
  body.append(elt('p', 'eyebrow', book.volume ? `VOLUMEN ${book.number} · ${categories[book.category].toUpperCase()}` : 'LIBRO RELACIONADO'));
  const title = elt('h2', '', book.title); title.id = 'dialog-title'; body.append(title);
  body.append(elt('p', 'dialog-angle', book.angle), elt('p', 'dialog-description', book.description));
  const facts = elt('div', 'dialog-facts');
  facts.append(elt('span', '', `Animal · ${book.animal}`), elt('span', '', `${book.pages} páginas`), elt('span', '', 'HTML + PDF'));
  body.append(facts);
  const actions = elt('div', 'dialog-actions');
  const read = elt('a', 'button button-dark', 'Leer en web ↗');
  read.href = `reader.html?libro=${encodeURIComponent(book.id)}`;
  const pdf = elt('a', 'button button-outline', 'Descargar PDF ↓');
  pdf.href = book.pdf; pdf.download = '';
  actions.append(read, pdf); body.append(actions);
  layout.append(art, body); dialogContent.append(layout);
  dialog.showModal();
}

chips.forEach(chip => chip.addEventListener('click', () => {
  activeFilter = chip.dataset.filter; activeRoute = null; render();
}));
search.addEventListener('input', render);
clear.addEventListener('click', () => { search.value = ''; activeFilter = 'todos'; activeRoute = null; render(); search.focus(); });
document.querySelectorAll('.route').forEach(route => route.addEventListener('click', () => {
  activeRoute = route.dataset.route; activeFilter = 'todos'; search.value = ''; render();
  document.querySelector('#catalogo').scrollIntoView({ behavior: 'smooth' });
}));
dialogClose.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

fetch('catalogo.json').then(response => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}).then(data => { books = data; render(); }).catch(() => {
  count.textContent = 'No se pudo cargar el catálogo';
  empty.textContent = 'Recarga la página para volver a intentar.';
  empty.hidden = false;
});
