// Apartmanca tanıtım sitesi — çerez yok, depolama yok, dış istek yok.
(function () {
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Başlık çizgisi
  var top = document.querySelector(".top");
  if (top) { var onS = function () { top.classList.toggle("scrolled", scrollY > 8); }; addEventListener("scroll", onS, { passive: true }); onS(); }

  // Cephe: ödeme yapan dairelerin pencereleri sırayla yanar (tek seferlik açılış anı)
  var wins = [].slice.call(document.querySelectorAll(".facade .win[data-o]"));
  var n = document.querySelector(".tally .n"), bar = document.querySelector(".tally .bar i");
  if (wins.length && n && bar && !reduce) {
    wins.sort(function (a, b) { return a.dataset.o - b.dataset.o; });
    wins.forEach(function (w) { w.classList.remove("on"); });
    n.textContent = "0"; bar.style.width = "0%";
    var i = 0;
    setTimeout(function step() {
      if (i >= wins.length) return;
      wins[i].classList.add("on"); i++;
      n.textContent = String(i); bar.style.width = (i / 12 * 100) + "%";
      setTimeout(step, i < 3 ? 420 : 300);
    }, 700);
  }

  // Fiyat hesaplayıcı
  var PER = 15, MIN = 99, PAID = 10;
  var num = document.getElementById("units-n"), rng = document.getElementById("units-r");
  if (!num || !rng) return;
  var month = document.getElementById("p-month"), year = document.getElementById("p-year"), per = document.getElementById("p-per");
  var mini = document.querySelector(".mini"), more = document.querySelector(".mini-more");
  var tl = function (v) { return v.toLocaleString("tr-TR") + " TL"; };
  function render(u, from) {
    u = Math.max(1, Math.min(500, Math.round(u) || 1));
    if (from !== "num") num.value = u;
    if (from !== "rng") rng.value = Math.min(u, 100);
    var m = Math.max(MIN, PER * u);
    month.textContent = tl(m);
    year.textContent = tl(m * PAID);
    per.textContent = m === MIN && PER * u < MIN ? "En az " + MIN + " TL; daire başına " + (m / u).toLocaleString("tr-TR", { maximumFractionDigits: 1 }) + " TL" : "Daire başına ayda " + PER + " TL";
    var show = Math.min(u, 60), html = "";
    for (var k = 0; k < show; k++) html += "<i></i>";
    mini.innerHTML = html;
    more.textContent = u > 60 ? "ve " + (u - 60) + " daire daha" : "";
  }
  num.addEventListener("input", function () { if (num.value !== "") render(+num.value, "num"); });
  num.addEventListener("blur", function () { render(+num.value); });
  rng.addEventListener("input", function () { render(+rng.value, "rng"); });
  render(+num.value);
})();
