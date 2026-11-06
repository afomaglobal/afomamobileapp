import type { ImageSourcePropType } from 'react-native';

const CATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  'art-and-collectibles': require('../../../assets/images/categories/Art_and_Collectibles.png'),
  fashion: require('../../../assets/images/categories/fashion.png'),
  'home-and-living': require('../../../assets/images/categories/Home_and_Living.png'),
  'jewelry-and-accessories': require('../../../assets/images/categories/Jewelry_and_Accessories.png'),
  'personal-care-and-bath-products': require(
    '../../../assets/images/categories/Personal_Care_and_Bath_Products.png',
  ),
  'stationery-and-paper-goods': require(
    '../../../assets/images/categories/Stationery_and_Paper_Goods.png',
  ),
  'toys-and-games': require('../../../assets/images/categories/Toys_and_Games.png'),
  'food-and-beverages' : require(
    '../../../assets/images/categories/food-and-beverages.jpg',
  ),
  "beauty-and-personal-care" : require(
    '../../../assets/images/categories/beauty-and-personal-care.jpg',
  ),
};

/** Bundled subcategory thumbnails — filenames match API slugs under assets/images/subcategories */
const SUBCATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  'baby-and-child-care': require('../../../assets/images/subcategories/baby-and-child-care.jpg'),
  'bakery-and-baked-goods': require('../../../assets/images/subcategories/bakery-and-baked-goods.png'),
  'barbering-services': require('../../../assets/images/subcategories/barbering-services.jpg'),
  'bath-bombs': require('../../../assets/images/subcategories/bath-bombs.jpg'),
  'bath-soaks-and-salts': require('../../../assets/images/subcategories/bath-soaks-and-salts.jpg'),
  'body-scrubs': require('../../../assets/images/subcategories/body-scrubs.jpg'),
  'bracelets-and-bangles': require('../../../assets/images/subcategories/bracelets-and-bangles.jpg'),
  'bridal-and-special-occasion-beauty': require(
    '../../../assets/images/subcategories/bridal-and-special-occasion-beauty.jpg',
  ),
  'brooches-and-pins': require('../../../assets/images/subcategories/brooches-and-pins.png'),
  'brow-services': require('../../../assets/images/subcategories/brow-services.png'),
  charms: require('../../../assets/images/subcategories/charms.jpg'),
  'colouring-books': require('../../../assets/images/subcategories/colouring-books.jpg'),
  'digital-art': require('../../../assets/images/subcategories/digital-art.jpg'),
  'drawings-and-illustrations': require(
    '../../../assets/images/subcategories/drawings-and-illustrations.jpg',
  ),
  earrings: require('../../../assets/images/subcategories/earrings.jpg'),
  'for-kids': require('../../../assets/images/subcategories/for-kids.jpg'),
  'for-men': require('../../../assets/images/subcategories/for-men.jpg'),
  'for-unisex': require('../../../assets/images/subcategories/for-unisex.jpg'),
  'for-women': require('../../../assets/images/subcategories/for-women.jpg'),
  'food-and-related': require('../../../assets/images/subcategories/food-and-related.jpg'),
  'games-and-puzzles': require('../../../assets/images/subcategories/games-and-puzzles.png'),
  'greeting-cards': require('../../../assets/images/subcategories/greeting-cards.jpg'),
  'hair-services': require('../../../assets/images/subcategories/hair-services.png'),
  'handbags-and-purses': require('../../../assets/images/subcategories/handbags-and-purses.png'),
  'handcrafted-decor': require('../../../assets/images/subcategories/handcrafted-decor.jpg'),
  'handmade-soap': require('../../../assets/images/subcategories/handmade-soap.jpg'),
  'hats-and-headpieces': require('../../../assets/images/subcategories/hats-and-headpieces.png'),
  'home-decor': require('../../../assets/images/subcategories/home-decor.jpg'),
  keychains: require('../../../assets/images/subcategories/keychains.jpg'),
  'lash-services': require('../../../assets/images/subcategories/lash-services.jpg'),
  'lotions-and-body-butters': require(
    '../../../assets/images/subcategories/lotions-and-body-butters.jpg',
  ),
  'makeup-services': require('../../../assets/images/subcategories/makeup-services.jpg'),
  "men's-clothing": require("../../../assets/images/subcategories/men's-clothing.jpg"),
  'nail-services': require('../../../assets/images/subcategories/nail-services.png'),
  'necklaces-and-pendants': require('../../../assets/images/subcategories/necklaces-and-pendants.jpg'),
  'notebooks-and-journals': require('../../../assets/images/subcategories/notebooks-and-journals.jpg'),
  oils: require('../../../assets/images/subcategories/oils.jpg'),
  paintings: require('../../../assets/images/subcategories/paintings.jpg'),
  'paper-art-and-prints': require('../../../assets/images/subcategories/paper-art-and-prints.jpg'),
  photography: require('../../../assets/images/subcategories/photography.jpg'),
  prints: require('../../../assets/images/subcategories/prints.jpg'),
  rings: require('../../../assets/images/subcategories/rings.jpg'),
  'skincare-and-facial-services': require(
    '../../../assets/images/subcategories/skincare-and-facial-services.jpg',
  ),
  'snacks-and-confectionery': require(
    '../../../assets/images/subcategories/snacks-and-confectionery.png',
  ),
  'spa-and-body-services': require('../../../assets/images/subcategories/spa-and-body-services.jpg'),
  standees: require('../../../assets/images/subcategories/standees.jpg'),
  'stickers-and-labels': require('../../../assets/images/subcategories/stickers-and-labels.jpg'),
  'textile-and-fiber-art': require('../../../assets/images/subcategories/textile-and-fiber-art.jpg'),
  toys: require('../../../assets/images/subcategories/toys.jpg'),
  'traditional-and-local-foods': require(
    '../../../assets/images/subcategories/traditional-and-local-foods.png',
  ),
  'waxing-and-hair-removal': require(
    '../../../assets/images/subcategories/waxing-and-hair-removal.jpg',
  ),
  "women's-clothing": require("../../../assets/images/subcategories/women's-clothing.jpg"),
};

