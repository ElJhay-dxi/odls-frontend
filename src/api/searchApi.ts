import axiosInstance from './axiosInstance';

export interface SearchItem {
  id: string;
  title: string;
  subtitle?: string | null;
  plantCode?: string | null;
  date?: string | null;
}

export interface SearchGroup {
  label: string;
  route: string;
  items: SearchItem[];
  hasMore: boolean;
}

export const searchApi = {
  search: (q: string, take = 6, signal?: AbortSignal) =>
    axiosInstance.get<{ query: string; groups: SearchGroup[] }>('/search', { params: { q, take }, signal }),
};
