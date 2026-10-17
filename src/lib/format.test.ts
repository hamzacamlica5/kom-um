import { expect, test } from "bun:test";
import { tl, price, parseAmount, shiftPeriod, periodName, currentPeriod, istanbulToday } from "./format";

test("TL biçimi", () => {
  expect(tl(750)).toBe("750 TL");
  expect(tl(1234.5)).toBe("1.234,50 TL");
  expect(tl("1500000")).toBe("1.500.000 TL");
  expect(tl(null)).toBe("0 TL");
});

test("abonelik fiyatı: daire başı 15 TL, en az 99 TL", () => {
  expect(price(0)).toBe(99);
  expect(price(6)).toBe(99);
  expect(price(7)).toBe(105);
  expect(price(10)).toBe(150);
  expect(price(40)).toBe(600);
});

test("tutar ayrıştırma", () => {
  expect(parseAmount("1.250,50")).toBe(1250.5);
  expect(parseAmount("750")).toBe(750);
  expect(parseAmount("750 TL")).toBe(750);
  expect(parseAmount("12.5")).toBe(12.5);
  expect(parseAmount("25.000")).toBe(25000);
  expect(parseAmount("1.250.000")).toBe(1250000);
  expect(parseAmount("12.50")).toBe(12.5);
  expect(parseAmount("")).toBe(null);
  expect(parseAmount("abc")).toBe(null);
});

test("dönem işlemleri", () => {
  expect(shiftPeriod("2026-01", -1)).toBe("2025-12");
  expect(shiftPeriod("2026-12", 1)).toBe("2027-01");
  expect(periodName("2026-10")).toBe("Ekim 2026");
  // İstanbul saatine göre: UTC 22:30 31 Ekim = İstanbul 1 Kasım 01:30
  expect(currentPeriod(new Date("2026-10-31T22:30:00Z"))).toBe("2026-11");
  expect(istanbulToday(new Date("2026-10-31T20:59:00Z"))).toBe("2026-10-31");
});

import { toCsv, slug } from "./csv";
test("Excel uyumlu CSV", () => {
  const c = toCsv(["Ad", "Tutar"], [["Daire 1", 750.5], ['Not; "özel"', null]]);
  expect(c.startsWith("﻿")).toBe(true);
  expect(c).toContain("Ad;Tutar\r\nDaire 1;750,5\r\n");
  expect(c).toContain('"Not; ""özel""";');
  expect(slug("Lale Apartmanı Şık Gül")).toBe("lale-apartmani-sik-gul");
});
