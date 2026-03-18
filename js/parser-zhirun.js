/**
 * parser-zhirun.js — Extracteur HTML Zhi Run (chinesemetasoft.com/QiMenDunJia)
 * Parse le HTML sauvegardé et extrait les blocs S1 → S7
 */

const ZhiRunParser = (() => {
  'use strict';

  function txt(el) {
    return el ? el.textContent.trim() : '';
  }

  function getValueAfterLabel(root, labelText) {
    const cells = root.querySelectorAll('td, th');
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].textContent.trim().includes(labelText)) {
        if (i + 1 < cells.length) {
          return txt(cells[i + 1]);
        }
      }
    }
    return '';
  }

  // =====================
  // BLOC S1 — Infos de base
  // =====================
  function parseBlocS1(doc) {
    const data = {};
    const labels = [
      'Structure', 'Tronc meneur', 'Envoyé', 'Porte meneuse', 'Étoile meneuse',
      'Etoile meneuse', '28 Constellations', 'Jia se cache en',
      'Cheval de Ciel', 'Mort et Vide', 'Noble'
    ];

    for (const label of labels) {
      const val = getValueAfterLabel(doc, label);
      if (val) {
        // Normalize label
        const key = label.replace('Étoile', 'Etoile');
        data[key] = val;
      }
    }

    // Structure often has Yin/Yang + number
    if (!data['Structure']) {
      const allText = doc.body ? doc.body.textContent : '';
      const match = allText.match(/(Yin|Yang)\s*(\d+)/i);
      if (match) {
        data['Structure'] = `${match[1]} ${match[2]}`;
      }
    }

    return data;
  }

  // =====================
  // BLOC S2 — Les 9 Palais
  // =====================
  function parseBlocS2(doc) {
    const palaces = {};
    const palaceNames = ['SE', 'S', 'SO', 'E', 'Centre', 'O', 'NE', 'N', 'NO'];

    for (const name of palaceNames) {
      palaces[name] = {
        tronc: '',
        etoile: '',
        porte: '',
        gardien: '',
        hexagramme: ''
      };
    }

    // The 9 palaces are often displayed in a 3x3 grid of tables or a large table
    const tables = doc.querySelectorAll('table');
    for (const table of tables) {
      const text = txt(table);
      // Look for palace-related content
      if (text.includes('Porte') && text.includes('Etoile') ||
          text.includes('Gardien') || text.includes('Tronc')) {

        // Try to find palace sections within cells
        const cells = table.querySelectorAll('td');
        for (const cell of cells) {
          const cellText = txt(cell);
          for (const name of palaceNames) {
            // Match palace direction in cell
            if (cellText.includes(name) || cellText.includes(getDirectionFr(name))) {
              // Extract palace details from this cell or nested table
              const nestedTable = cell.querySelector('table');
              if (nestedTable) {
                const rows = nestedTable.querySelectorAll('tr');
                for (const row of rows) {
                  const innerCells = row.querySelectorAll('td, th');
                  for (let i = 0; i < innerCells.length; i++) {
                    const label = txt(innerCells[i]).toLowerCase();
                    const value = i + 1 < innerCells.length ? txt(innerCells[i + 1]) : '';
                    if (label.includes('tronc')) palaces[name].tronc = value;
                    if (label.includes('toile') || label.includes('etoile')) palaces[name].etoile = value;
                    if (label.includes('porte')) palaces[name].porte = value;
                    if (label.includes('gardien')) palaces[name].gardien = value;
                    if (label.includes('hexagramme')) palaces[name].hexagramme = value;
                  }
                }
              } else {
                // Try line-based parsing
                const lines = cellText.split('\n').map(l => l.trim()).filter(Boolean);
                for (const line of lines) {
                  if (line.includes('Tronc')) palaces[name].tronc = line.replace(/.*Tronc\s*:?\s*/i, '');
                  if (line.includes('toile') || line.includes('Etoile')) palaces[name].etoile = line.replace(/.*[Éé]toile\s*:?\s*/i, '');
                  if (line.includes('Porte')) palaces[name].porte = line.replace(/.*Porte\s*:?\s*/i, '');
                  if (line.includes('Gardien')) palaces[name].gardien = line.replace(/.*Gardien\s*:?\s*/i, '');
                }
              }
            }
          }
        }
      }
    }

    return palaces;
  }

  function getDirectionFr(dir) {
    const map = {
      'SE': 'Sud-Est', 'S': 'Sud', 'SO': 'Sud-Ouest',
      'E': 'Est', 'Centre': 'Centre', 'O': 'Ouest',
      'NE': 'Nord-Est', 'N': 'Nord', 'NO': 'Nord-Ouest'
    };
    return map[dir] || dir;
  }

  // =====================
  // BLOC S3 — Formations de palais
  // =====================
  function parseBlocS3(doc) {
    const formations = [];

    const tables = doc.querySelectorAll('table');
    for (const table of tables) {
      const text = txt(table);
      if (text.includes('Formation') && (text.includes('palais') || text.includes('Palais'))) {
        const rows = table.querySelectorAll('tr');
        for (let r = 1; r < rows.length; r++) {
          const cells = rows[r].querySelectorAll('td, th');
          if (cells.length >= 2) {
            formations.push({
              nomCn: txt(cells[0]) || '',
              nomFr: cells.length > 1 ? txt(cells[1]) : '',
              palais: cells.length > 2 ? txt(cells[2]) : '',
              description: cells.length > 3 ? txt(cells[3]) : '',
              favorable: cells.length > 4 ? txt(cells[4]) : ''
            });
          }
        }
        break;
      }
    }

    return formations;
  }

  // =====================
  // BLOC S4 — Formations de troncs
  // =====================
  function parseBlocS4(doc) {
    const formations = [];

    const tables = doc.querySelectorAll('table');
    for (const table of tables) {
      const text = txt(table);
      if (text.includes('Formation') && (text.includes('tronc') || text.includes('Tronc'))) {
        const rows = table.querySelectorAll('tr');
        for (let r = 1; r < rows.length; r++) {
          const cells = rows[r].querySelectorAll('td, th');
          if (cells.length >= 2) {
            formations.push({
              numero: txt(cells[0]) || '',
              nomCn: cells.length > 1 ? txt(cells[1]) : '',
              nomFr: cells.length > 2 ? txt(cells[2]) : '',
              description: cells.length > 3 ? txt(cells[3]) : ''
            });
          }
        }
        break;
      }
    }

    return formations;
  }

  // =====================
  // BLOC S5 — Formations spéciales
  // =====================
  function parseBlocS5(doc) {
    const formations = [];

    const tables = doc.querySelectorAll('table');
    for (const table of tables) {
      const text = txt(table);
      if (text.includes('spécial') || text.includes('Special') || text.includes('Spécial')) {
        const rows = table.querySelectorAll('tr');
        for (let r = 1; r < rows.length; r++) {
          const cells = rows[r].querySelectorAll('td, th');
          if (cells.length >= 2) {
            formations.push({
              numero: txt(cells[0]) || '',
              nomCn: cells.length > 1 ? txt(cells[1]) : '',
              nomFr: cells.length > 2 ? txt(cells[2]) : '',
              description: cells.length > 3 ? txt(cells[3]) : ''
            });
          }
        }
        break;
      }
    }

    return formations;
  }

  // =====================
  // BLOC S6 — Stratégies (36 Stratagèmes)
  // =====================
  function parseBlocS6(doc) {
    const strategies = [];

    const tables = doc.querySelectorAll('table');
    for (const table of tables) {
      const text = txt(table);
      if (text.includes('Stratagème') || text.includes('stratagème') ||
          text.includes('36') || text.includes('Stratégie')) {
        const rows = table.querySelectorAll('tr');
        for (let r = 1; r < rows.length; r++) {
          const cells = rows[r].querySelectorAll('td, th');
          if (cells.length >= 2) {
            strategies.push({
              numero: txt(cells[0]) || '',
              categorie: cells.length > 1 ? txt(cells[1]) : '',
              nom: cells.length > 2 ? txt(cells[2]) : '',
              description: cells.length > 3 ? txt(cells[3]) : ''
            });
          }
        }
        break;
      }
    }

    return strategies;
  }

  // =====================
  // BLOC S7 — Informations complémentaires
  // =====================
  function parseBlocS7(doc) {
    const data = {};
    const labels = [
      '3 Victoires', 'Yi Céleste', 'Palais intérieurs', 'Palais extérieurs',
      'Clash jour', 'Clash heure'
    ];

    for (const label of labels) {
      data[label] = getValueAfterLabel(doc, label);
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
      type: 'zhirun',
      blocS1: parseBlocS1(doc),
      blocS2: parseBlocS2(doc),
      blocS3: parseBlocS3(doc),
      blocS4: parseBlocS4(doc),
      blocS5: parseBlocS5(doc),
      blocS6: parseBlocS6(doc),
      blocS7: parseBlocS7(doc)
    };
  }

  return { parse };
})();
