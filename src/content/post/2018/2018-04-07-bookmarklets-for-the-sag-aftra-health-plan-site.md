---
title: 2018 Bookmarklets for the SAG-AFTRA Health Plan Site
publishDate: 2018-04-08
category: Blog
tags:
  - Acting
  - Bookmarklet
  - Javascript
  - SAG-AFTRA
  - Union
  - Healthcare
---

<p>Sharing <a href="/blog/bookmarklets-for-the-new-sag-aftra-health-plan-site/">updated</a> bookmarklets for the <a href="https://my.sagaftraplans.org/health/">SAG-AFTRA Health Plan Benefits Manager</a> site:</p>
<ol>
<li><a href='javascript:void%20function()%7Bvar%20e=new%20Date,t=e.getDate(),a=e.getMonth()+1,n=e.getFullYear();10>t%26%26(t="0"+t),10>a%26%26(a="0"+a),e=a+"/"+t+"/"+n,$("input")%5B6%5D.value="01/01/2018",$("input")%5B7%5D.value=e;$("%23earningsForm%5C%5C:findBtn").click();%7D();'>Health 2018</a><br />
When I go the Earnings page, I tend to want to see my earnings from January 1, 2018 to today. This bookmarklet populates the date fields and presses the Find button.</li>
<li><a href='javascript:$(%27#earningsList_rppDD%20option[value="100"]%27).prop(%27selected%27,true);$(%27#earningsList_rppDD%20option[value="100"]%27).change();setTimeout(function(){$(%27table[role="grid"]%20thead%20tr%27).append(%27<th>Row</th>%27);$(%27table[role="grid"]%20tfoot%20tr%27).append(%27<td>Row</td>%27);$(%27table[role="grid"]%20tr.ui-widget-content%27).each(function(i,val){var%20row=%27<td>%27+(i+1).toString()+%27</td>%27;$(this).append(row);});},1000);'>Health Rows</a><br />
Add a column with the row number at the end of the table. Probably breaks once you change any other settings, so just refresh from there.</li>
</ol>
<p>Try them out by dragging the links to your bookmarks bar, then clicking on them &mdash; but only after you are logged in to the new site and are looking at the <a href="https://my.sagaftraplans.org/health/benefit/earnings.jsf">Earnings page</a>.</p>
<p>If things don't work quite right after clicking a bookmarklet, just refresh the whole page and start over. I've tested these on Safari, Firefox and an iPhone. Let me know how they work for you!</p>
