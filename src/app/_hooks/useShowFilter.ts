import { useState, useEffect } from 'react';
import type {
  CloudShowTag,
  CloudShowTypes,
  TagTypes,
} from '@/types/ResponsesInterface';
import normalizeTagName from '@/utils/normalizeTagName';

interface UseShowFilterProps {
  items: CloudShowTypes[];
  selectedTag: TagTypes | null;
}

const useShowFilter = ({ items, selectedTag }: UseShowFilterProps) => {
  const [filteredItems, setFilteredItems] = useState<CloudShowTypes[]>([]);
  useEffect(() => {
    let filteredItems = items;

    if (selectedTag) {
      filteredItems = items.filter((item) => {
        if (item.tags && item.tags.length > 0) {
          const matchingTags = item.tags.filter((tag) =>
            tagMatches(tag, selectedTag)
          );
          return matchingTags.length > 0;
        }
        return false;
      });
    }

    setFilteredItems(filteredItems);
  }, [items, selectedTag]);

  // Check if a tag or its synonyms match the given value
  const tagMatches = (tag: CloudShowTag, selectedTag: TagTypes) => {
    const escapeRegExp = (string: string) =>
      string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tagName = escapeRegExp(normalizeTagName(tag.name))
      .toLowerCase()
      .trim();

    const selectedTagName = normalizeTagName(selectedTag.name);
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
  };
  return filteredItems;
};

export default useShowFilter;
