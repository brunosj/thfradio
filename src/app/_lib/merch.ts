// Merch row on the homepage. SumUp's public API has no products or stock,
// so the tiles here are a small hand-kept showcase: prices, sizes and stock
// stay in the SumUp store, every tile just links there.
//
// To add an item: put the photo in /public/images/merch/ (square, ~1000 px)
// and add { title, image: '/images/merch/<file>.jpg', href: '<SumUp product link>' }.

export const MERCH_SHOP_URL = 'https://thf-radio.sumupstore.com/category/merch';

export type MerchItem = {
  title: string;
  /** Square photo, e.g. /images/merch/tote.jpg */
  image: string;
  /** Product page in the SumUp store (defaults to the merch category) */
  href?: string;
};

export const MERCH_ITEMS: MerchItem[] = [];
