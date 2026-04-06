export const WORDS = [
  "perro", "gato", "leon", "tigre", "elefante", "jirafa", "mono", "oso", "lobo", "zorro",
  "computadora", "televisor", "celular", "reloj", "camara", "auriculares", "teclado", "mouse",
  "guitarra", "piano", "bateria", "violin", "flauta", "trompeta", "saxofon",
  "auto", "bicicleta", "avion", "barco", "tren", "helicoptero", "moto", "colectivo",
  "manzana", "banana", "naranja", "pera", "uva", "frutilla", "sandia", "limon",
  "hamburguesa", "pizza", "empanada", "milanesa", "ensalada", "sopa", "helado", "chocolate",
  "hospital", "escuela", "universidad", "banco", "supermercado", "cine", "restaurante", "biblioteca",
  "playa", "montaña", "bosque", "desierto", "lago", "rio", "cascada", "isla",
  "policia", "bombero", "medico", "abogado", "profesor", "ingeniero", "arquitecto", "cocinero",
  "futbol", "basquet", "tenis", "natacion", "voley", "rugby", "golf", "boxeo",
  "libro", "revista", "diario", "cuaderno", "lapicera", "mochila", "tijera", "goma",
  "sol", "luna", "estrella", "planeta", "cometa", "asteroide", "galaxia", "universo"
];

export const getRandomWord = () => {
  const randomIndex = Math.floor(Math.random() * WORDS.length);
  return WORDS[randomIndex];
};
