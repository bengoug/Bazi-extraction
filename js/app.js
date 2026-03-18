/**
 * app.js — Logique UI + API GitHub pour BaZi Manager
 */

(() => {
  'use strict';

  // =====================
  // STATE
  // =====================
  let currentFile = null;        // { name, content (string) }
  let currentExtraction = null;  // parsed data object
  let extractionHtml = null;     // formatted HTML string
  let persons = [];              // list of person names

  // =====================
  // DOM REFS
  // =====================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const configSection = $('#config-section');
  const btnConfig = $('#btn-config');
  const btnSaveConfig = $('#btn-save-config');
  const configStatus = $('#config-status');
  const githubToken = $('#github-token');
  const githubOwner = $('#github-owner');
  const githubRepo = $('#github-repo');
  const tokenToggle = $('#token-toggle');

  const personSelect = $('#person-select');
  const btnAddPerson = $('#btn-add-person');
  const typeSelect = $('#type-select');
  const dropZone = $('#drop-zone');
  const fileInput = $('#file-input');
  const fileNameDisplay = $('#file-name-display');

  const btnExtract = $('#btn-extract');
  const btnDownload = $('#btn-download');
  const btnStore = $('#btn-store');
  const uploadStatus = $('#upload-status');

  const previewArea = $('#preview-area');
  const previewFrame = $('#preview-frame');

  const tabUpload = $('#tab-upload');
  const tabFiles = $('#tab-files');
  const btnRefreshFiles = $('#btn-refresh-files');
  const filesContainer = $('#files-container');
  const filesStatus = $('#files-status');

  const modalPerson = $('#modal-person');
  const newPersonName = $('#new-person-name');
  const btnConfirmPerson = $('#btn-confirm-person');
  const btnCancelPerson = $('#btn-cancel-person');

  // =====================
  // INIT
  // =====================
  function init() {
    loadConfig();
    loadPersons();
    bindEvents();
  }

  // =====================
  // CONFIG
  // =====================
  function loadConfig() {
    githubToken.value = localStorage.getItem('bazi_token') || '';
    githubOwner.value = localStorage.getItem('bazi_owner') || '';
    githubRepo.value = localStorage.getItem('bazi_repo') || 'bazi-manager';
  }

  function saveConfig() {
    localStorage.setItem('bazi_token', githubToken.value.trim());
    localStorage.setItem('bazi_owner', githubOwner.value.trim());
    localStorage.setItem('bazi_repo', githubRepo.value.trim());
    showStatus(configStatus, 'Configuration sauvegardée.', 'success');
  }

  function getConfig() {
    return {
      token: localStorage.getItem('bazi_token') || '',
      owner: localStorage.getItem('bazi_owner') || '',
      repo: localStorage.getItem('bazi_repo') || 'bazi-manager'
    };
  }

  // =====================
  // PERSONS
  // =====================
  function loadPersons() {
    const saved = localStorage.getItem('bazi_persons');
    persons = saved ? JSON.parse(saved) : [];
    renderPersonSelect();
  }

  function savePersons() {
    localStorage.setItem('bazi_persons', JSON.stringify(persons));
  }

  function addPerson(name) {
    const normalized = name.trim().toLowerCase().replace(/\s+/g, '_');
    if (!normalized) return;
    if (!persons.includes(normalized)) {
      persons.push(normalized);
      savePersons();
    }
    renderPersonSelect();
    personSelect.value = normalized;
  }

  function renderPersonSelect() {
    personSelect.innerHTML = '<option value="">-- Choisir --</option>';
    for (const name of persons) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name.charAt(0).toUpperCase() + name.slice(1);
      personSelect.appendChild(opt);
    }
  }

  // =====================
  // FILE HANDLING
  // =====================
  function handleFile(file) {
    if (!file || !file.name.match(/\.html?$/i)) {
      showStatus(uploadStatus, 'Veuillez sélectionner un fichier HTML.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      currentFile = { name: file.name, content: e.target.result };
      fileNameDisplay.textContent = file.name;
      btnExtract.disabled = false;
      currentExtraction = null;
      extractionHtml = null;
      btnDownload.disabled = true;
      btnStore.disabled = true;
      previewArea.classList.remove('visible');
      showStatus(uploadStatus, `Fichier "${file.name}" chargé. Cliquez sur "Extraire".`, 'info');
    };
    reader.readAsText(file);
  }

  // =====================
  // EXTRACTION
  // =====================
  function doExtract() {
    if (!currentFile) return;

    const type = typeSelect.value;
    const person = personSelect.value;

    if (!person) {
      showStatus(uploadStatus, 'Veuillez sélectionner ou créer une personne.', 'error');
      return;
    }

    try {
      if (type === 'bazi') {
        currentExtraction = BaZiParser.parse(currentFile.content);
      } else if (type === 'zhirun') {
        currentExtraction = ZhiRunParser.parse(currentFile.content);
      } else {
        // QMDJ du jour — use BaZi parser as fallback
        currentExtraction = BaZiParser.parse(currentFile.content);
        currentExtraction.type = 'bazi';
      }

      const personLabel = person.charAt(0).toUpperCase() + person.slice(1);
      extractionHtml = Formatter.format(currentExtraction, personLabel);

      // Show preview
      previewArea.classList.add('visible');
      const blob = new Blob([extractionHtml], { type: 'text/html' });
      previewFrame.src = URL.createObjectURL(blob);

      btnDownload.disabled = false;
      btnStore.disabled = false;

      showStatus(uploadStatus, 'Extraction terminée avec succès !', 'success');
    } catch (err) {
      console.error('Extraction error:', err);
      showStatus(uploadStatus, `Erreur d'extraction : ${err.message}`, 'error');
    }
  }

  // =====================
  // DOWNLOAD
  // =====================
  function doDownload() {
    if (!extractionHtml) return;

    const person = personSelect.value;
    const type = typeSelect.value;
    const typeLabel = { bazi: 'BaZi', zhirun: 'ZhiRun', qmdj: 'QMDJ' }[type] || type;
    const personLabel = person.charAt(0).toUpperCase() + person.slice(1);
    const filename = `${typeLabel}_Extraction_${personLabel}.html`;

    const blob = new Blob([extractionHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // =====================
  // GITHUB API
  // =====================
  async function githubApi(method, path, body) {
    const config = getConfig();
    if (!config.token || !config.owner || !config.repo) {
      throw new Error('Configuration GitHub incomplète. Remplissez le token, le propriétaire et le repo.');
    }

    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
    const headers = {
      'Authorization': `token ${config.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const resp = await fetch(url, options);
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(`GitHub API ${resp.status}: ${errData.message || resp.statusText}`);
    }
    return resp.json();
  }

  async function uploadToGitHub(filePath, content, message) {
    // Check if file already exists to get its SHA
    let sha = null;
    try {
      const existing = await githubApi('GET', filePath);
      sha = existing.sha;
    } catch (e) {
      // File doesn't exist yet, that's fine
    }

    const body = {
      message: message,
      content: btoa(unescape(encodeURIComponent(content))),
    };
    if (sha) body.sha = sha;

    return githubApi('PUT', filePath, body);
  }

  async function doStore() {
    if (!currentFile || !extractionHtml) return;

    const person = personSelect.value;
    const type = typeSelect.value;

    if (!person) {
      showStatus(uploadStatus, 'Veuillez sélectionner une personne.', 'error');
      return;
    }

    const config = getConfig();
    if (!config.token) {
      showStatus(uploadStatus, 'Configurez votre token GitHub d\'abord.', 'error');
      return;
    }

    btnStore.disabled = true;
    showStatus(uploadStatus, 'Upload en cours...', 'info');

    try {
      const typeLabel = { bazi: 'BaZi', zhirun: 'ZhiRun', qmdj: 'QMDJ' }[type] || type;
      const personLabel = person.charAt(0).toUpperCase() + person.slice(1);

      // Upload source file
      const sourcePath = `data/${person}/source/${currentFile.name}`;
      await uploadToGitHub(sourcePath, currentFile.content, `Add source ${typeLabel} for ${personLabel}`);

      // Upload extraction file
      const extractionFilename = `${typeLabel}_Extraction_${personLabel}.html`;
      const extractionPath = `data/${person}/extraction/${extractionFilename}`;
      await uploadToGitHub(extractionPath, extractionHtml, `Add ${typeLabel} extraction for ${personLabel}`);

      showStatus(uploadStatus, `Fichiers stockés sur GitHub avec succès !`, 'success');
    } catch (err) {
      console.error('GitHub upload error:', err);
      showStatus(uploadStatus, `Erreur GitHub : ${err.message}`, 'error');
    } finally {
      btnStore.disabled = false;
    }
  }

  // =====================
  // FILE LISTING
  // =====================
  async function loadFiles() {
    const config = getConfig();
    if (!config.token) {
      showStatus(filesStatus, 'Configurez votre token GitHub d\'abord.', 'error');
      return;
    }

    showStatus(filesStatus, 'Chargement...', 'info');

    try {
      // List data/ directory
      let dataContents;
      try {
        dataContents = await githubApi('GET', 'data');
      } catch (e) {
        filesContainer.innerHTML = `<div class="empty-state"><div class="empty-icon">📂</div><p>Aucun fichier stocké pour le moment.</p></div>`;
        showStatus(filesStatus, '', '');
        filesStatus.classList.remove('visible');
        return;
      }

      if (!Array.isArray(dataContents)) {
        filesContainer.innerHTML = `<div class="empty-state"><div class="empty-icon">📂</div><p>Aucun fichier stocké pour le moment.</p></div>`;
        filesStatus.classList.remove('visible');
        return;
      }

      // Get person directories
      const personDirs = dataContents.filter(item => item.type === 'dir');
      if (personDirs.length === 0) {
        filesContainer.innerHTML = `<div class="empty-state"><div class="empty-icon">📂</div><p>Aucun fichier stocké pour le moment.</p></div>`;
        filesStatus.classList.remove('visible');
        return;
      }

      let allHtml = '';
      for (const dir of personDirs) {
        const personName = dir.name;
        const personLabel = personName.charAt(0).toUpperCase() + personName.slice(1);

        // Add to persons list if not already there
        if (!persons.includes(personName)) {
          persons.push(personName);
        }

        let files = [];

        // Get source files
        try {
          const sourceContents = await githubApi('GET', `data/${personName}/source`);
          if (Array.isArray(sourceContents)) {
            for (const f of sourceContents) {
              files.push({ name: f.name, type: 'source', path: f.path, downloadUrl: f.download_url, sha: f.sha });
            }
          }
        } catch (e) { /* no source dir */ }

        // Get extraction files
        try {
          const extractContents = await githubApi('GET', `data/${personName}/extraction`);
          if (Array.isArray(extractContents)) {
            for (const f of extractContents) {
              files.push({ name: f.name, type: 'extraction', path: f.path, downloadUrl: f.download_url, sha: f.sha });
            }
          }
        } catch (e) { /* no extraction dir */ }

        allHtml += `<div class="person-group">`;
        allHtml += `<div class="person-group-header"><h3>👤 ${esc(personLabel)}</h3><span>${files.length} fichier(s)</span></div>`;
        allHtml += `<div class="person-group-files">`;

        if (files.length === 0) {
          allHtml += `<div class="file-item"><span class="file-info" style="color:var(--text-muted)">Aucun fichier</span></div>`;
        } else {
          for (const f of files) {
            const badge = f.type === 'source'
              ? `<span class="file-type-badge source">Source</span>`
              : `<span class="file-type-badge extraction">Extraction</span>`;
            allHtml += `<div class="file-item">`;
            allHtml += `<div class="file-info">${badge}<span class="file-name-text">${esc(f.name)}</span></div>`;
            allHtml += `<div class="file-actions">`;
            allHtml += `<button class="btn btn-sm btn-icon" onclick="App.downloadFile('${esc(f.downloadUrl)}')" title="Télécharger">⬇</button>`;
            allHtml += `<button class="btn btn-sm btn-icon btn-danger" onclick="App.deleteFile('${esc(f.path)}','${f.sha}')" title="Supprimer">✕</button>`;
            allHtml += `</div></div>`;
          }
        }

        allHtml += `</div></div>`;
      }

      filesContainer.innerHTML = allHtml;
      savePersons();
      renderPersonSelect();
      filesStatus.classList.remove('visible');

    } catch (err) {
      console.error('Load files error:', err);
      showStatus(filesStatus, `Erreur : ${err.message}`, 'error');
    }
  }

  async function downloadFile(url) {
    if (!url) return;
    window.open(url, '_blank');
  }

  async function deleteFile(path, sha) {
    if (!confirm(`Supprimer ${path} ?`)) return;

    const config = getConfig();
    try {
      const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
      const resp = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `token ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Delete ${path}`,
          sha: sha
        })
      });

      if (!resp.ok) throw new Error(`Erreur ${resp.status}`);
      showStatus(filesStatus, 'Fichier supprimé.', 'success');
      loadFiles();
    } catch (err) {
      showStatus(filesStatus, `Erreur : ${err.message}`, 'error');
    }
  }

  // =====================
  // UI HELPERS
  // =====================
  function showStatus(el, msg, type) {
    if (!msg) {
      el.classList.remove('visible');
      return;
    }
    el.textContent = msg;
    el.className = `status-msg visible ${type}`;
  }

  function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // =====================
  // EVENTS
  // =====================
  function bindEvents() {
    // Config toggle
    btnConfig.addEventListener('click', () => {
      configSection.classList.toggle('visible');
    });

    btnSaveConfig.addEventListener('click', saveConfig);

    // Token toggle
    tokenToggle.addEventListener('click', () => {
      githubToken.type = githubToken.type === 'password' ? 'text' : 'password';
    });

    // Tab navigation
    $$('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const target = tab.dataset.tab;
        if (target === 'upload') {
          tabUpload.style.display = '';
          tabFiles.classList.remove('visible');
        } else {
          tabUpload.style.display = 'none';
          tabFiles.classList.add('visible');
          loadFiles();
        }
      });
    });

    // Person management
    btnAddPerson.addEventListener('click', () => {
      modalPerson.classList.add('visible');
      newPersonName.value = '';
      newPersonName.focus();
    });

    btnConfirmPerson.addEventListener('click', () => {
      const name = newPersonName.value.trim();
      if (name) {
        addPerson(name);
        modalPerson.classList.remove('visible');
      }
    });

    btnCancelPerson.addEventListener('click', () => {
      modalPerson.classList.remove('visible');
    });

    newPersonName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnConfirmPerson.click();
      if (e.key === 'Escape') btnCancelPerson.click();
    });

    // File drop zone
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        handleFile(fileInput.files[0]);
      }
    });

    // Actions
    btnExtract.addEventListener('click', doExtract);
    btnDownload.addEventListener('click', doDownload);
    btnStore.addEventListener('click', doStore);
    btnRefreshFiles.addEventListener('click', loadFiles);

    // Close modal on overlay click
    modalPerson.addEventListener('click', (e) => {
      if (e.target === modalPerson) modalPerson.classList.remove('visible');
    });
  }

  // =====================
  // PUBLIC API (for inline onclick handlers)
  // =====================
  window.App = {
    downloadFile,
    deleteFile
  };

  // =====================
  // BOOT
  // =====================
  document.addEventListener('DOMContentLoaded', init);
})();
