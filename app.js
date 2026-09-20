// ══════════════════════════════════════
// TIPOS DE INTERVENÇÃO
// ══════════════════════════════════════
const TIPOS=[
  {id:'ac',l:'A/C',i:'❄️'},
  {id:'bateria',l:'Bateria',i:'🔋'},
  {id:'correiadist',l:'Correia Distibuição',i:'⚙️'},
  {id:'filtrocombo',l:'Filtro Combustível',i:'🌀'},
  {id:'filtroleo',l:'Filtro Óleo',i:'🌀'},
  {id:'filtrohabi',l:'Filtro Habitáculo',i:'🌀'},
  {id:'inspecao',l:'Inspeção',i:'🔍'},
  {id:'lavagem',l:'Lavagem',i:'🧼'},
  {id:'luzes',l:'Luzes',i:'💡'},
  {id:'oleo',l:'Óleo',i:'🛢️'},
  {id:'outro',l:'Outro',i:'🔧'},
  {id:'pneus',l:'Pneus',i:'⚫'},
  {id:'travoes',l:'Travões',i:'🔴'},
  {id:'revisao',l:'Revisão',i:'📋'},
  {id:'seguro',l:'Seguro',i:'🛡️'}
];

// ══════════════════════════════════════
// BASE DE DADOS — localStorage
// ══════════════════════════════════════
let DB = {cars:[], records:[]};

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[char]);
}

function jsString(value) {
  return escapeHTML(JSON.stringify(String(value ?? '')));
}

function validDB(data) {
  return data && Array.isArray(data.cars) && Array.isArray(data.records);
}

function loadDB() {
  try {
    const s = localStorage.getItem('autolog_v2');
    if(s) {
      const parsed = JSON.parse(s);
      if(validDB(parsed)) DB = parsed;
    }
  } catch(e) { DB = {cars:[], records:[]}; }
}
function saveDB() {
  localStorage.setItem('autolog_v2', JSON.stringify(DB));
  flashSave();
}
function flashSave() {
  const d = document.getElementById('saveDot');
  d.classList.add('saved');
  setTimeout(()=>d.classList.remove('saved'), 1200);
}

// ══════════════════════════════════════
// EXPORT / IMPORT JSON
// ══════════════════════════════════════
function exportJSON() {
  const json = JSON.stringify(DB, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'autolog_' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Ficheiro exportado!','ok');
}

function importJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if(!validDB(parsed)) throw new Error('Formato inválido');
        if(!confirm(`Importar ${parsed.cars.length} carro(s) e ${parsed.records.length} registo(s)?\nOs dados actuais serão substituídos.`)) return;
        DB = parsed;
        saveDB();
        renderCars(); renderRegs(); renderSum();
        toast('Dados importados com sucesso!','ok');
      } catch(err) {
        toast('Ficheiro inválido','err');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function clearAll() {
  if(!confirm('Apagar TODOS os carros e registos?\nEsta acção não pode ser desfeita.')) return;
  DB = {cars:[], records:[]};
  saveDB(); renderCars(); renderRegs(); renderSum();
  toast('Dados apagados','err');
}

// ══════════════════════════════════════
// GOOGLE DRIVE — OAuth2 + Drive API
// ══════════════════════════════════════
const GDRIVE_CLIENT_ID = '853627522281-duuvpar60nh0blqlgrdad13dt6vegl5h.apps.googleusercontent.com';
const GDRIVE_SCOPE     = 'https://www.googleapis.com/auth/drive.file profile email';
const GDRIVE_FILE_NAME = 'autolog_backup.json';

let gToken      = null;  // access token
let gFileId     = null;  // Drive file ID (se já existe)
let gUserInfo   = null;

// Carregar token guardado
(function loadGToken() {
  try {
    const saved = localStorage.getItem('gdrive_token');
    if(saved) {
      const t = JSON.parse(saved);
      // Verificar se não expirou (tokens duram 1h)
      if(t.expires_at && Date.now() < t.expires_at) {
        gToken = t.access_token;
        gFileId = t.file_id || null;
        fetchUserInfo();
      } else {
        localStorage.removeItem('gdrive_token');
      }
    }
  } catch(e) {}
})();

function gdriveLogin() {
  const params = new URLSearchParams({
    client_id:     GDRIVE_CLIENT_ID,
    redirect_uri:  location.origin + location.pathname,
    response_type: 'token',
    scope:         GDRIVE_SCOPE,
    include_granted_scopes: 'true',
    state: 'gdrive_auth'
  });
  location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params;
}

function gdriveLogout() {
  gToken = null; gFileId = null; gUserInfo = null;
  localStorage.removeItem('gdrive_token');
  renderGDriveUI(false);
  toast('Conta Google desligada','');
}

// Tratar redirect OAuth (hash com access_token)
(function handleOAuthRedirect() {
  const hash = location.hash.substring(1);
  if(!hash.includes('access_token')) return;
  const params = new URLSearchParams(hash);
  if(params.get('state') !== 'gdrive_auth') return;
  gToken = params.get('access_token');
  const expiresIn = parseInt(params.get('expires_in') || '3600');
  // Guardar token
  const toSave = {
    access_token: gToken,
    expires_at: Date.now() + (expiresIn - 60) * 1000,
    file_id: null
  };
  localStorage.setItem('gdrive_token', JSON.stringify(toSave));
  // Limpar hash do URL
  history.replaceState(null, '', location.pathname);
  // Ir para tab backup
  fetchUserInfo();
  showPage('backup', document.querySelector('.btn-backup'));
  toast('Conta Google ligada!','ok');
})();

async function fetchUserInfo() {
  if(!gToken) return;
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + gToken }
    });
    if(!r.ok) { gdriveLogout(); return; }
    gUserInfo = await r.json();
    renderGDriveUI(true);
    // Procurar ficheiro existente no Drive
    findDriveFile();
  } catch(e) { renderGDriveUI(false); }
}

