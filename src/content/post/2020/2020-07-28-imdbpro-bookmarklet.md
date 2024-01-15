---
title: IMDbPro Bookmarklet
excerpt: Easy access for subscribers, regardless of how annoying the ads get
publishDate: 2020-07-28
category: Blog
tags:
  - Acting
  - Bookmarklet
  - JavaScript
---

Many years ago, I [offered](http://web.archive.org/web/20120419154621/http://www.kevinashworth.com/blog/archives/category/technology/tech-tips) a bookmarklet that makes life easier for users with IMDbPro subscriptions. Today, I am posting this updated version, free for your use.

Once installed properly, this bookmarklet does two things:

1. It takes you to a specific IMDbPro page if you click it when you’re _not_ already on IMDb. (The specific page is the one shown in the blue input box. Use mine, as shown, or enter the one you want for your own browser.)
2. If you’re already _on_ a regular IMDb page when you click this bookmarklet, you’ll be whisked to the IMDbPro version of it.

<input onblur="javascript:bookmarklet_change(this.value);" value="https://pro.imdb.com/name/nm2825198/" class="w-full">

So, first enter your “home” URL in this input box above, and then drag this link to your bookmarks bar, and you’re good to go: <a class="hidden" id="imdbprobookmarklet" href="#">IMDbPro</a>

_Wondering what the heck a bookmarklet is? [Click here](https://en.wikipedia.org/wiki/Bookmarklet)._

<script type="text/javascript" charset="utf-8">
const bookmarklet_initialize = () => {
  const RAW_CODE = 'https://raw.githubusercontent.com/kevinashworth/imdb-pro-bookmarklet/main/src/bookmarklet'
  fetch(RAW_CODE)
    .then((response) => {
      if (!response.ok) {
        throw Error(response.statusText);
      }
      return response.text();
    })
    .then((text) => {
      const bookmarklet = document.getElementById('imdbprobookmarklet');
      bookmarklet.href = text;
      bookmarklet.classList.add('btn');
      bookmarklet.classList.add('btn--small');
      bookmarklet.classList.add('btn--info');
      bookmarklet.classList.remove('hidden');
    })
    .catch((error) => console.error('bookmarklet_initialize catch error:', error));
}
bookmarklet_initialize();
const bookmarklet_change = (url) => {
  const bookmarklet = document.getElementById('imdbprobookmarklet');
  bookmarklet.href = bookmarklet.href.replace("https://pro.imdb.com/name/nm2825198/", url);
}
</script>
