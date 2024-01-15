---
title: 2019 Bookmarklets for the SAG-AFTRA Health Plan Site
publishDate: 2019-01-02
category: Blog
tags:
  - Acting
  - Bookmarklet
  - JavaScript
  - SAG-AFTRA
  - Union
  - Healthcare
---

Sharing once again [updated](/blog/bookmarklets-for-the-sag-aftra-health-plan-site/) bookmarklets for the [SAG-AFTRA Health Plan Benefits Manager](https://my.sagaftraplans.org/health/):

<ul>
<li><a href='javascript:void%20function()%7Bvar%20e=new%20Date,t=e.getDate(),a=e.getMonth()+1,n=e.getFullYear();10>t%26%26(t="0"+t),10>a%26%26(a="0"+a),e=a+"/"+t+"/"+n,$("input")%5B6%5D.value="01/01/2019",$("input")%5B7%5D.value=e;$("%23earningsForm%5C%5C:findBtn").click();%7D();'>Health 2019</a><br />
When I go the Earnings page, I tend to want to see my YTD earnings. This bookmarklet populates the date fields for January 1 to today, and activates the Find button.</li>
<li><a href='javascript:void%20function()%7B$(%22input%22)%5B6%5D.value=%2201/01/2018%22,$(%22input%22)%5B7%5D.value=%2212/31/2018%22;$(%22%23earningsForm%5C%5C:findBtn%22).click();%7D();'>Health 2018</a><br />
Out of morbid curiosity or for legitimate tax purposes, I often want to see last year's earnings. This bookmarklet populates the date fields for 2018 and activates the Find button.</li>
<li><a href='javascript:void%20function()%7B$(%22input%22)%5B6%5D.value=%2201/01/2018%22,$(%22input%22)%5B7%5D.value=%2212/31/2018%22;$(%22%23earningsForm%5C%5C:findBtn%22).click();%7D();'>Health 2017</a><br />
Same for the year before last year.</li>
<li><a href='javascript:$(%27#earningsList_rppDD%20option[value="100"]%27).prop(%27selected%27,true);$(%27#earningsList_rppDD%20option[value="100"]%27).change();setTimeout(function(){$(%27table[role="grid"]%20thead%20tr%27).append(%27<th>Row</th>%27);$(%27table[role="grid"]%20tfoot%20tr%27).append(%27<td>Row</td>%27);$(%27table[role="grid"]%20tr.ui-widget-content%27).each(function(i,val){var%20row=%27<td>%27+(i+1).toString()+%27</td>%27;$(this).append(row);});},1000);'>Health Rows</a><br />
This bookmarklet adds a column with the row number at the end of the table. This functionality breaks once you change any other settings, so just refresh the web page if it gets wonky.</li>
</ul>

If you're using Safari on a desktop computer, simply install these underlined bookmarklets by dragging the links to your bookmarks bar, then clicking on them &mdash; but only after you are logged in to the new site and are looking at the [Earnings History page](https://my.sagaftraplans.org/health/benefit/earnings.jsf). For other browsers, you'll probably need to manually install them by creating a new bookmark and pasting in the raw JavaScript code that you access by right-clicking the bookmarklet and copying its code.

If things don't work quite right after clicking a bookmarklet, just refresh the whole page and start over. I've used them many times. Let me know how they work for you!
