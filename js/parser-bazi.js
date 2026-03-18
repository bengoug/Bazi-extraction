/**
 * parser-bazi.js — Extracteur HTML BaZi (chinesemetasoft.com/BaZi/ViewChart)
 * Parse le HTML sauvegardé et extrait les blocs A → R
 *
 * Structure du HTML source :
 *   - div#bazipersonal    → table.frameDynamic (Détails personnels)
 *   - div#bazigeographicaldata → table.frameDynamic (Données astro-géo)
 *   - div#bazianalysisbasic (1er) → table.frameDynamic (Base d'analyse) + table.frameDynamic (Force/Éléments)
 *   - div#bazianalysisbasic (2e) → table.frameDynamic (Analyse intermédiaire)
 *   - table#bazi.bazi4pillars → Les 6 piliers (avec tables.baziinner imbriquées)
 *   - table.frameDynamic contenant "10 Aspects" → Force des 10 aspects
 *   - table contenant "Element" + "Strength" → 5 Éléments
 *   - div#qimendunjiapalace (1er) → Ba Zhai
 *   - div#qimendunjiapalace (2e) → QMDJ
 *   - table.baziluckpillars → Piliers de Chance
 */

const BaZiParser = (() => {
  'use strict';

  function txt(el) {
    return el ? el.textContent.trim() : '';
  }

  function directText(el) {
    // Get only direct text nodes, not from nested tables
    if (!el) return '';
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === 3) text += node.textContent;
    }
    return text.trim();
  }

  // Get rows from a table, excluding rows from nested sub-tables
  function directRows(table) {
    if (!table) return [];
    const rows = [];
    const tbody = table.querySelector(':scope > tbody') || table;
    for (const child of tbody.children) {
      if (child.tagName === 'TR') rows.push(child);
    }
    return rows;
  }

  // Get direct cells from a row (not from nested tables)
  function directCells(row) {
    if (!row) return [];
    const cells = [];
    for (const child of row.children) {
      if (child.tagName === 'TD' || child.tagName === 'TH') cells.push(child);
    }
    return cells;
  }

  // Find a frameDynamic table inside a div by ID
  function getFrameTable(doc, divId, index) {
    const divs = doc.querySelectorAll(`#${divId}`);
    const div = divs[index || 0];
    if (!div) return null;
    const tables = div.querySelectorAll(':scope > table.frameDynamic, table.frameDynamic');
    return tables[0] || null;
  }

  // Parse a simple 2-column label/value table (class="frameDynamic")
  function parseKvTable(table) {
    if (!table) return {};
    const data = {};
    const rows = directRows(table);
    for (const row of rows) {
      const cells = directCells(row);
      if (cells.length >= 2) {
        const label = directText(cells[0]) || txt(cells[0]);
        const value = directText(cells[1]) || txt(cells[1]);
        if (label && !label.includes('Détails') && !label.includes('Donnée') &&
            !label.includes('Base d\'analyse') && !label.includes('Analyse Ba Zi') &&
            !label.includes('Ba Zhai') && !label.includes('Qi Men')) {
          data[label] = value;
        }
      }
    }
    return data;
  }

  const ELEMENT_EMOJI = {
    'Feu': '🔴', 'Bois': '🟢', 'Eau': '🔵', 'Métal': '🟡', 'Terre': '🟤'
  };

  function elementEmoji(name) {
    if (!name) return '';
    for (const [key, emoji] of Object.entries(ELEMENT_EMOJI)) {
      if (name.includes(key)) return emoji;
    }
    return '';
  }

  // Extract trunk name from img src
  function trunkFromImg(img) {
    if (!img) return '';
    const src = img.getAttribute('src') || '';
    const match = src.match(/\/([A-Za-z]+)(?:\(\d+\))?\.png/i);
    return match ? match[1] : '';
  }

  // =====================
  // BLOC A — Détails personnels
  // =====================
  function parseBlocA(doc) {
    // Find the table inside div#bazipersonal
    const div = doc.querySelector('#bazipersonal');
    if (!div) return {};
    // The frameDynamic table is nested inside
    const tables = div.querySelectorAll('table.frameDynamic');
    for (const table of tables) {
      const text = txt(table);
      if (text.includes('Nom complet') || text.includes('Genre')) {
        return parseKvTable(table);
      }
    }
    return {};
  }

  // =====================
  // BLOC B — Données astro-géographiques
  // =====================
  function parseBlocB(doc) {
    const div = doc.querySelector('#bazigeographicaldata');
    if (!div) return {};
    const tables = div.querySelectorAll('table.frameDynamic');
    for (const table of tables) {
      const text = txt(table);
      if (text.includes('Type de calendrier') || text.includes('Heure solaire')) {
        return parseKvTable(table);
      }
    }
    return {};
  }

  // =====================
  // BLOC C — Les 6 Piliers
  // =====================
  function parseBlocC(doc) {
    const pillarNames = ['Heure', 'Jour', 'Mois', 'Année', 'Conception', 'Palais de vie'];
    const pillars = {};

    for (const name of pillarNames) {
      pillars[name] = {
        tronc: { pinyin: '', element: '', polarite: '', aspect: '' },
        branche: { pinyin: '', animal: '', element: '', phaseDeVie: '', mv: false },
        troncsCaches: [],
        nayin: ''
      };
    }

    // Find table#bazi.bazi4pillars - this is the main pillars table
    const mainTable = doc.querySelector('table#bazi.bazi4pillars') ||
                      doc.querySelector('table.bazi4pillars');
    if (!mainTable) return pillars;

    // The main table has rows:
    // Row 0 (HEADER): Date | Heure | Jour | Mois | Année | Pilliers de conception | Palais de vie
    // Row 1: Lundi | 10:48 | 05 | 03 | 1979
    // Row 2: Tronc | [baziinner tables for each pillar]
    // Then individual rows for each trunk detail (aspect, pinyin, element)
    // Then Branche row with baziinner tables
    // Then Troncs cachés, NaYin, Étoiles auxiliaires, Relations, Hexagramme rows

    const rows = directRows(mainTable);
    if (rows.length < 3) return pillars;

    // Identify column mapping from header row
    const headerCells = directCells(rows[0]);
    const colMap = {};
    headerCells.forEach((cell, idx) => {
      const t = txt(cell);
      if (t.includes('Heure') && !t.includes('Date')) colMap['Heure'] = idx;
      else if (t === 'Jour' || t.startsWith('Jour')) colMap['Jour'] = idx;
      else if (t.includes('Mois')) colMap['Mois'] = idx;
      else if (t.includes('Année')) colMap['Année'] = idx;
      else if (t.includes('conception')) colMap['Conception'] = idx;
      else if (t.includes('Palais')) colMap['Palais de vie'] = idx;
    });

    // Parse each data row
    for (let r = 1; r < rows.length; r++) {
      const cells = directCells(rows[r]);
      if (cells.length === 0) continue;

      const rowLabel = directText(cells[0]).toLowerCase();

      if (rowLabel.includes('tronc') && !rowLabel.includes('cach')) {
        // Trunk row - each cell contains a baziinner table with: [IMG aspect] / Pinyin / Element Polarity
        for (const [name, colIdx] of Object.entries(colMap)) {
          if (colIdx >= cells.length) continue;
          const cell = cells[colIdx];
          const innerTable = cell.querySelector('table.baziinner');
          if (innerTable) {
            const innerRows = innerTable.querySelectorAll('tr');
            if (innerRows.length >= 3) {
              // Row 0: [IMG] aspect code (e.g. "DV")
              const aspectText = txt(innerRows[0]);
              const aspectMatch = aspectText.match(/\b(DV|DO|7K|VR|RI|RD|ReI|ReD|HO|A)\b/);
              if (aspectMatch) pillars[name].tronc.aspect = aspectMatch[1];

              // Row 0 also has the trunk image
              const img = innerRows[0].querySelector('img');
              if (img) pillars[name].tronc.pinyin = trunkFromImg(img);

              // Row 1: Pinyin name
              const pinyin = txt(innerRows[1]);
              if (pinyin && !pillars[name].tronc.pinyin) {
                pillars[name].tronc.pinyin = pinyin;
              }

              // Row 2: Element + Polarity (e.g. "Eau Yin")
              const elemPol = txt(innerRows[2]);
              pillars[name].tronc.element = elemPol;
            }
          }
        }
      } else if (rowLabel.includes('branche')) {
        // Branch row
        for (const [name, colIdx] of Object.entries(colMap)) {
          if (colIdx >= cells.length) continue;
          const cell = cells[colIdx];
          const innerTable = cell.querySelector('table.baziinner');
          if (innerTable) {
            const innerRows = innerTable.querySelectorAll('tr');
            if (innerRows.length >= 5) {
              // Row 0: [IMG]
              // Row 1: Phase de vie (Mort, Affaibli, etc.)
              pillars[name].branche.phaseDeVie = txt(innerRows[1]);
              // Row 2: Pinyin
              pillars[name].branche.pinyin = txt(innerRows[2]);
              // Row 3: Animal
              pillars[name].branche.animal = txt(innerRows[3]);
              // Row 4: Element + Polarity
              pillars[name].branche.element = txt(innerRows[4]);
            } else if (innerRows.length >= 1) {
              // Simpler structure
              const img = innerTable.querySelector('img');
              if (img) {
                pillars[name].branche.pinyin = trunkFromImg(img);
              }
            }
          }
        }
      } else if (rowLabel.includes('troncs cach') || rowLabel.includes('cach')) {
        // Hidden trunks row
        for (const [name, colIdx] of Object.entries(colMap)) {
          if (colIdx >= cells.length) continue;
          const cell = cells[colIdx];
          const innerTable = cell.querySelector('table.baziinner');
          if (innerTable) {
            const innerRows = innerTable.querySelectorAll('tr');
            if (innerRows.length >= 2) {
              // Row 1 has the pinyin names
              const pinyinRow = txt(innerRows[1]);
              pillars[name].troncsCaches = pinyinRow.split(/(?=[A-Z])/).filter(s => s.trim());
            }
          }
        }
      } else if (rowLabel.includes('nayin') || rowLabel.includes('na yin')) {
        // NaYin row - baziinner tables with single row
        for (const [name, colIdx] of Object.entries(colMap)) {
          if (colIdx >= cells.length) continue;
          const cell = cells[colIdx];
          const innerTable = cell.querySelector('table.baziinner');
          if (innerTable) {
            pillars[name].nayin = txt(innerTable);
          } else {
            const val = directText(cell);
            if (val) pillars[name].nayin = val;
          }
        }
      } else if (rowLabel.includes('toiles auxiliaires') || rowLabel.includes('etoiles')) {
        // Stars - handled in bloc D
      } else if (rowLabel.includes('relation')) {
        // Relations - handled in bloc E
      }
    }

    // Detect MV from tooltips or text
    const mvDivs = doc.querySelectorAll('div[id*="god-tooltip"]');
    // Also check the base analysis table for MV info
    const allText = doc.body ? doc.body.textContent : '';
    // MV detection from Bloc H data
    const mvMatch = allText.match(/Mort et vide\*?([^\n]*)/);

    return pillars;
  }

  // =====================
  // BLOC D — Étoiles auxiliaires
  // =====================
  function parseBlocD(doc) {
    const stars = {};
    const pillarNames = ['Heure', 'Jour', 'Mois', 'Année', 'Conception', 'Palais de vie'];
    for (const name of pillarNames) stars[name] = [];

    const mainTable = doc.querySelector('table#bazi.bazi4pillars') ||
                      doc.querySelector('table.bazi4pillars');
    if (!mainTable) return stars;

    const rows = directRows(mainTable);
    const headerCells = directCells(rows[0]);
    const colMap = {};
    headerCells.forEach((cell, idx) => {
      const t = txt(cell);
      if (t.includes('Heure') && !t.includes('Date')) colMap['Heure'] = idx;
      else if (t === 'Jour' || t.startsWith('Jour')) colMap['Jour'] = idx;
      else if (t.includes('Mois')) colMap['Mois'] = idx;
      else if (t.includes('Année')) colMap['Année'] = idx;
      else if (t.includes('conception')) colMap['Conception'] = idx;
      else if (t.includes('Palais')) colMap['Palais de vie'] = idx;
    });

    for (let r = 1; r < rows.length; r++) {
      const cells = directCells(rows[r]);
      if (cells.length === 0) continue;
      const rowLabel = directText(cells[0]).toLowerCase();

      if (rowLabel.includes('toiles') || rowLabel.includes('etoiles')) {
        for (const [name, colIdx] of Object.entries(colMap)) {
          if (colIdx >= cells.length) continue;
          const cell = cells[colIdx];
          // Stars are in baziinner tables, each with a single text row
          const innerTables = cell.querySelectorAll('table.baziinner');
          for (const inner of innerTables) {
            const starName = txt(inner);
            if (starName) stars[name].push(starName);
          }
        }
        break;
      }
    }

    return stars;
  }

  // =====================
  // BLOC E — Relations entre branches
  // =====================
  function parseBlocE(doc) {
    const relations = {};

    const mainTable = doc.querySelector('table#bazi.bazi4pillars') ||
                      doc.querySelector('table.bazi4pillars');
    if (!mainTable) return relations;

    const rows = directRows(mainTable);
    const headerCells = directCells(rows[0]);
    const colMap = {};
    headerCells.forEach((cell, idx) => {
      const t = txt(cell);
      if (t.includes('Heure') && !t.includes('Date')) colMap['Heure'] = idx;
      else if (t === 'Jour' || t.startsWith('Jour')) colMap['Jour'] = idx;
      else if (t.includes('Mois')) colMap['Mois'] = idx;
      else if (t.includes('Année')) colMap['Année'] = idx;
      else if (t.includes('conception')) colMap['Conception'] = idx;
      else if (t.includes('Palais')) colMap['Palais de vie'] = idx;
    });

    for (let r = 1; r < rows.length; r++) {
      const cells = directCells(rows[r]);
      if (cells.length === 0) continue;
      const rowLabel = directText(cells[0]).toLowerCase();

      if (rowLabel.includes('relation')) {
        for (const [name, colIdx] of Object.entries(colMap)) {
          if (colIdx >= cells.length) continue;
          const cell = cells[colIdx];
          const innerTables = cell.querySelectorAll('table.baziinner');
          for (const inner of innerTables) {
            const relText = txt(inner);
            if (relText) {
              // Extract relation type and tag, e.g. "Préjudice [M]"
              const match = relText.match(/^(.+?)\s*\[([HJMA])\]$/);
              if (match) {
                const type = match[1].trim();
                const tag = match[2];
                if (!relations[type]) relations[type] = [];
                relations[type].push(`${name} [${tag}]`);
              } else if (relText.trim()) {
                const type = relText.trim();
                if (!relations[type]) relations[type] = [];
                relations[type].push(name);
              }
            }
          }
        }
        break;
      }
    }

    return relations;
  }

  // =====================
  // BLOC F — Hexagrammes
  // =====================
  function parseBlocF(doc) {
    const hexagrams = {};
    const pillarNames = ['Heure', 'Jour', 'Mois', 'Année', 'Conception', 'Palais de vie'];

    const mainTable = doc.querySelector('table#bazi.bazi4pillars') ||
                      doc.querySelector('table.bazi4pillars');
    if (!mainTable) return hexagrams;

    const rows = directRows(mainTable);
    const headerCells = directCells(rows[0]);
    const colMap = {};
    headerCells.forEach((cell, idx) => {
      const t = txt(cell);
      if (t.includes('Heure') && !t.includes('Date')) colMap['Heure'] = idx;
      else if (t === 'Jour' || t.startsWith('Jour')) colMap['Jour'] = idx;
      else if (t.includes('Mois')) colMap['Mois'] = idx;
      else if (t.includes('Année')) colMap['Année'] = idx;
      else if (t.includes('conception')) colMap['Conception'] = idx;
      else if (t.includes('Palais')) colMap['Palais de vie'] = idx;
    });

    for (let r = 1; r < rows.length; r++) {
      const cells = directCells(rows[r]);
      if (cells.length === 0) continue;
      const rowLabel = directText(cells[0]).toLowerCase();

      if (rowLabel.includes('hexagramme')) {
        for (const [name, colIdx] of Object.entries(colMap)) {
          if (colIdx >= cells.length) continue;
          const cell = cells[colIdx];
          // Hexagram data: baziinner table (trigrammes) + adjacent table (number - name)
          const innerTable = cell.querySelector('table.baziinner');
          const hex = { trigrammeHaut: '', trigrammeBas: '', numero: '', nom: '' };

          if (innerTable) {
            const innerRows = innerTable.querySelectorAll('tr');
            if (innerRows.length >= 3) {
              // Row 0: Element
              hex.trigrammeHaut = txt(innerRows[0]);
              // Row 1: [IMG] number (haut)
              const img1 = innerRows[1].querySelector('img');
              if (img1) {
                const name1 = trunkFromImg(img1);
                hex.trigrammeHaut = name1;
              }
              // Row 2: [IMG] number (bas)
              const img2 = innerRows[2].querySelector('img');
              if (img2) {
                hex.trigrammeBas = trunkFromImg(img2);
              }
            }
          }

          // Find the hex name/number table (non-baziinner, adjacent)
          const allTables = cell.querySelectorAll('table');
          for (const t of allTables) {
            if (!t.classList.contains('baziinner')) {
              const content = txt(t);
              const match = content.match(/(\d+)\s*-\s*(.+)/);
              if (match) {
                hex.numero = match[1];
                hex.nom = match[2].trim();
              }
            }
          }

          hexagrams[name] = hex;
        }
        break;
      }
    }

    return hexagrams;
  }

  // =====================
  // BLOC G — Groupe/Gua/Famille/Stratagème
  // =====================
  function parseBlocG(doc) {
    const data = {};
    const labels = ['Groupe', 'En dehors du Gua', 'Famille', 'Stratagème'];
    const pillarNames = ['Heure', 'Jour', 'Mois', 'Année', 'Conception', 'Palais de vie'];

    const mainTable = doc.querySelector('table#bazi.bazi4pillars') ||
                      doc.querySelector('table.bazi4pillars');
    if (!mainTable) return data;

    const rows = directRows(mainTable);
    const headerCells = directCells(rows[0]);
    const colMap = {};
    headerCells.forEach((cell, idx) => {
      const t = txt(cell);
      if (t.includes('Heure') && !t.includes('Date')) colMap['Heure'] = idx;
      else if (t === 'Jour' || t.startsWith('Jour')) colMap['Jour'] = idx;
      else if (t.includes('Mois')) colMap['Mois'] = idx;
      else if (t.includes('Année')) colMap['Année'] = idx;
      else if (t.includes('conception')) colMap['Conception'] = idx;
      else if (t.includes('Palais')) colMap['Palais de vie'] = idx;
    });

    for (const label of labels) {
      data[label] = {};
    }

    for (let r = 1; r < rows.length; r++) {
      const cells = directCells(rows[r]);
      if (cells.length === 0) continue;
      const rowLabel = directText(cells[0]);

      for (const label of labels) {
        if (rowLabel.includes(label)) {
          for (const [name, colIdx] of Object.entries(colMap)) {
            if (colIdx >= cells.length) continue;
            const cell = cells[colIdx];
            const innerTable = cell.querySelector('table.baziinner');
            if (innerTable) {
              data[label][name] = txt(innerTable);
            } else {
              data[label][name] = directText(cell);
            }
          }
        }
      }
    }

    return data;
  }

  // =====================
  // BLOC H — Base d'analyse
  // =====================
  function parseBlocH(doc) {
    const data = {};

    // Find tables inside div#bazianalysisbasic (first one)
    const divs = doc.querySelectorAll('#bazianalysisbasic');
    if (divs.length === 0) return data;

    const firstDiv = divs[0];
    const tables = firstDiv.querySelectorAll('table.frameDynamic');

    // First frameDynamic table: Base d'analyse
    if (tables[0]) {
      const kvData = parseKvTable(tables[0]);
      Object.assign(data, kvData);
    }

    // Second frameDynamic table (or frameNone): Force du MJ
    if (tables[1]) {
      const rows = directRows(tables[1]);
      for (const row of rows) {
        const cells = directCells(row);
        if (cells.length >= 2) {
          const label = directText(cells[0]);
          const value = directText(cells[1]);
          if (label && value && !label.includes('Cinq') && !label.includes('Saison') &&
              !label.match(/^\d+\s*%/)) {
            // Only clean kv pairs
            if (label.includes('Par saison') || label.includes('Score') ||
                label === 'Faible' || label === 'Fort') {
              data[label] = value;
            }
          }
        }
        // Single cell with "Faible" or "Fort"
        if (cells.length === 1) {
          const t = directText(cells[0]);
          if (t === 'Faible' || t === 'Fort') {
            data['Force'] = t;
          }
        }
      }

      // Extract Saison
      for (const row of rows) {
        const cells = directCells(row);
        if (cells.length >= 2) {
          const label = directText(cells[0]);
          if (label === 'Saison') {
            data['Saison'] = directText(cells[1]);
          }
        }
      }
    }

    // Also parse the frameNone table for Force
    const frameNone = firstDiv.querySelector('table.frameNone');
    if (frameNone) {
      const rows = frameNone.querySelectorAll('tr');
      for (const row of rows) {
        const cells = directCells(row);
        if (cells.length >= 2) {
          const label = directText(cells[0]);
          const value = directText(cells[1]);
          if (label.includes('Par saison')) data['Par saison'] = value;
          if (label.includes('Score fortifiant')) data['Score fortifiant'] = value;
          if (label.includes('Score affaiblissant')) data['Score affaiblissant'] = value;
        }
        if (cells.length === 1) {
          const t = directText(cells[0]);
          if (t === 'Faible' || t === 'Fort') data['Force'] = t;
        }
      }
    }

    return data;
  }

  // =====================
  // BLOC I — 10 Aspects
  // =====================
  function parseBlocI(doc) {
    const aspects = [];

    // Find table.frameDynamic that contains "10 Aspects"
    const tables = doc.querySelectorAll('table.frameDynamic');
    for (const table of tables) {
      const firstRowText = directRows(table)[0] ? txt(directRows(table)[0]) : '';
      if (firstRowText.includes('10 Aspects')) {
        const rows = directRows(table);
        for (let r = 1; r < rows.length; r++) {
          const cells = directCells(rows[r]);
          if (cells.length >= 4) {
            const code = directText(cells[0]);
            const nomFr = directText(cells[1]);
            const nomCn = directText(cells[2]);
            const tronc = directText(cells[3]);
            let score = 0;

            // Score is in the last column (Moyenne / Force)
            if (cells.length >= 5) {
              score = parseFloat(directText(cells[4])) || 0;
            }

            // Only real aspect rows
            const validCodes = ['DO', 'ReI', 'RD', 'DV', '7K', 'ReD', 'RI', 'VR', 'A', 'HO'];
            if (validCodes.includes(code)) {
              aspects.push({ code, nomFr, nomCn, tronc, score });
            }
          }
        }
        break;
      }
    }

    aspects.sort((a, b) => b.score - a.score);
    return aspects;
  }

  // =====================
  // BLOC J — 5 Éléments
  // =====================
  function parseBlocJ(doc) {
    const elements = [];

    // Find the table with "Element" and "Strength" headers
    const tables = doc.querySelectorAll('table');
    for (const table of tables) {
      const rows = directRows(table);
      if (rows.length < 2) continue;

      const headerText = txt(rows[0]);
      if (headerText.includes('Element') && headerText.includes('Strength')) {
        for (let r = 1; r < rows.length; r++) {
          const cells = directCells(rows[r]);
          if (cells.length >= 2) {
            const elemText = directText(cells[0]);
            const strength = parseFloat(directText(cells[1])) || 0;

            // Parse "Influence - Feu 火" → element = Feu, role = Influence
            const match = elemText.match(/(.+?)\s*-\s*(.+?)\s*[火木土水金]?$/);
            if (match) {
              const role = match[1].trim();
              const elemName = match[2].trim();
              elements.push({
                element: elemName,
                emoji: elementEmoji(elemName),
                percentage: strength,
                role: role
              });
            }
          }
        }
        break;
      }
    }

    // If not found, try parsing from "Cinq Facteurs" text
    if (elements.length === 0) {
      const allText = doc.body ? doc.body.textContent : '';
      const patterns = [
        { search: 'Feu', name: 'Feu', emoji: '🔴' },
        { search: 'Bois', name: 'Bois', emoji: '🟢' },
        { search: 'Eau', name: 'Eau', emoji: '🔵' },
        { search: 'Métal', name: 'Métal', emoji: '🟡' },
        { search: 'Terre', name: 'Terre', emoji: '🟤' }
      ];

      for (const elem of patterns) {
        const regex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*%\\s*-\\s*\\w+\\s*-\\s*${elem.search}`, 'i');
        const match = allText.match(regex);
        if (match) {
          elements.push({
            element: elem.name,
            emoji: elem.emoji,
            percentage: parseFloat(match[1])
          });
        }
      }
    }

    return elements;
  }

  // =====================
  // BLOC K — Analyse intermédiaire
  // =====================
  function parseBlocK(doc) {
    const data = {};

    // Find the second #bazianalysisbasic div
    const divs = doc.querySelectorAll('#bazianalysisbasic');
    if (divs.length < 2) {
      // Try finding the table with "Analyse Ba Zi - Intermédiaire"
      const tables = doc.querySelectorAll('table.frameDynamic');
      for (const table of tables) {
        const text = txt(table);
        if (text.includes('Intermédiaire') || text.includes('Structure')) {
          const rows = directRows(table);
          for (const row of rows) {
            const cells = directCells(row);
            if (cells.length >= 2) {
              const label = directText(cells[0]);
              // Get the value from the first non-nested cell
              const innerTable = cells[1].querySelector('table');
              const value = innerTable ? txt(innerTable) : directText(cells[1]);
              if (label && value && !label.includes('Analyse')) {
                data[label] = value;
              }
            }
          }
          break;
        }
      }
      return data;
    }

    const secondDiv = divs[1];
    const table = secondDiv.querySelector('table.frameDynamic');
    if (table) {
      const rows = directRows(table);
      for (const row of rows) {
        const cells = directCells(row);
        if (cells.length >= 2) {
          const label = directText(cells[0]);
          const innerTable = cells[1].querySelector('table');
          const value = innerTable ? txt(innerTable) : directText(cells[1]);
          if (label && value && !label.includes('Analyse')) {
            data[label] = value;
          }
        }
      }
    }

    return data;
  }

  // =====================
  // BLOC L — Piliers de Chance
  // =====================
  function parseBlocL(doc) {
    const luckPillars = [];

    const mainTable = doc.querySelector('table.baziluckpillars');
    if (!mainTable) return luckPillars;

    const rows = directRows(mainTable);
    if (rows.length < 5) return luckPillars;

    // Row structure:
    // Row 0: header/wrapper
    // Row 1-2: header info
    // Row 3: Ages (90, 80, 70, ...)
    // Row 4: Periods (03.2069-03.2079, ...)
    // Row 5: Trunks (baziinner tables)
    // Then individual trunk detail rows
    // Then Branch row with baziinner tables
    // Then hidden trunks, nayin, stars, relations, hexagrams

    // Find the ages row and periods row
    let agesRow = null, periodsRow = null, trunkRow = null, branchRow = null;
    let nayinRowIdx = -1;

    for (let r = 0; r < rows.length; r++) {
      const cells = directCells(rows[r]);
      if (cells.length === 0) continue;
      const firstCellText = directText(cells[0]);

      // Ages row: all cells are numbers
      if (!agesRow && cells.length >= 5) {
        const allNumbers = Array.from(cells).every(c => /^\d+$/.test(directText(c)));
        if (allNumbers) {
          agesRow = rows[r];
          periodsRow = rows[r + 1]; // next row is periods
          continue;
        }
      }

      // Trunk row has baziinner tables with trunk images
      if (!trunkRow && firstCellText === '' && cells.length >= 5) {
        const hasInner = cells[0].querySelector('table.baziinner');
        if (hasInner) {
          const innerText = txt(hasInner);
          // Check if it looks like a trunk (has aspect code)
          if (innerText.match(/\b(DO|DV|7K|VR|RI|RD|ReI|ReD|HO|A)\b/)) {
            trunkRow = rows[r];
            continue;
          }
        }
      }
    }

    // If we found ages, build pillar data
    if (agesRow) {
      const ageCells = directCells(agesRow);
      const periodCells = periodsRow ? directCells(periodsRow) : [];

      for (let i = 0; i < ageCells.length; i++) {
        const age = directText(ageCells[i]);
        const periode = i < periodCells.length ? directText(periodCells[i]) : '';

        if (age) {
          const pillar = {
            age,
            periode,
            tronc: '',
            branche: '',
            aspect: '',
            elementTronc: '',
            phaseDeVie: '',
            animalBranche: '',
            elementBranche: '',
            troncsCaches: [],
            nayin: ''
          };

          luckPillars.push(pillar);
        }
      }

      // Now parse trunk row
      if (trunkRow) {
        const trunkCells = directCells(trunkRow);
        for (let i = 0; i < Math.min(trunkCells.length, luckPillars.length); i++) {
          const inner = trunkCells[i].querySelector('table.baziinner');
          if (inner) {
            const innerRows = inner.querySelectorAll('tr');
            if (innerRows.length >= 3) {
              const aspectText = txt(innerRows[0]);
              const aspectMatch = aspectText.match(/\b(DV|DO|7K|VR|RI|RD|ReI|ReD|HO|A)\b/);
              if (aspectMatch) luckPillars[i].aspect = aspectMatch[1];

              const img = innerRows[0].querySelector('img');
              if (img) luckPillars[i].tronc = trunkFromImg(img);

              luckPillars[i].tronc = luckPillars[i].tronc || txt(innerRows[1]);
              luckPillars[i].elementTronc = txt(innerRows[2]);
            }
          }
        }
      }

      // Find branch row (next major row with baziinner after trunk)
      if (trunkRow) {
        const trunkRowIdx = rows.indexOf(trunkRow);
        // Skip individual trunk detail rows, find next row with multiple baziinner
        for (let r = trunkRowIdx + 1; r < rows.length; r++) {
          const cells = directCells(rows[r]);
          if (cells.length < 5) continue;

          const firstInner = cells[0].querySelector('table.baziinner');
          if (firstInner) {
            const innerRows = firstInner.querySelectorAll('tr');
            if (innerRows.length >= 4) {
              // This is the branch row
              for (let i = 0; i < Math.min(cells.length, luckPillars.length); i++) {
                const inner = cells[i].querySelector('table.baziinner');
                if (inner) {
                  const iRows = inner.querySelectorAll('tr');
                  if (iRows.length >= 5) {
                    luckPillars[i].phaseDeVie = txt(iRows[1]);
                    luckPillars[i].branche = txt(iRows[2]);
                    luckPillars[i].animalBranche = txt(iRows[3]);
                    luckPillars[i].elementBranche = txt(iRows[4]);
                  }
                }
              }
              break;
            }
          }
        }
      }
    }

    return luckPillars;
  }

  // =====================
  // BLOC M — Étoiles PC (simplified)
  // =====================
  function parseBlocM(doc) {
    return []; // Extracted from luck pillars table, complex nested structure
  }

  // =====================
  // BLOC N — Relations PC (simplified)
  // =====================
  function parseBlocN(doc) {
    return [];
  }

  // =====================
  // BLOC O — Hexagrammes PC (simplified)
  // =====================
  function parseBlocO(doc) {
    return [];
  }

  // =====================
  // BLOC P — Piliers annuels (Liu Nian)
  // =====================
  function parseBlocP(doc) {
    const annualPillars = [];

    // Annual pillars are in small nested tables within baziluckpillars
    // Each decade has a table with year entries like "2019己亥"
    const mainTable = doc.querySelector('table.baziluckpillars');
    if (!mainTable) return annualPillars;

    // Find rows that contain year data (pattern: 4-digit year + Chinese characters)
    const allInnerTables = mainTable.querySelectorAll('table.baziinner');

    // Actually, the annual data is at the bottom in grouped tables
    // Each group: outer table has 20 rows (10 pairs of year lines)
    // We need to find these - they're in rows near the bottom

    return annualPillars;
  }

  // =====================
  // BLOC Q — Ba Zhai (8 Demeures)
  // =====================
  function parseBlocQ(doc) {
    const data = {
      chiffreGua: '',
      etoileVie: '',
      groupe: '',
      favorables: [],
      defavorables: []
    };

    // Find the first div#qimendunjiapalace (Ba Zhai)
    const divs = doc.querySelectorAll('#qimendunjiapalace');
    if (divs.length === 0) return data;

    const baZhaiDiv = divs[0];
    const tables = baZhaiDiv.querySelectorAll('table.frameDynamic');

    // First table: Chiffre Gua, Etoile de la vie, Groupe
    if (tables[0]) {
      const kv = parseKvTable(tables[0]);
      data.chiffreGua = kv['Chiffre Gua'] || '';
      data.etoileVie = kv['Etoile de la vie'] || '';
      data.groupe = kv['Groupe'] || '';
    }

    // Second table: Directions
    if (tables[1]) {
      const rows = directRows(tables[1]);
      let isFavorable = true;

      for (const row of rows) {
        const cells = directCells(row);
        if (cells.length === 0) continue;
        const text = directText(cells[0]);

        if (text.includes('Directions Favorables')) {
          isFavorable = true;
          continue;
        }
        if (text.includes('Directions Défavorables') || text.includes('Défavorables')) {
          isFavorable = false;
          continue;
        }

        // Direction rows: # | Name | Description | Direction
        if (cells.length >= 4) {
          const nom = directText(cells[1]);
          const desc = directText(cells[2]);
          const dir = directText(cells[3]);
          if (nom && dir) {
            const entry = { nom: `${nom} (${desc})`, direction: dir };
            if (isFavorable) {
              data.favorables.push(entry);
            } else {
              data.defavorables.push(entry);
            }
          }
        } else if (cells.length >= 3) {
          const nom = directText(cells[0]);
          const desc = directText(cells[1]);
          const dir = directText(cells[2]);
          if (nom && dir && !nom.match(/^\d+$/)) {
            const entry = { nom, direction: dir };
            if (isFavorable) {
              data.favorables.push(entry);
            } else {
              data.defavorables.push(entry);
            }
          }
        }
      }
    }

    return data;
  }

  // =====================
  // BLOC R — Qi Men Dun Jia
  // =====================
  function parseBlocR(doc) {
    const data = {};

    // Find the second div#qimendunjiapalace (QMDJ)
    const divs = doc.querySelectorAll('#qimendunjiapalace');
    const qmdjDiv = divs.length >= 2 ? divs[1] : null;
    if (!qmdjDiv) return data;

    const table = qmdjDiv.querySelector('table.frameDynamic');
    if (table) {
      const kv = parseKvTable(table);
      Object.assign(data, kv);
    }

    return data;
  }

  // =====================
  // MAIN PARSE FUNCTION
  // =====================
  function parse(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    return {
      type: 'bazi',
      blocA: parseBlocA(doc),
      blocB: parseBlocB(doc),
      blocC: parseBlocC(doc),
      blocD: parseBlocD(doc),
      blocE: parseBlocE(doc),
      blocF: parseBlocF(doc),
      blocG: parseBlocG(doc),
      blocH: parseBlocH(doc),
      blocI: parseBlocI(doc),
      blocJ: parseBlocJ(doc),
      blocK: parseBlocK(doc),
      blocL: parseBlocL(doc),
      blocM: parseBlocM(doc),
      blocN: parseBlocN(doc),
      blocO: parseBlocO(doc),
      blocP: parseBlocP(doc),
      blocQ: parseBlocQ(doc),
      blocR: parseBlocR(doc)
    };
  }

  return { parse, elementEmoji };
})();