// Utilitário XHR para compatibilidade máxima mobile
function xhrRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    Object.entries(headers).forEach(([k,v]) => xhr.setRequestHeader(k, v));
    xhr.timeout = 15000;
    xhr.onload = () => resolve({ status: xhr.status, ok: xhr.status >= 200 && xhr.status < 300, text: xhr.responseText });
    xhr.onerror = () => reject(new Error('Erro de rede (XHR)'));
    xhr.ontimeout = () => reject(new Error('Timeout'));
    xhr.send(body || null);
  });
}

async function findDriveFile() {
  if(!gToken) return;
  try {
    const q = encodeURIComponent("name='" + GDRIVE_FILE_NAME + "' and trashed=false");
    const r = await xhrRequest('GET',
      'https://www.googleapis.com/drive/v3/files?q=' + q + '&fields=files(id,name,modifiedTime)',
      { 'Authorization': 'Bearer ' + gToken }
    );
    const data = JSON.parse(r.text);
    if(data.files && data.files.length > 0) {
      gFileId = data.files[0].id;
      const mod = new Date(data.files[0].modifiedTime);
      document.getElementById('gdrive-last').textContent =
        'Último backup: ' + mod.toLocaleDateString('pt-PT') + ' às ' + mod.toLocaleTimeString('pt-PT', {hour:'2-digit',minute:'2-digit'});
      try {
        const t = JSON.parse(localStorage.getItem('gdrive_token') || '{}');
        t.file_id = gFileId;
        localStorage.setItem('gdrive_token', JSON.stringify(t));
      } catch(e){}
    } else {
      document.getElementById('gdrive-last').textContent = 'Ainda sem backup no Drive.';
    }
  } catch(e) {
    document.getElementById('gdrive-last').textContent = 'Não foi possível verificar o Drive.';
  }
}

