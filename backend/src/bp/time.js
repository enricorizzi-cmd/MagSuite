"use strict";

function pad2(n){ return (n < 10 ? "0" : "") + n; }
function toDate(v){ return v instanceof Date ? new Date(v.getTime()) : new Date(v); }

function dmy(d){ const x = toDate(d); return pad2(x.getDate()) + "/" + pad2(x.getMonth() + 1) + "/" + x.getFullYear(); }
function ymd(d){ const x = toDate(d); return x.getFullYear() + "-" + pad2(x.getMonth() + 1) + "-" + pad2(x.getDate()); }
function timeHM(d){ const x = toDate(d); return pad2(x.getHours()) + ":" + pad2(x.getMinutes()); }

function startOfWeek(d){
  const x = toDate(d); x.setHours(0,0,0,0);
  const diff = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}
function endOfWeek(d){ const s = startOfWeek(d); const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23,59,59,999); return e; }

function startOfMonth(d){ const x = toDate(d); return new Date(x.getFullYear(), x.getMonth(), 1); }
function endOfMonth(d){ const x = toDate(d); return new Date(x.getFullYear(), x.getMonth() + 1, 0, 23,59,59,999); }

function isoWeekNum(d){
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  return Math.ceil((((date - yearStart)/86400000)+1)/7);
}

function startOfQuarter(d){ const x = toDate(d), q = Math.floor(x.getMonth()/3); return new Date(x.getFullYear(), q*3, 1); }
function endOfQuarter(d){ const s = startOfQuarter(d); return new Date(s.getFullYear(), s.getMonth() + 3, 0, 23,59,59,999); }
function startOfSemester(d){ const x = toDate(d), s = (x.getMonth() < 6 ? 0 : 6); return new Date(x.getFullYear(), s, 1); }
function endOfSemester(d){ const s = startOfSemester(d); return new Date(s.getFullYear(), s.getMonth() + 6, 0, 23,59,59,999); }
function startOfYear(d){ const x = toDate(d); return new Date(x.getFullYear(),0,1); }
function endOfYear(d){ const x = toDate(d); return new Date(x.getFullYear(),11,31, 23,59,59,999); }

function startOfIsoWeek(y, w){
  const simple = new Date(y,0,1 + (w-1)*7);
  const dow = simple.getDay() || 7;
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - (dow-1));
  monday.setHours(0,0,0,0);
  return monday;
}
function weekBoundsOf(y, w){ const s = startOfIsoWeek(y,w); const e = new Date(s); e.setDate(s.getDate()+6); e.setHours(23,59,59,999); return { start: s, end: e }; }

function nextWeekBounds(from){ const s = startOfWeek(from); s.setDate(s.getDate()+7); const e = new Date(s); e.setDate(s.getDate()+6); e.setHours(23,59,59,999); return { start: s, end: e }; }
function prevWeekBounds(from){ const s = startOfWeek(from); s.setDate(s.getDate()-7); const e = new Date(s); e.setDate(s.getDate()+6); e.setHours(23,59,59,999); return { start: s, end: e }; }
function nextMonthBounds(from){ const start = new Date(from.getFullYear(), from.getMonth()+1, 1); return { start, end: new Date(start.getFullYear(), start.getMonth()+1, 0, 23,59,59,999) }; }
function prevMonthBounds(from){ const end = new Date(from.getFullYear(), from.getMonth(), 0, 23,59,59,999); return { start: new Date(end.getFullYear(), end.getMonth(), 1), end }; }
function nextQuarterBounds(from){ const start = startOfQuarter(new Date(from.getFullYear(), from.getMonth()+3, 1)); return { start, end: new Date(start.getFullYear(), start.getMonth()+3, 0, 23,59,59,999) }; }
function prevQuarterBounds(from){ const start = startOfQuarter(new Date(from.getFullYear(), from.getMonth()-3, 1)); return { start, end: new Date(start.getFullYear(), start.getMonth()+3, 0, 23,59,59,999) }; }
function nextSemesterBounds(from){ const start = startOfSemester(new Date(from.getFullYear(), from.getMonth()+6, 1)); return { start, end: new Date(start.getFullYear(), start.getMonth()+6, 0, 23,59,59,999) }; }
function prevSemesterBounds(from){ const start = startOfSemester(new Date(from.getFullYear(), from.getMonth()-6, 1)); return { start, end: new Date(start.getFullYear(), start.getMonth()+6, 0, 23,59,59,999) }; }
function nextYearBounds(from){ const start = startOfYear(new Date(from.getFullYear()+1,0,1)); return { start, end: endOfYear(start) }; }
function prevYearBounds(from){ const start = startOfYear(new Date(from.getFullYear()-1,0,1)); return { start, end: endOfYear(start) }; }

function formatPeriodLabel(type, startDate){
  const d = toDate(startDate);
  if(type === "settimanale") return "Sett. " + isoWeekNum(d) + " " + d.getFullYear();
  if(type === "mensile") return d.toLocaleString("it-IT", { month: "long", year: "numeric" });
  if(type === "trimestrale"){ const q = Math.floor(d.getMonth()/3) + 1; return "Trimestre " + q + " " + d.getFullYear(); }
  if(type === "semestrale") return (d.getMonth() < 6 ? "1" : "2") + "° semestre " + d.getFullYear();
  if(type === "annuale") return "Anno " + d.getFullYear();
  if(type === "ytd") return "YTD " + d.getFullYear();
  if(type === "ltm") return "Ultimi 12 mesi";
  return type;
}

module.exports = {
  pad2,
  dmy,
  ymd,
  timeHM,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isoWeekNum,
  startOfQuarter,
  endOfQuarter,
  startOfSemester,
  endOfSemester,
  startOfYear,
  endOfYear,
  startOfIsoWeek,
  weekBoundsOf,
  nextWeekBounds,
  prevWeekBounds,
  nextMonthBounds,
  prevMonthBounds,
  nextQuarterBounds,
  prevQuarterBounds,
  nextSemesterBounds,
  prevSemesterBounds,
  nextYearBounds,
  prevYearBounds,
  formatPeriodLabel
};