function normalizeCategoryKey(value: string | undefined | null): string | undefined {
  if (value == null) {
    return undefined;
  }

  const trimmed = String(value).trim().toLowerCase();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.replace(/_/g, '-').replace(/\s+/g, '-');
}

function lookupLocalImage(
  map: Record<string, ImageSourcePropType>,
  slug: string | undefined | null,
  name?: string | undefined | null,
): ImageSourcePropType | undefined {
  const slugKey = normalizeCategoryKey(slug);
  if (slugKey && map[slugKey]) {
    return map[slugKey];
  }

  const nameKey = normalizeCategoryKey(name);
  if (nameKey && map[nameKey]) {
    return map[nameKey];
  }

  return undefined;
}

/** Parent category hero (PNG bundles). */
export function getCategoryImageSource(
  slug: string | undefined | null,
  name?: string | undefined | null,
): ImageSourcePropType | undefined {
  return lookupLocalImage(CATEGORY_IMAGES, slug, name);
}

/** Subcategory thumbnail (JPG bundles under assets/images/subcategories). */
export function getSubCategoryImageSource(
  slug: string | undefined | null,
  name?: string | undefined | null,
): ImageSourcePropType | undefined {
  return lookupLocalImage(SUBCATEGORY_IMAGES, slug, name);
}

/** Resolves bundled parent category or subcategory image before any remote fallback. */
export function getBrowseCategoryImageSource(
  slug: string | undefined | null,
  name?: string | undefined | null,
): ImageSourcePropType | undefined {
  return getCategoryImageSource(slug, name) ?? getSubCategoryImageSource(slug, name);
}

export function hasLocalCategoryImage(
  slug: string | undefined | null,
  name?: string | undefined | null,
): boolean {
  return getBrowseCategoryImageSource(slug, name) !== undefined;
}
