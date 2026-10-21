// Şirket ve tarife bilgileri — yasal metinler, uygulama ve tanıtım sitesi BURADAN okur.
// Köşeli parantezli alanlar şirket bilgileri gelince doldurulacak.
export const COMPANY = {
  brand: "Apartmanca",
  unvan: "[Şirket unvanı]",
  mersis: "[MERSİS numarası]",
  vergiDairesi: "[Vergi dairesi]",
  vergiNo: "[Vergi numarası]",
  adres: "[Açık adres]",
  eposta: "[destek e-posta adresi]",
  telefon: "[Telefon]",
  kep: "", // Varsa KEP adresi (KVKK başvuruları için); boşsa metinlerde gösterilmez.
  site: "apartmanca.com",
  app: "app.apartmanca.com",
};

export const PRICE = { perUnit: 15, min: 99, trialDays: 30, yearlyPaidMonths: 10, refundDays: 14 };

export const LEGAL_UPDATED = "21 Ekim 2026";

export const monthly = (units: number) => Math.max(PRICE.min, PRICE.perUnit * Math.max(0, units));
export const yearly = (units: number) => monthly(units) * PRICE.yearlyPaidMonths;
