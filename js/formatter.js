/**
 * formatter.js — Génère le HTML d'extraction formaté (fichier autonome)
 */

const Formatter = (() => {
  'use strict';

  const CSS = `
    body { font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 900px; margin: auto; padding: 20px; background: #fafafa; color: #1a202c; }
    h1 { color: #2c5282; text-align: center; border-bottom: 3px solid #d4a373; padding-bottom: 12px; }
    h2 { color: #2c5282; border-bottom: 2px solid #d4a373; padding: 6px 0; margin-top: 28px; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    th { background: #2c5282; color: white; padding: 8px 10px; text-align: left; font-size: 0.9rem; }
    td { border: 1px solid #ddd; padding: 6px 10px; font-size: 0.9rem; }
    tr:nth-child(even) { background: #f7fafc; }
    .feu { color: #e53e3e; font-weight: 600; }
    .bois { color: #38a169; font-weight: 600; }
    .eau { color: #3182ce; font-weight: 600; }
    .metal { color: #d69e2e; font-weight: 600; }
    .terre { color: #8b6914; font-weight: 600; }
    .mv { background: #fed7d7; }
    .bloc-header { background: #ebf8ff; padding: 10px 14px; margin-top: 24px; border-left: 4px solid #2c5282; font-size: 1.1rem; font-weight: 600; color: #2c5282; }
    .kv-table td:first-child { font-weight: 600; background: #edf2f7; width: 220px; }
    .note { font-size: 0.85rem; color: #718096; margin-top: 4px; font-style: italic; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 500; }
    .badge-fav { background: #c6f6d5; color: #22543d; }
    .badge-def { background: #fed7d7; color: #742a2a; }
    .section-divider { border: none; border-top: 2px dashed #d4a373; margin: 30px 0; }
    .generated { text-align: center; color: #a0aec0; font-size: 0.8rem; margin-top: 40px; }
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

  function kvTable(data, title) {
    if (!data || Object.keys(data).length === 0) return '';
    let html = `<table class="kv-table"><tbody>`;
    for (const [key, val] of Object.entries(data)) {
      if (val === undefined || val === null) continue;
      const display = typeof val === 'object' ? JSON.stringify(val) : String(val);
      const cls = elementClass(display);
      html += `<tr><td>${esc(key)}</td><td class="${cls}">${esc(display)}</td></tr>`;
    }
    html += `</tbody></table>`;
    return html;
  }

  // =====================
  // FORMAT BAZI
  // =====================
  function formatBaZi(data, personName) {
    let html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>BaZi Extraction — ${esc(personName)}</title>
  <style>${CSS}</style>
</head>
<body>
<h1>🏯 BaZi Extraction — ${esc(personName)}</h1>
`;

    // BLOC A
    html += `<div class="bloc-header">🔷 BLOC A — Détails personnels</div>`;
    html += kvTable(data.blocA);

    // BLOC B
    html += `<div class="bloc-header">🔷 BLOC B — Données astro-géographiques</div>`;
    html += kvTable(data.blocB);

    // BLOC C — 6 Piliers
    html += `<div class="bloc-header">🔷 BLOC C — Les 6 Piliers</div>`;
    html += formatPillars(data.blocC);

    // BLOC D — Étoiles auxiliaires
    html += `<div class="bloc-header">🔷 BLOC D — Étoiles auxiliaires</div>`;
    html += formatStars(data.blocD);

    // BLOC E — Relations
    html += `<div class="bloc-header">🔷 BLOC E — Relations entre branches</div>`;
    html += formatRelations(data.blocE);

    // BLOC F — Hexagrammes
    html += `<div class="bloc-header">🔷 BLOC F — Hexagrammes</div>`;
    html += formatHexagrams(data.blocF);

    // BLOC G — Groupe/Gua/Famille/Stratagème
    html += `<div class="bloc-header">🔷 BLOC G — Groupe / Gua / Famille / Stratagème</div>`;
    html += formatGroupGua(data.blocG);

    // BLOC H — Base d'analyse
    html += `<div class="bloc-header">🔷 BLOC H — Base d'analyse</div>`;
    html += kvTable(data.blocH);

    // BLOC I — 10 Aspects
    html += `<div class="bloc-header">🔷 BLOC I — 10 Aspects</div>`;
    html += formatAspects(data.blocI);

    // BLOC J — 5 Éléments
    html += `<div class="bloc-header">🔷 BLOC J — 5 Éléments</div>`;
    html += formatElements(data.blocJ);

    // BLOC K — Analyse intermédiaire
    html += `<div class="bloc-header">🔷 BLOC K — Analyse intermédiaire</div>`;
    html += kvTable(data.blocK);

    // BLOC L — Piliers de Chance
    html += `<hr class="section-divider">`;
    html += `<div class="bloc-header">🔷 BLOC L — Piliers de Chance</div>`;
    html += formatLuckPillars(data.blocL);

    // BLOC M — Étoiles PC
    html += `<div class="bloc-header">🔷 BLOC M — Étoiles PC</div>`;
    html += formatGenericTable(data.blocM);

    // BLOC N — Relations PC
    html += `<div class="bloc-header">🔷 BLOC N — Relations PC</div>`;
    html += formatGenericTable(data.blocN);

    // BLOC O — Hexagrammes PC
    html += `<div class="bloc-header">🔷 BLOC O — Hexagrammes PC</div>`;
    html += formatGenericTable(data.blocO);

    // BLOC P — Piliers annuels
    html += `<div class="bloc-header">🔷 BLOC P — Piliers annuels (Liu Nian)</div>`;
    html += formatGenericTable(data.blocP);

    // BLOC Q — Ba Zhai
    html += `<hr class="section-divider">`;
    html += `<div class="bloc-header">🔷 BLOC Q — Ba Zhai (8 Demeures)</div>`;
    html += formatBaZhai(data.blocQ);

    // BLOC R — QMDJ basique
    html += `<div class="bloc-header">🔷 BLOC R — Qi Men Dun Jia (basique)</div>`;
    html += kvTable(data.blocR);

    html += `<p class="generated">Généré par BaZi Manager — ${new Date().toLocaleDateString('fr-FR')}</p>`;
    html += `</body></html>`;

    return html;
  }

  function formatPillars(pillars) {
    if (!pillars || Object.keys(pillars).length === 0) {
      return `<p class="note">Aucune donnée de pilier extraite.</p>`;
    }

    const names = ['Heure', 'Jour', 'Mois', 'Année', 'Conception', 'Palais de vie'];
    let html = `<table><thead><tr><th></th>`;
    for (const name of names) {
      html += `<th>${esc(name)}</th>`;
    }
    html += `</tr></thead><tbody>`;

    // Tronc
    html += `<tr><td><strong>Tronc</strong></td>`;
    for (const name of names) {
      const p = pillars[name];
      if (!p) { html += `<td>-</td>`; continue; }
      const cls = elementClass(p.tronc.element);
      const emoji = elementEmoji(p.tronc.element);
      html += `<td class="${cls}">${emoji} ${esc(p.tronc.pinyin)}`;
      if (p.tronc.element) html += ` <br><small>${esc(p.tronc.element)}</small>`;
      if (p.tronc.aspect) html += ` <br><strong>${esc(p.tronc.aspect)}</strong>`;
      html += `</td>`;
    }
    html += `</tr>`;

    // Branche
    html += `<tr><td><strong>Branche</strong></td>`;
    for (const name of names) {
      const p = pillars[name];
      if (!p) { html += `<td>-</td>`; continue; }
      const cls = elementClass(p.branche.element) + (p.branche.mv ? ' mv' : '');
      const emoji = elementEmoji(p.branche.element);
      html += `<td class="${cls}">${emoji} ${esc(p.branche.pinyin)}`;
      if (p.branche.animal) html += ` (${esc(p.branche.animal)})`;
      if (p.branche.phaseDeVie) html += `<br><small>${esc(p.branche.phaseDeVie)}</small>`;
      if (p.branche.mv) html += `<br><span class="badge badge-def">MV</span>`;
      html += `</td>`;
    }
    html += `</tr>`;

    // Troncs cachés
    html += `<tr><td><strong>Troncs cachés</strong></td>`;
    for (const name of names) {
      const p = pillars[name];
      if (!p) { html += `<td>-</td>`; continue; }
      html += `<td>${p.troncsCaches.length > 0 ? esc(p.troncsCaches.join(', ')) : '-'}</td>`;
    }
    html += `</tr>`;

    // NaYin
    html += `<tr><td><strong>NaYin</strong></td>`;
    for (const name of names) {
      const p = pillars[name];
      if (!p) { html += `<td>-</td>`; continue; }
      html += `<td>${esc(p.nayin) || '-'}</td>`;
    }
    html += `</tr>`;

    html += `</tbody></table>`;
    return html;
  }

  function formatStars(stars) {
    if (!stars || Object.keys(stars).length === 0) {
      return `<p class="note">Aucune étoile extraite.</p>`;
    }

    let html = `<table><thead><tr>`;
    const names = Object.keys(stars);
    for (const name of names) {
      html += `<th>${esc(name)}</th>`;
    }
    html += `</tr></thead><tbody><tr>`;
    for (const name of names) {
      html += `<td>${stars[name].length > 0 ? stars[name].map(esc).join('<br>') : '-'}</td>`;
    }
    html += `</tr></tbody></table>`;
    return html;
  }

  function formatRelations(relations) {
    if (!relations || Object.keys(relations).length === 0) {
      return `<p class="note">Aucune relation extraite.</p>`;
    }

    let html = `<table class="kv-table"><tbody>`;
    for (const [type, values] of Object.entries(relations)) {
      const display = values.map(v => typeof v === 'object' ? v.text : String(v)).join(', ');
      html += `<tr><td>${esc(type)}</td><td>${esc(display) || '-'}</td></tr>`;
    }
    html += `</tbody></table>`;
    return html;
  }

  function formatHexagrams(hexagrams) {
    if (!hexagrams || Object.keys(hexagrams).length === 0) {
      return `<p class="note">Aucun hexagramme extrait.</p>`;
    }

    const names = Object.keys(hexagrams);
    let html = `<table><thead><tr><th></th>`;
    for (const name of names) html += `<th>${esc(name)}</th>`;
    html += `</tr></thead><tbody>`;

    for (const field of ['trigrammeHaut', 'trigrammeBas', 'numero', 'nom']) {
      const label = { trigrammeHaut: 'Trigramme Haut', trigrammeBas: 'Trigramme Bas', numero: 'Numéro', nom: 'Nom' }[field];
      html += `<tr><td><strong>${label}</strong></td>`;
      for (const name of names) {
        html += `<td>${esc(hexagrams[name][field]) || '-'}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table>`;
    return html;
  }

  function formatGroupGua(data) {
    if (!data || Object.keys(data).length === 0) {
      return `<p class="note">Aucune donnée extraite.</p>`;
    }

    let html = '';
    for (const [label, pillarData] of Object.entries(data)) {
      if (typeof pillarData === 'object') {
        html += `<h3>${esc(label)}</h3>`;
        html += `<table><thead><tr>`;
        for (const name of Object.keys(pillarData)) html += `<th>${esc(name)}</th>`;
        html += `</tr></thead><tbody><tr>`;
        for (const val of Object.values(pillarData)) html += `<td>${esc(val) || '-'}</td>`;
        html += `</tr></tbody></table>`;
      }
    }
    return html || `<p class="note">Aucune donnée extraite.</p>`;
  }

  function formatAspects(aspects) {
    if (!aspects || aspects.length === 0) {
      return `<p class="note">Aucun aspect extrait.</p>`;
    }

    let html = `<table><thead><tr><th>Code</th><th>Nom (FR)</th><th>Nom (CN)</th><th>Tronc</th><th>Score</th></tr></thead><tbody>`;
    for (const a of aspects) {
      html += `<tr><td><strong>${esc(a.code)}</strong></td><td>${esc(a.nomFr)}</td><td>${esc(a.nomCn)}</td><td>${esc(a.tronc)}</td><td>${a.score}</td></tr>`;
    }
    html += `</tbody></table>`;
    return html;
  }

  function formatElements(elements) {
    if (!elements || elements.length === 0) {
      return `<p class="note">Aucun élément extrait.</p>`;
    }

    let html = `<table><thead><tr><th>Élément</th><th>%</th><th>Barre</th></tr></thead><tbody>`;
    for (const e of elements) {
      const cls = elementClass(e.element);
      const barWidth = Math.min(e.percentage * 3, 100);
      html += `<tr><td class="${cls}">${e.emoji} ${esc(e.element)}</td><td>${e.percentage}%</td>`;
      html += `<td><div style="background:${getBarColor(e.element)};height:16px;width:${barWidth}%;border-radius:3px;"></div></td></tr>`;
    }
    html += `</tbody></table>`;
    return html;
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

  function formatLuckPillars(pillars) {
    if (!pillars || pillars.length === 0) {
      return `<p class="note">Aucun pilier de chance extrait.</p>`;
    }

    let html = `<table><thead><tr><th>Âge</th><th>Période</th><th>Tronc</th><th>Branche</th><th>Phase</th><th>Troncs cachés</th><th>NaYin</th></tr></thead><tbody>`;
    for (const p of pillars) {
      html += `<tr>`;
      html += `<td>${esc(p.age)}</td>`;
      html += `<td>${esc(p.periode)}</td>`;
      html += `<td>${esc(p.tronc)}</td>`;
      html += `<td>${esc(p.branche)}</td>`;
      html += `<td>${esc(p.phaseDeVie)}</td>`;
      html += `<td>${esc((p.troncsCaches || []).join(', '))}</td>`;
      html += `<td>${esc(p.nayin)}</td>`;
      html += `</tr>`;
    }
    html += `</tbody></table>`;
    return html;
  }

  function formatGenericTable(rows) {
    if (!rows || rows.length === 0) {
      return `<p class="note">Aucune donnée extraite.</p>`;
    }

    let html = `<table><tbody>`;
    for (const row of rows) {
      html += `<tr>`;
      const cells = Array.isArray(row) ? row : [row];
      for (const cell of cells) {
        html += `<td>${esc(cell)}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table>`;
    return html;
  }

  function formatBaZhai(data) {
    if (!data) return `<p class="note">Aucune donnée Ba Zhai extraite.</p>`;

    let html = `<table class="kv-table"><tbody>`;
    html += `<tr><td>Chiffre Gua</td><td>${esc(data.chiffreGua)}</td></tr>`;
    html += `<tr><td>Étoile de la vie</td><td>${esc(data.etoileVie)}</td></tr>`;
    html += `<tr><td>Groupe</td><td>${esc(data.groupe)}</td></tr>`;
    html += `</tbody></table>`;

    if (data.favorables && data.favorables.length > 0) {
      html += `<h3>✅ Directions favorables</h3>`;
      html += `<table><thead><tr><th>Nom</th><th>Direction</th></tr></thead><tbody>`;
      for (const f of data.favorables) {
        html += `<tr><td><span class="badge badge-fav">${esc(f.nom)}</span></td><td>${esc(f.direction)}</td></tr>`;
      }
      html += `</tbody></table>`;
    }

    if (data.defavorables && data.defavorables.length > 0) {
      html += `<h3>❌ Directions défavorables</h3>`;
      html += `<table><thead><tr><th>Nom</th><th>Direction</th></tr></thead><tbody>`;
      for (const d of data.defavorables) {
        html += `<tr><td><span class="badge badge-def">${esc(d.nom)}</span></td><td>${esc(d.direction)}</td></tr>`;
      }
      html += `</tbody></table>`;
    }

    return html;
  }

  // =====================
  // FORMAT ZHI RUN
  // =====================
  function formatZhiRun(data, personName) {
    let html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Zhi Run Extraction — ${esc(personName)}</title>
  <style>${CSS}</style>
</head>
<body>
<h1>🧭 Zhi Run Extraction — ${esc(personName)}</h1>
`;

    // S1
    html += `<div class="bloc-header">🔷 BLOC S1 — Infos de base</div>`;
    html += kvTable(data.blocS1);

    // S2
    html += `<div class="bloc-header">🔷 BLOC S2 — Les 9 Palais</div>`;
    html += formatPalaces(data.blocS2);

    // S3
    html += `<div class="bloc-header">🔷 BLOC S3 — Formations de palais</div>`;
    html += formatFormations(data.blocS3);

    // S4
    html += `<div class="bloc-header">🔷 BLOC S4 — Formations de troncs</div>`;
    html += formatFormations(data.blocS4);

    // S5
    html += `<div class="bloc-header">🔷 BLOC S5 — Formations spéciales</div>`;
    html += formatFormations(data.blocS5);

    // S6
    html += `<div class="bloc-header">🔷 BLOC S6 — Stratégies (36 Stratagèmes)</div>`;
    html += formatStrategies(data.blocS6);

    // S7
    html += `<div class="bloc-header">🔷 BLOC S7 — Informations complémentaires</div>`;
    html += kvTable(data.blocS7);

    html += `<p class="generated">Généré par BaZi Manager — ${new Date().toLocaleDateString('fr-FR')}</p>`;
    html += `</body></html>`;

    return html;
  }

  function formatPalaces(palaces) {
    if (!palaces || Object.keys(palaces).length === 0) {
      return `<p class="note">Aucun palais extrait.</p>`;
    }

    // Display as 3x3 grid
    const grid = [['SE', 'S', 'SO'], ['E', 'Centre', 'O'], ['NE', 'N', 'NO']];
    let html = `<table><tbody>`;
    for (const row of grid) {
      html += `<tr>`;
      for (const dir of row) {
        const p = palaces[dir] || {};
        html += `<td style="vertical-align:top;padding:10px;">`;
        html += `<strong>${esc(dir)}</strong><br>`;
        html += `Tronc: ${esc(p.tronc) || '-'}<br>`;
        html += `Étoile: ${esc(p.etoile) || '-'}<br>`;
        html += `Porte: ${esc(p.porte) || '-'}<br>`;
        html += `Gardien: ${esc(p.gardien) || '-'}<br>`;
        if (p.hexagramme) html += `Hex: ${esc(p.hexagramme)}<br>`;
        html += `</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table>`;
    return html;
  }

  function formatFormations(formations) {
    if (!formations || formations.length === 0) {
      return `<p class="note">Aucune formation extraite.</p>`;
    }

    let html = `<table><thead><tr>`;
    const keys = Object.keys(formations[0]);
    for (const key of keys) html += `<th>${esc(key)}</th>`;
    html += `</tr></thead><tbody>`;
    for (const f of formations) {
      html += `<tr>`;
      for (const key of keys) html += `<td>${esc(f[key])}</td>`;
      html += `</tr>`;
    }
    html += `</tbody></table>`;
    return html;
  }

  function formatStrategies(strategies) {
    if (!strategies || strategies.length === 0) {
      return `<p class="note">Aucune stratégie extraite.</p>`;
    }

    let html = `<table><thead><tr><th>#</th><th>Catégorie</th><th>Nom</th><th>Description</th></tr></thead><tbody>`;
    for (const s of strategies) {
      html += `<tr><td>${esc(s.numero)}</td><td>${esc(s.categorie)}</td><td>${esc(s.nom)}</td><td>${esc(s.description)}</td></tr>`;
    }
    html += `</tbody></table>`;
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
