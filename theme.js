'use strict';
// Fixed daily periods follow the device's local clock, not the selected task date.
function themeForHour(hour) {
  if (hour >= 5 && hour < 8) return {id:'dawn',label:'الفجر',icon:'🌅',color:'#7650a0'};
  if (hour >= 8 && hour < 12) return {id:'morning',label:'الصباح',icon:'🌤️',color:'#277665'};
  if (hour >= 12 && hour < 16) return {id:'noon',label:'منتصف النهار',icon:'☀️',color:'#946008'};
  if (hour >= 16 && hour < 20) return {id:'evening',label:'المساء',icon:'🌇',color:'#a44e37'};
  return {id:'night',label:'الليل',icon:'🌙',color:'#a8b9ff'};
}
function applyTimeTheme() {
  const theme=themeForHour(new Date().getHours());
  if(document.documentElement.dataset.timeTheme===theme.id)return;
  document.documentElement.dataset.timeTheme=theme.id;
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.content=theme.id==='night'?'#141d35':theme.color;
  const badge=document.getElementById('timeTheme');
  if(badge){badge.textContent=`${theme.icon} ${theme.label}`;badge.title='الألوان تتغيّر تلقائيًا حسب ساعة جهازك';}
}
applyTimeTheme();
setInterval(applyTimeTheme,10000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)applyTimeTheme()});
window.addEventListener('focus',applyTimeTheme);
