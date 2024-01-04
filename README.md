# Installation

```console
npm i github:alabsi91/fuzzy-search
```

# Usage

```tsx
import { search, highlight } from 'fuzzy-search';
import { Highlight } from 'fuzzy-search/react'; // for react or react-native

const data = [
  {
    name: 'item name',
    description: 'item description',
    info: {
      longName: 'item long name',
    },
  },
  {
    name: 'item name',
    description: 'item description',
    info: {
      longName: 'item long name',
    },
  },
];

// Note: this will mutate each object and inject a new property `_searchInfo` which will be used for highlight text.

// example for searching using a single key
const results = search(searchInput, data, { key: 'name' });

// example for searching using a multiple keys
const results = search(searchInput, data, { keys: ['name', 'description'] });

// example for searching using a nested keys
const results = search(searchInput, data, { key: 'info.longName' });

// example for searching through an array of strings
const data = ['item1', 'item2'];
// this will return: [{ string: 'item1', _searchInfo: [object] }]
const results = search(searchInput, data); 

// highlight results HTML
const item = results[0];
const highlightedName = highlight(item); // item <b>name</b>

// or you can pass a custom HTML tag
const highlightedName = highlight(item, '<span>', '</span>');

// highlight results for react
function HighlightedTextComponent({ text }: { text: string }) {
  return <p>{text}</p>;
}

const highlightedName = Highlight(item, HighlightedTextComponent);
// this will return an array of react elements
// ["item ", <p>name</p>]
// you can also pass another component to handle none highlighted text
```
