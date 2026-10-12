export const FRUITS_SRC = "/games/snake/fruits.png";

/** Recorte dentro de fruits.png. */
export interface FruitSprite {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ROW_Y = 136; // fila pixel-art: y 136–295
const ROW_H = 160;

function sprite(x: number, w: number): FruitSprite {
  return { x, y: ROW_Y, w, h: ROW_H };
}

// Coordenadas de sprites.js; las claves se renombran según lo que se ve
// (en sprites.js están desplazadas: su `banana` es una manzana, etc.).
export const FRUIT_SPRITES = {
  apple: sprite(34, 110), // banana
  banana: sprite(186, 150), // orange
  pineapple: sprite(378, 110), // grape
  grape: sprite(540, 130), // garlic
  pumpkin: sprite(712, 130), // eggplant
  turnip: sprite(894, 110), // strawberry
  eggplant: sprite(1066, 110), // cherry
  strawberry: sprite(1228, 130), // carrot
  cherry: sprite(1400, 130), // mushroom
  carrot: sprite(1582, 110), // broccoli
  mushroom: sprite(1734, 150), // watermelon
  broccoli: sprite(1906, 150), // pepper
  watermelon: sprite(2068, 170), // kiwi
  pepper: sprite(2250, 140), // lemon
  kiwi: sprite(2432, 130), // peach
  lemon: sprite(2604, 130), // peanut
  orange: sprite(2786, 110), // apple
  peach: sprite(2948, 130), // tomato
  peanut: sprite(3110, 150), // berries
  raspberry: sprite(3302, 110), // grapes2
  tomato: sprite(3454, 150), // pineapple
  bowl: sprite(3637, 130), // melon
} satisfies Record<string, FruitSprite>;

export type FruitName = keyof typeof FRUIT_SPRITES;
