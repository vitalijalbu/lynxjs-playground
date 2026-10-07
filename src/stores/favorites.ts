import { createStore, useSelector } from '@tanstack/react-store';

import type { Listing } from '../types/marketplace.js';

/**
 * Saved listings, kept on the device (guests have no account yet). A card-sized
 * snapshot is stored so the Favorites tab renders offline and instantly; the
 * detail page always reloads fresh data.
 */
export type FavoriteSnapshot = Pick<
  Listing,
  | 'id'
  | 'slug'
  | 'title'
  | 'price'
  | 'price_negotiable'
  | 'condition'
  | 'year'
  | 'mileage'
  | 'power_kw'
  | 'is_spotlight'
  | 'is_featured'
  | 'listing_type'
  | 'status'
  | 'views_count'
  | 'published_at'
  | 'images'
  | 'city'
  | 'fuel_type'
  | 'transmission'
  | 'seller'
  | 'price_drop'
>;

export interface FavoritesState {
  /** Most recently saved first. */
  items: FavoriteSnapshot[];
}

export const favoritesStore = createStore<FavoritesState>({ items: [] });

function snapshot(listing: Listing): FavoriteSnapshot {
  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    price: listing.price,
    price_negotiable: listing.price_negotiable,
    condition: listing.condition,
    year: listing.year,
    mileage: listing.mileage,
    power_kw: listing.power_kw,
    is_spotlight: listing.is_spotlight,
    is_featured: listing.is_featured,
    listing_type: listing.listing_type,
    status: listing.status,
    views_count: listing.views_count,
    published_at: listing.published_at,
    images: listing.images?.slice(0, 1),
    city: listing.city,
    fuel_type: listing.fuel_type,
    transmission: listing.transmission,
    seller: listing.seller,
    price_drop: listing.price_drop,
  };
}

export function toggleFavorite(listing: Listing): void {
  favoritesStore.setState(({ items }) => ({
    items: items.some((item) => item.id === listing.id)
      ? items.filter((item) => item.id !== listing.id)
      : [snapshot(listing), ...items],
  }));
}

export function useIsFavorite(id: number): boolean {
  return useSelector(favoritesStore, (state) => state.items.some((item) => item.id === id));
}

export function useFavorites(): FavoriteSnapshot[] {
  return useSelector(favoritesStore, (state) => state.items);
}
