export type Game = {
  id: number;
  title: string;
  image: string;
  price: number;
  oldPrice: number | null;
  discount: number | null;
  tags: string[];
};
