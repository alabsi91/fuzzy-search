import React from 'react';
import type { ReturnSearchInfo } from '../types';

export function HighlightReact(
  result: ReturnSearchInfo<string | object>,
  HighlightedTextCP: React.FC<{ text: string }>,
  RegularTextCP: React.FC<{ text: string }> = ({ text }) => <>{text}</>
): React.JSX.Element[] {
  const target = result._searchInfo.target;
  const targetLen = target.length;
  const results = [];

  let indexes = result._searchInfo.indexes;
  indexes = indexes.slice(0, indexes.len).sort((a, b) => a - b);
  let highlighted = '';
  let matchI = 0;
  let indexesI = 0;
  let opened = false;

  for (let i = 0; i < targetLen; ++i) {
    const char = target[i];
    if (indexes[indexesI] === i) {
      ++indexesI;
      if (!opened) {
        opened = true;
        results.push(<HighlightedTextCP key={highlighted + matchI} text={highlighted} />);
        highlighted = '';
      }

      if (indexesI === indexes.length) {
        highlighted += char;
        results.push(<HighlightedTextCP key={highlighted + matchI++} text={highlighted} />);
        highlighted = '';
        const regularText = target.substring(i + 1);
        results.push(<RegularTextCP key={regularText + matchI++} text={regularText} />);
        break;
      }
    } else {
      if (opened) {
        opened = false;
        results.push(<HighlightedTextCP key={highlighted + matchI++} text={highlighted} />);
        highlighted = '';
      }
    }

    highlighted += char;
  }

  return results;
}