async function gdriveSave() {
  if(!gToken) { toast('Liga a conta Google primeiro','err'); return; }
  toast('A guardar no Drive…','');
  const json = JSON.stringify(DB, null, 2);
  try {
    let r;
    if(gFileId) {
      // Actualizar ficheiro existente
      r = await xhrRequest('PATCH',
        'https://www.googleapis.com/upload/drive/v3/files/' + gFileId + '?uploadType=media',
        { 'Authorization': 'Bearer ' + gToken, 'Content-Type': 'application/json' },
        json
      );
    } else {
      // Criar ficheiro novo via multipart manual
      const boundary = 'autolog_boundary_' + Date.now();
      const meta = JSON.stringify({ name: GDRIVE_FILE_NAME, mimeType: 'application/json' });
      const body = '--' + boundary + '\r\n'
        + 'Content-Type: application/json; charset=UTF-8\r\n\r\n'
        + meta + '\r\n'
        + '--' + boundary + '\r\n'
        + 'Content-Type: application/json\r\n\r\n'
        + json + '\r\n'
        + '--' + boundary + '--';
      r = await xhrRequest('POST',
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
        { 'Authorization': 'Bearer ' + gToken, 'Content-Type': 'multipart/related; boundary=' + boundary },
        body
      );
      if(r.ok) {
        const created = JSON.parse(r.text);
        gFileId = created.id;
        try {
          const t = JSON.parse(localStorage.getItem('gdrive_token') || '{}');
          t.file_id = gFileId;
          localStorage.setItem('gdrive_token', JSON.stringify(t));
        } catch(e){}
      }
    }
    if(r.ok) {
      const now = new Date();
      document.getElementById('gdrive-last').textContent =
        'Último backup: ' + now.toLocaleDateString('pt-PT') + ' às ' + now.toLocaleTimeString('pt-PT', {hour:'2-digit',minute:'2-digit'});
      toast('Guardado no Google Drive!','ok');
    } else {
      let errMsg = 'Erro ' + r.status;
      try {
        const errData = JSON.parse(r.text);
        if(errData.error && errData.error.code === 401) {
          gdriveLogout(); toast('Sessão expirada — liga novamente','err'); return;
        }
        if(errData.error && errData.error.message) errMsg = errData.error.message;
      } catch(e){}
      toast(errMsg,'err');
    }
  } catch(e) {
    toast('Erro: ' + e.message,'err');
  }
}

async function gdriveLoad() {
  if(!gToken) { toast('Liga a conta Google primeiro','err'); return; }
  if(!gFileId) { toast('Sem backup no Drive ainda','err'); return; }
  if(!confirm('Restaurar dados do Google Drive?\nOs dados actuais serão substituídos.')) return;
  toast('A carregar do Drive…','');
  try {
    const r = await xhrRequest('GET',
      'https://www.googleapis.com/drive/v3/files/' + gFileId + '?alt=media',
      { 'Authorization': 'Bearer ' + gToken }
    );
    if(!r.ok) { toast('Erro ' + r.status + ' ao carregar','err'); return; }
    const parsed = JSON.parse(r.text);
    if(!validDB(parsed)) { toast('Ficheiro inválido','err'); return; }
    DB = parsed;
    saveDB(); renderCars(); renderRegs(); renderSum();
    toast('Dados restaurados do Drive!','ok');
  } catch(e) {
    toast('Erro: ' + e.message,'err');
  }
}

function renderGDriveUI(loggedIn) {
  const loginBtn  = document.getElementById('btn-gdrive-login');
  const userPanel = document.getElementById('gdrive-user');
  const status    = document.getElementById('gdrive-status');
  if(loggedIn && gUserInfo) {
    loginBtn.style.display  = 'none';
    userPanel.style.display = 'block';
    status.textContent = 'Conta ligada. Os dados ficam no teu Drive pessoal.';
    document.getElementById('gdrive-name').textContent  = gUserInfo.name  || '';
    document.getElementById('gdrive-email').textContent = gUserInfo.email || '';
    if(gUserInfo.picture) {
      const img = document.getElementById('gdrive-avatar');
      img.src = gUserInfo.picture;
      img.style.display = 'block';
    }
  } else {
    loginBtn.style.display  = 'inline-flex';
    userPanel.style.display = 'none';
    status.textContent = 'Liga a tua conta Google para fazer backup no Drive.';
  }
}

