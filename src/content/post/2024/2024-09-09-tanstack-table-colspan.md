---
title: TanStack Table
subtitle: Some colSpan=2 ideas for TanStack Table when you want to line up in the middle of the column
publishDate: 2024-09-09
category: Blog
tags:
  - Development
  - JavaScript
  - TailwindCSS
  - TanStack
  - TanStack Table
---

<b>Table 1</b> is my intervention into the guts of a TanStack Table to
create <code className="text-sm">colSpan</code>s in the table headers.
Note that the date and bitcoin columns are 2 columns wide, with a single
header, to get the middle of the contents to align vertcially. I
couldn't find any examples like this, but it yields a nice result, and
that's why I'm writing this blog post, in case it helps you, dear
reader.

Toggle the <code className="text-sm">Highlight Alternate Columns</code> checkbox to see what's what with the columns.

All 4 columns are sortable by clicking the header. The Date column sorts
by the date, and both of its columns have the same source because they
are the same data, formatted differently. Because <code className="text-sm">created_datetime</code> is an ISO string, we
sort by <code className="text-sm">text</code>, not by <code className="text-sm">datetime</code>. The Amount column sorts <code className="text-sm">token_amount</code> before any formatting is
done to it, so it's sorted as a <code className="text-sm">basic</code>.
It doesn't come with an icon or any currency information. The BTC icon
is added to every row.

```typescript
<thead> // [!code focus] // [!code ++]
  {table.getHeaderGroups().map((headerGroup) => (
    <tr key={headerGroup.id}>
      {headerGroup.headers.map((header) => {
        const colSpan2Headers = ["created_datetime", "token_amount"];
        const hiddenHeaders = ["created_datetime2", "token_amount2"];
        const isColSpan2Header = colSpan2Headers.includes(header.id);
        const isHiddenHeader = hiddenHeaders.includes(header.id);

        if (isHiddenHeader) return null;

        return (
          <th
            className={
              header.column.getCanSort()
                ? "cursor-pointer select-none"
                : ""
            }
            colSpan={isColSpan2Header ? 2 : undefined}
            key={header.id}
            onClick={header.column.getToggleSortingHandler()}
            style={{ width: `${header.getSize()}px` }}
          >
            {flexRender(
              header.column.columnDef.header,
              header.getContext()
            )}
            {{
              asc: "\u00A0↑",
              desc: "\u00A0↓",
            }[header.column.getIsSorted() as string] ?? null}
          </th>
        );
      })}
    </tr>
  ))}
</thead>
```
