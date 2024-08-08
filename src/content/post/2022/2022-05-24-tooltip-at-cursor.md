---
title: How to show a Material-UI V4/V5 Tooltip at the cursor
excerpt: Recently, I needed to place a tooltip at the tip of the cursor
image: /assets/images/2022-05-24-tooltip-screenshot.png
publishDate: 2022-05-24 15:17:59
category: Blog
tags:
  - Development
  - JavaScript
  - Material-UI
  - Popper
  - Programming
  - React
---

Recently, I needed to place a tooltip at the tip of the cursor, and it took a little bit of trial and error to get it to work. Here is the code I used.

## Material-UI V4 Tooltip

[Material-UI V4](https://v4.mui.com) uses the older [V1 of the Popper.js library](https://popper.js.org/docs/v1/). To get it to work, I followed the mouse and put its `position` in state, and then used the position to adjust the Tooltip's Popper using the `computeStyle` function:

```javascript
const computeStyleFn = (data) => {
  return {
    ...data,
    styles: {
      ...data.styles,
      left: `${position.clientX + 7}px`,
      top: `${position.clientY + 2}px`,
    },
  };
};
```

See a rudimentary React 17 demo repo in action at [CodeSandbox.io](https://codesandbox.io/s/github/kevinashworth/mui-v4-tooltip-demo?file=/src/Demo.js), or find the code [on GitHub](https://github.com/kevinashworth/mui-v4-tooltip-demo).

## Material UI V5 Tooltip

With [Material UI V5](https://mui.com/), the Popper.js library has been updated to [V2](https://popper.js.org/docs/v2/). It has a `followCursor` option available, so all we need to do here is figure out the offset that we want.

```javascript
<Tooltip
  followCursor={true}
  PopperProps={{
    modifiers: [
      {
        name: "offset",
        options: {
          offset: [88, 2],
        },
      },
    ],
  }}
```

See a React 18 demo repo in action at [CodeSandbox.io](https://codesandbox.io/s/github/kevinashworth/mui-v5-tooltip-demo?file=/src/Demo.js), or check out the code [on GitHub](https://github.com/kevinashworth/mui-v5-tooltip-demo).
