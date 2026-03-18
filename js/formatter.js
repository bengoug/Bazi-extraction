/**
 * formatter.js — Génère le HTML d'extraction formaté en 8 phases
 * Layout basé sur le modèle d'analyse BaZi professionnel
 */

const Formatter = (() => {
  'use strict';

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap');

    * { box-sizing: border-box; }

    body {
      font-family: 'Noto Sans', 'Segoe UI', sans-serif;
      max-width: 860px;
      margin: 0 auto;
      padding: 40px 28px;
      background: #fff;
      color: #1a1a1a;
      line-height: 1.8;
      font-size: 15px;
    }

    /* Title */
    .main-title {
      font-size: 1.9rem;
      color: #1a1a1a;
      margin-bottom: 2px;
      font-weight: 700;
    }
    .main-subtitle {
      font-size: 1rem;
      color: #666;
      margin-bottom: 30px;
    }

    /* Phase headers (h2 style) */
    .phase-header {
      font-size: 1.3rem;
      color: #1a1a1a;
      margin-top: 50px;
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e0e0e0;
      font-weight: 700;
    }
    .phase-header small {
      font-weight: 400;
      color: #888;
      font-size: 0.85rem;
    }

    /* Section headers */
    h3 {
      font-size: 1.05rem;
      color: #333;
      margin-top: 28px;
      margin-bottom: 12px;
      font-weight: 700;
    }

    /* Separator */
    .phase-divider {
      border: none;
      border-top: 1px solid #e0e0e0;
      margin: 36px 0;
    }

    /* Tables */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0 20px 0;
      font-size: 0.9rem;
    }
    th {
      background: #f5f5f5;
      color: #333;
      padding: 10px 14px;
      text-align: left;
      font-weight: 700;
      border-bottom: 2px solid #ddd;
    }
    td {
      padding: 9px 14px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }
    tr:hover td {
      background: #fafafa;
    }

    /* Key-value table */
    .kv-table td:first-child {
      font-weight: 600;
      width: 220px;
      color: #333;
    }

    /* Element colors */
    .feu { color: #d32f2f; font-weight: 600; }
    .bois { color: #2e7d32; font-weight: 600; }
    .eau { color: #1565c0; font-weight: 600; }
    .metal { color: #f9a825; font-weight: 600; }
    .terre { color: #8d6e63; font-weight: 600; }

    /* MV highlight */
    .mv { background: #ffebee !important; }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .badge-fav { background: #e8f5e9; color: #1b5e20; }
    .badge-def { background: #ffebee; color: #b71c1c; }
    .badge-mv { background: #ffebee; color: #c62828; font-size: 0.8rem; }
    .badge-phase { background: #e3f2fd; color: #1565c0; }

    /* Pillar cards */
    .pillar-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin: 14px 0;
    }
    .pillar-card {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
    }
    .pillar-card.mv-card {
      border-color: #d32f2f;
      background: #fff5f5;
    }
    .pillar-card-title {
      font-weight: 700;
      color: #333;
      font-size: 0.82rem;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .pillar-trunk {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .pillar-branch {
      font-size: 0.95rem;
      margin-bottom: 4px;
    }
    .pillar-detail {
      font-size: 0.78rem;
      color: #666;
      margin-top: 4px;
    }

    /* Element bars */
    .element-bar-container {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 4px 0;
    }
    .element-bar-label {
      min-width: 80px;
      font-weight: 600;
      font-size: 0.88rem;
    }
    .element-bar {
      height: 20px;
      border-radius: 4px;
      min-width: 4px;
    }
    .element-bar-pct {
      font-size: 0.85rem;
      font-weight: 600;
      min-width: 40px;
    }

    /* Stars grid */
    .stars-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin: 14px 0;
    }
    .stars-card {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 12px;
    }
    .stars-card-title {
      font-weight: 700;
      color: #333;
      font-size: 0.82rem;
      margin-bottom: 8px;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 6px;
    }
    .star-item {
      font-size: 0.85rem;
      padding: 2px 0;
      color: #555;
    }

    /* Luck pillar timeline */
    .lp-timeline {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 10px;
      margin: 14px 0;
    }
    .lp-card {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 10px;
      text-align: center;
      font-size: 0.85rem;
    }
    .lp-card.lp-current {
      border-color: #d4a373;
      background: #fffaf0;
    }
    .lp-age {
      font-weight: 700;
      color: #1a1a1a;
      font-size: 1rem;
    }
    .lp-period {
      font-size: 0.78rem;
      color: #888;
    }
    .lp-trunk {
      font-weight: 600;
      margin-top: 4px;
    }

    /* Ba Zhai directions grid */
    .directions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 14px 0;
    }
    .dir-section {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 14px;
    }
    .dir-section-title {
      font-weight: 700;
      font-size: 0.92rem;
      margin-bottom: 10px;
    }
    .dir-section-title.fav { color: #2e7d32; }
    .dir-section-title.def { color: #d32f2f; }
    .dir-item {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 0.88rem;
      border-bottom: 1px solid #f5f5f5;
    }

    /* Hexagram display */
    .hex-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 10px;
      margin: 14px 0;
    }
    .hex-card {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 10px;
      text-align: center;
    }
    .hex-pillar {
      font-size: 0.78rem;
      color: #888;
      font-weight: 600;
      text-transform: uppercase;
    }
    .hex-number {
      font-size: 1.4rem;
      font-weight: 700;
      color: #1a1a1a;
    }
    .hex-name {
      font-size: 0.88rem;
      color: #555;
      margin-top: 2px;
    }

    /* Note */
    .note {
      font-size: 0.85rem;
      color: #888;
      font-style: italic;
      margin: 8px 0;
    }

    /* Footer */
    .generated {
      text-align: center;
      color: #aaa;
      font-size: 0.82rem;
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }

    /* Print / responsive */
    @media print {
      body { padding: 20px; font-size: 13px; }
      .phase-header { break-before: page; }
    }
    @media (max-width: 600px) {
      .pillar-grid { grid-template-columns: repeat(3, 1fr); }
      .stars-grid { grid-template-columns: 1fr; }
      .directions-grid { grid-template-columns: 1fr; }
    }
  `;

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function elementClass(text) {
    if (!text) return '';
    const t = text.toLowerCase();
    if (t.includes('feu') || t.includes('fire')) return 'feu';
    if (t.includes('bois') || t.includes('wood')) return 'bois';
    if (t.includes('eau') || t.includes('water')) return 'eau';
    if (t.includes('métal') || t.includes('metal')) return 'metal';
    if (t.includes('terre') || t.includes('earth')) return 'terre';
    return '';
  }

  function elementEmoji(text) {
    if (!text) return '';
    const t = text.toLowerCase();
    if (t.includes('feu') || t.includes('fire')) return '🔴';
    if (t.includes('bois') || t.includes('wood')) return '🟢';
    if (t.includes('eau') || t.includes('water')) return '🔵';
    if (t.includes('métal') || t.includes('metal')) return '🟡';
    if (t.includes('terre') || t.includes('earth')) return '🟤';
    return '';
  }

  function getBarColor(element) {
    const t = (element || '').toLowerCase();
    if (t.includes('feu')) return '#e53e3e';
    if (t.includes('bois')) return '#38a169';
    if (t.includes('eau')) return '#3182ce';
    if (t.includes('métal') || t.includes('metal')) return '#d69e2e';
    if (t.includes('terre')) return '#8b6914';
    return '#a0aec0';
  }

  function kvTable(data) {
    if (!data || Object.keys(data).length === 0) return '<p class="note">Aucune donnée extraite.</p>';
    let html = '<table class="kv-table"><tbody>';
    for (const [key, val] of Object.entries(data)) {
      if (val === undefined || val === null) continue;
      const display = typeof val === 'object' ? JSON.stringify(val) : String(val);
      const cls = elementClass(display);
      html += `<tr><td>${esc(key)}</td><td class="${cls}">${esc(display)}</td></tr>`;
    }
    html += '</tbody></table>';
    return html;
  }

  // =====================
  // PHASE RENDERERS
  // =====================

  /** PHASE 1 — CONTEXTE (Blocs A + B) */
  function renderPhase1(data) {
    let html = `<div class="phase-header">PHASE 1 — CONTEXTE <small>(Blocs A + B)</small></div>`;

    html += `<h3>Cadre de la lecture</h3>`;
    html += kvTable(data.blocA);

    html += `<h3>Heure solaire et données astro-géographiques</h3>`;
    html += kvTable(data.blocB);

    return html;
  }

  /** PHASE 2 — COEUR DU THEME (Blocs C + H) */
  function renderPhase2(data) {
    let html = `<div class="phase-header">PHASE 2 — COEUR DU THÈME <small>(Blocs C + H)</small></div>`;

    // Maître du Jour + Force
    html += `<h3>Maître du Jour &amp; Base d'analyse</h3>`;
    html += kvTable(data.blocH);

    // 6 Piliers as cards
    html += `<h3>Les 6 Piliers</h3>`;
    html += renderPillarCards(data.blocC);

    return html;
  }

  function renderPillarCards(pillars) {
    if (!pillars || Object.keys(pillars).length === 0) {
      return '<p class="note">Aucune donnée de pilier extraite.</p>';
    }

    const names = ['Heure', 'Jour', 'Mois', 'Année', 'Conception', 'Palais de vie'];
    let html = '<div class="pillar-grid">';

    for (const name of names) {
      const p = pillars[name];
      if (!p) continue;
      const isMv = p.branche.mv;
      const cls = elementClass(p.tronc.element);
      const emoji = elementEmoji(p.tronc.element);

      html += `<div class="pillar-card${isMv ? ' mv-card' : ''}">`;
      html += `<div class="pillar-card-title">${esc(name)}</div>`;
      html += `<div class="pillar-trunk ${cls}">${emoji} ${esc(p.tronc.pinyin)}</div>`;
      if (p.tronc.element) html += `<div class="pillar-detail">${esc(p.tronc.element)}</div>`;
      if (p.tronc.aspect) html += `<div class="pillar-detail"><strong>${esc(p.tronc.aspect)}</strong></div>`;
      html += `<div class="pillar-branch">${esc(p.branche.pinyin)}`;
      if (p.branche.animal) html += ` (${esc(p.branche.animal)})`;
      html += `</div>`;
      if (p.branche.phaseDeVie) html += `<div class="pillar-detail"><span class="badge badge-phase">${esc(p.branche.phaseDeVie)}</span></div>`;
      if (isMv) html += `<div class="pillar-detail"><span class="badge badge-mv">MV</span></div>`;
      if (p.troncsCaches.length > 0) html += `<div class="pillar-detail">Cachés: ${esc(p.troncsCaches.join(', '))}</div>`;
      if (p.nayin) html += `<div class="pillar-detail">NaYin: ${esc(p.nayin)}</div>`;
      html += `</div>`;
    }

    html += '</div>';

    // Also render as table for detailed view
    html += renderPillarTable(pillars);
    return html;
  }

  function renderPillarTable(pillars) {
    const names = ['Heure', 'Jour', 'Mois', 'Année', 'Conception', 'Palais de vie'];
    let html = '<table><thead><tr><th></th>';
    for (const name of names) html += `<th>${esc(name)}</th>`;
    html += '</tr></thead><tbody>';

    // Tronc
    html += '<tr><td><strong>Tronc</strong></td>';
    for (const name of names) {
      const p = pillars[name];
      if (!p) { html += '<td>-</td>'; continue; }
      const cls = elementClass(p.tronc.element);
      const emoji = elementEmoji(p.tronc.element);
      html += `<td class="${cls}">${emoji} ${esc(p.tronc.pinyin)}`;
      if (p.tronc.element) html += `<br><small>${esc(p.tronc.element)}</small>`;
      if (p.tronc.aspect) html += `<br><strong>${esc(p.tronc.aspect)}</strong>`;
      html += '</td>';
    }
    html += '</tr>';

    // Branche
    html += '<tr><td><strong>Branche</strong></td>';
    for (const name of names) {
      const p = pillars[name];
      if (!p) { html += '<td>-</td>'; continue; }
      const cls = elementClass(p.branche.element) + (p.branche.mv ? ' mv' : '');
      html += `<td class="${cls}">${esc(p.branche.pinyin)}`;
      if (p.branche.animal) html += ` (${esc(p.branche.animal)})`;
      if (p.branche.phaseDeVie) html += `<br><small>${esc(p.branche.phaseDeVie)}</small>`;
      if (p.branche.mv) html += `<br><span class="badge badge-mv">MV</span>`;
      html += '</td>';
    }
    html += '</tr>';

    // Troncs cachés
    html += '<tr><td><strong>Troncs cachés</strong></td>';
    for (const name of names) {
      const p = pillars[name];
      if (!p) { html += '<td>-</td>'; continue; }
      html += `<td>${p.troncsCaches.length > 0 ? esc(p.troncsCaches.join(', ')) : '-'}</td>`;
    }
    html += '</tr>';

    // NaYin
    html += '<tr><td><strong>NaYin</strong></td>';
    for (const name of names) {
      const p = pillars[name];
      if (!p) { html += '<td>-</td>'; continue; }
      html += `<td>${esc(p.nayin) || '-'}</td>`;
    }
    html += '</tr>';

    html += '</tbody></table>';
    return html;
  }

  /** PHASE 3 — QUANTITATIF (Blocs I + J + K) */
  function renderPhase3(data) {
    let html = `<div class="phase-header">PHASE 3 — QUANTITATIF <small>(Blocs I + J + K)</small></div>`;

    // 10 Aspects
    html += `<h3>Force des 10 Aspects</h3>`;
    html += renderAspects(data.blocI);

    // 5 Elements
    html += `<h3>5 Éléments</h3>`;
    html += renderElements(data.blocJ);

    // Analyse intermédiaire
    html += `<h3>Structure &amp; Analyse intermédiaire</h3>`;
    html += kvTable(data.blocK);

    return html;
  }

  function renderAspects(aspects) {
    if (!aspects || aspects.length === 0) return '<p class="note">Aucun aspect extrait.</p>';

    let html = '<table><thead><tr><th>Code</th><th>Nom (FR)</th><th>Nom (CN)</th><th>Tronc</th><th>Score</th><th></th></tr></thead><tbody>';
    const maxScore = Math.max(...aspects.map(a => a.score), 1);
    for (const a of aspects) {
      const barWidth = Math.round((a.score / maxScore) * 100);
      html += '<tr>';
      html += `<td><strong>${esc(a.code)}</strong></td>`;
      html += `<td>${esc(a.nomFr)}</td>`;
      html += `<td>${esc(a.nomCn)}</td>`;
      html += `<td>${esc(a.tronc)}</td>`;
      html += `<td><strong>${a.score}</strong></td>`;
      html += `<td><div style="background:#555;height:14px;width:${barWidth}%;border-radius:3px;min-width:2px;"></div></td>`;
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  }

  function renderElements(elements) {
    if (!elements || elements.length === 0) return '<p class="note">Aucun élément extrait.</p>';

    let html = '';
    for (const e of elements) {
      const color = getBarColor(e.element);
      const barWidth = Math.min(e.percentage * 3, 100);
      html += '<div class="element-bar-container">';
      html += `<div class="element-bar-label" style="color:${color}">${e.emoji} ${esc(e.element)}</div>`;
      html += `<div style="flex:1;background:#edf2f7;border-radius:4px;overflow:hidden;"><div class="element-bar" style="background:${color};width:${barWidth}%;"></div></div>`;
      html += `<div class="element-bar-pct" style="color:${color}">${e.percentage}%</div>`;
      html += '</div>';
    }

    // Also show as table
    html += '<table><thead><tr><th>Élément</th><th>Pourcentage</th></tr></thead><tbody>';
    for (const e of elements) {
      const cls = elementClass(e.element);
      html += `<tr><td class="${cls}">${e.emoji} ${esc(e.element)}</td><td><strong>${e.percentage}%</strong></td></tr>`;
    }
    html += '</tbody></table>';
    return html;
  }

  /** PHASE 4 — DYNAMIQUE (Blocs E + D) */
  function renderPhase4(data) {
    let html = `<div class="phase-header">PHASE 4 — DYNAMIQUE <small>(Blocs E + D)</small></div>`;

    // Relations entre branches
    html += `<h3>Relations entre branches — Charte natale</h3>`;
    html += renderRelations(data.blocE);

    // Étoiles auxiliaires
    html += `<h3>Étoiles auxiliaires — Charte natale</h3>`;
    html += renderStarsCards(data.blocD);

    return html;
  }

  function renderRelations(relations) {
    if (!relations || Object.keys(relations).length === 0) return '<p class="note">Aucune relation extraite.</p>';

    let html = '<table class="kv-table"><tbody>';
    for (const [type, values] of Object.entries(relations)) {
      if (!values || values.length === 0) {
        html += `<tr><td>${esc(type)}</td><td class="note">—</td></tr>`;
        continue;
      }
      const display = values.map(v => typeof v === 'object' ? v.text : String(v)).join(', ');
      html += `<tr><td>${esc(type)}</td><td>${esc(display) || '—'}</td></tr>`;
    }
    html += '</tbody></table>';
    return html;
  }

  function renderStarsCards(stars) {
    if (!stars || Object.keys(stars).length === 0) return '<p class="note">Aucune étoile extraite.</p>';

    let html = '<div class="stars-grid">';
    for (const [pillar, starList] of Object.entries(stars)) {
      if (!starList || starList.length === 0) continue;
      html += '<div class="stars-card">';
      html += `<div class="stars-card-title">${esc(pillar)}</div>`;
      for (const star of starList) {
        html += `<div class="star-item">&#9733; ${esc(star)}</div>`;
      }
      html += '</div>';
    }
    html += '</div>';

    // Empty check
    const hasAny = Object.values(stars).some(s => s && s.length > 0);
    if (!hasAny) return '<p class="note">Aucune étoile extraite.</p>';

    return html;
  }

  /** PHASE 5 — YI JING (Blocs F + G) */
  function renderPhase5(data) {
    let html = `<div class="phase-header">PHASE 5 — YI JING <small>(Blocs F + G)</small></div>`;

    // Hexagrammes
    html += `<h3>Hexagrammes par pilier</h3>`;
    html += renderHexagrams(data.blocF);

    // Groupe/Gua/Famille/Stratagème
    html += `<h3>Groupe / Gua / Famille / Stratagème</h3>`;
    html += renderGroupGua(data.blocG);

    return html;
  }

  function renderHexagrams(hexagrams) {
    if (!hexagrams || Object.keys(hexagrams).length === 0) return '<p class="note">Aucun hexagramme extrait.</p>';

    let html = '<div class="hex-grid">';
    for (const [pillar, hex] of Object.entries(hexagrams)) {
      html += '<div class="hex-card">';
      html += `<div class="hex-pillar">${esc(pillar)}</div>`;
      if (hex.numero) html += `<div class="hex-number">#${esc(hex.numero)}</div>`;
      if (hex.nom) html += `<div class="hex-name">${esc(hex.nom)}</div>`;
      if (hex.trigrammeHaut) html += `<div class="pillar-detail">Haut: ${esc(hex.trigrammeHaut)}</div>`;
      if (hex.trigrammeBas) html += `<div class="pillar-detail">Bas: ${esc(hex.trigrammeBas)}</div>`;
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function renderGroupGua(data) {
    if (!data || Object.keys(data).length === 0) return '<p class="note">Aucune donnée extraite.</p>';

    let html = '';
    for (const [label, pillarData] of Object.entries(data)) {
      if (typeof pillarData === 'object') {
        html += `<h4 style="color:#4a5568;margin-top:14px;">${esc(label)}</h4>`;
        html += '<table><thead><tr>';
        for (const name of Object.keys(pillarData)) html += `<th>${esc(name)}</th>`;
        html += '</tr></thead><tbody><tr>';
        for (const val of Object.values(pillarData)) html += `<td>${esc(val) || '-'}</td>`;
        html += '</tr></tbody></table>';
      }
    }
    return html || '<p class="note">Aucune donnée extraite.</p>';
  }

  /** PHASE 6 — TEMPORALITÉ DÉCENNALE (Blocs L + M + N + O) */
  function renderPhase6(data) {
    let html = `<div class="phase-header">PHASE 6 — TEMPORALITÉ DÉCENNALE <small>(Blocs L + M + N + O)</small></div>`;

    // Piliers de Chance
    html += `<h3>Vue d'ensemble des Piliers de Chance</h3>`;
    html += renderLuckPillars(data.blocL);

    // Étoiles PC
    html += `<h3>Étoiles par Pilier de Chance</h3>`;
    html += renderGenericTable(data.blocM);

    // Relations PC
    html += `<h3>Relations par Pilier de Chance</h3>`;
    html += renderGenericTable(data.blocN);

    // Hexagrammes PC
    html += `<h3>Hexagrammes par Pilier de Chance</h3>`;
    html += renderGenericTable(data.blocO);

    return html;
  }

  function renderLuckPillars(pillars) {
    if (!pillars || pillars.length === 0) return '<p class="note">Aucun pilier de chance extrait.</p>';

    // Cards view
    let html = '<div class="lp-timeline">';
    for (const p of pillars) {
      html += '<div class="lp-card">';
      html += `<div class="lp-age">${esc(p.age)}</div>`;
      if (p.periode) html += `<div class="lp-period">${esc(p.periode)}</div>`;
      if (p.tronc) html += `<div class="lp-trunk">${esc(p.tronc)}</div>`;
      if (p.branche) html += `<div class="pillar-detail">${esc(p.branche)}</div>`;
      if (p.phaseDeVie) html += `<div class="pillar-detail"><span class="badge badge-phase">${esc(p.phaseDeVie)}</span></div>`;
      if (p.troncsCaches && p.troncsCaches.length > 0) html += `<div class="pillar-detail">${esc(p.troncsCaches.join(', '))}</div>`;
      if (p.nayin) html += `<div class="pillar-detail">${esc(p.nayin)}</div>`;
      html += '</div>';
    }
    html += '</div>';

    // Also table view
    html += '<table><thead><tr><th>Âge</th><th>Période</th><th>Tronc</th><th>Branche</th><th>Phase</th><th>Troncs cachés</th><th>NaYin</th></tr></thead><tbody>';
    for (const p of pillars) {
      html += '<tr>';
      html += `<td><strong>${esc(p.age)}</strong></td>`;
      html += `<td>${esc(p.periode)}</td>`;
      html += `<td>${esc(p.tronc)}</td>`;
      html += `<td>${esc(p.branche)}</td>`;
      html += `<td>${esc(p.phaseDeVie)}</td>`;
      html += `<td>${esc((p.troncsCaches || []).join(', '))}</td>`;
      html += `<td>${esc(p.nayin)}</td>`;
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  }

  function renderGenericTable(rows) {
    if (!rows || rows.length === 0) return '<p class="note">Aucune donnée extraite.</p>';

    let html = '<table><tbody>';
    for (const row of rows) {
      html += '<tr>';
      const cells = Array.isArray(row) ? row : [row];
      for (const cell of cells) {
        html += `<td>${esc(cell)}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  }

  /** PHASE 7 — TEMPORALITÉ ANNUELLE (Bloc P) */
  function renderPhase7(data) {
    let html = `<div class="phase-header">PHASE 7 — TEMPORALITÉ ANNUELLE <small>(Bloc P)</small></div>`;

    html += `<h3>Piliers annuels (Liu Nian)</h3>`;
    html += renderGenericTable(data.blocP);

    return html;
  }

  /** PHASE 8 — SYSTÈMES COMPLÉMENTAIRES (Blocs Q + R) */
  function renderPhase8(data) {
    let html = `<div class="phase-header">PHASE 8 — SYSTÈMES COMPLÉMENTAIRES <small>(Blocs Q + R)</small></div>`;

    // Ba Zhai
    html += `<h3>Ba Zhai (8 Demeures)</h3>`;
    html += renderBaZhai(data.blocQ);

    // QMDJ
    html += `<h3>Qi Men Dun Jia (Palais de Destinée)</h3>`;
    html += kvTable(data.blocR);

    return html;
  }

  function renderBaZhai(data) {
    if (!data) return '<p class="note">Aucune donnée Ba Zhai extraite.</p>';

    let html = '<table class="kv-table"><tbody>';
    html += `<tr><td>Chiffre Gua</td><td>${esc(data.chiffreGua)}</td></tr>`;
    html += `<tr><td>Étoile de la vie</td><td>${esc(data.etoileVie)}</td></tr>`;
    html += `<tr><td>Groupe</td><td>${esc(data.groupe)}</td></tr>`;
    html += '</tbody></table>';

    html += '<div class="directions-grid">';

    // Favorables
    html += '<div class="dir-section">';
    html += '<div class="dir-section-title fav">Directions favorables</div>';
    if (data.favorables && data.favorables.length > 0) {
      for (const f of data.favorables) {
        html += `<div class="dir-item"><span class="badge badge-fav">${esc(f.nom)}</span><span>${esc(f.direction)}</span></div>`;
      }
    } else {
      html += '<p class="note">Aucune</p>';
    }
    html += '</div>';

    // Défavorables
    html += '<div class="dir-section">';
    html += '<div class="dir-section-title def">Directions défavorables</div>';
    if (data.defavorables && data.defavorables.length > 0) {
      for (const d of data.defavorables) {
        html += `<div class="dir-item"><span class="badge badge-def">${esc(d.nom)}</span><span>${esc(d.direction)}</span></div>`;
      }
    } else {
      html += '<p class="note">Aucune</p>';
    }
    html += '</div>';

    html += '</div>';
    return html;
  }

  // =====================
  // FORMAT BAZI — 8 PHASES
  // =====================
  function formatBaZi(data, personName) {
    let html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analyse BaZi — ${esc(personName)}</title>
  <style>${CSS}</style>
</head>
<body>
<h1 class="main-title">Analyse BaZi — ${esc(personName)}</h1>
<div class="main-subtitle">Charte Id ${esc(data.blocA?.['Charte Id'] || '—')} — 8 phases</div>
`;

    html += renderPhase1(data);
    html += '<hr class="phase-divider">';
    html += renderPhase2(data);
    html += '<hr class="phase-divider">';
    html += renderPhase3(data);
    html += '<hr class="phase-divider">';
    html += renderPhase4(data);
    html += '<hr class="phase-divider">';
    html += renderPhase5(data);
    html += '<hr class="phase-divider">';
    html += renderPhase6(data);
    html += '<hr class="phase-divider">';
    html += renderPhase7(data);
    html += '<hr class="phase-divider">';
    html += renderPhase8(data);

    html += `<p class="generated">Généré par BaZi Manager — ${new Date().toLocaleDateString('fr-FR')}</p>`;
    html += '</body></html>';
    return html;
  }

  // =====================
  // FORMAT ZHI RUN (unchanged structure)
  // =====================
  function formatZhiRun(data, personName) {
    let html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zhi Run Extraction — ${esc(personName)}</title>
  <style>${CSS}</style>
</head>
<body>
<div class="main-title">Zhi Run — ${esc(personName)}</div>
`;

    html += `<div class="phase-header">BLOC S1 — Infos de base</div>`;
    html += kvTable(data.blocS1);

    html += `<div class="phase-header">BLOC S2 — Les 9 Palais</div>`;
    html += renderPalaces(data.blocS2);

    html += `<div class="phase-header">BLOC S3 — Formations de palais</div>`;
    html += renderFormations(data.blocS3);

    html += `<div class="phase-header">BLOC S4 — Formations de troncs</div>`;
    html += renderFormations(data.blocS4);

    html += `<div class="phase-header">BLOC S5 — Formations spéciales</div>`;
    html += renderFormations(data.blocS5);

    html += `<div class="phase-header">BLOC S6 — Stratégies (36 Stratagèmes)</div>`;
    html += renderStrategies(data.blocS6);

    html += `<div class="phase-header">BLOC S7 — Informations complémentaires</div>`;
    html += kvTable(data.blocS7);

    html += `<p class="generated">Généré par BaZi Manager — ${new Date().toLocaleDateString('fr-FR')}</p>`;
    html += '</body></html>';
    return html;
  }

  function renderPalaces(palaces) {
    if (!palaces || Object.keys(palaces).length === 0) return '<p class="note">Aucun palais extrait.</p>';

    const grid = [['SE', 'S', 'SO'], ['E', 'Centre', 'O'], ['NE', 'N', 'NO']];
    let html = '<table><tbody>';
    for (const row of grid) {
      html += '<tr>';
      for (const dir of row) {
        const p = palaces[dir] || {};
        html += '<td style="vertical-align:top;padding:10px;">';
        html += `<strong>${esc(dir)}</strong><br>`;
        html += `Tronc: ${esc(p.tronc) || '-'}<br>`;
        html += `Étoile: ${esc(p.etoile) || '-'}<br>`;
        html += `Porte: ${esc(p.porte) || '-'}<br>`;
        html += `Gardien: ${esc(p.gardien) || '-'}<br>`;
        if (p.hexagramme) html += `Hex: ${esc(p.hexagramme)}<br>`;
        html += '</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  }

  function renderFormations(formations) {
    if (!formations || formations.length === 0) return '<p class="note">Aucune formation extraite.</p>';

    let html = '<table><thead><tr>';
    const keys = Object.keys(formations[0]);
    for (const key of keys) html += `<th>${esc(key)}</th>`;
    html += '</tr></thead><tbody>';
    for (const f of formations) {
      html += '<tr>';
      for (const key of keys) html += `<td>${esc(f[key])}</td>`;
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  }

  function renderStrategies(strategies) {
    if (!strategies || strategies.length === 0) return '<p class="note">Aucune stratégie extraite.</p>';

    let html = '<table><thead><tr><th>#</th><th>Catégorie</th><th>Nom</th><th>Description</th></tr></thead><tbody>';
    for (const s of strategies) {
      html += `<tr><td>${esc(s.numero)}</td><td>${esc(s.categorie)}</td><td>${esc(s.nom)}</td><td>${esc(s.description)}</td></tr>`;
    }
    html += '</tbody></table>';
    return html;
  }

  // =====================
  // PUBLIC API
  // =====================
  function format(extractionData, personName) {
    if (extractionData.type === 'bazi') {
      return formatBaZi(extractionData, personName);
    } else if (extractionData.type === 'zhirun') {
      return formatZhiRun(extractionData, personName);
    }
    return `<html><body><p>Type non supporté: ${esc(extractionData.type)}</p></body></html>`;
  }

  return { format };
})();
