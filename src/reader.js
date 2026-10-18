const params = new URLSearchParams(location.search);
const id = params.get('libro');
const error = document.querySelector('#reader-error');
const frame = document.querySelector('#book-frame');

fetch('catalogo.json').then(response => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}).then(books => {
  const book = books.find(item => item.id === id);
  if (!book) throw new Error('Libro desconocido');
  document.title = `${book.title} · Biblioteca de Agentes de IA`;
  document.querySelector('#reader-number').textContent = book.volume ? `VOLUMEN ${book.number}` : 'LIBRO RELACIONADO';
  document.querySelector('#reader-title').textContent = book.title;
  document.querySelector('#reader-pdf').href = book.pdf;
  document.querySelector('#reader-original').href = book.html;
  frame.title = `Lectura de ${book.title}`;
  frame.src = book.html;
}).catch(() => { frame.hidden = true; error.hidden = false; });