// ══════════════════════════════════════
// NAV
// ══════════════════════════════════════
let activePage = 'carros';
function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('on'));
  document.getElementById('page-'+id).classList.add('on');
  if(btn) btn.classList.add('on');
  activePage = id;
  if(id==='registos') renderRegs();
  if(id==='resumo')   renderSum();
  if(id==='carros')   renderCars();
}

// ══════════════════════════════════════
// MODAIS
// ══════════════════════════════════════
function openM(id, preCarId=null, record=null) {
  if(id==='m-rec') prepRec(preCarId, record);
  document.getElementById(id).classList.add('on');
}
function closeM(id) { document.getElementById(id).classList.remove('on'); }
document.querySelectorAll('.ov').forEach(o=>{
  o.addEventListener('click', e=>{ if(e.target===o) o.classList.remove('on'); });
});

// ══════════════════════════════════════
// CARROS
// ══════════════════════════════════════
function addCar() {
  const model = document.getElementById('c-model').value.trim();
  if(!model) { toast('Introduz o modelo','err'); return; }
  DB.cars.push({
    id: Date.now().toString(),
    model,
    year:  document.getElementById('c-year').value.trim(),
    color: document.getElementById('c-color').value.trim()
  });
  saveDB(); closeM('m-car');
  ['c-model','c-year','c-color'].forEach(i=>document.getElementById(i).value='');
  renderCars();
  toast('Carro adicionado!','ok');
}

function deleteCar(id, e) {
  e.stopPropagation();
  const car = DB.cars.find(c=>c.id===id);
  const n = DB.records.filter(r=>r.carId===id).length;
  if(!confirm(`Eliminar ${car.model}?\n${n} registo(s) serão apagados.`)) return;
  DB.cars    = DB.cars.filter(c=>c.id!==id);
  DB.records = DB.records.filter(r=>r.carId!==id);
  saveDB(); renderCars();
  toast('Carro eliminado','err');
}

