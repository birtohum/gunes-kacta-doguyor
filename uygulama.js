"use strict";
const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const YIL = 2026, R = Math.PI / 180;
let H, M, gun, dilim = 3, tur = "dog", secili = 33; // İstanbul (sıra = plaka-1)

// NOAA genel güneş denklemleri → gün doğumu/batımı, UTC dakikası
function gunes(doy, lat, lon) {
  const g = ((2 * Math.PI) / 365) * doy; // doy: 0 = 1 Ocak, öğle
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const d = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const c = Math.cos(90.833 * R) / (Math.cos(lat * R) * Math.cos(d)) - Math.tan(lat * R) * Math.tan(d);
  const ha = Math.acos(Math.max(-1, Math.min(1, c))) / R;
  return { dog: 720 - 4 * (lon + ha) - eq, bat: 720 - 4 * (lon - ha) - eq };
}
const yerel = (utc) => utc + dilim * 60;
const saat = (m) => { m = Math.round(m); return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
const tarih = (doy) => { const t = new Date(Date.UTC(YIL, 0, 1 + doy)); return `${t.getUTCDate()} ${AY[t.getUTCMonth()]}`; };
const sure = (m) => `${Math.floor(m / 60)} sa ${Math.round(m % 60)} dk`;
function ek(s, e) { // bulunma: İstanbul'da, Muş'ta
  const k = s.toLocaleLowerCase("tr"), sesli = [...k].reverse().find((h) => "aıoueiöü".includes(h));
  return `${s}'${"fstkçşhp".includes(k.slice(-1)) ? "t" : "d"}${"aıou".includes(sesli) ? "a" : "e"}${e || ""}`;
}

function haritaKur() {
  const s = $("harita");
  s.setAttribute("viewBox", `0 0 ${H.w} ${H.h}`);
  H.iller.forEach((p, i) => {
    const e = document.createElementNS(NS, "path"); e.setAttribute("d", p.d); e.dataset.i = i;
    e.appendChild(document.createElementNS(NS, "title"));
    e.onclick = () => { secili = i; ciz(); $("ozet").scrollIntoView({ behavior: "smooth", block: "nearest" }); };
    s.appendChild(e);
  });
  const g = document.createElementNS(NS, "g"); g.id = "yazilar"; s.appendChild(g);
}

function ciz() {
  const vals = M.map(([, , la, lo]) => { const x = gunes(gun, la, lo); return { dog: yerel(x.dog), bat: yerel(x.bat) }; });
  const v = vals.map((x) => x[tur]);
  const lo = Math.min(...v), hi = Math.max(...v);
  const g = $("yazilar"); g.innerHTML = "";
  [...$("harita").querySelectorAll("path")].forEach((e) => {
    const i = Number(e.dataset.i), f = (v[i] - lo) / (hi - lo || 1);
    e.style.fill = `color-mix(in oklab, var(--gec) ${Math.round(100 * f)}%, var(--erken))`;
    e.style.stroke = i === secili ? "var(--yazi)" : ""; e.style.strokeWidth = i === secili ? "2" : "";
    e.querySelector("title").textContent = `${H.iller[i].ad}: doğum ${saat(vals[i].dog)}, batım ${saat(vals[i].bat)}`;
    const t = document.createElementNS(NS, "text");
    t.setAttribute("x", H.iller[i].x); t.setAttribute("y", H.iller[i].y + 3); t.setAttribute("text-anchor", "middle"); t.setAttribute("class", "saat");
    t.textContent = saat(v[i]); g.appendChild(t);
  });
  const iMin = v.indexOf(lo), iMax = v.indexOf(hi);
  $("gunAd").textContent = tarih(gun);
  $("lejant").innerHTML = `${tur === "dog" ? "Gün doğumu" : "Gün batımı"} (UTC+${dilim}): <b>${saat(lo)}</b><span class="olcek"></span><b>${saat(hi)}</b>. En erken ${H.iller[iMin].ad}, en geç ${H.iller[iMax].ad}; fark ${Math.round(hi - lo)} dakika.`;

  // seçili il
  const il = H.iller[secili], [, , la, lon] = M[secili], x = vals[secili];
  let gec = 0, gec730 = 0, erkenBat = 0;
  for (let d = 0; d < 365; d++) { const y = gunes(d, la, lon); if (yerel(y.dog) > 480) gec++; if (yerel(y.dog) > 450) gec730++; if (yerel(y.bat) < 1050) erkenBat++; }
  $("ozet").innerHTML = `<p class="cumle">${ek(tarih(gun))} ${ek(il.ad)} güneş <b>${saat(x.dog)}</b>'${ekSaat(x.dog)} doğuyor, <b>${saat(x.bat)}</b>'${ekSaat(x.bat)} batıyor; gün ${sure(x.bat - x.dog)}.</p>
    <div class="kutular"><div class="kutu"><b>${gec}</b><span>günde güneş 08:00'den sonra doğuyor</span></div>
    <div class="kutu"><b>${gec730}</b><span>günde 07:30'dan sonra</span></div>
    <div class="kutu"><b>${erkenBat}</b><span>günde 17:30'dan önce batıyor</span></div></div>`;
  yilGrafik(la, lon, il.ad);
  history.replaceState(null, "", `?il=${secili + 1}&gun=${gun}${dilim === 2 ? "&utc=2" : ""}`);
}
// "07:12'de", "08:00'de", "06:40'ta" — son rakamın okunuşuna göre
function ekSaat(m) {
  const dk = Math.round(m) % 60, son = dk === 0 ? Math.floor(Math.round(m) / 60) % 12 || 12 : dk;
  const oku = ["sıfır", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"], on = ["", "on", "yirmi", "otuz", "kırk", "elli"];
  const s = son % 10 ? oku[son % 10] : on[Math.floor(son / 10)] || oku[0];
  const k = s.slice(-1), sesli = [...s].reverse().find((h) => "aıoueiöü".includes(h));
  return `${"fstkçşhp".includes(k) ? "t" : "d"}${"aıou".includes(sesli) ? "a" : "e"}`;
}

function yilGrafik(la, lon, ad) {
  const G = 900, Y = 260, sol = 44, sag = 14, ust = 12, alt = 26;
  const v = []; for (let d = 0; d < 365; d++) { const y = gunes(d, la, lon); v.push([yerel(y.dog), yerel(y.bat)]); }
  const yMin = 3 * 60, yMax = 22 * 60;
  const X = (d) => sol + (d / 364) * (G - sol - sag), Yp = (m) => ust + ((m - yMin) / (yMax - yMin)) * (Y - ust - alt);
  let s = `<svg viewBox="0 0 ${G} ${Y}" role="img" aria-label="${ad} için yıl boyunca gün doğumu ve batımı">`;
  s += `<path d="M${v.map(([a], d) => `${X(d)},${Yp(a)}`).join("L")}L${v.map(([, b], d) => `${X(364 - d)},${Yp(v[364 - d][1])}`).join("L")}Z" fill="var(--erken)" opacity=".45"/>`;
  for (const h of [4, 8, 12, 16, 20]) s += `<line x1="${sol}" x2="${G - sag}" y1="${Yp(h * 60)}" y2="${Yp(h * 60)}" stroke="var(--cizgi)"/><text x="${sol - 6}" y="${Yp(h * 60) + 4}" text-anchor="end">${String(h).padStart(2, "0")}:00</text>`;
  s += `<line x1="${sol}" x2="${G - sag}" y1="${Yp(480)}" y2="${Yp(480)}" stroke="var(--vurgu)" stroke-dasharray="4 4"/>`;
  for (let m = 0; m < 12; m += 2) { const d = Math.round((Date.UTC(YIL, m, 1) - Date.UTC(YIL, 0, 1)) / 864e5); s += `<text x="${X(d)}" y="${Y - 6}">${AY[m].slice(0, 3)}</text>`; }
  s += `<path d="M${v.map(([a], d) => `${X(d)},${Yp(a)}`).join("L")}" fill="none" stroke="var(--vurgu)" stroke-width="2"/>`;
  s += `<path d="M${v.map(([, b], d) => `${X(d)},${Yp(b)}`).join("L")}" fill="none" stroke="var(--gec)" stroke-width="2"/>`;
  s += `<line x1="${X(gun)}" x2="${X(gun)}" y1="${ust}" y2="${Y - alt}" stroke="var(--yazi)" stroke-width="1"/>`;
  $("yil").innerHTML = s + "</svg>";
  $("yilBaslik").textContent = `${ek(ad)} bir yıl`;
  $("yilAlt").textContent = `Turuncu çizgi gün doğumu, lacivert gün batımı (UTC+${dilim}); aradaki sarı alan gündüz. Kesikli çizgi 08:00.`;
}

function giris() {
  const kis = 354; // 21 Aralık
  const v = M.map(([, , la, lo]) => yerel(gunes(kis, la, lo).dog));
  const i0 = v.indexOf(Math.min(...v)), i1 = v.indexOf(Math.max(...v));
  $("giris").innerHTML = `Türkiye 2016'dan beri yıl boyu UTC+3 kullanıyor. Yılın en kısa gününde (21 Aralık) güneş ${ek(H.iller[i0].ad)} ${saat(v[i0])}'${ekSaat(v[i0])}, ${ek(H.iller[i1].ad)} <b>${saat(v[i1])}</b>'${ekSaat(v[i1])} doğuyor: aynı saat diliminde ${Math.round(v[i1] - v[i0])} dakika fark.`;
}

async function baslat() {
  [H, M] = await Promise.all([fetch("veri/harita.json").then((r) => r.json()), fetch("veri/merkezler.json").then((r) => r.json())]);
  const p = new URLSearchParams(location.search);
  const bugun = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 1)) / 864e5);
  gun = p.has("gun") ? Math.min(364, Math.max(0, Number(p.get("gun")))) : Math.min(364, bugun);
  if (Number(p.get("il")) >= 1 && Number(p.get("il")) <= 81) secili = Number(p.get("il")) - 1;
  if (p.get("utc") === "2") dilim = 2;
  $("gun").value = gun;
  haritaKur(); giris();
  $("gun").oninput = (e) => { gun = Number(e.target.value); ciz(); };
  const dilimSec = (d) => { dilim = d; $("s3").classList.toggle("secili", d === 3); $("s2").classList.toggle("secili", d === 2); $("s3").setAttribute("aria-checked", d === 3); $("s2").setAttribute("aria-checked", d === 2); ciz(); };
  $("s3").onclick = () => dilimSec(3); $("s2").onclick = () => dilimSec(2);
  const turSec = (t) => { tur = t; $("tDog").classList.toggle("secili", t === "dog"); $("tBat").classList.toggle("secili", t === "bat"); ciz(); };
  $("tDog").onclick = () => turSec("dog"); $("tBat").onclick = () => turSec("bat");
  dilimSec(dilim);
}
baslat();
