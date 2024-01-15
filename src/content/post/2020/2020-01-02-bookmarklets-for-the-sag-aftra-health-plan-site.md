---
title: 2020 Bookmarklets for the SAG-AFTRA Health Plan Site
publishDate: 2020-01-02
category: Blog
tags:
  - Acting
  - Bookmarklet
  - JavaScript
  - SAG-AFTRA
  - Union
  - Healthcare
---

> **Update** November 2020:\
> Most of these bookmarklets are no longer needed, because the Health Plan's site now has the same functionality "built-in". Did I inspire them to do so? I'm not saying I did, I'm not saying I didn't.

Sharing once again [updated](/blog/2019-bookmarklets-for-the-sag-aftra-health-plan-site/) bookmarklets for the [SAG-AFTRA Health Plan Benefits Manager](https://my.sagaftraplans.org/health/):

<ul>
<li><a href='javascript:void%20function()%7Bvar%20e=new%20Date,t=e.getDate(),a=e.getMonth()+1,n=e.getFullYear();10>t%26%26(t="0"+t),10>a%26%26(a="0"+a),e=a+"/"+t+"/"+n,$("input")%5B6%5D.value="01/01/2020",$("input")%5B7%5D.value=e;$("%23earningsForm%5C%5C:findBtn").click();%7D();'>Health 2020</a><br />
When I go the Earnings page, I tend to want to see my YTD earnings. This bookmarklet populates the date fields for January 1, 2020, to today's date, and activates the Find button.</li>
<li><a href='javascript:void%20function()%7B$(%22input%22)%5B6%5D.value=%2201/01/2019%22,$(%22input%22)%5B7%5D.value=%2212/31/2019%22;$(%22%23earningsForm%5C%5C:findBtn%22).click();%7D();'>Health 2019</a><br />
I also often want to see last year's earnings. This bookmarklet populates the date fields for 2019 and activates the Find button.</li>
<li><a href='javascript:void%20function()%7B$(%22input%22)%5B6%5D.value=%2201/01/2018%22,$(%22input%22)%5B7%5D.value=%2212/31/2018%22;$(%22%23earningsForm%5C%5C:findBtn%22).click();%7D();'>Health 2018</a><br />
Same for the year before last year.</li>
<li><a href='javascript:$(%27#earningsList_rppDD%20option[value="100"]%27).prop(%27selected%27,true);$(%27#earningsList_rppDD%20option[value="100"]%27).change();setTimeout(function(){$(%27table[role="grid"]%20thead%20tr%27).append(%27<th>Row</th>%27);$(%27table[role="grid"]%20tfoot%20tr%27).append(%27<td>Row</td>%27);$(%27table[role="grid"]%20tr.ui-widget-content%27).each(function(i,val){var%20row=%27<td>%27+(i+1).toString()+%27</td>%27;$(this).append(row);});},1000);'>Health Rows</a><br />
This bookmarklet adds a column with the row number at the end of the table. I find this super helpful! But this functionality breaks once you change any other settings, so just refresh the plan's website if anything gets wonky. In fact, if the site doesn’t work quite right after clicking any of these bookmarklets, just refresh the whole site and start over</li>
</ul>

If you’re using Safari or Chrome on a desktop computer, install these underlined bookmarklets by dragging the links to your bookmarks bar &mdash; but only after you are logged in to the new site and are looking at the [Earnings History page](https://my.sagaftraplans.org/health/benefit/earnings.jsf).
