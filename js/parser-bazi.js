/**
 * parser-bazi.js — Extracteur HTML BaZi (chinesemetasoft.com/BaZi/ViewChart)
 * Parse le HTML sauvegardé et extrait les blocs A → R
 */

const BaZiParser = (() => {
  'use strict';

  // Utility: get text content trimmed
  function txt(el) {
    return el ? el.textContent.trim() : '';
  }

  // Utility: find element containing text
  function findByText(root, tag, text) {
    const els = root.querySelectorAll(tag);
    for (const el of els) {
      if (el.textContent.includes(text)) return el;
    }
    return null;
  }

  // Utility: find all elements containing text
  function findAllByText(root, tag, text) {
    const results = [];
    const els = root.querySelectorAll(tag);
    for (const el of els) {
      if (el.textContent.includes(text)) results.push(el);
    }
    return results;
  }

  // Utility: get value from a label/value pair in a table
  function getValueAfterLabel(root, labelText) {
    const cells = root.querySelectorAll('td, th');
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].textContent.trim().includes(labelText)) {
        // Value is usually in the next cell
        if (i + 1 < cells.length) {
          return txt(cells[i + 1]);
        }
      }
    }
    return '';
  }

  // Utility: extract trunk name from image src or alt
  function trunkFromImg(img) {
    if (!img) return '';
    const alt = img.getAttribute('alt') || '';
    if (alt) return alt.replace(/\.png$/i, '');
    const src = img.getAttribute('src') || '';
    const match = src.match(/\/([A-Za-z]+)\.png/i);
    return match ? match[1] : '';
  }

  // Element mapping
  const ELEMENT_EMOJI = {
    'Feu': '🔴', 'Fire': '🔴', 'feu': '🔴',
    'Bois': '🟢', 'Wood': '🟢', 'bois': '🟢',
    'Eau': '🔵', 'Water': '🔵', 'eau': '🔵',
    'Métal': '🟡', 'Metal': '🟡', 'métal': '🟡', 'metal': '🟡',
    'Terre': '🟤', 'Earth': '🟤', 'terre': '🟤'
  };

  function elementEmoji(elementName) {
    for (const [key, emoji] of Object.entries(ELEMENT_EMOJI)) {
      if (elementName && elementName.toLowerCase().includes(key.toLowerCase())) {
        return emoji;
      }
    }
    return '';
  }

  // =====================
  // BLOC A — Détails personnels
  // =====================
  function parseBlocA(doc) {
    const data = {};
    const labels = ['Nom complet', 'Genre', 'Date de naissance', 'Age', 'Charte Id'];
    for (const label of labels) {
      data[label] = getValueAfterLabel(doc, label);
    }
    return data;
  }

  // =====================
  // BLOC B — Données astro-géographiques
  // =====================
  function parseBlocB(doc) {
    const data = {};
    const labels = [
      'Type de calendrier', 'Lieu', 'Zone de temps', 'Longitude',
      'Heure locale', 'Equation de l\'heure', 'Geo Compensation', 'DST',
      'Heure solaire', 'Jie Qi', 'Date de départ', 'Date de fin'
    ];
    for (const label of labels) {
      data[label] = getValueAfterLabel(doc, label);
    }
    return data;
  }

  // =====================
  // BLOC C — Les 6 Piliers
  // =====================
  function parseBlocC(doc) {
    const pillarNames = ['Heure', 'Jour', 'Mois', 'Année', 'Conception', 'Palais de vie'];
    const pillars = {};

    // Find the main chart table — usually contains trunk/branch info
    // Look for a table that has pillar headers
    const tables = doc.querySelectorAll('table');
    let chartTable = null;

    for (const table of tables) {
      const headerText = txt(table);
      if (headerText.includes('Heure') && headerText.includes('Jour') &&
          headerText.includes('Mois') && headerText.includes('Année')) {
        // Check if this looks like the main pillars table (has trunk images)
        if (table.querySelector('img') || headerText.includes('Tronc') || headerText.includes('Branche')) {
          chartTable = table;
          break;
        }
      }
    }

    if (!chartTable) {
      // Try a broader search
      for (const table of tables) {
        const th = table.querySelector('th, td');
        if (th && (txt(th).includes('Heure') || txt(table.rows[0]).includes('Heure'))) {
          chartTable = table;
          break;
        }
      }
    }

    for (const name of pillarNames) {
      pillars[name] = {
        tronc: { pinyin: '', element: '', polarite: '', aspect: '' },
        branche: { pinyin: '', animal: '', element: '', phaseDeVie: '', mv: false },
        troncsCaches: [],
        nayin: ''
      };
    }

    if (chartTable) {
      const rows = chartTable.querySelectorAll('tr');

      // Try to identify columns based on header row
      let colMap = {};
      if (rows.length > 0) {
        const headerCells = rows[0].querySelectorAll('th, td');
        headerCells.forEach((cell, idx) => {
          const t = txt(cell);
          for (const name of pillarNames) {
            if (t.includes(name)) {
              colMap[name] = idx;
            }
          }
        });
      }

      // Parse rows for trunk, branch, hidden trunks, nayin
      for (const row of rows) {
        const cells = row.querySelectorAll('td, th');
        const rowLabel = cells.length > 0 ? txt(cells[0]).toLowerCase() : '';

        for (const [name, colIdx] of Object.entries(colMap)) {
          if (colIdx >= cells.length) continue;
          const cell = cells[colIdx];

          // Trunk row - look for images
          const img = cell.querySelector('img');
          if (img && !pillars[name].tronc.pinyin) {
            pillars[name].tronc.pinyin = trunkFromImg(img);
          }

          // Extract element info from cell text
          const cellText = txt(cell);

          if (rowLabel.includes('tronc') && !rowLabel.includes('cach')) {
            pillars[name].tronc.pinyin = pillars[name].tronc.pinyin || cellText;
            // Look for element in same or adjacent cell
            for (const [elem, emoji] of Object.entries(ELEMENT_EMOJI)) {
              if (cellText.includes(elem)) {
                pillars[name].tronc.element = elem;
                break;
              }
            }
          }

          if (rowLabel.includes('branche')) {
            pillars[name].branche.pinyin = cellText.split(/\s/)[0] || cellText;
          }

          if (rowLabel.includes('cach')) {
            const parts = cellText.split(/[,;\/\n]/).map(s => s.trim()).filter(Boolean);
            pillars[name].troncsCaches = parts;
          }

          if (rowLabel.includes('nayin') || rowLabel.includes('na yin')) {
            pillars[name].nayin = cellText;
          }

          // MV detection
          if (cellText.includes('MV')) {
            pillars[name].branche.mv = true;
          }

          // Phase de vie
          const phases = ['Florissant', 'Prospère', 'Affaibli', 'Bain', 'Croissance',
            'Naissance', 'Embryon', 'Mort', 'Maladie', 'Déclin', 'Tombeau', 'Fin'];
          for (const phase of phases) {
            if (cellText.includes(phase)) {
              pillars[name].branche.phaseDeVie = phase;
            }
          }
        }
      }

      // Try to extract aspects from adjacent cells
      for (const row of rows) {
        const cells = row.querySelectorAll('td, th');
        const aspects = ['7K', 'VR', 'RI', 'DO', 'RW', 'EG', 'HO', 'DR', 'IR', 'DW',
          'RP', 'PO', 'PM', 'GR', 'GP'];
        for (const cell of cells) {
          const t = txt(cell);
          for (const aspect of aspects) {
            if (t === aspect || t.includes('(' + aspect + ')')) {
              // Find which pillar this belongs to
              const cellIdx = Array.from(cells).indexOf(cell);
              for (const [name, colIdx] of Object.entries(colMap)) {
                if (Math.abs(cellIdx - colIdx) <= 1) {
                  pillars[name].tronc.aspect = aspect;
                }
              }
            }
          }
        }
      }
    }

    return pillars;
  }

  // =====================
  // BLOC D — Étoiles auxiliaires
  // =====================
  function parseBlocD(doc) {
    const stars = {};
    const pillarNames = ['Heure', 'Jour', 'Mois', 'Année', 'Conception', 'Palais de vie'];
    for (const name of pillarNames) {
      stars[name] = [];
    }

    // Look for section with "Etoiles auxiliaires" or "AP001" etc.
    const tables = doc.querySelectorAll('table');
    for (const table of tables) {
      const text = txt(table);
      if (text.includes('Etoiles auxiliaires') || text.includes('toiles auxiliaires') ||
          text.includes('AP0') || text.includes('Auxiliary')) {
        const rows = table.querySelectorAll('tr');

        // First identify column headers
        let colMap = {};
        if (rows.length > 0) {
          const headerCells = rows[0].querySelectorAll('th, td');
          headerCells.forEach((cell, idx) => {
            const t = txt(cell);
            for (const name of pillarNames) {
              if (t.includes(name)) {
                colMap[name] = idx;
              }
            }
          });
        }

        for (let r = 1; r < rows.length; r++) {
          const cells = rows[r].querySelectorAll('td, th');
          for (const [name, colIdx] of Object.entries(colMap)) {
            if (colIdx < cells.length) {
              const val = txt(cells[colIdx]);
              if (val) {
                stars[name].push(val);
              }
            }
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
    const relTypes = [
      '3 Harmonies', 'Combo de 6', 'Punition', 'Clash',
      'Destruction', 'Préjudice', 'Combo des Troncs', 'Clash des Troncs'
    ];

    for (const relType of relTypes) {
      relations[relType] = [];

      const cells = doc.querySelectorAll('td, th');
      for (let i = 0; i < cells.length; i++) {
        const t = txt(cells[i]);
        if (t.includes(relType)) {
          // Value is usually in the next cell or same row
          if (i + 1 < cells.length) {
            const val = txt(cells[i + 1]);
            if (val) {
              relations[relType].push(val);
            }
          }
          // Also check within the same cell for tags [H], [J], [M], [A]
          const tags = t.match(/\[[HJMA]\]/g);
          if (tags) {
            relations[relType].push({ text: t, tags: tags });
          }
        }
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

    const tables = doc.querySelectorAll('table');
    for (const table of tables) {
      const text = txt(table);
      if (text.includes('Hexagramme') || text.includes('hexagramme') ||
          text.includes('Trigramme') || text.includes('trigramme')) {
        const rows = table.querySelectorAll('tr');

        let colMap = {};
        if (rows.length > 0) {
          const headerCells = rows[0].querySelectorAll('th, td');
          headerCells.forEach((cell, idx) => {
            const t = txt(cell);
            for (const name of pillarNames) {
              if (t.includes(name)) colMap[name] = idx;
            }
          });
        }

        for (const name of pillarNames) {
          hexagrams[name] = { trigrammeHaut: '', trigrammeBas: '', numero: '', nom: '' };
        }

        for (const row of rows) {
          const cells = row.querySelectorAll('td, th');
          const label = cells.length > 0 ? txt(cells[0]).toLowerCase() : '';

          for (const [name, colIdx] of Object.entries(colMap)) {
            if (colIdx >= cells.length) continue;
            const val = txt(cells[colIdx]);

            if (label.includes('haut') || label.includes('upper')) {
              hexagrams[name].trigrammeHaut = val;
            } else if (label.includes('bas') || label.includes('lower')) {
              hexagrams[name].trigrammeBas = val;
            } else if (label.includes('num') || label.includes('#')) {
              hexagrams[name].numero = val;
            } else if (label.includes('nom') || label.includes('name')) {
              hexagrams[name].nom = val;
            }
          }
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

    for (const label of labels) {
      data[label] = {};
      for (const name of pillarNames) {
        data[label][name] = '';
      }
    }

    const tables = doc.querySelectorAll('table');
    for (const table of tables) {
      const text = txt(table);
      if (text.includes('Groupe') || text.includes('Gua') || text.includes('Stratagème')) {
        const rows = table.querySelectorAll('tr');

        let colMap = {};
        if (rows.length > 0) {
          const headerCells = rows[0].querySelectorAll('th, td');
          headerCells.forEach((cell, idx) => {
            const t = txt(cell);
            for (const name of pillarNames) {
              if (t.includes(name)) colMap[name] = idx;
            }
          });
        }

        for (const row of rows) {
          const cells = row.querySelectorAll('td, th');
          if (cells.length === 0) continue;
          const rowLabel = txt(cells[0]);

          for (const label of labels) {
            if (rowLabel.includes(label)) {
              for (const [name, colIdx] of Object.entries(colMap)) {
                if (colIdx < cells.length) {
                  data[label][name] = txt(cells[colIdx]);
                }
              }
            }
          }
        }
        break;
      }
    }

    return data;
  }

  // =====================
  // BLOC H — Base d'analyse
  // =====================
  function parseBlocH(doc) {
    const data = {};
    const labels = [
      'Maître du Jour', 'Noble', 'Intelligence', 'Cheval de Ciel',
      'Fleur de Pêcher', 'Solitaire', 'Docteur Céleste', 'Etoile de la maladie',
      'Mort et vide', 'Dieu Utile', 'He Luo Li Shu', 'Saison', 'Par saison',
      'Score fortifiant', 'Score affaiblissant'
    ];

    for (const label of labels) {
      data[label] = getValueAfterLabel(doc, label);
    }

    // Fort/Faible
    data['Force'] = '';
    const allText = doc.body ? doc.body.textContent : '';
    if (allText.includes('Fort')) data['Force'] = 'Fort';
    if (allText.includes('Faible')) data['Force'] = data['Force'] ? data['Force'] + ' / Faible' : 'Faible';

    // Try to be more precise - look near score labels
    const cells = doc.querySelectorAll('td, th');
    for (const cell of cells) {
      const t = txt(cell);
      if (t === 'Fort' || t === 'Faible') {
        data['Force'] = t;
      }
    }

    return data;
  }

  // =====================
  // BLOC I — 10 Aspects
  // =====================
  function parseBlocI(doc) {
    const aspects = [];
    const aspectCodes = ['7K', 'VR', 'RI', 'DO', 'RW', 'EG', 'HO', 'DR', 'IR', 'DW',
      'RP', 'PO', 'PM', 'GR', 'GP'];

    const tables = doc.querySelectorAll('table');
    for (const table of tables) {
      const text = txt(table);
      // Find a table that has aspect codes and scores
      let hasAspects = false;
      for (const code of aspectCodes) {
        if (text.includes(code)) { hasAspects = true; break; }
      }

      if (hasAspects && (text.includes('Score') || text.includes('score'))) {
        const rows = table.querySelectorAll('tr');
        for (let r = 1; r < rows.length; r++) {
          const cells = rows[r].querySelectorAll('td, th');
          if (cells.length >= 3) {
            const aspect = {
              code: txt(cells[0]),
              nomFr: txt(cells[1]) || '',
              nomCn: txt(cells[2]) || '',
              tronc: cells.length > 3 ? txt(cells[3]) : '',
              score: cells.length > 4 ? parseFloat(txt(cells[cells.length - 1])) || 0 : 0
            };
            if (aspect.code) {
              aspects.push(aspect);
            }
          }
        }
        break;
      }
    }

    // Sort by score descending
    aspects.sort((a, b) => b.score - a.score);
    return aspects;
  }

  // =====================
  // BLOC J — 5 Éléments
  // =====================
  function parseBlocJ(doc) {
    const elements = [];
    const elementNames = [
      { search: 'Feu', name: 'Feu', emoji: '🔴' },
      { search: 'Bois', name: 'Bois', emoji: '🟢' },
      { search: 'Eau', name: 'Eau', emoji: '🔵' },
      { search: 'Métal', name: 'Métal', emoji: '🟡' },
      { search: 'Terre', name: 'Terre', emoji: '🟤' }
    ];

    const cells = doc.querySelectorAll('td, th');
    for (const cell of cells) {
      const t = txt(cell);
      // Look for pattern like "XX% - Category - Element"
      const match = t.match(/(\d+(?:\.\d+)?)\s*%/);
      if (match) {
        for (const elem of elementNames) {
          if (t.includes(elem.search)) {
            elements.push({
              element: elem.name,
              emoji: elem.emoji,
              percentage: parseFloat(match[1]),
              rawText: t
            });
          }
        }
      }
    }

    // If not found in cells, try text content
    if (elements.length === 0) {
      const allText = doc.body ? doc.body.textContent : '';
      for (const elem of elementNames) {
        const regex = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*%[^%]*${elem.search}`, 'i');
        const match = allText.match(regex);
        if (match) {
          elements.push({
            element: elem.name,
            emoji: elem.emoji,
            percentage: parseFloat(match[1]),
            rawText: match[0]
          });
        }
        // Also try reverse order: "Ressource - Terre - XX%"
        const regex2 = new RegExp(`${elem.search}[^%]*(\\d+(?:\\.\\d+)?)\\s*%`, 'i');
        const match2 = allText.match(regex2);
        if (match2 && !elements.find(e => e.element === elem.name)) {
          elements.push({
            element: elem.name,
            emoji: elem.emoji,
            percentage: parseFloat(match2[1]),
            rawText: match2[0]
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
    const labels = ['Jours particuliers', 'Structure', 'Bon', 'Mauvais', 'Relations'];

    for (const label of labels) {
      data[label] = getValueAfterLabel(doc, label);
    }

    return data;
  }

  // =====================
  // BLOC L — Piliers de Chance
  // =====================
  function parseBlocL(doc) {
    const luckPillars = [];

    const tables = doc.querySelectorAll('table');
    for (const table of tables) {
      const text = txt(table);
      if ((text.includes('Pilier') && text.includes('Chance')) ||
          text.includes('Da Yun') || text.includes('Luck Pillar') ||
          text.includes('PC')) {
        const rows = table.querySelectorAll('tr');

        // Try to identify structure
        for (let r = 1; r < rows.length; r++) {
          const cells = rows[r].querySelectorAll('td, th');
          if (cells.length >= 3) {
            const pillar = {
              age: txt(cells[0]),
              periode: txt(cells[1]) || '',
              tronc: '',
              branche: '',
              phaseDeVie: '',
              troncsCaches: [],
              nayin: ''
            };

            // Extract trunk from image if present
            const img = rows[r].querySelector('img');
            if (img) {
              pillar.tronc = trunkFromImg(img);
            }

            // Fill in available data from cells
            for (let c = 0; c < cells.length; c++) {
              const val = txt(cells[c]);
              if (!pillar.tronc && cells[c].querySelector('img')) {
                pillar.tronc = trunkFromImg(cells[c].querySelector('img'));
              }
            }

            if (pillar.age || pillar.tronc) {
              luckPillars.push(pillar);
            }
          }
        }
        break;
      }
    }

    return luckPillars;
  }

  // =====================
  // BLOC M — Étoiles PC
  // =====================
  function parseBlocM(doc) {
    // Stars for each Luck Pillar — look for the relevant table
    const stars = [];
    const tables = doc.querySelectorAll('table');
    for (const table of tables) {
      const text = txt(table);
      if ((text.includes('Etoile') || text.includes('toile')) &&
          (text.includes('PC') || text.includes('Chance'))) {
        const rows = table.querySelectorAll('tr');
        for (let r = 1; r < rows.length; r++) {
          const cells = rows[r].querySelectorAll('td, th');
          const entry = [];
          for (const cell of cells) {
            entry.push(txt(cell));
          }
          if (entry.some(e => e)) {
            stars.push(entry);
          }
        }
        break;
      }
    }
    return stars;
  }

  // =====================
  // BLOC N — Relations PC
  // =====================
  function parseBlocN(doc) {
    const relations = [];
    const tables = doc.querySelectorAll('table');
    for (const table of tables) {
      const text = txt(table);
      if ((text.includes('Relation') || text.includes('relation')) &&
          (text.includes('PC') || text.includes('Chance'))) {
        const rows = table.querySelectorAll('tr');
        for (let r = 1; r < rows.length; r++) {
          const cells = rows[r].querySelectorAll('td, th');
          const entry = [];
          for (const cell of cells) {
            entry.push(txt(cell));
          }
          if (entry.some(e => e)) {
            relations.push(entry);
          }
        }
        break;
      }
    }
    return relations;
  }

  // =====================
  // BLOC O — Hexagrammes PC
  // =====================
  function parseBlocO(doc) {
    const hexagrams = [];
    const tables = doc.querySelectorAll('table');
    for (const table of tables) {
      const text = txt(table);
      if ((text.includes('Hexagramme') || text.includes('hexagramme')) &&
          (text.includes('PC') || text.includes('Chance') || text.includes('Stratagème'))) {
        const rows = table.querySelectorAll('tr');
        for (let r = 1; r < rows.length; r++) {
          const cells = rows[r].querySelectorAll('td, th');
          const entry = [];
          for (const cell of cells) {
            entry.push(txt(cell));
          }
          if (entry.some(e => e)) {
            hexagrams.push(entry);
          }
        }
        break;
      }
    }
    return hexagrams;
  }

  // =====================
  // BLOC P — Piliers annuels (Liu Nian)
  // =====================
  function parseBlocP(doc) {
    const annualPillars = [];
    const tables = doc.querySelectorAll('table');
    for (const table of tables) {
      const text = txt(table);
      if (text.includes('Liu Nian') || text.includes('Annual') ||
          text.includes('annuel') || text.includes('Année')) {
        // Check if table has multiple year entries (10 years per LP)
        const rows = table.querySelectorAll('tr');
        for (const row of rows) {
          const cells = row.querySelectorAll('td, th');
          const entry = [];
          for (const cell of cells) {
            entry.push(txt(cell));
          }
          if (entry.some(e => e)) {
            annualPillars.push(entry);
          }
        }
        break;
      }
    }
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

    const labels = { 'Chiffre Gua': 'chiffreGua', 'Etoile de la vie': 'etoileVie', 'Groupe': 'groupe' };
    for (const [label, key] of Object.entries(labels)) {
      data[key] = getValueAfterLabel(doc, label);
    }

    const favorable = ['Sheng Qi', 'Tian Yi', 'Yan Nian', 'Fu Wei'];
    const defavorable = ['Huo Hai', 'Wu Gui', 'Liu Sha', 'Jue Ming'];

    for (const name of favorable) {
      const val = getValueAfterLabel(doc, name);
      if (val) {
        data.favorables.push({ nom: name, direction: val });
      }
    }

    for (const name of defavorable) {
      const val = getValueAfterLabel(doc, name);
      if (val) {
        data.defavorables.push({ nom: name, direction: val });
      }
    }

    return data;
  }

  // =====================
  // BLOC R — Qi Men Dun Jia (basique)
  // =====================
  function parseBlocR(doc) {
    const data = {};
    const labels = [
      'Palais de Destinée', 'Direction', 'Tronc de vie',
      'Etoile', 'Porte', 'Gardien', 'Combinaison'
    ];

    // Look specifically in QMDJ section
    const tables = doc.querySelectorAll('table');
    for (const table of tables) {
      const text = txt(table);
      if (text.includes('Qi Men') || text.includes('QMDJ') ||
          text.includes('Palais de Destinée')) {
        for (const label of labels) {
          const rows = table.querySelectorAll('tr');
          for (const row of rows) {
            const cells = row.querySelectorAll('td, th');
            for (let i = 0; i < cells.length; i++) {
              if (txt(cells[i]).includes(label) && i + 1 < cells.length) {
                data[label] = txt(cells[i + 1]);
              }
            }
          }
        }
        break;
      }
    }

    // Fallback: search in whole document
    if (Object.keys(data).length === 0) {
      for (const label of labels) {
        data[label] = getValueAfterLabel(doc, label);
      }
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