function renderCars() {
  const el = document.getElementById('car-list');
  if(!DB.cars.length) {
    el.innerHTML = `<div class="empty"><div class="empty-ico">🚗</div><div class="empty-t">Sem carros</div><p>Adiciona o teu primeiro carro abaixo</p></div>`;
    return;
  }
  el.innerHTML = DB.cars.map(car => {
    const recs  = DB.records.filter(r=>r.carId===car.id);
    const total = recs.reduce((s,r)=>s+(parseFloat(r.cost)||0), 0);
    const last  = [...recs].sort((a,b)=>b.date.localeCompare(a.date))[0];
    return `
    <div class="card car-card" onclick="showDet(${jsString(car.id)})">
      <button class="xbtn" onclick="deleteCar(${jsString(car.id)},event)">✕</button>
      <div class="plate" style="font-size:18px;letter-spacing:1px">${escapeHTML(car.model)}</div>
      ${(car.year||car.color)?`<div class="year-color">${escapeHTML([car.year,car.color].filter(Boolean).join(' · '))}</div>`:''}
      <div class="car-stats">
        <div class="cstat"><span class="cstat-val">${recs.length}</span><span class="cstat-lbl">Registos</span></div>
        <div class="cstat"><span class="cstat-val">${fEur(total)}</span><span class="cstat-lbl">Gasto</span></div>
        <div class="cstat"><span class="cstat-val">${last?escapeHTML(fKm(last.km)):'—'}</span><span class="cstat-lbl">Último km</span></div>
        <div class="cstat"><span class="cstat-val">${last?escapeHTML(fDate(last.date)):'—'}</span><span class="cstat-lbl">Data</span></div>
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════
// REGISTOS
// ══════════════════════════════════════
let selTipos = new Set();
let activeFilt = null;
let editingRecId = null;

function prepRec(preCarId=null, record=null) {
  const sel = document.getElementById('r-car');
  sel.innerHTML = DB.cars.map(c=>`<option value="${escapeHTML(c.id)}"${c.id===preCarId?' selected':''}>${escapeHTML(c.model)}${c.year?' ('+escapeHTML(c.year)+')':''}</option>`).join('');
  if(!DB.cars.length) sel.innerHTML = '<option value="">Adiciona um carro primeiro</option>';
  editingRecId = record?.id || null;
  document.getElementById('rec-modal-title').textContent = record ? 'Editar Registo' : 'Novo Registo';
  document.getElementById('rec-save-btn').textContent = record ? 'Guardar Alterações' : 'Guardar Registo';
  document.getElementById('r-date').value = record?.date || new Date().toISOString().slice(0,10);
  document.getElementById('r-km').value = record?.km ?? '';
  document.getElementById('r-cost').value = record?.cost ?? '';
  document.getElementById('r-notes').value = record?.notes ?? '';
  const typeIds = record ? recordTypeIds(record) : [];
  const typeNames = record ? recordTypeNames(record) : [];
  document.getElementById('r-custom').value = typeIds.includes('outro')
    ? typeNames[typeIds.indexOf('outro')] || ''
    : '';
  selTipos = new Set(typeIds); renderChips();
}
function renderChips() {
  document.getElementById('tchips').innerHTML = TIPOS.map(t=>`
    <button class="chip${selTipos.has(t.id)?' on':''}" onclick="pickTipo('${t.id}')">${t.i} ${t.l}</button>
  `).join('');
  document.getElementById('cfg').style.display = selTipos.has('outro')?'block':'none';
}
function pickTipo(id) {
  if(selTipos.has(id)) selTipos.delete(id);
  else selTipos.add(id);
  renderChips();
}

function recordTypeNames(record) {
  const names = Array.isArray(record.typeNames) ? record.typeNames : [record.typeName];
  return names.filter(Boolean).map(String);
}

function recordTypeIds(record) {
  const types = Array.isArray(record.types) ? record.types : [record.type];
  return types.filter(Boolean).map(String);
}

function addRec() {
  const carId = document.getElementById('r-car').value;
  const date  = document.getElementById('r-date').value;
  if(!carId || !DB.cars.find(c=>c.id===carId)) { toast('Seleciona um carro','err'); return; }
  if(!date)  { toast('Indica a data','err'); return; }
  if(!selTipos.size) { toast('Escolhe pelo menos um tipo de intervenção','err'); return; }
  const types = [...selTipos];
  const typeNames = types.map(type => type==='outro'
    ? (document.getElementById('r-custom').value.trim() || 'Outro')
    : TIPOS.find(t=>t?.id===type)?.l || type);
  const record = {
    id: editingRecId || Date.now().toString(), carId, date,
    km:   document.getElementById('r-km').value,
    cost: document.getElementById('r-cost').value,
    types, typeNames,
    type: types[0], typeName: typeNames.join(' · '),
    notes: document.getElementById('r-notes').value.trim()
  };
  if(editingRecId) {
    const index = DB.records.findIndex(r=>r.id===editingRecId);
    if(index === -1) { toast('Registo não encontrado','err'); return; }
    DB.records[index] = record;
  } else {
    DB.records.push(record);
  }
  saveDB(); closeM('m-rec');
  renderCars(); renderRegs();
  toast(editingRecId ? 'Registo actualizado!' : 'Registo guardado!','ok');
}

function editRec(id) {
  const record = DB.records.find(r=>r.id===id);
  if(!record) { toast('Registo não encontrado','err'); return; }
  openM('m-rec', record.carId, record);
}

function deleteRec(id) {
  if(!confirm('Eliminar este registo?')) return;
  DB.records = DB.records.filter(r=>r.id!==id);
  saveDB(); renderCars(); renderRegs();
  toast('Registo eliminado','err');
}

function renderRegs() {
  // Filter bar
  const usedCars = [...new Set(DB.records.map(r=>r.carId))]
    .map(id=>DB.cars.find(c=>c.id===id)).filter(Boolean);
  document.getElementById('fbar').innerHTML =
    `<button class="chip${!activeFilt?' on':''}" onclick="setFilt(null)">Todos</button>` +
    usedCars.map(c=>`<button class="chip${activeFilt===c.id?' on':''}" onclick="setFilt(${jsString(c.id)})">${escapeHTML(c.model)}</button>`).join('');

  let recs = [...DB.records].sort((a,b)=>b.date.localeCompare(a.date));
  if(activeFilt) recs = recs.filter(r=>r.carId===activeFilt);

  const el = document.getElementById('rec-list');
  if(!recs.length) {
    el.innerHTML = `<div class="empty"><div class="empty-ico">🔧</div><div class="empty-t">Sem registos</div><p>Toca em + para adicionar</p></div>`;
    return;
  }
  el.innerHTML = recs.map(r=>recHTML(r)).join('');
}
function setFilt(id) { activeFilt=id; renderRegs(); }

function recHTML(r) {
  const car = DB.cars.find(c=>c.id===r.carId);
  const t   = TIPOS.find(t=>t?.id===recordTypeIds(r)[0])||{i:'🔧'};
  const names = recordTypeNames(r);
  return `<div class="rec">
    <div class="rec-ico">${t.i}</div>
    <div class="rec-body">
      <div class="rec-type">${escapeHTML(names.join(' · '))}</div>
      <div class="rec-meta">${escapeHTML(fDate(r.date))}${car?' · '+escapeHTML(car.model):''}</div>
      ${r.notes?`<div class="rec-note">${escapeHTML(r.notes)}</div>`:''}
    </div>
    <div class="rec-right">
      <div class="rec-cost">${r.cost?fEur(parseFloat(r.cost)):'—'}</div>
      <div class="rec-km">${r.km?escapeHTML(fKm(r.km)):'—'}</div>
    </div>
    <div class="rec-actions">
      <button class="btn btn-g" onclick="editRec(${jsString(r.id)})">✎ Editar</button>
      <button class="btn btn-d rec-delete" onclick="deleteRec(${jsString(r.id)})">Eliminar</button>
    </div>
  </div>`;
}

// ══════════════════════════════════════
// DETALHE CARRO
// ══════════════════════════════════════
function showDet(carId) {
  const car  = DB.cars.find(c=>c.id===carId);
  if(!car) return;
  const recs = [...DB.records.filter(r=>r.carId===carId)].sort((a,b)=>b.date.localeCompare(a.date));
  const tot  = recs.reduce((s,r)=>s+(parseFloat(r.cost)||0),0);
  document.getElementById('det-hdr').innerHTML = `
    <div style="margin-bottom:14px">
      <div class="plate" style="font-size:18px;letter-spacing:1px">${escapeHTML(car.model)}${car.year?' · '+escapeHTML(car.year):''}</div>
      ${car.color?`<div class="year-color">${escapeHTML(car.color)}</div>`:''}
      <div style="font-size:12px;color:var(--sub);margin-top:6px">${recs.length} registos · ${fEur(tot)} total</div>
    </div>`;
  document.getElementById('det-add-btn').onclick = ()=>{ closeM('m-det'); openM('m-rec', carId); };
  const listEl = document.getElementById('det-recs');
  listEl.innerHTML = recs.length
    ? recs.map(r=>recHTML(r)).join('')
    : `<div class="empty" style="padding:24px 0"><div class="empty-ico">📋</div><div class="empty-t">Sem registos</div></div>`;
  openM('m-det');
}

function summaryTypeEntries(records) {
  const entries = {};
  records.forEach(record => {
    const ids = recordTypeIds(record);
    const names = recordTypeNames(record);
    ids.forEach((id, index) => {
      const name = names[index] || TIPOS.find(type => type.id === id)?.l || id;
      // "Outro" pode ter uma descri\u00e7\u00e3o pr\u00f3pria; cada descri\u00e7\u00e3o aparece separadamente.
      const key = `${encodeURIComponent(id)}|${encodeURIComponent(name)}`;
      if(!entries[key]) entries[key] = {key, id, name, count:0};
      entries[key].count++;
    });
  });
  return Object.values(entries);
}

function showTypeDetails(carId, typeKey) {
  const car = DB.cars.find(c => c.id === carId);
  if(!car) return;
  const [encodedId, encodedName] = String(typeKey).split('|');
  const typeId = decodeURIComponent(encodedId || '');
  const typeName = decodeURIComponent(encodedName || '');
  const records = DB.records
    .filter(record => record.carId === carId)
    .filter(record => recordTypeIds(record).some((id, index) =>
      id === typeId && (recordTypeNames(record)[index] || TIPOS.find(type => type.id === id)?.l || id) === typeName
    ))
    .sort((a,b) => b.date.localeCompare(a.date));

  document.getElementById('type-det-title').textContent = typeName;
  document.getElementById('type-det-subtitle').textContent = `${car.model} · ${records.length} registo${records.length === 1 ? '' : 's'}`;
  document.getElementById('type-det-list').innerHTML = records.map(record => `
    <div class="type-det-rec">
      <div class="type-det-meta">
        <span>${escapeHTML(fDate(record.date))}</span>
        <span class="type-det-km">${record.km ? escapeHTML(fKm(record.km)) : '—'}</span>
      </div>
      <div class="type-det-note">${record.notes ? escapeHTML(record.notes) : 'Sem observações.'}</div>
    </div>`).join('') || '<div class="empty" style="padding:24px 0"><div class="empty-t">Sem registos</div></div>';
  openM('m-type-det');
}

// ══════════════════════════════════════
// RESUMO
// ══════════════════════════════════════
function renderSum() {
  const total = DB.records.reduce((s,r)=>s+(parseFloat(r.cost)||0),0);
  const freq  = {};
  DB.records.forEach(r=>recordTypeNames(r).forEach(name=>{ freq[name]=(freq[name]||0)+1; }));
  const top = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';

  document.getElementById('sgrid').innerHTML = `
    <div class="scard"><div class="slbl">Carros</div><div class="sval">${DB.cars.length}</div></div>
    <div class="scard"><div class="slbl">Registos</div><div class="sval">${DB.records.length}</div></div>
    <div class="scard" style="grid-column:1/-1">
      <div class="slbl">Total Gasto</div>
      <div class="sval" style="font-size:32px">${fEur(total)}</div>
      <div class="ssub">em todas as intervenções</div>
    </div>
    <div class="scard" style="grid-column:1/-1">
      <div class="slbl">Mais Frequente</div>
      <div class="sval" style="font-size:22px">${escapeHTML(top)}</div>
    </div>`;

  document.getElementById('car-sum').innerHTML = DB.cars.map(car=>{
    const recs = DB.records.filter(r=>r.carId===car.id);
    const tot  = recs.reduce((s,r)=>s+(parseFloat(r.cost)||0),0);
    const byT = summaryTypeEntries(recs);
    return `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><div class="plate" style="font-size:17px">${escapeHTML(car.model)}${car.year?' · '+escapeHTML(car.year):''}</div></div>
        <div style="text-align:right">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--a)">${fEur(tot)}</div>
          <div style="font-size:11px;color:var(--sub)">${recs.length} registos</div>
        </div>
      </div>
      ${byT.length?`<div style="margin-top:10px">${byT.sort((a,b)=>b.count-a.count).map(type=>`<button class="badge type-badge" onclick="showTypeDetails(${jsString(car.id)},${jsString(type.key)})" aria-label="Ver registos de ${escapeHTML(type.name)}">${escapeHTML(type.name)} ×${type.count}</button>`).join('')}</div>`:''}
    </div>`;
  }).join('') || '<div class="empty"><div class="empty-t">Sem dados</div></div>';
}

// ══════════════════════════════════════
// TOAST
// ══════════════════════════════════════
let toastTimer;
function toast(msg, type='') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (type?' '+type:'');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove('show'), 2400);
}

// ══════════════════════════════════════
// FORMATAÇÃO
// ══════════════════════════════════════
function fDate(d) {
  if(!d) return '—';
  const [y,m,dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}
function fKm(k) { return Number(k).toLocaleString('pt-PT')+' km'; }
function fEur(v) { return Number(v).toLocaleString('pt-PT',{style:'currency',currency:'EUR'}); }

// ══════════════════════════════════════
// ARRANQUE
// ══════════════════════════════════════
loadDB();
renderRegs();
