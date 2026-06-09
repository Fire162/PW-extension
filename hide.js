// 🎯 target URL check
function isTargetPage() {
  return window.location.href.includes('batch-overview') &&
         window.location.href.includes('#Subjects_2');
}

// 🔥 teachers to remove
const removeTeachers = [
  'rahul yadav',
  'sachin jakhar',
  'vijay kumar tripathi',
  'ashutosh gautam',
  'amitabh sharma',
  'pankaj sijariya'
];

function runScript() {
  if (!isTargetPage()) return;

  // ❌ remove unwanted subjects
  document.querySelectorAll('.subjectCard-Ytcdxf').forEach(el => {
    const text = el.innerText.toLowerCase();
    if (removeTeachers.some(name => text.includes(name))) {
      el.remove();
    }
  });

  // ➕ add Rohit Agrawal card (avoid duplicates)
  const grid = document.querySelector('.subjectGrid-xLWQXl');

  if (grid && !document.getElementById('rohit-card')) {
    const newCard = document.createElement('div');
    newCard.id = 'rohit-card';
    newCard.className = 'subjectCard-Ytcdxf';
    newCard.style.cursor = 'pointer';

    newCard.innerHTML = `
      <div class="subjectContent-YDbOw6">
        <div class="subjectIcon-w538he">Or</div>
        <div class="_root_3yr8m_1 _subHeading_3yr8m_54 _semi-bold_3yr8m_21 _none_3yr8m_14 subjectText-BV4W9g">
          Organic Chemistry By Rohit Agrawal
        </div>
      </div>
    `;

    newCard.onclick = () => {
      window.location.href = 'https://www.pw.live/study-v2/batches/6779345c20fa0756e4a7fd08/khazana/62cd3a81c521a200190acaca/62cd3aa091598500118968bf/69c27194597749a9ded81368/khazana-topics?chapterName=Organic+Chemistry+(2026)&isPurchased=true&categoryName=Complete+Chemistry+-+12th&teacherId=637cc360a3039607af5e2524&year=2026';
    };

    grid.appendChild(newCard);

    // 🎯 layout fix
    grid.style.gridTemplateColumns = '1fr';
    grid.style.rowGap = '12px';
  }
}

// ⏳ wait for dynamic DOM (IMPORTANT)
const observer = new MutationObserver(() => {
  runScript();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// 🚀 initial run
runScript();

// 🔁 also detect SPA navigation
let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(runScript, 1000);
  }
}, 1000);
