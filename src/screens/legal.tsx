import React from "react";
import { Link } from "../state";
import { Brand } from "./auth";
import { LinkCtx, LEGAL_PAGES, LEGAL_UPDATED, type LegalPage } from "../legal/texts";
import { COMPANY } from "../legal/info";

// Uygulamadaki yasal sayfalar; metinler src/legal/texts.tsx'ten gelir (site ile aynı kaynak).
export const LEGAL = { owner: COMPANY.unvan, address: COMPANY.adres, email: COMPANY.eposta, updated: LEGAL_UPDATED };

const AppLink = ({ to, children }: { to: string; children: React.ReactNode }) =>
  LEGAL_PAGES.some((p) => p.path === to) || to === "/" ? <Link to={to}>{children}</Link> : <a href={to}>{children}</a>;

function Shell({ page }: { page: LegalPage }) {
  const { Body } = page;
  return (
    <LinkCtx.Provider value={AppLink}>
      <div className="legal">
        <header className="legal-top"><Link to="/"><Brand small /></Link><Link to="/" className="small">Uygulamaya dön</Link></header>
        <article className="legal-body">
          <h1>{page.title}</h1>
          <p className="muted small">Son güncelleme: {LEGAL_UPDATED}</p>
          <Body />
          <nav className="legal-nav">
            {LEGAL_PAGES.filter((p) => p.path !== page.path).map((p) => <Link key={p.path} to={p.path}>{p.title}</Link>)}
          </nav>
        </article>
      </div>
    </LinkCtx.Provider>
  );
}

export function legalPageFor(path: string) {
  const page = LEGAL_PAGES.find((p) => p.path === path);
  return page ? <Shell page={page} /> : null;
}
