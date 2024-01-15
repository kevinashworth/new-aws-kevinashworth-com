---
title: Bookmarklets for the New SAG-AFTRA Health Plan Site
publishDate: 2016-10-11
category: Blog
tags:
  - Acting
  - Bookmarklet
  - Javascript
  - SAG-AFTRA
  - Union
  - Healthcare
---

<p>Sharing some bookmarklets for the new <a href="https://my.sagaftraplans.org/health/">SAG-AFTRA Health Plan Benefits Manager</a> site:</p>
<ol>
<li><a href='javascript:void%20function(){var%20e=new%20Date,t=e.getDate(),a=e.getMonth()+1,n=e.getFullYear();10%3Et%26%26(t=%220%22+t),10%3Ea%26%26(a=%220%22+a),e=a+%22/%22+t+%22/%22+n,$(%22input%22)[6].value=%2201/01/2016%22,$(%22input%22)[7].value=e;$("#earningsForm\\:findBtn").click();}();'>Health 2016</a><br />
When I go the Earnings page, I tend to want to see my earnings from January 1, 2016 to today. This bookmarklet populates the date fields and presses the Find button.</li></p>
<li><a href='javascript:$(%22.ui-row-toggler%20span%22).click();$(%22.ui-datatable-even%22).switchClass(%22ui-datatable-even%22,%20%22ui-datatable-odd%22);'>Health All More</a><br />
Each row of the Earnings page has a "More" link at the end. This bookmarklet opens all of them at once.</li><br />
</ol><br />
Try them out by dragging the links to your bookmarks bar, then clicking on them &mdash; but only after you are logged in to the new site and are looking at the <a href="https://my.sagaftraplans.org/health/benefit/earnings.jsf">Earnings page</a>.</p>
<p>If things don't work quite right after clicking a bookmarklet, just refresh the whole page and start over. I've tested these on Safari, Firefox and an iPhone. Let me know how they work for you!</p>
