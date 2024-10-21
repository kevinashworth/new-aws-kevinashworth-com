---
title: Highlighting within code blocks in Astro
excerpt: Not just showing a code block, but highlighting one or more lines within it.
publishDate: 2024-09-08
category: Blog
image: /assets/images/pexels-yaroslav-shuraev-9489804.jpg
imageAlt: "Photo by Yaroslav Shuraev: https://www.pexels.com/photo/pexels-yaroslav-shuraev-9489804/"
tags:
  - Astro
  - Development
  - JavaScript
  - Programming
---

Putting a code block into a post using Astro is very easy. You simply have to enclose the code in triple backticks, aka grave accents.

Here, I enclose the backticks in pre and code tags, in order to show them but not have them processed as a code block:

<pre class="show-backticks"><code>```javascript
const fizz = "buzz";
```</code></pre>

But how do you <mark>highlight</mark> part of the code?

```javascript
const fizz = "buzz"; // [!code highlight]
const foo = "baz";
```

I did a little digging to learn that Astro uses Shiki to highlight code blocks. And it turns out that Shiki offers some transformers. But, from their documentation, "Transformers only applies classes and does not come with styles; you can provide your own CSS rules to style them properly."

So what you need to do is a 4-step process:

1. install the Shiki transformers
2. modify your Astro config
3. add styling for a "highlighted" CSS class
4. indicate which lines you want highlighted

Here are the steps with a few more details for you:

1. Install the Shiki transformers

```bash
npm i -D @shikijs/transformers
```

2. Modify your Astro config

```javascript
import { transformerNotationHighlight } from "@shikijs/transformers";
```

```javascript
    shikiConfig: {
      transformers: [transformerNotationHighlight()],
    },
```

3. Add some CSS styling

Here are styles I added at the end of my tailwind.css file:

```css
.astro-code code {
  @apply block w-fit px-4;
}

.astro-code code .highlighted {
  @apply -mx-4 inline-block bg-yellow-800 px-4;
}
```

4. Indicate lines you want highlighted by adding a comment for the Shiki transformer

Add ` // [!code highlight]` at the end of a line you wanted highlighted.

The comment at the end of the line(s) will be stripped out and CSS classes will be added, and boom! That's how you do it!

<pre class="show-backticks"><code>```javascript
const fizz = "buzz";
const foo = 'baz'; // [!code highlight]
```</code></pre>

```javascript
const fizz = "buzz";
const foo = "baz"; // [!code highlight]
```

For more info, including instructions on how to highlight many lines with just one comment, see the [Shiki site](https://shiki.style/packages/transformers#transformernotationhighlight).
