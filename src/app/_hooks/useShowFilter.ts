import { useMemo } from 'react';
import type {
  CloudShowListItem,
  CloudShowTag,
  TagTypes,
} from '@/types/ResponsesInterface';
import normalizeTagName from '@/utils/normalizeTagName';

interface UseShowFilterProps {
  items: CloudShowListItem[];
  selectedTag: TagTypes | null;
}

function tagMatches(tag: CloudShowTag, selectedTag: TagTypes) {
  const escapeRegExp = (string: string) =>
    string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tagName = escapeRegExp(normalizeTagName(tag.name ?? ''))
    .toLowerCase()
    .trim();

  const selectedTagName = normalizeTagName(selectedTag.name ?? '');
  if (!tagName) {
    return false;
  }
  const regex = new RegExp(tagName, 'i');

  if (regex.test(selectedTagName)) {
    return true;
  }

  if (selectedTag.synonyms && selectedTag.synonyms.length > 0) {
    const synonymMatches = selectedTag.synonyms.some((synonym) => {
      const normalizedSynonym = normalizeTagName(synonym.name);
      return regex.test(normalizedSynonym);
    });
    if (synonymMatches) {
      return true;
    }
  }

  return false;
}

const useShowFilter = ({ items, selectedTag }: UseShowFilterProps) => {
  return useMemo(() => {
    if (!selectedTag) return items;
    return items.filter((item) => {
      if (!item.tags?.length) return false;
      return item.tags.some((tag) => tagMatches(tag, selectedTag));
    });
  }, [items, selectedTag]);
};

export default useShowFilter;