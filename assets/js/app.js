// â”€â”€ POPUP ELEMENT
let _pp = null;
let _ppTimer = null;
const PORTAL_THEMES = Object.freeze({
  default: '',
  'gov-command': 'assets/css/theme-gov-command.css',
  'digital-india': 'assets/css/theme-digital-india.css',
  'control-room': 'assets/css/theme-control-room.css',
  'executive-light': 'assets/css/theme-executive-light.css'
});
const ASSET_VERSION = '20260713-data-refresh';

function setPortalTheme(themeName) {
  const theme = PORTAL_THEMES[themeName] !== undefined ? themeName : 'default';
  const link = document.getElementById('themeStylesheet');
  if (link) {
    const href = PORTAL_THEMES[theme];
    link.setAttribute('href', href ? `${href}?v=${ASSET_VERSION}` : '');
  }
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('rlp_theme', theme);
  const sel = document.getElementById('themeSelect');
  if (sel && sel.value !== theme) sel.value = theme;
}

function initPortalTheme() {
  setPortalTheme('digital-india');
}

function setBlockStyle(styleName) {
  const style = styleName === 'raised' ? 'raised' : 'flat';
  document.documentElement.setAttribute('data-block-style', style);
  localStorage.setItem('rlp_block_style', style);
  const sel = document.getElementById('blockStyleSelect');
  if (sel && sel.value !== style) sel.value = style;
}

function initBlockStyle() {
  setBlockStyle('raised');
}

function initPopup() {
  if (_pp) return; // already initialised
  _pp = document.createElement('div');
  _pp.id='puPopup';
  _pp.style.cssText='position:fixed;z-index:9999;pointer-events:none;background:#fff;border:1px solid #C0D4F0;border-radius:8px;padding:0;box-shadow:0 8px 32px rgba(10,22,40,.20),0 2px 8px rgba(10,22,40,.10);min-width:270px;max-width:320px;opacity:0;transform:translateY(6px);transition:opacity .15s,transform .15s;font-size:11px;color:#0A1628;overflow:hidden';
  document.body.appendChild(_pp);
  _pp.addEventListener('mouseenter', function(){ clearTimeout(_ppTimer); });
  _pp.addEventListener('mouseleave', hidePUPopup);
}

// â”€â”€ LOGIN SYSTEM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AUTH_DIGESTS = Object.freeze({
  ADMIN: 'b8824be5a97f2673f084e8d91336ffa24752344e361e9f25655e70aeeb12d104'
});
let _pendingUploadAfterLogin = false;

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

async function doLogin() {
  const user = 'ADMIN';
  const pwd  = document.getElementById('loginPwd').value;
  const err  = document.getElementById('loginErr');
  const digest = await sha256Hex(`${user}:${pwd}`);
  if (AUTH_DIGESTS[user] !== digest) {
    err.textContent = 'Incorrect ADMIN password. Upload access not allowed.';
    document.getElementById('loginPwd').value = '';
    setTimeout(()=>err.textContent='', 3000);
    return;
  }
  sessionStorage.setItem('rlp_upload_admin', '1');
  const shouldOpenUpload = _pendingUploadAfterLogin;
  _pendingUploadAfterLogin = false;
  closeUploadLogin();
  if (shouldOpenUpload) {
    switchTab('upload');
  }
}

function restoreLoginSession() {
  const overlay = document.getElementById('loginOverlay');
  if (overlay) overlay.classList.add('hidden');
  const uploadTab = document.getElementById('uploadTab');
  if (uploadTab) uploadTab.style.display = '';
  const uploadMenuBtn = document.getElementById('uploadMenuBtn');
  if (uploadMenuBtn) uploadMenuBtn.style.display = '';
}

function isUploadAdminUnlocked() {
  return sessionStorage.getItem('rlp_upload_admin') === '1';
}

function requestUploadAdmin() {
  _pendingUploadAfterLogin = true;
  const overlay = document.getElementById('loginOverlay');
  const pwd = document.getElementById('loginPwd');
  const err = document.getElementById('loginErr');
  if (err) err.textContent = '';
  if (pwd) pwd.value = '';
  if (overlay) overlay.classList.remove('hidden');
  setTimeout(() => { if (pwd) pwd.focus(); }, 60);
}

function closeUploadLogin() {
  _pendingUploadAfterLogin = false;
  const overlay = document.getElementById('loginOverlay');
  const pwd = document.getElementById('loginPwd');
  const err = document.getElementById('loginErr');
  if (overlay) overlay.classList.add('hidden');
  if (pwd) pwd.value = '';
  if (err) err.textContent = '';
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MASTER DATA - from uploaded files (figures in Rs '000s)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const PU_META = [
  {code:'01',desc:'Sal/Wag',puType:'Staff PU',liab:'Committed',isNeg:false},
  {code:'02',desc:'DA',puType:'Staff PU',liab:'Committed',isNeg:false},
  {code:'03',desc:'PLB',puType:'Staff PU',liab:'Committed',isNeg:false},
  {code:'04',desc:'HRA',puType:'Staff PU',liab:'Committed',isNeg:false},
  {code:'07',desc:'Transport Allowance /TPT',puType:'Staff PU',liab:'Committed',isNeg:false},
  {code:'08',desc:'NPS Contribution',puType:'Staff PU',liab:'Committed',isNeg:false},
  {code:'09',desc:'WCL',puType:'Staff PU',liab:'Committed',isNeg:false},
  {code:'10',desc:'Kilometrage Allowance (KMA)',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'11',desc:'OT',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'12',desc:'NDA',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'13',desc:'Other Allowance',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'14',desc:'FEES & HON.',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'15',desc:'Travalling Allowance/TA',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'16',desc:'Travelling expenses./CTG',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'17',desc:'Air Travel Expense sanctioned in lieu of privilege passes.',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'18',desc:'Office Expenses',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'19',desc:'Phone',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'20',desc:'Leave Salary',puType:'Staff PU',liab:'Committed',isNeg:false},
  {code:'21',desc:'Advertising Expenses',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'22',desc:'Util(excl. elec.)',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'23',desc:'Rental Office Equip',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'24',desc:'Printing and Stnry',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'25',desc:'Children Edu. Allow',puType:'Staff PU',liab:'Committed',isNeg:false},
  {code:'26',desc:'Medical Expenses',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'27',desc:'Materials from stock',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'28',desc:'Materials-Dir. purchase',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'29',desc:'Remu. Re-engaged Staff',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'30',desc:'Cost Of Elec. Energy/Traction Energy Procurement',puType:'Non Staff PU',liab:'Committed',isNeg:false},
  {code:'31',desc:'Direct Purchase',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'32',desc:'Contractual payments',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'33',desc:'Transfer of debits/credits from other units',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'34',desc:'Intra-railway adjustment of wages on POH and other repairs',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'35',desc:'Material POH',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'36',desc:'Excise Duty',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'37',desc:'Customs Duty',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'38',desc:'Sales Tax',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'39',desc:'ATD',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'40',desc:'ATF',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'41',desc:'VAT',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'42',desc:'ARR SALARY',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'43',desc:'ARR DA',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'44',desc:'ARR OTH ALW',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'45',desc:'Pmt Of Service Tax',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'46',desc:'Counter-vailing duty',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'47',desc:'Addl custom duty',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'48',desc:'Custom Duty paid',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'49',desc:'O/S OF MAN POWER FOR TRACK MNT',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'51',desc:'COMPCONSUM',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'52',desc:'Laptop',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'53',desc:'All India LTC',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'54',desc:'Int on delayed NPS',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'60',desc:'Fuel from Stock-Home',puType:'Non Staff PU',liab:'Committed',isNeg:false},
  {code:'61',desc:'Trf Dr/Cr of loco performance',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'63',desc:'Adj of labour cost on POH/WMS',puType:'Staff PU',liab:'Planned',isNeg:false},
  {code:'64',desc:'Int Rly Adj debits materials',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'72',desc:'Central GST (CGST)',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'73',desc:'State GST (SGST)',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'74',desc:'Union Territory GST (UTGST)',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'75',desc:'Integrated GST (IGST)',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  {code:'99',desc:'Other Expenses/Misc',puType:'Non Staff PU',liab:'Planned',isNeg:false},
  // PU-98: Recoveries - kept in data for Recovery tab reference only
  {code:'98',desc:'Credit or Recoveries',puType:'Staff PU',liab:'Recovery',isNeg:true},
];

const SKIPPED_DISPLAY_PUS = new Set(['72','73','74','75']);
const IMPORTANT_PUS = new Set(['27','28','30','32','60']);
function normPUCode(code) {
  return String(code == null ? '' : code).trim().padStart(2, '0');
}
function isSkippedDisplayPU(code) {
  return SKIPPED_DISPLAY_PUS.has(normPUCode(code));
}
function isImportantPU(code) {
  return IMPORTANT_PUS.has(normPUCode(code));
}
function puFocusMode() {
  return (document.getElementById('puFocusFilter') || {}).value || 'all';
}
function passesPUFocus(code) {
  return puFocusMode() !== 'important' || isImportantPU(code);
}
function isActiveDisplayPU(pu) {
  return !!pu && !pu.isNeg && !isSkippedDisplayPU(pu.code);
}
function activePUMeta() {
  return PU_META.filter(isActiveDisplayPU);
}

const SOURCE_REGISTER = {
  budgetCY: {label:'Current Year PU-wise Budget Available', fy:'2026-2027', source:'PU Wise 2026-2027 Budget.xls', used:'Revenue Liability, Month-wise Actuals, PU Master, Trend, BP Analysis'},
  monthCY: {label:'Current Year PU-wise Month-wise Actuals', fy:'2026-2027', source:'PU Wise Month Wise 2026-2027 Actual.xls', used:'Revenue Liability, Month-wise Actuals, Trend, AI Trend, BP Analysis'},
  budgetPY: {label:'Previous Year PU-wise Budget Available', fy:'2025-2026', source:'Pre-loaded Budget Available file (PY static portal data)', used:'Trend comparison and AI Trend comparison'},
  monthPY: {label:'Previous Year PU-wise Month-wise Actuals', fy:'2025-2026', source:'Pre-loaded Month-wise Actuals file (PY static portal data)', used:'Trend comparison and AI Trend comparison'},
  smhBudgetCY: {label:'DEPT-Demand Budget Available', fy:'2026-2027', source:'SMH-DEMAND Wise PU wise Dept wise Month Wise 2026-2027 Budget.xls', used:'DEPT-Demand Wise'},
  smhMonthCY: {label:'DEPT-Demand Month-wise Actuals', fy:'2026-2027', source:'SMH-DEMAND Wise PU wise Dept wise Month Wise 2026-2027 Actual.xls', used:'DEPT-Demand Wise'},
  demandSmhCY: {label:'Demand / SMH Grant Summary', fy:'2026-2027', source:'SMH-DEMAND Wise 2026-2027 Budget.xls + SMH-DEMAND WISE 2026-2027 ACTUAL.xls', used:'Demand / SMH Summary', remarks:'OBA = BG_ISL; BP = BG_ISL / 12 x completed actual months; AE = actuals up to JUL 2026 till-date. Demand 12N/10N Suspense Heads is shown separately.'}
};

// Budget data from BudgetReport (BG_ISL col, RG col) - Rs'000s
let BUDGET = {
  '10':{bg_isl:680197,rg:0,actuals_till:218804},
  '11':{bg_isl:77300,rg:0,actuals_till:43958},
  '12':{bg_isl:209913,rg:0,actuals_till:73688},
  '13':{bg_isl:527832,rg:0,actuals_till:116001},
  '14':{bg_isl:3566,rg:0,actuals_till:352},
  '15':{bg_isl:16048,rg:0,actuals_till:5394},
  '16':{bg_isl:308081,rg:0,actuals_till:130831},
  '17':{bg_isl:2110,rg:0,actuals_till:0},
  '18':{bg_isl:8252,rg:0,actuals_till:0},
  '19':{bg_isl:655,rg:0,actuals_till:0},
  '20':{bg_isl:18623,rg:0,actuals_till:8251},
  '21':{bg_isl:3300,rg:0,actuals_till:521},
  '22':{bg_isl:0,rg:0,actuals_till:0},
  '23':{bg_isl:42,rg:0,actuals_till:0},
  '24':{bg_isl:215,rg:0,actuals_till:0},
  '25':{bg_isl:379418,rg:0,actuals_till:318899},
  '26':{bg_isl:384392,rg:0,actuals_till:102246},
  '27':{bg_isl:1068752,rg:0,actuals_till:348025},
  '28':{bg_isl:149947,rg:0,actuals_till:42356},
  '29':{bg_isl:0,rg:0,actuals_till:124},
  '30':{bg_isl:3878724,rg:0,actuals_till:813838},
  '31':{bg_isl:95273,rg:0,actuals_till:15405},
  '32':{bg_isl:3254310,rg:0,actuals_till:955743},
  '33':{bg_isl:2625440,rg:0,actuals_till:351700},
  '36':{bg_isl:155548,rg:0,actuals_till:5500},
  '38':{bg_isl:95829,rg:0,actuals_till:14165},
  '39':{bg_isl:5,rg:0,actuals_till:0},
  '42':{bg_isl:25882,rg:0,actuals_till:3937},
  '43':{bg_isl:12005,rg:0,actuals_till:1855},
  '44':{bg_isl:11589,rg:0,actuals_till:200441},
  '49':{bg_isl:544,rg:0,actuals_till:2893},
  '52':{bg_isl:0,rg:0,actuals_till:0},
  '53':{bg_isl:614,rg:0,actuals_till:1140},
  '60':{bg_isl:4703356,rg:0,actuals_till:1175862},
  '72':{bg_isl:32329,rg:0,actuals_till:25685},
  '73':{bg_isl:31932,rg:0,actuals_till:25685},
  '74':{bg_isl:4,rg:0,actuals_till:0},
  '75':{bg_isl:26098,rg:0,actuals_till:24910},
  '98':{bg_isl:-1652821,rg:0,actuals_till:-288791},
  '99':{bg_isl:1797579,rg:0,actuals_till:1781866},
  '01':{bg_isl:6706409,rg:0,actuals_till:1832267},
  '02':{bg_isl:4100453,rg:0,actuals_till:1190135},
  '03':{bg_isl:285089,rg:0,actuals_till:82},
  '04':{bg_isl:776198,rg:0,actuals_till:201371},
  '07':{bg_isl:496609,rg:0,actuals_till:130195},
  '08':{bg_isl:1285187,rg:0,actuals_till:318409}
};

// Month-wise actuals from MONTH WISE report - Rs'000s
let MONTH = {
  '10':{apr:63531,may:71427,jun:83846,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '11':{apr:13824,may:17030,jun:13104,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '12':{apr:25290,may:22611,jun:25787,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '13':{apr:41628,may:35790,jun:38583,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '14':{apr:154,may:149,jun:50,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '15':{apr:2096,may:1652,jun:1646,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '16':{apr:44933,may:41693,jun:44205,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '20':{apr:2666,may:2950,jun:2636,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '21':{apr:521,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '25':{apr:103975,may:128614,jun:86310,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '26':{apr:30352,may:33757,jun:38137,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '27':{apr:195370,may:152529,jun:126,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '28':{apr:17104,may:12231,jun:13021,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '29':{apr:3,may:0,jun:121,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '30':{apr:235339,may:467625,jun:110873,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '31':{apr:6627,may:8778,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '32':{apr:385443,may:433214,jun:137086,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '33':{apr:145104,may:206596,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '36':{apr:0,may:5500,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '38':{apr:0,may:14165,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '42':{apr:1292,may:1069,jun:1577,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '43':{apr:655,may:500,jun:700,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '44':{apr:766,may:1692,jun:197982,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '49':{apr:2403,may:249,jun:241,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '53':{apr:1070,may:0,jun:71,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '60':{apr:450171,may:725691,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '72':{apr:15207,may:5140,jun:5338,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '73':{apr:15207,may:5140,jun:5338,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '75':{apr:14110,may:6386,jun:4414,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '98':{apr:-112823,may:-80293,jun:-95675,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '99':{apr:1498093,may:156216,jun:127556,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '01':{apr:611000,may:610721,jun:610546,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '02':{apr:422511,may:384198,jun:383426,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '03':{apr:53,may:28,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '04':{apr:66797,may:67250,jun:67324,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '07':{apr:44217,may:42920,jun:43058,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0},
  '08':{apr:108760,may:104872,jun:104778,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:0,mar:0}
};

// FY Month order APRtoMAR and their keys
const FY_MONTHS = ['apr','may','jun','jul','aug','sep','oct','nov','dec','jan','feb','mar'];
const FY_MONTH_LABELS = ['APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC','JAN','FEB','MAR'];
let BUDGET_PY = {
  '01':{bg_isl:6105068,rg:7074279,actuals_till:7351227},
  '02':{bg_isl:4264737,rg:4420234,actuals_till:4447867},
  '03':{bg_isl:265382,rg:289831,actuals_till:302570},
  '04':{bg_isl:653214,rg:824912,actuals_till:802371},
  '07':{bg_isl:468531,rg:506019,actuals_till:509847},
  '08':{bg_isl:1302824,rg:1100183,actuals_till:1224831},
  '10':{bg_isl:764822,rg:765522,actuals_till:764170},
  '11':{bg_isl:92488,rg:96309,actuals_till:106223},
  '12':{bg_isl:244859,rg:280806,actuals_till:294342},
  '13':{bg_isl:537984,rg:551574,actuals_till:519753},
  '14':{bg_isl:4980,rg:4686,actuals_till:1362},
  '15':{bg_isl:17727,rg:19866,actuals_till:20172},
  '16':{bg_isl:488655,rg:523466,actuals_till:523753},
  '17':{bg_isl:4000,rg:2260,actuals_till:0},
  '18':{bg_isl:317,rg:8037,actuals_till:0},
  '19':{bg_isl:93,rg:606,actuals_till:3},
  '20':{bg_isl:22003,rg:14388,actuals_till:24948},
  '21':{bg_isl:2222,rg:2848,actuals_till:0},
  '22':{bg_isl:0,rg:0,actuals_till:0},
  '23':{bg_isl:40,rg:40,actuals_till:0},
  '24':{bg_isl:12,rg:12,actuals_till:0},
  '25':{bg_isl:302671,rg:364718,actuals_till:374596},
  '26':{bg_isl:292424,rg:321438,actuals_till:330091},
  '27':{bg_isl:1468901,rg:1445603,actuals_till:1291487},
  '28':{bg_isl:229945,rg:223635,actuals_till:164507},
  '29':{bg_isl:0,rg:0,actuals_till:7},
  '30':{bg_isl:3575499,rg:3659596,actuals_till:4115874},
  '31':{bg_isl:154669,rg:154625,actuals_till:125852},
  '32':{bg_isl:3983827,rg:3775796,actuals_till:3623757},
  '33':{bg_isl:3610570,rg:3391480,actuals_till:2825950},
  '36':{bg_isl:213822,rg:203822,actuals_till:170083},
  '38':{bg_isl:161025,rg:161025,actuals_till:126223},
  '39':{bg_isl:45,rg:80,actuals_till:73},
  '42':{bg_isl:11169,rg:12543,actuals_till:23222},
  '43':{bg_isl:3217,rg:8631,actuals_till:9496},
  '44':{bg_isl:14699,rg:22378,actuals_till:14674},
  '49':{bg_isl:0,rg:789,actuals_till:2667},
  '52':{bg_isl:0,rg:0,actuals_till:0},
  '53':{bg_isl:0,rg:200,actuals_till:868},
  '60':{bg_isl:6009641,rg:4909641,actuals_till:5106357},
  '72':{bg_isl:16303,rg:15454,actuals_till:38276},
  '73':{bg_isl:16302,rg:15459,actuals_till:38275},
  '74':{bg_isl:3,rg:8,actuals_till:0},
  '75':{bg_isl:12590,rg:15534,actuals_till:39869},
  '98':{bg_isl:-1047871,rg:-1194360,actuals_till:-1067890},
  '99':{bg_isl:1080105,rg:1157401,actuals_till:1267317},
};
let MONTH_PY = {
  '01':{apr:604866,may:612838,jun:610922,jul:596020,aug:613620,sep:609232,oct:613951,nov:611378,dec:609372,jan:643849,feb:613920,mar:611260},
  '02':{apr:386483,may:351968,jun:351843,jul:345585,aug:353716,sep:351765,oct:429724,nov:371117,dec:370340,jan:390920,feb:372540,mar:371867},
  '03':{apr:116,may:43,jun:40,jul:19,aug:8,sep:288005,oct:13098,nov:589,dec:331,jan:283,feb:20,mar:18},
  '04':{apr:65550,may:67123,jun:67311,jul:64388,aug:68042,sep:66789,oct:67406,nov:67163,dec:66991,jan:67088,feb:67113,mar:67405},
  '07':{apr:42927,may:42077,jun:42130,jul:40707,aug:41872,sep:41744,oct:45191,nov:42664,dec:42595,jan:42552,feb:42556,mar:42831},
  '08':{apr:101634,may:98743,jun:98649,jul:100381,aug:100615,sep:100678,oct:108666,nov:102295,dec:102146,jan:103616,feb:103746,mar:103662},
  '10':{apr:65201,may:62468,jun:63727,jul:69826,aug:67101,sep:65802,oct:62441,nov:63078,dec:63004,jan:62053,feb:61681,mar:57789},
  '11':{apr:14450,may:14251,jun:21020,jul:12654,aug:5142,sep:12170,oct:14037,nov:11870,dec:475,jan:0,feb:154,mar:0},
  '12':{apr:23430,may:22077,jun:24644,jul:23582,aug:23948,sep:24367,oct:22584,nov:24286,dec:25921,jan:27145,feb:27980,mar:24378},
  '13':{apr:40609,may:36049,jun:37853,jul:139167,aug:29031,sep:33987,oct:31670,nov:40507,dec:30332,jan:34820,feb:33732,mar:31997},
  '14':{apr:157,may:66,jun:24,jul:74,aug:57,sep:182,oct:152,nov:169,dec:76,jan:141,feb:171,mar:92},
  '15':{apr:3376,may:3482,jun:2003,jul:1416,aug:1884,sep:1637,oct:1003,nov:1196,dec:750,jan:1978,feb:1067,mar:379},
  '16':{apr:35889,may:38792,jun:46820,jul:43957,aug:43703,sep:50325,oct:35632,nov:50827,dec:44747,jan:48953,feb:42401,mar:41706},
  '19':{apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0,jan:0,feb:2,mar:0},
  '20':{apr:1135,may:2567,jun:3222,jul:-1754,aug:1955,sep:3048,oct:2583,nov:2138,dec:2993,jan:2488,feb:2905,mar:1669},
  '25':{apr:63179,may:102175,jun:161201,jul:28162,aug:8520,sep:4232,oct:1390,nov:2900,dec:1701,jan:424,feb:574,mar:138},
  '26':{apr:48180,may:29363,jun:18729,jul:45973,aug:18520,sep:26690,oct:22462,nov:26740,dec:27966,jan:17667,feb:42660,mar:5140},
  '27':{apr:30050,may:124203,jun:123848,jul:98731,aug:139466,sep:135349,oct:189024,nov:44816,dec:120923,jan:99013,feb:98905,mar:87159},
  '28':{apr:14565,may:15431,jun:22518,jul:13528,aug:39595,sep:13598,oct:7384,nov:11583,dec:9014,jan:8029,feb:7818,mar:1443},
  '29':{apr:1,may:0,jun:2,jul:2,aug:0,sep:1,oct:0,nov:0,dec:0,jan:0,feb:2,mar:0},
  '30':{apr:122227,may:360545,jun:435819,jul:291805,aug:463475,sep:306773,oct:324120,nov:395927,dec:300098,jan:292093,feb:396502,mar:426490},
  '31':{apr:3652,may:6991,jun:8913,jul:5661,aug:4803,sep:6040,oct:4984,nov:63586,dec:3871,jan:7218,feb:1388,mar:8745},
  '32':{apr:211169,may:115033,jun:629801,jul:628713,aug:128096,sep:122341,oct:657131,nov:133974,dec:169675,jan:701096,feb:114463,mar:12264},
  '33':{apr:177176,may:268302,jun:272688,jul:262273,aug:251690,sep:211188,oct:180568,nov:221529,dec:230055,jan:237187,feb:255355,mar:257940},
  '36':{apr:0,may:15636,jun:18272,jul:17611,aug:14998,sep:17079,oct:12825,nov:14673,dec:13343,jan:13398,feb:11329,mar:20918},
  '38':{apr:0,may:11787,jun:13773,jul:12555,aug:10693,sep:12176,oct:9143,nov:10461,dec:9512,jan:9552,feb:8077,mar:18494},
  '39':{apr:0,may:0,jun:3,jul:13,aug:14,sep:0,oct:0,nov:12,dec:13,jan:17,feb:0,mar:0},
  '42':{apr:1910,may:2963,jun:1228,jul:1871,aug:1823,sep:2981,oct:3912,nov:976,dec:782,jan:2544,feb:1364,mar:868},
  '43':{apr:674,may:1187,jun:555,jul:821,aug:717,sep:1273,oct:1524,nov:432,dec:296,jan:1023,feb:585,mar:410},
  '44':{apr:6724,may:1969,jun:1476,jul:647,aug:484,sep:521,oct:1027,nov:431,dec:441,jan:345,feb:403,mar:205},
  '49':{apr:0,may:0,jun:0,jul:0,aug:0,sep:2,oct:0,nov:0,dec:0,jan:1,feb:2665,mar:0},
  '53':{apr:362,may:250,jun:0,jul:2,aug:112,sep:0,oct:0,nov:0,dec:0,jan:0,feb:142,mar:0},
  '60':{apr:332976,may:493804,jun:496499,jul:470156,aug:430038,sep:376280,oct:319942,nov:399475,dec:415528,jan:442134,feb:437337,mar:492189},
  '72':{apr:1068,may:996,jun:1057,jul:624,aug:2652,sep:4357,oct:4053,nov:4834,dec:5269,jan:8758,feb:4349,mar:259},
  '73':{apr:1067,may:996,jun:1057,jul:624,aug:2652,sep:4357,oct:4053,nov:4834,dec:5269,jan:8758,feb:4349,mar:259},
  '75':{apr:1475,may:1196,jun:1861,jul:1814,aug:2082,sep:3782,oct:7505,nov:3890,dec:5918,jan:6141,feb:3590,mar:615},
  '98':{apr:-97549,may:-85671,jun:-101378,jul:-161832,aug:-86711,sep:-83463,oct:-73442,nov:-71836,dec:-48263,jan:-79866,feb:-109983,mar:-67894},
  '99':{apr:1489498,may:122273,jun:227948,jul:288816,aug:124842,sep:111579,oct:191275,nov:101367,dec:76338,jan:238120,feb:135015,mar:-1839753},
};
let _pendingBudgetPY = null;
let _pendingMonthPY  = null;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CURRENT MONTH DETECTION (auto from date)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let _uploadedMonthIdx = null; // latest completed month detected from uploaded CY month-wise file
let _latestActualMonthIdx = null;
const DEFAULT_DATA_AS_ON_DATE = new Date('2026-07-13T10:50:45+05:30');
let _dataAsOnDate = new Date(DEFAULT_DATA_AS_ON_DATE);
const RLP_BUILD_ID = 'rlp-mbd-2026-07-13-data-refresh';
const RLP_UPLOAD_STATE_KEY = 'rlp_cy_upload_state_' + RLP_BUILD_ID;
const RLP_PY_UPLOAD_STATE_KEY = 'rlp_py_upload_state_2025_2026';
const RLP_UPLOAD_CONFIRM_KEY = 'rlp_upload_confirm_history_' + RLP_BUILD_ID;
let _uploadConfirmHistory = [];
let _pyUploadMeta = null;
let _pyUploadMode = false;

function formatAsOnDate(d) {
  const dt = d instanceof Date && !isNaN(d) ? d : DEFAULT_DATA_AS_ON_DATE;
  const datePart = dt.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}).replace(/ /g,'-');
  const timePart = dt.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', hour12:false});
  return `${datePart} ${timePart}`;
}

function uploadFileTimestamp(file) {
  const ts = file && file.lastModified ? new Date(file.lastModified) : new Date();
  return ts instanceof Date && !isNaN(ts) ? ts : new Date();
}

function latestUploadTimestamp(...items) {
  return items
    .filter(Boolean)
    .map(item => item.at instanceof Date ? item.at : new Date(item.at))
    .filter(dt => dt instanceof Date && !isNaN(dt))
    .sort((a,b) => b - a)[0] || DEFAULT_DATA_AS_ON_DATE;
}

function saveCYUploadState() {
  try {
    clearStoredUploadState();
  } catch (err) {
    console.warn('Could not clear upload state', err);
  }
}

function clearStoredUploadState() {
  try {
    Object.keys(localStorage).forEach(k => {
      if (k === 'rlp_cy_upload_state' || k.startsWith('rlp_cy_upload_state_')) {
        localStorage.removeItem(k);
      }
    });
  } catch (err) {
    console.warn('Could not remove saved upload state', err);
  }
}

function loadCYUploadState() {
  try {
    clearStoredUploadState();
  } catch (err) {
    console.warn('Could not clear saved upload state', err);
  }
}

function indianDateTime(value) {
  const dt = value instanceof Date ? value : new Date(value || Date.now());
  if (!(dt instanceof Date) || isNaN(dt)) return '';
  return dt.toLocaleString('en-IN', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'});
}

function loadUploadConfirmHistory() {
  try {
    _uploadConfirmHistory = JSON.parse(localStorage.getItem(RLP_UPLOAD_CONFIRM_KEY) || '[]').slice(0, 2);
  } catch (err) {
    _uploadConfirmHistory = [];
  }
}

function saveUploadConfirmHistory() {
  try {
    localStorage.setItem(RLP_UPLOAD_CONFIRM_KEY, JSON.stringify(_uploadConfirmHistory.slice(0, 2)));
  } catch (err) {
    console.warn('Could not save upload confirmation history', err);
  }
}

function addUploadConfirmation(entry) {
  _uploadConfirmHistory.unshift({
    at: new Date().toISOString(),
    label: entry.label || 'Upload confirmed',
    detail: entry.detail || '',
    files: entry.files || ''
  });
  _uploadConfirmHistory = _uploadConfirmHistory.slice(0, 2);
  saveUploadConfirmHistory();
  renderUploadConfirmHistory();
}

function savePYUploadState(meta) {
  try {
    _pyUploadMeta = {...meta, confirmedAt: new Date().toISOString()};
    localStorage.setItem(RLP_PY_UPLOAD_STATE_KEY, JSON.stringify({
      meta:_pyUploadMeta,
      budget:BUDGET_PY,
      month:MONTH_PY
    }));
  } catch (err) {
    console.warn('Could not save previous year upload state', err);
  }
}

function loadPYUploadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(RLP_PY_UPLOAD_STATE_KEY) || 'null');
    if (!saved) return;
    if (saved.budget && typeof saved.budget === 'object') BUDGET_PY = saved.budget;
    if (saved.month && typeof saved.month === 'object') MONTH_PY = saved.month;
    _pyUploadMeta = saved.meta || null;
    if (_pyUploadMeta) {
      SOURCE_REGISTER.budgetPY.source = _pyUploadMeta.budgetFile || SOURCE_REGISTER.budgetPY.source;
      SOURCE_REGISTER.monthPY.source = _pyUploadMeta.monthFile || SOURCE_REGISTER.monthPY.source;
      SOURCE_REGISTER.budgetPY.remarks = `Previous year data restored from browser storage; confirmed ${indianDateTime(_pyUploadMeta.confirmedAt)}.`;
      SOURCE_REGISTER.monthPY.remarks = SOURCE_REGISTER.budgetPY.remarks;
    }
  } catch (err) {
    console.warn('Could not load previous year upload state', err);
  }
}

function setPYUpdateMode(enabled) {
  _pyUploadMode = !!enabled;
  const panel = document.getElementById('pyUploadPanel');
  const yes = document.getElementById('pyYesBtn');
  const no = document.getElementById('pyNoBtn');
  if (panel) panel.style.display = _pyUploadMode ? 'grid' : 'none';
  if (yes) yes.classList.toggle('active', _pyUploadMode);
  if (no) no.classList.toggle('active', !_pyUploadMode);
}

function renderUploadConfirmHistory() {
  const wrap = document.getElementById('uploadConfirmHistory');
  if (wrap) {
    wrap.innerHTML = _uploadConfirmHistory.length
      ? _uploadConfirmHistory.map(item => `<div class="upload-confirm-item">
          <strong>${htmlSafe(item.label)} - ${htmlSafe(indianDateTime(item.at))}</strong>
          <span>${htmlSafe(item.detail || '')}${item.files ? '<br>' + htmlSafe(item.files) : ''}</span>
        </div>`).join('')
      : '<div class="upload-confirm-empty">No upload confirmed in this browser yet.</div>';
  }
  const pyStatus = document.getElementById('pyUploadStatus');
  if (pyStatus) {
    pyStatus.textContent = _pyUploadMeta
      ? `Stored PY data confirmed ${indianDateTime(_pyUploadMeta.confirmedAt)}`
      : 'OK Pre-loaded from static file';
  }
}

function loadUploadAdminState() {
  loadPYUploadState();
  loadUploadConfirmHistory();
}

function getCurrentFYMonth() {
  const d = new Date();
  const m = d.getMonth(); // 0-Jan..11-Dec
  // FY: APR(3)=0, MAY(4)=1, ..., MAR(2)=11
  const fyIdx = m >= 3 ? m - 3 : m + 9;
  return {idx: fyIdx, key: FY_MONTHS[fyIdx], label: FY_MONTH_LABELS[fyIdx], year: fyIdx <= 8 ? 2026 : 2027};
}

// Months COMPLETED before current month (actuals known)
// Months from current month onward = remaining (current = partial committed)
function getMonthStatus() {
  const cur = getCurrentFYMonth();
  const latestActualIdx = _latestActualMonthIdx !== null ? _latestActualMonthIdx : (cur.idx > 0 ? cur.idx - 1 : -1);
  const completedThroughIdx = Math.min(latestActualIdx, cur.idx - 1);
  const pastMonths   = FY_MONTHS.slice(0, cur.idx);
  const actualMonths  = completedThroughIdx >= 0 ? FY_MONTHS.slice(0, completedThroughIdx + 1) : [];
  const curMonthKey  = cur.key;
  const futureMonths = FY_MONTHS.slice(cur.idx + 1);  // jul..mar = 9 months
  const latestActual = latestActualIdx >= 0
    ? {idx:latestActualIdx, key:FY_MONTHS[latestActualIdx], label:FY_MONTH_LABELS[latestActualIdx], year:latestActualIdx<=8?2026:2027}
    : null;
  return {cur, pastMonths, actualMonths, latestActual, curMonthKey, futureMonths};
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// COMPUTE LIABILITY PER PU
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function isRGActive() {
  return Object.values(BUDGET).some(b => b.rg && b.rg !== 0);
}

function getBudget(code) {
  const b = BUDGET[code];
  if (!b) return 0;
  return isRGActive() ? b.rg : b.bg_isl;
}

function compute(code) {
  const {pastMonths, curMonthKey, futureMonths} = getMonthStatus();
  const md     = MONTH[code] || {};
  const budget = getBudget(code);
  const isNeg  = (PU_META.find(p=>p.code===code)||{}).isNeg || false;

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // VERIFIED FORMULA - Budget balances exactly across 12 months
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Budget = APR_actual + MAY_actual + JUN_total + JUL_projx9
  // where:
  //   JUN_total      = proj_per_month  (one equal share of remaining)
  //   JUN_remaining  = proj_per_month - JUN_committed
  //   proj_per_month = (Budget - pastActuals) / (1 + futureMonths.length)
  //
  // CHECK: APR + MAY + projx10 = Budget OK
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  // Past months actuals (completed months before current)
  const pastActuals  = pastMonths.reduce((s,m) => s + (md[m]||0), 0);

  // Current month till-date value. If the active month column is blank,
  // derive it from actuals_till minus completed actual months.
  const curColumnVal = Object.prototype.hasOwnProperty.call(md, curMonthKey)
    ? (Number(md[curMonthKey]) || 0)
    : 0;
  const actualsTill = BUDGET[code] ? (Number(BUDGET[code].actuals_till) || 0) : 0;
  const residualTillDate = Math.max(0, actualsTill - pastActuals);
  const curCommitted = Math.max(curColumnVal, residualTillDate);

  // proj_per_month = remaining after past actuals / 10 equal months
  // (current month remainder counts as 1 full projected month)
  const totalRemainingMonths = 1 + futureMonths.length;  // e.g. 10 for JUN
  const projPerMonth = totalRemainingMonths > 0
    ? (budget - pastActuals) / totalRemainingMonths
    : 0;

  // JUN_remaining = proj_per_month - committed (what's left of this month's share)
  // JUN_total     = proj_per_month  (always equal to one projected month)
  const curRemaining  = Math.max(0, projPerMonth - curCommitted);
  const curMonthTotal = projPerMonth;  // = committed + remaining = proj_per_month OK

  // % of this month's allocation already committed
  const curDonePct = projPerMonth > 0
    ? Math.min(100, (curCommitted / projPerMonth) * 100)
    : 0;

  // Balance shown = budget - all committed spend (past + current month)
  const totalCommitted = pastActuals + curCommitted;
  const balanceBudget  = budget - totalCommitted;

  // % utilised = committed so far vs total budget
  let utilisedPct, utilisedFlag;
  if (budget === 0) {
    utilisedPct  = 0;
    utilisedFlag = totalCommitted === 0 ? 'none' : 'no-budget';
  } else if (budget < 0) {
    utilisedPct  = (totalCommitted / budget) * 100;
    utilisedFlag = 'normal';
  } else {
    utilisedPct  = (totalCommitted / budget) * 100;
    utilisedFlag = utilisedPct > 100 ? 'over' : 'normal';
  }

  return {budget, pastActuals, curCommitted, curRemaining, curMonthTotal,
          curDonePct, totalCommitted, balanceBudget, projPerMonth,
          utilisedPct, utilisedFlag, remMonthCount: futureMonths.length};
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FORMATTING HELPERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function fmtT(n) { // Rs'000s display with commas
  if (n===null||n===undefined||isNaN(n)||n===0) return '<span style="color:#aaa">-</span>';
  const abs = Math.abs(Math.round(n));
  const s = abs.toLocaleString('en-IN');
  return n < 0 ? `<span class="neg-val">(${s})</span>` : s;
}
function fmtCr(n) { // Convert Rs'000s to Crore
  if (!n || n===0) return '<span style="color:#aaa">-</span>';
  const cr = (n * 1000 / 10000000);
  const s = Math.abs(cr).toFixed(2);
  return n < 0 ? `<span class="neg-val">(${s} Cr)</span>` : `${s} Cr`;
}
function pct(a, b) { return b ? Math.abs(Math.round((a/Math.abs(b))*1000)/10) : 0; }
function miniProg(val, color) {
  const v = Math.min(100, Math.max(0, val));
  return `<div class="mp"><div class="mb"><div class="mf" style="width:${v}%;background:${color}"></div></div><span class="mpct ${val>90?'over':''}" style="color:${color}">${val.toFixed(1)}%</span></div>`;
}
function utilColor(p) { if(p===null||p===undefined||isNaN(p)) return '#CC0000'; p=Math.abs(p); return p < 30 ? '#1A7A4A' : p < 60 ? '#C07000' : p < 85 ? '#E85D04' : '#CC0000'; }
function isBudgetNoExpense(code) {
  const meta = PU_META.find(p => p.code === code);
  if (!isActiveDisplayPU(meta)) return false;
  const c = compute(code);
  return c.budget > 0 && Math.abs(c.totalCommitted || 0) === 0;
}
function getRowClass(pu) {
  const focusClass = isImportantPU(pu.code) ? ' important-pu-row' : '';
  if (pu.isNeg) return 'neg-row' + focusClass;
  if (isBudgetNoExpense(pu.code)) return 'no-exp-row' + focusClass;
  if (pu.puType==='Staff PU' && pu.liab==='Committed') return 'cs-row' + focusClass;
  if (pu.liab==='Committed') return 'co-row' + focusClass;
  return 'pl-row' + focusClass;
}
function puBadge(t) {
  if (t.includes('Staff PU') && !t.includes('Non')) return `<span class="badge b-staff">Staff PU</span>`;
  if (t.includes('Contractual')) return `<span class="badge b-ctr">Contractual</span>`;
  return `<span class="badge b-ns">Non Staff PU</span>`;
}
function liabBadge(l) {
  if (l==='Recovery') return `<span class="badge b-neg">Recovery</span>`;
  if (l==='Committed') return `<span class="badge b-cg">Committed</span>`;
  return `<span class="badge b-pl">Planned</span>`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FILTER HELPERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function getFiltered() {
  const tf = document.getElementById('typeFilter').value;
  const lf = document.getElementById('liabFilter').value;
  const af = document.getElementById('activityFilter') ? document.getElementById('activityFilter').value : 'all';
  const uc = document.getElementById('utilCompare') ? document.getElementById('utilCompare').value : 'all';
  const uvRaw = document.getElementById('utilPctFilter') ? document.getElementById('utilPctFilter').value : '';
  const uv = uvRaw === '' ? null : Number(uvRaw);
  return activePUMeta().filter(pu => {
    if (!passesPUFocus(pu.code)) return false;
    if (tf !== 'all') {
      if (tf === 'Staff'     && pu.puType !== 'Staff PU')     return false;
      if (tf === 'Non Staff' && pu.puType !== 'Non Staff PU') return false;
    }
    if (lf !== 'all' && pu.liab !== lf) return false;
    if (af === 'budget-no-exp' && !isBudgetNoExpense(pu.code)) return false;
    if (uc !== 'all' && uv !== null && !isNaN(uv)) {
      const c = compute(pu.code);
      const util = c.utilisedPct != null ? Math.abs(c.utilisedPct) : 0;
      if (uc === 'above' && util < uv) return false;
      if (uc === 'below' && util > uv) return false;
    }
    return true;
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SUMMARY CARDS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderCards() {
  const pus = activePUMeta();
  let totB=0, totC=0, totBal=0;
  pus.forEach(pu => {
    const c = compute(pu.code);
    totB += c.budget; totC += c.totalCommitted; totBal += c.balanceBudget;
  });
  const {cur, futureMonths} = getMonthStatus();
  const netBudget = totB; // Net = Gross (PU-98 excluded from main)
  const util = pct(totC, totB);
  document.getElementById('summaryCards').innerHTML = `
    <div class="card g"><div class="cl">Gross Budget (BG_ISL)</div>
      <div class="cv">${fmtCr(totB)}</div><div class="cs2">${Math.round(totB).toLocaleString('en-IN')} Rs'000s</div></div>
    <div class="card gold"><div class="cl">Net Budget (excl. Recoveries)</div>
      <div class="cv">${fmtCr(netBudget)}</div><div class="cs2">${Math.round(netBudget).toLocaleString('en-IN')} Rs'000s</div></div>
    <div class="card a"><div class="cl">Total Committed (Till ${cur.label})</div>
      <div class="cv">${fmtCr(totC)}</div><div class="cs2">${util}% of gross budget</div></div>
    <div class="card"><div class="cl">Balance Available</div>
      <div class="cv">${fmtCr(totBal)}</div><div class="cs2">Includes ${cur.label} remaining + ${futureMonths.length} future months</div></div>
    <div class="card"><div class="cl">${isRGActive()?'RG Active':'Budget Mode'}</div>
      <div class="cv" style="font-size:14px">${isRGActive()?'RG':'BG_ISL'}</div>
      <div class="cs2">${isRGActive()?'Revised Grant':'Awaiting RG (Jan 2027)'}</div></div>
  `;
  document.getElementById('rgNote').textContent = isRGActive() ? 'RG Active' : 'RG not active - using BG_ISL';
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// JUNE (CURRENT MONTH) PROGRESS BARS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderLiabilityHeader() {
  const {cur, pastMonths, futureMonths} = getMonthStatus();
  const topPast = pastMonths.map(m => {
    const idx = FY_MONTHS.indexOf(m), lbl = FY_MONTH_LABELS[idx], yr = idx <= 8 ? 2026 : 2027;
    return `<th class="sub" colspan="1">${lbl} ${yr}</th>`;
  }).join('');
  const subPast = pastMonths.map(m => {
    const idx = FY_MONTHS.indexOf(m), lbl = FY_MONTH_LABELS[idx];
    return `<th class="sub" style="min-width:90px">${lbl} Actual<br>(Rs'000s)</th>`;
  }).join('');
  const firstFuture = futureMonths.length ? FY_MONTH_LABELS[FY_MONTHS.indexOf(futureMonths[0])] : cur.label;
  document.getElementById('liab-thead').innerHTML = `
    <tr>
      <th class="la" rowspan="2">PU</th>
      <th class="la" rowspan="2" style="min-width:160px">Description</th>
      <th class="la" rowspan="2">PU Type</th>
      <th class="la" rowspan="2">Liability</th>
      <th rowspan="2">Budget<br>(Rs'000s)</th>
      ${topPast}
      <th class="sub" colspan="4" id="curMonHdr" style="background:rgba(244,169,50,.15)">${cur.label} ${cur.year} - Till Date Exp + Remaining</th>
      <th rowspan="2">Total Committed<br>(Rs'000s)</th>
      <th rowspan="2">Balance Budget<br>(Rs'000s)</th>
      <th rowspan="2">Proj./Month<br>${futureMonths.length ? firstFuture + '-MAR' : 'Completed'} (Rs'000s)</th>
      <th rowspan="2">% Utilised</th>
      <th rowspan="2">Status</th>
    </tr>
    <tr>
      ${subPast}
      <th class="sub" style="min-width:100px">${cur.label} till date exp<br>(Rs'000s)</th>
      <th class="sub" style="min-width:90px">${cur.label}<br>Remaining</th>
      <th class="sub" style="min-width:90px">${cur.label} Total<br>(Rs'000s)</th>
      <th class="sub">% Done</th>
    </tr>`;
}

function renderJuneBars() {
  const {cur, pastMonths, futureMonths} = getMonthStatus();
  document.getElementById('curMonLabel').textContent = `${cur.label} ${cur.year}`;
  const badge = document.getElementById('curMonBadge');
  if (badge) badge.textContent = `${cur.label} ${cur.year}`;
  const asOn = document.getElementById('asOnLabel');
  if (asOn) asOn.textContent = `As on: ${formatAsOnDate(_dataAsOnDate)}`;
  const noteFormula = document.getElementById('noteFormulaText');
  if (noteFormula) {
    const actualText = pastMonths.map(m => `${FY_MONTH_LABELS[FY_MONTHS.indexOf(m)]} Actual`).join(' + ');
    const nextText = futureMonths.length
      ? `Balance after ${cur.label} Total / ${futureMonths.length} remaining months (${FY_MONTH_LABELS[FY_MONTHS.indexOf(futureMonths[0])]}-MAR) = Projected per month`
      : `FY completed after ${cur.label}`;
    noteFormula.textContent = `${actualText} + ${cur.label} ${cur.year} Till-Date Exp + ${cur.label} ${cur.year} Remaining = ${cur.label} ${cur.year} Total Liability | ${nextText}.`;
  }
  const el = document.getElementById('curMonHdr');
  if (el) el.textContent = `${cur.label} ${cur.year} - till date exp`;

  let html = '';
  const showPUs = activePUMeta()
    .map(p => ({p, c:compute(p.code)}))
    .filter(({c}) => c.budget !== 0 || c.totalCommitted !== 0)
    .sort((a,b) => {
      const au = a.c.utilisedFlag === 'no-budget' && a.c.totalCommitted !== 0 ? 9999 : Math.abs(a.c.utilisedPct || 0);
      const bu = b.c.utilisedFlag === 'no-budget' && b.c.totalCommitted !== 0 ? 9999 : Math.abs(b.c.utilisedPct || 0);
      return bu - au || Math.abs(b.c.totalCommitted) - Math.abs(a.c.totalCommitted);
    })
    .slice(0, 14);

  showPUs.forEach(({p: pu, c}) => {
    const pctVal = c.utilisedPct !== null ? Math.abs(c.utilisedPct) : 0;
    const col    = c.utilisedFlag==='over'||c.utilisedFlag==='no-budget' ? '#CC0000'
                 : pctVal>85 ? '#E85D04' : pctVal>60 ? '#C07000' : '#1A7A4A';
    const flag   = '';
    const lbl    = c.utilisedFlag==='no-budget' ? 'No Budget' : pctVal.toFixed(1)+'%';
    html += `<div class="prog-item" data-pu="${pu.code}" style="cursor:pointer">
      <div class="prog-lbl">PU-${pu.code}: ${pu.desc.substring(0,22)}${flag}</div>
      <div class="prog-wrap"><div class="prog-fill" style="width:${Math.min(100,pctVal)}%;background:${col}"></div></div>
      <div class="prog-pct" style="color:${col}">${lbl}</div></div>`;
  });
  document.getElementById('juneBars').innerHTML = html;
}

function renderSummaryPage() {
  const cardSrc = document.getElementById('summaryCards');
  const cardDest = document.getElementById('summaryPageCards');
  if (cardSrc && cardDest) cardDest.innerHTML = cardSrc.innerHTML;

  const barSrc = document.getElementById('juneBars');
  const barDest = document.getElementById('summaryPageBars');
  if (barSrc && barDest) barDest.innerHTML = barSrc.innerHTML || '<div class="summary-empty">No utilisation progress data available.</div>';

  const {cur, actualMonths, futureMonths} = getMonthStatus();
  const curLbl = document.getElementById('summaryCurMonLabel');
  if (curLbl) curLbl.textContent = `${cur.label} ${cur.year}`;
  const meta = document.getElementById('summaryMeta');
  if (meta) {
    const months = actualMonths.map(m => FY_MONTH_LABELS[FY_MONTHS.indexOf(m)]).join(', ') || 'No completed month';
    meta.textContent = `As on ${cur.label} ${cur.year}; completed actual months: ${months}. Future projection covers ${futureMonths.length} month(s).`;
  }

  const rows = reportRowsForActivePUs();
  const highRisk = rows.filter(r => r.high).sort((a,b) => Math.abs(b.balance) - Math.abs(a.balance));
  const noExpense = rows.filter(r => r.noExpense).sort((a,b) => b.budget - a.budget);
  const overBudget = rows.filter(r => r.over).sort((a,b) => Math.abs(b.balance) - Math.abs(a.balance));
  const bcRows = typeof buildBudgetControlRows === 'function' ? buildBudgetControlRows() : [];
  const askTotal = bcRows.reduce((s,r) => s + (r.askAmount || 0), 0);
  const surrenderTotal = bcRows.reduce((s,r) => s + (r.surrenderAmount || 0), 0);
  const topAsk = bcRows.filter(r => r.askAmount > 0).sort((a,b) => b.askAmount - a.askAmount)[0];
  const topSurrender = bcRows.filter(r => r.surrenderAmount > 0).sort((a,b) => b.surrenderAmount - a.surrenderAmount)[0];
  const topUtil = rows.slice().sort((a,b) => b.utilPct - a.utilPct)[0];
  const points = [
    ['High / Watch PUs', String(highRisk.length), highRisk[0] ? `Top: PU-${highRisk[0].pu.code} ${highRisk[0].pu.desc}` : 'No high-risk PU at present', 'risk'],
    ['Over Budget', String(overBudget.length), overBudget[0] ? `PU-${overBudget[0].pu.code}: ${textCr(Math.abs(overBudget[0].balance))} over` : 'No over-budget PU shown', 'danger'],
    ['Budget, No Expense', String(noExpense.length), noExpense[0] ? `Largest: PU-${noExpense[0].pu.code} ${textCr(noExpense[0].budget)}` : 'No budget-without-expense item', 'warn'],
    ['Amount to Ask', textCr(askTotal), topAsk ? `Top ask: PU-${topAsk.pu.code} ${textCr(topAsk.askAmount)}` : 'No additional grant projected', 'danger'],
    ['Possible Surrender', textCr(surrenderTotal), topSurrender ? `Top saving: PU-${topSurrender.pu.code} ${textCr(topSurrender.surrenderAmount)}` : 'No surrender signal projected', 'good'],
    ['Top Utilisation', topUtil ? `${topUtil.utilPct.toFixed(1)}%` : '0.0%', topUtil ? `PU-${topUtil.pu.code} ${topUtil.pu.desc}` : 'No utilisation data', 'risk']
  ];
  const pointBox = document.getElementById('summaryMainPoints');
  if (pointBox) {
    pointBox.innerHTML = points.map(([label,value,note,cls]) => `
      <div class="summary-point ${cls}">
        <div class="summary-point-label">${htmlSafe(label)}</div>
        <div class="summary-point-value">${htmlSafe(value)}</div>
        <div class="summary-point-note">${htmlSafe(note)}</div>
      </div>`).join('');
  }

  const note = document.getElementById('summaryPageNote');
  const formula = (document.getElementById('noteFormulaText') || {}).textContent || '';
  if (note) {
    note.innerHTML = `
      <strong>Figures:</strong> Stored in Rs '000s. <strong>Budget:</strong> ${isRGActive() ? 'RG active' : 'BG_ISL active until RG is available'}.
      <strong>Liability Formula:</strong> ${htmlSafe(formula)}
      <strong>Excluded:</strong> PU-72, PU-73, PU-74, PU-75 GST heads and PU-98 recoveries are excluded from normal operational display.`;
  }
}

function handleAIDashboardJump(tab) {
  if (!tab) return;
  const sel = document.getElementById('aiDashClassicSelect');
  if (sel) sel.value = '';
  switchTab(tab);
}

function renderAIDashboard() {
  const kpis = document.getElementById('aiDashKpis');
  if (!kpis) return;
  const rows = reportRowsForActivePUs();
  const bcRows = typeof buildBudgetControlRows === 'function' ? buildBudgetControlRows() : [];
  const totals = rows.reduce((t, r) => {
    t.budget += r.budget;
    t.actual += r.actual;
    t.balance += r.balance;
    return t;
  }, {budget:0, actual:0, balance:0});
  const util = totals.budget ? (totals.actual / totals.budget) * 100 : 0;
  const highWatch = rows.filter(r => r.high).sort((a,b) => Math.abs(b.balance) - Math.abs(a.balance));
  const over = rows.filter(r => r.over).sort((a,b) => Math.abs(b.balance) - Math.abs(a.balance));
  const noExpense = rows.filter(r => r.noExpense).sort((a,b) => b.budget - a.budget);
  const topUtil = rows.slice().sort((a,b) => b.utilPct - a.utilPct)[0];
  const askTotal = bcRows.reduce((s,r) => s + (r.askAmount || 0), 0);
  const surrenderTotal = bcRows.reduce((s,r) => s + (r.surrenderAmount || 0), 0);
  const topAsk = bcRows.filter(r => r.askAmount > 0).sort((a,b) => b.askAmount - a.askAmount)[0];
  const topSurrender = bcRows.filter(r => r.surrenderAmount > 0).sort((a,b) => b.surrenderAmount - a.surrenderAmount)[0];
  const {cur, actualMonths} = getMonthStatus();
  const meta = document.getElementById('aiDashMeta');
  if (meta) meta.textContent = `Current control view as on ${cur.label} ${cur.year}; ${actualMonths.length} completed month(s) used for trend signals. Classic tables remain available from the selector.`;

  kpis.innerHTML = [
    ['Gross Budget', textCr(totals.budget), 'Operational active PUs', 'good'],
    ['Actual Till Date', textCr(totals.actual), `${util.toFixed(1)}% utilised`, util >= 85 ? 'risk' : 'good'],
    ['High / Watch PUs', String(highWatch.length), highWatch[0] ? `Top: PU-${highWatch[0].pu.code}` : 'No watch signal', 'risk'],
    ['Amount to Ask', textCr(askTotal), topAsk ? `PU-${topAsk.pu.code} is highest` : 'No ask projected', 'danger'],
    ['Possible Surrender', textCr(surrenderTotal), topSurrender ? `PU-${topSurrender.pu.code} is highest` : 'No surrender signal', 'good'],
    ['No Expense Budget', String(noExpense.length), noExpense[0] ? `Largest PU-${noExpense[0].pu.code}` : 'No item', 'warn']
  ].map(([label,value,note,cls]) => `<div class="ai-dash-kpi ${cls}"><span>${htmlSafe(label)}</span><strong>${htmlSafe(value)}</strong><small>${htmlSafe(note)}</small></div>`).join('');

  const priority = document.getElementById('aiDashPriority');
  if (priority) {
    const priorityRows = highWatch.slice(0, 8);
    priority.innerHTML = priorityRows.length ? priorityRows.map(r => {
      const cls = r.over ? 'danger' : r.utilPct >= 85 ? 'risk' : r.noExpense ? 'warn' : 'normal';
      const remark = r.over ? `Over by ${textCr(Math.abs(r.balance))}`
        : r.noExpense ? `Budget ${textCr(r.budget)} but no expense`
        : `Utilisation ${r.utilPct.toFixed(1)}%`;
      return `<button type="button" class="ai-priority-row ${cls}" onclick="openPUDetail('${r.pu.code}')">
        <span>PU-${htmlSafe(r.pu.code)}</span><strong>${htmlSafe(r.pu.desc)}</strong><em>${htmlSafe(remark)}</em>
      </button>`;
    }).join('') : '<div class="ai-empty">No priority watch signal available.</div>';
  }

  const actions = document.getElementById('aiDashActions');
  if (actions) {
    const actionLines = [
      over.length ? `Control booking in ${over.length} over-budget PU(s), starting with PU-${over[0].pu.code}.` : 'No over-budget PU is visible in current operational view.',
      noExpense.length ? `Review ${noExpense.length} budget-with-no-expense PU(s) for pending liability or surrender.` : 'No major budget-without-expense signal at present.',
      askTotal > 0 ? `Examine ${textCr(askTotal)} as possible amount to ask through budget review process.` : 'No net additional grant ask is projected by current control rule.',
      surrenderTotal > 0 ? `Confirm pending bills before treating ${textCr(surrenderTotal)} as possible surrender.` : 'No surrender signal is projected by current control rule.',
      topUtil ? `Top utilisation is PU-${topUtil.pu.code} at ${topUtil.utilPct.toFixed(1)}%; use click-through for PU detail.` : 'No utilisation signal available.'
    ];
    actions.innerHTML = `<ul class="ai-action-list">${actionLines.map(x => `<li>${htmlSafe(x)}</li>`).join('')}</ul>`;
  }

  const askBox = document.getElementById('aiDashAskSurrender');
  if (askBox) {
    const max = Math.max(askTotal, surrenderTotal, 1);
    askBox.innerHTML = `
      <div class="ai-balance-row"><span>Amount to Ask</span><strong>${textCr(askTotal)}</strong><div><i style="width:${Math.min(100,(askTotal/max)*100)}%"></i></div><small>${topAsk ? `Top ask: PU-${topAsk.pu.code} ${textCr(topAsk.askAmount)}` : 'No additional grant projected'}</small></div>
      <div class="ai-balance-row surrender"><span>Possible Surrender</span><strong>${textCr(surrenderTotal)}</strong><div><i style="width:${Math.min(100,(surrenderTotal/max)*100)}%"></i></div><small>${topSurrender ? `Top saving: PU-${topSurrender.pu.code} ${textCr(topSurrender.surrenderAmount)}` : 'No surrender signal projected'}</small></div>`;
  }

  const utilBox = document.getElementById('aiDashUtilisation');
  if (utilBox) {
    const utilRows = rows.slice().sort((a,b) => b.utilPct - a.utilPct).slice(0, 10);
    utilBox.innerHTML = utilRows.map(r => {
      const col = r.utilPct >= 100 ? '#B00020' : r.utilPct >= 85 ? '#E85D04' : r.utilPct >= 60 ? '#C07000' : '#1A7A4A';
      return `<div class="ai-util-row" onclick="openPUDetail('${r.pu.code}')">
        <div><strong>PU-${htmlSafe(r.pu.code)} ${htmlSafe(r.pu.desc)}</strong><span>${htmlSafe(r.pu.puType)} | ${htmlSafe(r.pu.liab)}</span></div>
        <div class="ai-util-bar"><i style="width:${Math.min(100, Math.max(0, r.utilPct))}%;background:${col}"></i></div>
        <b style="color:${col}">${r.utilPct.toFixed(1)}%</b>
      </div>`;
    }).join('');
  }
}

const REPORT_VIEW_MODE_KEY = 'rlp_report_view_mode';
let reportViewMode = 'classic';

function currentReportTitle(tab) {
  const label = REPORT_LABELS[tab] || ['Current Report', 'Report view'];
  return {title: label[0], sub: label[1]};
}

function biKpi(label, value, note, cls) {
  return `<div class="bi-kpi ${cls || ''}"><span>${htmlSafe(label)}</span><strong>${htmlSafe(value)}</strong><small>${htmlSafe(note || '')}</small></div>`;
}

function biBars(rows, valueKey, labelFn, noteFn, clsFn) {
  const max = Math.max(1, ...rows.map(r => Math.abs(Number(r._barValue ?? r[valueKey]) || 0)));
  return rows.map(r => {
    const val = Math.abs(Number(r._barValue ?? r[valueKey]) || 0);
    const width = Math.min(100, (val / max) * 100);
    const cls = clsFn ? clsFn(r) : '';
    return `<button type="button" class="bi-bar-row ${cls}" onclick="${r.pu ? `openPUDetail('${r.pu.code}')` : ''}">
      <div><strong>${htmlSafe(labelFn(r))}</strong><span>${htmlSafe(noteFn ? noteFn(r) : '')}</span></div>
      <div class="bi-bar-track"><i style="width:${width}%"></i></div>
      <b>${htmlSafe(r._displayValue || textCr(val))}</b>
    </button>`;
  }).join('') || '<div class="bi-empty">No rows available for this view.</div>';
}

function biMonthlyPattern() {
  const active = activePUMeta();
  const {cur} = getMonthStatus();
  const values = FY_MONTHS.map(m => active.reduce((s, pu) => s + (((MONTH[pu.code] || {})[m]) || 0), 0));
  const max = Math.max(1, ...values);
  return FY_MONTHS.map((m, idx) => {
    const val = values[idx] || 0;
    const pct = Math.max(3, Math.min(100, (val / max) * 100));
    const isCur = idx === cur.idx;
    const isFuture = idx > cur.idx;
    return `<span class="${isCur ? 'current' : isFuture ? 'future' : ''}" style="height:${pct}%"><em>${FY_MONTH_LABELS[idx].slice(0,3)}</em></span>`;
  }).join('');
}

function biVisualWidgets(tab, data) {
  const rows = reportRowsForActivePUs();
  const totals = rows.reduce((t, r) => {
    t.budget += r.budget;
    t.actual += r.actual;
    t.staff += r.pu.puType === 'Staff PU' ? r.actual : 0;
    t.nonStaff += r.pu.puType === 'Non Staff PU' ? r.actual : 0;
    return t;
  }, {budget:0, actual:0, staff:0, nonStaff:0});
  const util = totals.budget ? (totals.actual / totals.budget) * 100 : 0;
  const utilClamp = Math.max(0, Math.min(100, util));
  const over = rows.filter(r => r.over).length;
  const noExp = rows.filter(r => r.noExpense).length;
  const controlRows = typeof buildBudgetControlRows === 'function' ? buildBudgetControlRows() : [];
  const ask = controlRows.reduce((s, r) => s + (r.askAmount || 0), 0);
  const surrender = controlRows.reduce((s, r) => s + (r.surrenderAmount || 0), 0);
  const totalMix = Math.max(1, ask + surrender);
  const staffShare = totals.actual ? (totals.staff / totals.actual) * 100 : 0;
  const nonStaffShare = Math.max(0, 100 - staffShare);
  return `
    <div class="bi-visual-strip">
      <div class="bi-widget gauge">
        <div class="bi-widget-label">Utilisation Gauge</div>
        <div class="bi-donut" style="--p:${utilClamp.toFixed(1)}"><strong>${util.toFixed(1)}%</strong><span>Budget used</span></div>
      </div>
      <div class="bi-widget pattern">
        <div class="bi-widget-label">Monthly Actual Pattern</div>
        <div class="bi-month-bars">${biMonthlyPattern()}</div>
      </div>
      <div class="bi-widget mix">
        <div class="bi-widget-label">Control Mix</div>
        <div class="bi-mix-row"><span>Ask</span><div><i class="ask" style="width:${Math.min(100,(ask/totalMix)*100)}%"></i></div><b>${textCr(ask)}</b></div>
        <div class="bi-mix-row"><span>Surrender</span><div><i class="surrender" style="width:${Math.min(100,(surrender/totalMix)*100)}%"></i></div><b>${textCr(surrender)}</b></div>
        <div class="bi-alert-line">${over} over-budget PU(s), ${noExp} no-expense PU(s)</div>
      </div>
      <div class="bi-widget mix">
        <div class="bi-widget-label">Staff vs Non-Staff Actual</div>
        <div class="bi-mix-row"><span>Staff</span><div><i class="staff" style="width:${staffShare.toFixed(1)}%"></i></div><b>${staffShare.toFixed(1)}%</b></div>
        <div class="bi-mix-row"><span>Non-Staff</span><div><i class="nonstaff" style="width:${nonStaffShare.toFixed(1)}%"></i></div><b>${nonStaffShare.toFixed(1)}%</b></div>
        <div class="bi-alert-line">${htmlSafe((currentReportTitle(tab) || {}).title || 'Report')} visual reading</div>
      </div>
    </div>`;
}

function filteredSMHRowsForBI() {
  const data = window.DETAIL_SMH_DATA;
  if (!data || !Array.isArray(data.rows)) return [];
  const dept = (document.getElementById('smhDeptFilter') || {}).value || 'all';
  const smh = (document.getElementById('smhCodeFilter') || {}).value || 'all';
  const selectedPUs = smhSelectedCodes();
  const activityFilter = (document.getElementById('activityFilter') || {}).value || 'all';
  return data.rows.filter(r =>
    !isSkippedDisplayPU(r.puCode) &&
    passesPUFocus(r.puCode) &&
    (dept === 'all' || r.deptCode === dept) &&
    (smh === 'all' || r.smh === smh) &&
    (selectedPUs.includes('all') || selectedPUs.includes(r.puCode)) &&
    (activityFilter !== 'budget-no-exp' || isSMHBudgetNoExpense(r))
  );
}

function biDataForCurrentReport(tab) {
  const rows = reportRowsForActivePUs();
  const totals = rows.reduce((t, r) => {
    t.budget += r.budget;
    t.actual += r.actual;
    t.balance += r.balance;
    return t;
  }, {budget:0, actual:0, balance:0});
  totals.util = totals.budget ? (totals.actual / totals.budget) * 100 : 0;
  const over = rows.filter(r => r.over).sort((a,b) => Math.abs(b.balance) - Math.abs(a.balance));
  const noExpense = rows.filter(r => r.noExpense).sort((a,b) => b.budget - a.budget);
  const topUtil = rows.filter(r => r.budget > 0).sort((a,b) => b.utilPct - a.utilPct);
  const bcRows = typeof buildBudgetControlRows === 'function' ? buildBudgetControlRows() : [];
  const askTotal = bcRows.reduce((s,r) => s + (r.askAmount || 0), 0);
  const surrenderTotal = bcRows.reduce((s,r) => s + (r.surrenderAmount || 0), 0);
  const base = {
    kpis: [
      ['Gross Budget', textCr(totals.budget), 'Current operational budget', 'good'],
      ['Actual Till Date', textCr(totals.actual), `${totals.util.toFixed(1)}% utilised`, totals.util >= 85 ? 'risk' : 'good'],
      ['Balance', textCr(totals.balance), totals.balance < 0 ? 'Over spent' : 'Available budget', totals.balance < 0 ? 'danger' : 'good'],
      ['Watch Items', String(over.length + noExpense.length), 'Over budget + no-expense signals', 'warn']
    ],
    bars: topUtil.slice(0, 8).map(r => Object.assign({_displayValue: r.utilPct.toFixed(1) + '%'}, r)),
    barsTitle: 'Top Utilisation',
    actions: [
      over[0] ? `First control point: PU-${over[0].pu.code} is over by ${textCr(Math.abs(over[0].balance))}.` : 'No over-budget PU in the current visible dataset.',
      noExpense[0] ? `Review PU-${noExpense[0].pu.code}: budget ${textCr(noExpense[0].budget)} but no expense booked.` : 'No budget-without-expense signal in the current view.',
      askTotal ? `Budget Control projects ${textCr(askTotal)} as amount to ask, subject to verification.` : 'No net additional grant ask is projected from current budget control rule.',
      surrenderTotal ? `Possible surrender signal is ${textCr(surrenderTotal)} after pending liability verification.` : 'No surrender signal is projected from current budget control rule.'
    ],
    focusRows: over.concat(noExpense).slice(0, 6)
  };

  if (tab === 'pumaster') {
    const meta = activePUMeta();
    const staff = meta.filter(p => p.puType === 'Staff PU').length;
    const nonStaff = meta.filter(p => p.puType === 'Non Staff PU').length;
    const committed = meta.filter(p => p.liab === 'Committed').length;
    const planned = meta.filter(p => p.liab === 'Planned').length;
    return Object.assign(base, {
      kpis: [
        ['Active PUs', String(meta.length), 'After exclusions applied', 'good'],
        ['Staff / Non-Staff', `${staff} / ${nonStaff}`, 'Classification in PU master', ''],
        ['Committed', String(committed), 'Committed liability PUs', 'risk'],
        ['Planned', String(planned), 'Planned / controllable PUs', 'warn']
      ],
      barsTitle: 'Highest Budget PUs',
      bars: rows.slice().sort((a,b) => b.budget - a.budget).slice(0, 8),
      actions: [
        'PU Master BI view checks classification strength before using report filters.',
        'Staff committed PUs are generally less flexible; planned non-staff PUs are better for control review.',
        'GST heads PU-72 to PU-75 and PU-98 recoveries remain excluded from operational display.',
        'Click a PU row below to open the existing detailed PU drill-down.'
      ],
      focusRows: rows.slice().sort((a,b) => b.budget - a.budget).slice(0, 6)
    });
  }

  if (tab === 'smhdetail') {
    const smhRows = filteredSMHRowsForBI();
    const smhTotals = makeDetailTotal(smhRows);
    const balance = smhTotals.budget - smhTotals.actualTill;
    const util = smhTotals.budget ? (smhTotals.actualTill / smhTotals.budget) * 100 : 0;
    const deptGroups = aggregateDetailRows(smhRows, 'dept').sort((a,b) => b.actualTill - a.actualTill);
    const noExp = smhRows.filter(r => isSMHBudgetNoExpense(r)).sort((a,b) => b.budget - a.budget);
    const overRows = smhRows.filter(r => (Number(r.actualTill)||0) > (Number(r.budget)||0)).sort((a,b) => (b.actualTill-b.budget) - (a.actualTill-a.budget));
    return Object.assign(base, {
      kpis: [
        ['DEPT-Demand Budget', detailCr(smhTotals.budget), `${smhRows.length} detail rows`, 'good'],
        ['Actual Till Date', detailCr(smhTotals.actualTill), `${util.toFixed(1)}% utilised`, util >= 85 ? 'risk' : 'good'],
        ['Balance', detailCr(balance), balance < 0 ? 'Over spent' : 'Budget minus actual', balance < 0 ? 'danger' : 'good'],
        ['No Expense Lines', String(noExp.length), 'Budget available, no expense', 'warn']
      ],
      barsTitle: 'Department Actual Share',
      bars: deptGroups.slice(0, 8).map(r => ({_displayValue: detailCr(r.actualTill), dept:r.deptName, code:r.deptCode, actualTill:r.actualTill, budget:r.budget})),
      actions: [
        overRows[0] ? `Highest SMH overrun: ${overRows[0].deptCode} ${overRows[0].deptName}, PU-${overRows[0].puCode}.` : 'No SMH line has crossed budget in the selected view.',
        noExp[0] ? `Largest budget-with-no-expense line: ${noExp[0].deptCode} ${noExp[0].deptName}, PU-${noExp[0].puCode}.` : 'No budget-with-no-expense SMH line in selected filters.',
        'Use Classic Table when DEPT > Demand > PU line-by-line checking is required.',
        'BI-AI view is for officer-level signal reading; it follows the same current filters.'
      ],
      focusRows: overRows.slice(0, 6).map(r => ({label:`${r.deptCode} ${r.deptName}`, desc:`${r.smh} | PU-${r.puCode} ${r.puName}`, value:detailCr((r.actualTill||0)-(r.budget||0)), cls:'danger'}))
    });
  }

  if (tab === 'demandsmh') {
    const dRows = demandSMHOperationalRows();
    const dTotals = demandSMHTotals();
    const dSuspense = demandSMHSuspenseRows()[0];
    const excess = dRows.filter(r => (Number(r.variation) || 0) > 0).sort((a,b) => b.variation - a.variation);
    const saving = dRows.filter(r => (Number(r.variation) || 0) < 0).sort((a,b) => Math.abs(b.variation) - Math.abs(a.variation));
    const highUtil = dRows.slice().sort((a,b) => (Number(b.bpPct) || 0) - (Number(a.bpPct) || 0));
    return Object.assign(base, {
      kpis: [
        ['OBA / BG_ISL', detailCr(dTotals.oba), 'Current year original budget allocation', 'good'],
        ['BP Value', detailCr(dTotals.bp), 'BG / 12 x completed months', ''],
        ['AE up to JUN', detailCr(dTotals.ae), `${dTotals.bpPct}% of BP`, dTotals.bpPct >= 100 ? 'risk' : 'good'],
        ['Budget Remaining', detailCr(dTotals.budgetRemaining), `${dTotals.obaUtil}% OBA utilised`, dTotals.budgetRemaining < 0 ? 'danger' : 'good']
      ],
      barsTitle: 'Demand / SMH BP Utilisation',
      bars: highUtil.slice(0, 8).map(r => ({label:demandSMHLabel(r), dept:r.dept, utilPct:Number(r.bpPct)||0, _displayValue:`${detailNum(r.bpPct)}%`, _barValue:Math.abs(Number(r.bpPct)||0)})),
      actions: [
        excess[0] ? `Highest excess against BP: ${demandSMHLabel(excess[0])} by ${detailCr(excess[0].variation)}.` : 'No excess against BP in Demand / SMH summary.',
        saving[0] ? `Largest saving against BP: ${demandSMHLabel(saving[0])} by ${detailCr(Math.abs(saving[0].variation))}.` : 'No saving against BP in Demand / SMH summary.',
        'OBA is taken from BG_ISL 2026-2027 in the SMH-wise budget file.',
        'AE uses ACTUALS UPTO JUN 2026 because July is the running month.',
        dSuspense ? `${demandSMHLabel(dSuspense)} Suspense Heads is separately calculated: AE ${detailCr(dSuspense.ae)}.` : 'Suspense Heads row is kept outside main Demand / SMH total.'
      ],
      focusRows: excess.concat(saving).slice(0, 6).map(r => ({
        label:demandSMHLabel(r),
        desc:r.dept,
        value:signedCr(r.variation),
        cls:(Number(r.variation)||0) > 0 ? 'danger' : ''
      }))
    });
  }

  if (tab === 'bpanalysis') {
    const bpRows = typeof getFilteredBPRows === 'function' ? getFilteredBPRows() : [];
    const excess = bpRows.filter(r => r.variance > 0).sort((a,b) => b.variance - a.variance);
    const saving = bpRows.filter(r => r.variance < 0).sort((a,b) => Math.abs(b.variance) - Math.abs(a.variance));
    const bpTotals = bpRows.reduce((t,r) => { t.budget += r.budget; t.bp += r.bp; t.actual += r.actualTill; t.var += r.variance; return t; }, {budget:0,bp:0,actual:0,var:0});
    return Object.assign(base, {
      kpis: [
        ['Budget Grant', textCr(bpTotals.budget), 'Selected PU set', 'good'],
        ['BP Value', textCr(bpTotals.bp), 'BG / 12 x completed months', ''],
        ['Actual Till Date', textCr(bpTotals.actual), 'Against BP', bpTotals.actual > bpTotals.bp ? 'risk' : 'good'],
        ['Excess / Saving', signedCr(bpTotals.var), bpTotals.var > 0 ? 'Excess vs BP' : 'Saving vs BP', bpTotals.var > 0 ? 'danger' : 'good']
      ],
      barsTitle: 'BP Excess / Saving Signals',
      bars: excess.concat(saving).slice(0, 8).map(r => Object.assign({_displayValue:signedCr(r.variance)}, r)),
      actions: [
        excess[0] ? `Top BP excess: PU-${excess[0].pu.code} by ${textCr(excess[0].variance)}.` : 'No BP excess in selected view.',
        saving[0] ? `Top BP saving: PU-${saving[0].pu.code} by ${textCr(Math.abs(saving[0].variance))}.` : 'No BP saving signal in selected view.',
        'BP view treats only completed months as proportionate base.',
        'Use this to decide early saving/excess review before AR/REA stage.'
      ],
      focusRows: excess.concat(saving).slice(0, 6)
    });
  }

  if (tab === 'budgetcontrol') {
    const control = typeof getFilteredBudgetControlRows === 'function' ? getFilteredBudgetControlRows() : bcRows;
    const ask = control.filter(r => r.askAmount > 0).sort((a,b) => b.askAmount - a.askAmount);
    const surrender = control.filter(r => r.surrenderAmount > 0).sort((a,b) => b.surrenderAmount - a.surrenderAmount);
    const ct = control.reduce((t,r) => { t.ceiling += r.ceiling; t.actual += r.actualTill; t.projected += r.projectedRequirement; t.ask += r.askAmount; t.surrender += r.surrenderAmount; return t; }, {ceiling:0,actual:0,projected:0,ask:0,surrender:0});
    return Object.assign(base, {
      kpis: [
        ['Current Ceiling', textCr(ct.ceiling), isRGActive() ? 'RG active' : 'BG/BE ceiling', 'good'],
        ['Projected Need', textCr(ct.projected), 'Till-date projection', ct.projected > ct.ceiling ? 'risk' : 'good'],
        ['Amount to Ask', textCr(ct.ask), 'Excess above ceiling', ct.ask ? 'danger' : 'good'],
        ['Possible Surrender', textCr(ct.surrender), 'Verify pending bills', 'warn']
      ],
      barsTitle: 'Ask / Surrender Action Board',
      bars: ask.concat(surrender).slice(0, 8).map(r => Object.assign({_displayValue:r.askAmount ? textCr(r.askAmount) : textCr(r.surrenderAmount), _barValue: r.askAmount || r.surrenderAmount}, r)),
      actions: [
        ask[0] ? `Top ask case: PU-${ask[0].pu.code} ${ask[0].pu.desc} needs ${textCr(ask[0].askAmount)}.` : 'No additional grant case in selected control filters.',
        surrender[0] ? `Top surrender candidate: PU-${surrender[0].pu.code} ${surrender[0].pu.desc} ${textCr(surrender[0].surrenderAmount)}.` : 'No surrender candidate in selected control filters.',
        'Budget Control BI view follows Indian Railways BG > AR > REA > RG > FME > FG flow.',
        'Final ask/surrender should be vetted against pending bills and committed liabilities.'
      ],
      focusRows: ask.concat(surrender).slice(0, 6)
    });
  }

  if (tab === 'trend' || tab === 'aitrend' || tab === 'monthwise') {
    const {cur, actualMonths} = getMonthStatus();
    return Object.assign(base, {
      kpis: [
        ['Current Month', `${cur.label} ${cur.year}`, 'Running month detected', ''],
        ['Completed Months', String(actualMonths.length), 'Used for trend/BP reading', 'good'],
        ['Actual Till Date', textCr(totals.actual), `${totals.util.toFixed(1)}% utilisation`, totals.util >= 85 ? 'risk' : 'good'],
        ['Top Util PU', topUtil[0] ? `PU-${topUtil[0].pu.code}` : 'NA', topUtil[0] ? `${topUtil[0].utilPct.toFixed(1)}%` : 'No data', 'risk']
      ],
      barsTitle: 'Current Trend Watch',
      actions: [
        'BI-AI view gives the officer reading; use Graphs tab Classic View for detailed chart inspection.',
        topUtil[0] ? `Highest utilisation is PU-${topUtil[0].pu.code} at ${topUtil[0].utilPct.toFixed(1)}%.` : 'No utilisation signal available.',
        over[0] ? `Overspend trend exists in PU-${over[0].pu.code}; compare CY vs PY before proposal.` : 'No over-budget trend signal in current view.',
        'Trend notes use current portal totals and uploaded month-wise data.'
      ]
    });
  }

  if (tab === 'remarks') {
    return Object.assign(base, {
      kpis: [
        ['Data Year', 'FY 2026-27', 'Current year basis', 'good'],
        ['Previous Year', 'FY 2025-26', 'Trend comparison basis', ''],
        ['Excluded GST PUs', '72-75', 'Operational display skip', 'warn'],
        ['Recovery PU', '98', 'Excluded from expense view', 'warn']
      ],
      barsTitle: 'Source Rule Highlights',
      actions: [
        'Budget Available and Month-wise Actuals feed the main financial tables.',
        'DEPT-Demand files feed the Department > Demand > PU report.',
        'Department 00, PU-98 recoveries and GST PU-72 to PU-75 are excluded from normal operational view.',
        'Use Remarks Classic Table for exact source-file naming and rule register.'
      ]
    });
  }
  return base;
}

function renderBIView() {
  const panel = document.getElementById('biViewPanel');
  if (!panel) return;
  const tab = activeTabName();
  document.body.classList.toggle('bi-view-active', reportViewMode === 'bi');
  panel.hidden = reportViewMode !== 'bi';
  if (reportViewMode !== 'bi') return;
  const {title, sub} = currentReportTitle(tab);
  const data = biDataForCurrentReport(tab);
  const focus = (data.focusRows || []).map(r => {
    if (r.label) return `<div class="bi-focus ${r.cls || ''}"><strong>${htmlSafe(r.label)}</strong><span>${htmlSafe(r.desc || '')}</span><b>${htmlSafe(r.value || '')}</b></div>`;
    const value = r.over ? `Over ${textCr(Math.abs(r.balance))}` : r.noExpense ? `No expense ${textCr(r.budget)}` : r.askAmount ? `Ask ${textCr(r.askAmount)}` : r.surrenderAmount ? `Surrender ${textCr(r.surrenderAmount)}` : r.variance !== undefined ? signedCr(r.variance) : `${(r.utilPct || 0).toFixed(1)}%`;
    return `<button type="button" class="bi-focus ${r.over || r.askAmount || (r.variance > 0) ? 'danger' : r.noExpense ? 'warn' : ''}" onclick="${r.pu ? `openPUDetail('${r.pu.code}')` : ''}">
      <strong>${r.pu ? `PU-${htmlSafe(r.pu.code)} ${htmlSafe(r.pu.desc)}` : htmlSafe(r.status || r.label || 'Signal')}</strong>
      <span>${htmlSafe(r.remark || r.label || r.status || 'Current report signal')}</span>
      <b>${htmlSafe(value)}</b>
    </button>`;
  }).join('') || '<div class="bi-empty">No priority focus item for the selected filters.</div>';
  panel.innerHTML = `
    <div class="bi-head">
      <div>
        <div class="bi-eyebrow">BI-AI Report View</div>
        <div class="bi-title">${htmlSafe(title)}</div>
        <div class="bi-sub">${htmlSafe(sub)} - visual reading of the same active report and filters.</div>
      </div>
      <button type="button" class="bi-classic-btn" onclick="setReportViewMode('classic')">Back to Classic Table</button>
    </div>
    <div class="bi-kpi-grid">${data.kpis.map(k => biKpi(k[0], k[1], k[2], k[3])).join('')}</div>
    ${biVisualWidgets(tab, data)}
    <div class="bi-layout">
      <div class="bi-card bi-wide">
        <div class="bi-card-title">${htmlSafe(data.barsTitle || 'Report Signals')}</div>
        <div class="bi-bar-list">${biBars(data.bars || [], data.bars && data.bars[0] && data.bars[0].actualTill !== undefined ? 'actualTill' : data.bars && data.bars[0] && data.bars[0].variance !== undefined ? 'variance' : data.bars && data.bars[0] && data.bars[0].askAmount !== undefined ? (data.bars[0].askAmount ? 'askAmount' : 'surrenderAmount') : 'utilPct', r => r.dept ? `${r.code} ${r.dept}` : r.pu ? `PU-${r.pu.code} ${r.pu.desc}` : r.label || 'Signal', r => r.pu ? `${r.pu.puType || ''} ${r.pu.liab || ''}` : r.budget !== undefined ? `Budget ${detailCr ? detailCr(r.budget) : textCr(r.budget)}` : '', r => (r.over || r.askAmount || r.variance > 0) ? 'danger' : r.noExpense ? 'warn' : '')}</div>
      </div>
      <div class="bi-card">
        <div class="bi-card-title">AI-Style Officer Notes</div>
        <ul class="bi-note-list">${(data.actions || []).map(x => `<li>${htmlSafe(x)}</li>`).join('')}</ul>
      </div>
      <div class="bi-card bi-wide">
        <div class="bi-card-title">Priority Focus</div>
        <div class="bi-focus-grid">${focus}</div>
      </div>
    </div>`;
}

function setReportViewMode(mode) {
  reportViewMode = mode === 'bi' ? 'bi' : 'classic';
  try { sessionStorage.setItem(REPORT_VIEW_MODE_KEY, reportViewMode); } catch(e) {}
  document.querySelectorAll('[data-report-view-mode]').forEach(btn => {
    const active = btn.dataset.reportViewMode === reportViewMode;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  renderBIView();
}

function refreshBIViewSoon() {
  if (reportViewMode === 'bi') setTimeout(renderBIView, 80);
}

function initReportViewMode() {
  try { reportViewMode = sessionStorage.getItem(REPORT_VIEW_MODE_KEY) || 'classic'; } catch(e) { reportViewMode = 'classic'; }
  document.querySelectorAll('[data-report-view-mode]').forEach(btn => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => setReportViewMode(btn.dataset.reportViewMode));
  });
  setReportViewMode(reportViewMode);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LIABILITY TABLE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderLiability() {
  const pus = getFiltered();
  const {cur, pastMonths} = getMonthStatus();
  renderLiabilityHeader();
  let rows='', tB=0,tC=0,tBal=0,tPast={},tJunC=0,tJunR=0,tJunT=0;
  pastMonths.forEach(m => tPast[m]=0);
  pus.forEach(pu => {
    const c = compute(pu.code);
    const md = MONTH[pu.code]||{};
    const pastCells = pastMonths.map(m => {
      const v = md[m] || 0;
      tPast[m] += v;
      return `<td class="n">${fmtT(v)}</td>`;
    }).join('');
    const col = utilColor(c.utilisedPct||0);
    const balCls = c.balanceBudget < 0 ? 'neg' : c.balanceBudget < c.budget*0.1 ? 'low' : 'ok';
    let statusHtml = '';
    const _pct = c.utilisedPct || 0;
    if (isBudgetNoExpense(pu.code)) statusHtml='<span style="color:#8A5A00;font-weight:800">Budget Available, No Expenses</span>';
    else if (c.utilisedFlag==='no-budget') statusHtml='<span style="color:#CC0000;font-weight:700">No Budget</span>';
    else if (c.utilisedFlag==='over') statusHtml=`<span style="color:#CC0000;font-weight:700">Over ${Math.abs(_pct).toFixed(0)}%</span>`;
    else if (c.utilisedFlag==='none') statusHtml='<span style="color:#aaa">Nil</span>';
    else if (_pct > 85) statusHtml = '<span style="color:#CC0000;font-weight:700">Near Limit</span>';
    else if (_pct > 60) statusHtml = '<span style="color:#C07000">Watch</span>';
    else if (pu.liab==='Committed'||pu.liab==='Committed Liability') statusHtml = '<span style="color:var(--green)">On Track</span>';
    else statusHtml = '<span style="color:var(--muted)">Planned</span>';

    rows += `<tr class="${getRowClass(pu)}" data-pu="${pu.code}" style="cursor:pointer">
      <td class="puc puc-link" title="Open Full Details: PU-${pu.code}" onclick="event.stopPropagation();openPUDetail('${pu.code}')">${pu.code}</td>
      <td class="desc" title="${pu.desc}">${pu.desc}</td>
      <td>${puBadge(pu.puType)}</td>
      <td>${liabBadge(pu.liab)}</td>
      <td class="n">${fmtT(c.budget)}</td>
      ${pastCells}
      <td class="n">${fmtT(c.curCommitted)}</td>
      <td class="n" style="color:var(--muted)">${fmtT(c.curRemaining)}</td>
      <td class="n" style="font-weight:600">${fmtT(c.curMonthTotal)}</td>
      <td>${miniProg(c.curDonePct, col)}</td>
      <td class="n" style="font-weight:700">${fmtT(c.totalCommitted)}</td>
      <td class="n rem ${balCls}">${fmtT(c.balanceBudget)}</td>
      <td class="n" style="color:var(--steel)">${fmtT(c.projPerMonth)}</td>
      <td>${miniProg(Math.min(100,c.utilisedPct), col)}</td>
      <td>${statusHtml}</td>
    </tr>`;
    tB+=c.budget;tC+=c.totalCommitted;tBal+=c.balanceBudget;
    tJunC+=c.curCommitted;tJunR+=c.curRemaining;tJunT+=c.curMonthTotal;
  });
  const tUtil = pct(tC,tB); const tc2 = utilColor(tUtil);
  const totalPastCells = pastMonths.map(m => `<td class="n">${fmtT(tPast[m]||0)}</td>`).join('');
  rows += `<tr class="tot">
    <td colspan="4" style="text-align:left">GRAND TOTAL (excl. Recoveries)</td>
    <td class="n">${fmtT(tB)}</td>
    ${totalPastCells}
    <td class="n">${fmtT(tJunC)}</td><td class="n">${fmtT(tJunR)}</td>
    <td class="n">${fmtT(tJunT)}</td><td>-</td>
    <td class="n">${fmtT(tC)}</td><td class="n rem ${tBal<0?'neg':'ok'}">${fmtT(tBal)}</td>
    <td class="n">-</td><td>${miniProg(Math.min(100,tUtil),tc2)}</td><td>-</td>
  </tr>`;
  document.getElementById('liab-tbody').innerHTML = rows;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MONTH WISE TABLE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderMonthwise() {
  const pus = getFiltered();
  const {pastMonths, curMonthKey, futureMonths, cur} = getMonthStatus();
  let rows='', tots={apr:0,may:0,junC:0,junR:0,junT:0,tB:0,tC:0,tBal:0};
  futureMonths.forEach(m => tots[m]=0);

  pus.forEach(pu => {
    const md = MONTH[pu.code]||{};
    const c = compute(pu.code);
    const apr = md.apr||0, may = md.may||0;
    const junC = c.curCommitted, junR = c.curRemaining, junT = c.curMonthTotal;
    const proj = c.projPerMonth;

    tots.apr+=apr; tots.may+=may; tots.junC+=junC; tots.junR+=junR; tots.junT+=junT;
    tots.tB+=c.budget; tots.tC+=c.totalCommitted; tots.tBal+=c.balanceBudget;
    futureMonths.forEach(m => tots[m]+=(proj||0));

    const util = Math.min(100, c.utilisedPct);
    const col = utilColor(util);

    let futureCells = futureMonths.map(() => `<td class="n" style="color:#1A4A8A;background:#F0F6FF">${fmtT(proj)}</td>`).join('');
    if (futureMonths.length < 9) futureCells += '<td class="n" style="color:#aaa">-</td>'.repeat(9 - futureMonths.length);

    const balCls = c.balanceBudget<0?'neg':c.balanceBudget<c.budget*0.1?'low':'ok';
    rows += `<tr class="${getRowClass(pu)}" data-pu="${pu.code}" style="cursor:pointer">
      <td class="puc puc-link" title="Open Full Details: PU-${pu.code}" onclick="event.stopPropagation();openPUDetail('${pu.code}')">${pu.code}</td>
      <td class="desc" title="${pu.desc}" style="font-weight:700">${pu.desc}</td>
      <td class="n">${fmtT(apr)}</td>
      <td class="n">${fmtT(may)}</td>
      <td class="n" style="background:#FFF9E0;font-weight:600">${fmtT(junC)}</td>
      <td class="n" style="background:#FFF9E0;color:var(--muted)">${fmtT(junR)}</td>
      <td class="n" style="background:#FFF9E0;font-weight:700">${fmtT(junT)}</td>
      ${futureCells}
      <td class="n">${fmtT(c.budget)}</td>
      <td class="n" style="font-weight:700">${fmtT(c.totalCommitted)}</td>
      <td class="n rem ${balCls}">${fmtT(c.balanceBudget)}</td>
      <td>${miniProg(util, col)}</td>
    </tr>`;
  });

  // Total row
  const futTotCells = futureMonths.map(m =>
    `<td class="n" style="color:#1A4A8A;background:#E8F0FF;font-weight:700">${fmtT(tots[m]||0)}</td>`).join('');
  const padNeeded2 = 9 - futureMonths.length;
  let ftPad = futTotCells;
  for(let i=0;i<padNeeded2;i++) ftPad += '<td class="n" style="color:#aaa">-</td>';
  const tUtil = pct(tots.tC, tots.tB);
  rows += `<tr class="tot">
    <td colspan="2" style="text-align:left">GRAND TOTAL</td>
    <td class="n">${fmtT(tots.apr)}</td><td class="n">${fmtT(tots.may)}</td>
    <td class="n" style="background:#FFF0C0">${fmtT(tots.junC)}</td>
    <td class="n" style="background:#FFF0C0">${fmtT(tots.junR)}</td>
    <td class="n" style="background:#FFF0C0">${fmtT(tots.junT)}</td>
    ${ftPad}
    <td class="n">${fmtT(tots.tB)}</td>
    <td class="n">${fmtT(tots.tC)}</td>
    <td class="n rem ${tots.tBal<0?'neg':'ok'}">${fmtT(tots.tBal)}</td>
    <td>${miniProg(Math.min(100,tUtil), utilColor(tUtil))}</td>
  </tr>`;
  document.getElementById('mw-tbody').innerHTML = rows;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RECOVERY PAGE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderRecovery() {
  const pu = PU_META.find(p=>p.code==='98');
  const c = compute('98');
  const md = MONTH['98']||{};
  const {cur, futureMonths} = getMonthStatus();
  const apr = md.apr||0, may = md.may||0;

  // Cards
  document.getElementById('rec-cards').innerHTML = `
    <div class="rec-card"><div class="cl">Recovery Budget (BG_ISL)</div>
      <div class="cv" style="color:#CC0000;font-size:16px">${fmtCr(c.budget)}</div>
      <div class="cs2">${Math.round(c.budget).toLocaleString('en-IN')} Rs'000s</div></div>
    <div class="rec-card"><div class="cl">APR Recoveries</div>
      <div class="cv" style="color:#CC0000;font-size:16px">${fmtCr(apr)}</div>
      <div class="cs2">${apr.toLocaleString('en-IN')} Rs'000s</div></div>
    <div class="rec-card"><div class="cl">MAY Recoveries</div>
      <div class="cv" style="color:#CC0000;font-size:16px">${fmtCr(may)}</div>
      <div class="cs2">${may.toLocaleString('en-IN')} Rs'000s</div></div>
    <div class="rec-card"><div class="cl">${cur.label} Committed</div>
      <div class="cv" style="color:#CC0000;font-size:16px">${fmtCr(c.curCommitted)}</div>
      <div class="cs2">${c.curCommitted.toLocaleString('en-IN')} Rs'000s</div></div>
    <div class="rec-card"><div class="cl">Total Committed</div>
      <div class="cv" style="color:#CC0000;font-size:16px">${fmtCr(c.totalCommitted)}</div>
      <div class="cs2">${c.utilisedPct.toFixed(1)}% of recovery budget</div></div>
    <div class="rec-card"><div class="cl">Proj./Month (${futureMonths.length} months)</div>
      <div class="cv" style="color:#CC0000;font-size:16px">${fmtCr(c.projPerMonth)}</div>
      <div class="cs2">${Math.round(c.projPerMonth).toLocaleString('en-IN')} Rs'000s</div></div>
  `;

  // Main liability row
  const balCls = c.balanceBudget>0?'ok':c.balanceBudget<0?'neg':'';
  document.getElementById('rec-tbody').innerHTML = `
    <tr class="neg-row" data-pu="98" style="cursor:pointer">
      <td class="puc">98</td>
      <td class="desc">Credit or Recoveries</td>
      <td class="n neg-val">${fmtT(c.budget)}</td>
      <td class="n neg-val">${fmtCr(c.budget)}</td>
      <td class="n neg-val">${fmtT(apr)}</td>
      <td class="n neg-val">${fmtT(may)}</td>
      <td class="n neg-val">${fmtT(c.curCommitted)}</td>
      <td class="n" style="color:var(--muted)">${fmtT(c.curRemaining)}</td>
      <td class="n neg-val font-weight:700">${fmtT(c.totalCommitted)}</td>
      <td class="n rem ${balCls}">${fmtT(c.balanceBudget)}</td>
      <td class="n neg-val">${fmtT(c.projPerMonth)}</td>
      <td>${miniProg(Math.min(100,c.utilisedPct),'#CC0000')}</td>
    </tr>`;

  // Month wise for PU-98
  const allMonths = FY_MONTHS;
  let cells = allMonths.map(m => `<td class="n neg-val">${md[m]?fmtT(md[m]):'<span style="color:#aaa">-</span>'}</td>`).join('');
  const total = allMonths.reduce((s,m)=>s+(md[m]||0),0);
  document.getElementById('rec-mw-tbody').innerHTML = `
    <tr class="neg-row" data-pu="98" style="cursor:pointer">
      <td class="puc">98</td>
      <td class="desc">Credit or Recoveries</td>
      ${cells}
      <td class="n neg-val" style="font-weight:700">${fmtT(total)}</td>
    </tr>`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PU MASTER TABLE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderPUMaster() {
  const pus = getFiltered();
  let rows = '';
  pus.forEach(pu => {
    const b = BUDGET[pu.code]||{};
    const c = compute(pu.code);
    const remCls = c.balanceBudget < 0 ? 'neg-val' : '';
    const noExp = isBudgetNoExpense(pu.code);
    rows += `<tr class="${getRowClass(pu)}" data-pu="${pu.code}" style="cursor:pointer">
      <td class="puc puc-link" title="Open Full Details: PU-${pu.code}" onclick="event.stopPropagation();openPUDetail('${pu.code}')">${pu.code}</td>
      <td class="desc pu-desc" title="${pu.desc}">${pu.desc}</td>
      <td>${puBadge(pu.puType)}</td>
      <td>${liabBadge(pu.liab)}</td>
      <td class="n ${remCls}">${fmtT(c.balanceBudget)}<span class="cr-sub">${fmtCr(c.balanceBudget)}</span></td>
      <td class="n">${fmtT(b.bg_isl||0)}</td>
      <td class="n">${fmtCr(b.bg_isl||0)}</td>
      <td class="n">${fmtT(b.actuals_till||0)}</td>
      <td class="no-exp-status">${htmlSafe(noExpenseStatus(noExp))}</td>
    </tr>`;
  });
  document.getElementById('pu-tbody').innerHTML = rows;
}

function initBPFilter() {
  const list = document.getElementById('bpPUFilter');
  if (!list || list.dataset.ready === '1') return;
  list.innerHTML = activePUMeta()
    .map(p => `<label class="bp-check-item">
      <input type="checkbox" class="bp-pu-check" value="${p.code}" onchange="onBPPUChange()">
      <span><strong>PU-${p.code}</strong> ${htmlSafe(p.desc)}</span>
    </label>`)
    .join('');
  list.dataset.ready = '1';
  updateBPSelectionCount();
}

function updateBPSelectionCount() {
  const all = document.getElementById('bpPUAll');
  const count = document.getElementById('bpPUCount');
  const checks = Array.from(document.querySelectorAll('#bpPUFilter .bp-pu-check'));
  if (!count) return;
  if (all && all.checked) {
    count.textContent = 'All selected';
    return;
  }
  const selectedCount = checks.filter(ch => ch.checked).length;
  count.textContent = selectedCount ? `${selectedCount} selected` : 'No PU selected';
}

function onBPAllToggle(checked) {
  document.querySelectorAll('#bpPUFilter .bp-pu-check').forEach(ch => {
    ch.checked = false;
  });
  updateBPSelectionCount();
  renderBPAnalysis();
}

function onBPPUChange() {
  const all = document.getElementById('bpPUAll');
  if (all) all.checked = false;
  updateBPSelectionCount();
  renderBPAnalysis();
}

function setBPSelection(mode) {
  const all = document.getElementById('bpPUAll');
  const checks = Array.from(document.querySelectorAll('#bpPUFilter .bp-pu-check'));
  if (all) all.checked = mode === 'all';
  checks.forEach(ch => {
    ch.checked = false;
  });
  updateBPSelectionCount();
  renderBPAnalysis();
}

function bpSelectedCodes() {
  const all = document.getElementById('bpPUAll');
  if (!all) return ['all'];
  if (all.checked) return ['all'];
  return Array.from(document.querySelectorAll('#bpPUFilter .bp-pu-check:checked')).map(o => o.value);
}

function buildBPRows() {
  const {actualMonths} = getMonthStatus();
  const actualMonthCount = actualMonths.length;
  return activePUMeta().map(pu => {
    const budget = getBudget(pu.code);
    const source = BUDGET[pu.code] || {};
    const actual = Number(source.actuals_till);
    const actualTill = Number.isFinite(actual) ? actual : compute(pu.code).totalCommitted;
    const bp = (budget / 12) * actualMonthCount;
    const variance = actualTill - bp;
    const utilPct = budget ? (actualTill / budget) * 100 : (actualTill ? 999 : 0);
    const overFullBudget = budget > 0 && actualTill > budget;
    const noExpense = budget > 0 && Math.abs(actualTill) === 0;
    const status = overFullBudget ? 'Over Full Budget'
      : noExpense ? 'Budget, No Expense'
      : variance > 0 ? 'Excess vs BP'
      : variance < 0 ? 'Saving vs BP'
      : 'On BP';
    const remark = overFullBudget ? 'Actual has crossed full year budget. Budget support or booking control required.'
      : noExpense ? 'Budget is available but no actual expense is booked.'
      : variance > 0 ? 'Actual spending is ahead of proportionate budget. Review pace and justification.'
      : variance < 0 ? 'Actual spending is below proportionate budget. Indicates saving or pending booking.'
      : 'Actual is aligned with proportionate budget.';
    return {pu, budget, actualTill, bp, variance, utilPct, actualMonthCount, status, remark, overFullBudget, noExpense};
  });
}

function getFilteredBPRows() {
  const selected = bpSelectedCodes();
  const statusFilter = (document.getElementById('bpStatusFilter') || {}).value || 'all';
  const typeFilter = (document.getElementById('bpTypeFilter') || {}).value || 'all';
  const liabilityFilter = (document.getElementById('bpLiabilityFilter') || {}).value || 'all';
  return buildBPRows().filter(row => {
    if (!passesPUFocus(row.pu.code)) return false;
    if (!selected.includes('all') && selected.length === 0) return false;
    if (!selected.includes('all') && !selected.includes(row.pu.code)) return false;
    if (typeFilter !== 'all' && row.pu.puType !== typeFilter) return false;
    if (liabilityFilter !== 'all' && row.pu.liab !== liabilityFilter) return false;
    if (statusFilter === 'excess' && !(row.variance > 0)) return false;
    if (statusFilter === 'saving' && !(row.variance < 0)) return false;
    if (statusFilter === 'overbudget' && !row.overFullBudget) return false;
    if (statusFilter === 'noexpense' && !row.noExpense) return false;
    return true;
  });
}

function renderBPAnalysis() {
  initBPFilter();
  const body = document.getElementById('bpTableBody');
  if (!body) return;
  const rows = getFilteredBPRows();
  const {actualMonths, cur} = getMonthStatus();
  const monthLabels = actualMonths.map(m => FY_MONTH_LABELS[FY_MONTHS.indexOf(m)]).join(', ') || 'No completed month';
  const totals = rows.reduce((t, r) => {
    t.budget += r.budget;
    t.bp += r.bp;
    t.actual += r.actualTill;
    t.variance += r.variance;
    if (r.variance > 0) t.excessCount++;
    if (r.variance < 0) t.savingCount++;
    if (r.overFullBudget) t.overCount++;
    return t;
  }, {budget:0, bp:0, actual:0, variance:0, excessCount:0, savingCount:0, overCount:0});
  const kpis = document.getElementById('bpKpis');
  if (kpis) {
    kpis.innerHTML = [
      ['Total Budget Grant', textCr(totals.budget), 'Selected PU budget'],
      ['Budget Proportionate', textCr(totals.bp), `${actualMonths.length} completed month(s): ${monthLabels}`],
      ['Actual Till Date', textCr(totals.actual), `As on ${cur.label} ${cur.year}`],
      [totals.variance >= 0 ? 'Net Excess vs BP' : 'Net Saving vs BP', signedCr(totals.variance), `${totals.excessCount} excess / ${totals.savingCount} saving PUs`],
      ['Over Full Budget', String(totals.overCount), 'PU count already above full BG']
    ].map(([l,v,s]) => `<div class="bp-kpi"><div class="lbl">${l}</div><div class="val">${v}</div><div class="sub">${s}</div></div>`).join('');
  }
  const meta = document.getElementById('bpMeta');
  if (meta) meta.textContent = `BP = BG / 12 x ${actualMonths.length}. Completed months counted: ${monthLabels}. ${cur.label} is current running month and is not counted in BP month count.`;
  const title = document.getElementById('bpTableTitle');
  if (title) title.textContent = `PU-wise Budget Proportionate Position - ${rows.length} PU(s) shown`;
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="12" style="text-align:center;color:#607080;padding:16px">No PU found for selected filters.</td></tr>';
    refreshBIViewSoon();
    return;
  }
  const rowHtml = rows
    .sort((a,b) => Math.abs(b.variance) - Math.abs(a.variance))
    .map(r => {
      const cls = r.overFullBudget ? 'bp-over' : r.noExpense ? 'bp-noexp' : r.variance > 0 ? 'bp-excess' : r.variance < 0 ? 'bp-saving' : '';
      return `<tr class="${cls}${isImportantPU(r.pu.code) ? ' important-pu-row' : ''}">
        <td class="puc puc-link" onclick="openPUDetail('${r.pu.code}')">${r.pu.code}</td>
        <td class="desc">${htmlSafe(r.pu.desc)}</td>
        <td>${htmlSafe(r.pu.puType)}</td>
        <td>${htmlSafe(r.pu.liab)}</td>
        <td class="n">${textCr(r.budget)}</td>
        <td class="n">${r.actualMonthCount}</td>
        <td class="n">${textCr(r.bp)}</td>
        <td class="n">${textCr(r.actualTill)}</td>
        <td class="n ${r.variance >= 0 ? 'bp-var-excess' : 'bp-var-saving'}">${signedCr(r.variance)}</td>
        <td class="n">${r.budget ? r.utilPct.toFixed(1) + '%' : (r.actualTill ? 'No Budget' : '0.0%')}</td>
        <td><span class="bp-status ${cls}">${htmlSafe(r.status)}</span></td>
        <td class="bp-remark">${htmlSafe(r.remark)}</td>
      </tr>`;
    }).join('');
  const totalClass = totals.variance >= 0 ? 'bp-excess' : 'bp-saving';
  body.innerHTML = rowHtml + `<tr class="tot ${totalClass}">
    <td colspan="4" style="text-align:left">TOTAL SELECTED PUs</td>
    <td class="n">${textCr(totals.budget)}</td>
    <td class="n">${actualMonths.length}</td>
    <td class="n">${textCr(totals.bp)}</td>
    <td class="n">${textCr(totals.actual)}</td>
    <td class="n">${signedCr(totals.variance)}</td>
    <td class="n">${totals.budget ? ((totals.actual / totals.budget) * 100).toFixed(1) + '%' : '0.0%'}</td>
    <td>${totals.variance >= 0 ? 'Net Excess' : 'Net Saving'}</td>
    <td class="bp-remark">Calculated on selected filters only.</td>
  </tr>`;
  refreshBIViewSoon();
}

function budgetControlStage() {
  const d = new Date();
  const month = d.getMonth();
  if (month >= 3 && month <= 6) {
    return {code:'BG', label:'BG / BE', askLabel:'AR Proposal', note:'Current ceiling is BG/BE; prepare August Review from current projection.'};
  }
  if (month === 7 || month === 8) {
    return {code:'AR', label:'August Review', askLabel:'AR Requirement', note:'Use AR to identify likely saving or additional requirement early.'};
  }
  if (month >= 9 && month <= 11) {
    return {code:'REA', label:isRGActive() ? 'RG Approved' : 'REA Asked', askLabel:isRGActive() ? 'RG Control' : 'REA Asked', note:isRGActive() ? 'RG is the revised spending ceiling.' : 'REA is the Railway demand before Board approval.'};
  }
  if (month === 0 || month === 1) {
    return {code:'FME', label:'FME / FM', askLabel:'FME Asked', note:'January FM should show realistic expenditure expected up to 31 March.'};
  }
  return {code:'FG', label:'FG / March Closing', askLabel:'FG Control', note:'FG is final authority before March closing and Appropriation Accounts.'};
}

function fyElapsedFactor() {
  const cur = getCurrentFYMonth();
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayPart = Math.min(1, Math.max(0.05, now.getDate() / daysInMonth));
  return Math.max(0.25, cur.idx + dayPart);
}

function budgetControlStatus(row) {
  if (row.noExpense) {
    return {
      key:'noexpense',
      label:'Budget, No Expense',
      cls:'bc-noexpense',
      remark:`Budget exists but no booking is visible. Keep under ${row.stage.askLabel}; confirm whether this can be surrendered or retained for firm liability.`
    };
  }
  if (row.askAmount > 0 || row.noBudgetSpend) {
    return {
      key:'ask',
      label:'Ask / Additional Grant',
      cls:'bc-ask',
      remark:`Projected requirement is above current ceiling. Ask ${textCr(row.askAmount)} through ${row.stage.askLabel} / re-appropriation support and control further booking.`
    };
  }
  if (row.surrenderAmount > 0 && row.utilPct < 70) {
    return {
      key:'surrender',
      label:'Surrender Review',
      cls:'bc-surrender',
      remark:`Possible surrender is ${textCr(row.surrenderAmount)} based on till-date projection. Confirm pending bills, contracts and staff liability before surrender.`
    };
  }
  if (row.utilPct >= 85 || row.projectionGapRatio > 0.9) {
    return {
      key:'watch',
      label:'Watch List',
      cls:'bc-watch',
      remark:'Projection is close to ceiling or utilisation is high. Watch booking pace before next budget review stage.'
    };
  }
  return {
    key:'normal',
    label:'Normal Control',
    cls:'bc-normal',
    remark:'Projection is within current ceiling. Continue monthly control against the next budget review stage.'
  };
}

function buildBudgetControlRows() {
  const {actualMonths} = getMonthStatus();
  const elapsedFactor = fyElapsedFactor();
  const stage = budgetControlStage();
  return activePUMeta().map(pu => {
    const ceiling = getBudget(pu.code);
    const source = BUDGET[pu.code] || {};
    const actual = Number(source.actuals_till);
    const actualTill = Number.isFinite(actual) ? actual : compute(pu.code).totalCommitted;
    const projectedRequirement = Math.max(actualTill, elapsedFactor > 0 ? (actualTill / elapsedFactor) * 12 : actualTill);
    const varianceVsCeiling = projectedRequirement - ceiling;
    const askAmount = Math.max(0, varianceVsCeiling);
    const surrenderAmount = Math.max(0, ceiling - projectedRequirement);
    const utilPct = ceiling ? (actualTill / ceiling) * 100 : (actualTill ? 999 : 0);
    const noExpense = ceiling > 0 && Math.abs(actualTill) === 0;
    const noBudgetSpend = ceiling <= 0 && Math.abs(actualTill) > 0;
    const projectionGapRatio = ceiling ? projectedRequirement / Math.abs(ceiling) : 999;
    const row = {
      pu, stage, ceiling, actualTill, projectedRequirement, varianceVsCeiling,
      askAmount, surrenderAmount, utilPct, noExpense, noBudgetSpend,
      projectionGapRatio, elapsedFactor, actualMonthCount: actualMonths.length
    };
    return Object.assign(row, budgetControlStatus(row));
  }).sort((a,b) => {
    const rank = {ask:5, watch:4, noexpense:3, surrender:2, normal:1};
    return (rank[b.key] - rank[a.key]) ||
      (Math.max(b.askAmount, b.surrenderAmount) - Math.max(a.askAmount, a.surrenderAmount));
  });
}

function getFilteredBudgetControlRows() {
  const action = (document.getElementById('bcActionFilter') || {}).value || 'all';
  const type = (document.getElementById('bcTypeFilter') || {}).value || 'all';
  const liability = (document.getElementById('bcLiabilityFilter') || {}).value || 'all';
  const impact = (document.getElementById('bcImpactFilter') || {}).value || 'all';
  const minImpact = impact === 'all' ? 0 : Number(impact) * 100;
  return buildBudgetControlRows().filter(row => {
    if (!passesPUFocus(row.pu.code)) return false;
    if (action !== 'all' && row.key !== action) return false;
    if (type !== 'all' && row.pu.puType !== type) return false;
    if (liability !== 'all' && row.pu.liab !== liability) return false;
    if (minImpact && Math.max(row.askAmount, row.surrenderAmount) < minImpact) return false;
    return true;
  });
}

function renderBudgetControl() {
  const body = document.getElementById('bcTableBody');
  if (!body) return;
  const rows = getFilteredBudgetControlRows();
  const allRows = buildBudgetControlRows();
  const {actualMonths, cur} = getMonthStatus();
  const stage = budgetControlStage();
  const elapsedFactor = fyElapsedFactor();
  const monthLabels = actualMonths.map(m => FY_MONTH_LABELS[FY_MONTHS.indexOf(m)]).join(', ') || 'No completed month';
  const totals = allRows.reduce((t, r) => {
    t.ceiling += r.ceiling;
    t.actual += r.actualTill;
    t.projected += r.projectedRequirement;
    t.ask += r.askAmount;
    t.surrender += r.surrenderAmount;
    t[r.key] = (t[r.key] || 0) + 1;
    return t;
  }, {ceiling:0, actual:0, projected:0, ask:0, surrender:0});
  const filteredTotals = rows.reduce((t, r) => {
    t.ceiling += r.ceiling;
    t.actual += r.actualTill;
    t.projected += r.projectedRequirement;
    t.ask += r.askAmount;
    t.surrender += r.surrenderAmount;
    return t;
  }, {ceiling:0, actual:0, projected:0, ask:0, surrender:0});

  const meta = document.getElementById('bcMeta');
  if (meta) meta.textContent = `As on ${cur.label} ${cur.year}; projection uses actual till date over ${elapsedFactor.toFixed(2)} elapsed FY month(s). ${stage.note}`;
  const basis = document.getElementById('bcBasis');
  if (basis) basis.textContent = `${stage.label} | ${isRGActive() ? 'RG Active' : 'BG/BE Ceiling'}`;

  const flow = document.getElementById('bcFlow');
  if (flow) {
    const flowItems = [
      ['BG / BE','Original grant','April spending ceiling'],
      ['AR','August Review','First saving/excess review'],
      ['REA','Budget Asked','Railway demand to Board'],
      ['RG','Revised Grant','Board approved revised ceiling'],
      ['FME / FM','Final Modified Estimate','January realistic March forecast'],
      ['FG','Final Grant','Last authorised allocation'],
      ['Actual','March Closing','Appropriation Accounts']
    ];
    flow.innerHTML = flowItems.map(([t,s,n]) => `<div class="bc-step ${t.includes(stage.code) || stage.label.includes(t) ? 'active' : ''}"><strong>${t}</strong><span>${s}</span><em>${n}</em></div>`).join('');
  }

  const kpis = document.getElementById('bcKpis');
  if (kpis) {
    const util = totals.ceiling ? (totals.actual / totals.ceiling) * 100 : 0;
    kpis.innerHTML = [
      ['Current Ceiling', textCr(totals.ceiling), isRGActive() ? 'RG is active in data' : 'Using BG/BE until RG is available'],
      ['Actual Till Date', textCr(totals.actual), `${util.toFixed(1)}% of current ceiling`],
      ['Projected Requirement', textCr(totals.projected), `Till-date projection to 31 March`],
      ['Amount to Ask', textCr(totals.ask), `${totals.ask || 0 ? 'Requirement above ceiling' : 'No net excess projected'}`],
      ['Possible Surrender', textCr(totals.surrender), 'Subject to pending liabilities'],
      ['Current Stage', stage.label, stage.askLabel]
    ].map(([l,v,s]) => `<div class="bc-kpi"><div class="lbl">${l}</div><div class="val">${v}</div><div class="sub">${s}</div></div>`).join('');
  }

  const actionGrid = document.getElementById('bcActionGrid');
  if (actionGrid) {
    const actionCards = [
      ['ask','Ask From Board', totals.ask, totals.ask ? 'Requirement above current ceiling' : 'No excess projected'],
      ['surrender','Can Surrender', totals.surrender, 'Verify committed liability first'],
      ['noexpense','No Expense', totals.noexpense || 0, 'Budget exists, no actual'],
      ['watch','Watch List', totals.watch || 0, 'Close to ceiling'],
      ['normal','Normal', totals.normal || 0, 'Within control']
    ];
    actionGrid.innerHTML = actionCards.map(([cls,label,value,note]) => {
      const display = typeof value === 'number' && (cls === 'ask' || cls === 'surrender') ? textCr(value) : value;
      return `<button type="button" class="bc-action-card ${cls}" onclick="setBudgetControlAction('${cls}')"><strong>${display}</strong><span>${label}</span><em>${htmlSafe(note)}</em></button>`;
    }).join('');
  }

  const title = document.getElementById('bcTableTitle');
  if (title) title.textContent = `PU-wise Ask / Surrender Control Register - ${rows.length} PU(s) shown`;
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="11" style="text-align:center;color:#607080;padding:16px">No PU found for selected Budget Control filters.</td></tr>';
    refreshBIViewSoon();
    return;
  }
  const rowHtml = rows.map(r => `<tr class="${r.cls}${isImportantPU(r.pu.code) ? ' important-pu-row' : ''}">
    <td class="puc puc-link" onclick="openPUDetail('${r.pu.code}')">${htmlSafe(r.pu.code)}</td>
    <td class="desc">${htmlSafe(r.pu.desc)}</td>
    <td class="n">${textCr(r.ceiling)}</td>
    <td class="n">${textCr(r.actualTill)}</td>
    <td class="n">${textCr(r.projectedRequirement)}</td>
    <td class="n bp-var-excess">${r.askAmount ? textCr(r.askAmount) : '-'}</td>
    <td class="n bp-var-saving">${r.surrenderAmount ? textCr(r.surrenderAmount) : '-'}</td>
    <td>${htmlSafe(r.stage.askLabel)}</td>
    <td class="n">${r.ceiling ? r.utilPct.toFixed(1) + '%' : (r.actualTill ? 'No Budget' : '0.0%')}</td>
    <td><span class="bc-status ${r.cls}">${htmlSafe(r.label)}</span></td>
    <td class="bc-remark">${htmlSafe(r.remark)}</td>
  </tr>`).join('');
  body.innerHTML = rowHtml + `<tr class="tot ${filteredTotals.ask > filteredTotals.surrender ? 'bc-ask' : 'bc-surrender'}">
    <td colspan="2" style="text-align:left">TOTAL SHOWN PUs</td>
    <td class="n">${textCr(filteredTotals.ceiling)}</td>
    <td class="n">${textCr(filteredTotals.actual)}</td>
    <td class="n">${textCr(filteredTotals.projected)}</td>
    <td class="n">${textCr(filteredTotals.ask)}</td>
    <td class="n">${textCr(filteredTotals.surrender)}</td>
    <td>${htmlSafe(stage.askLabel)}</td>
    <td class="n">${filteredTotals.ceiling ? ((filteredTotals.actual / filteredTotals.ceiling) * 100).toFixed(1) + '%' : '0.0%'}</td>
    <td>Filtered Total</td>
    <td class="bc-remark">Ask and surrender are based on current till-date projection. Final proposal should be vetted against committed liabilities and pending bills.</td>
  </tr>`;
  setTimeout(applyMobileTableLabels, 50);
  refreshBIViewSoon();
}

function setBudgetControlAction(action) {
  const filter = document.getElementById('bcActionFilter');
  if (!filter) return;
  filter.value = action || 'all';
  renderBudgetControl();
}

function activeTabName() {
  const active = document.querySelector('.tab-content.active');
  return active ? active.id.replace('tab-', '') : 'liability';
}

function showFilterAlert(message) {
  let box = document.getElementById('filterAlert');
  if (!box) {
    box = document.createElement('div');
    box.id = 'filterAlert';
    box.className = 'filter-alert';
    document.body.appendChild(box);
  }
  box.textContent = message;
  box.classList.add('show');
  clearTimeout(showFilterAlert._timer);
  showFilterAlert._timer = setTimeout(() => box.classList.remove('show'), 3200);
}

function resetTopFilters() {
  const keepPUFocus = (document.getElementById('puFocusFilter') || {}).value || 'all';
  const defaults = {
    typeFilter: 'all',
    liabFilter: 'all',
    activityFilter: 'all',
    puFocusFilter: keepPUFocus,
    utilCompare: 'all',
    utilPctFilter: ''
  };
  Object.entries(defaults).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
}

function resetTrendFilters() {
  const pu = document.getElementById('trendPUSelect');
  const chart = document.getElementById('trendChartType');
  const top = document.getElementById('trendTopN');
  const py = document.getElementById('trendShowPY');
  const useBP = document.getElementById('trendUseBPPU');
  if (pu) pu.value = 'ALL';
  if (chart) chart.value = 'monthly';
  if (top) top.value = '10';
  if (py) py.checked = true;
  if (useBP) useBP.checked = false;
}

function resetAITrendFilters() {
  const scope = document.getElementById('aiTrendScope');
  if (scope) scope.value = 'priority';
}

function resetSMHFilters() {
  ['smhDeptFilter','smhCodeFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = 'all';
  });
  setSMHPUSelection('all', true);
  const mode = document.getElementById('smhViewMode');
  if (mode) mode.value = 'report';
}

function resetBPFilters() {
  const all = document.getElementById('bpPUAll');
  if (all) all.checked = true;
  document.querySelectorAll('#bpPUFilter .bp-pu-check').forEach(ch => { ch.checked = false; });
  ['bpStatusFilter','bpTypeFilter','bpLiabilityFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = 'all';
  });
  updateBPSelectionCount();
}

function resetBudgetControlFilters() {
  ['bcActionFilter','bcTypeFilter','bcLiabilityFilter','bcImpactFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = 'all';
  });
}

function resetFiltersForNavigation() {
  resetTopFilters();
  resetTrendFilters();
  resetAITrendFilters();
  resetSMHFilters();
  resetBPFilters();
  resetBudgetControlFilters();
}

function handleTopFilterChange(sourceLabel) {
  const tab = activeTabName();
  const supported = ['liability','monthwise','pumaster','smhdetail','bpanalysis','budgetcontrol','trend','aitrend','summary'];
  if (!supported.includes(tab)) {
    resetTopFilters();
    showFilterAlert(`${sourceLabel || 'This filter'} is not used on the current tab. Please use this page's own filters.`);
    return;
  }
  renderAll();
  if (tab === 'smhdetail' && typeof renderSMHDetail === 'function') renderSMHDetail();
  if (tab === 'bpanalysis' && typeof renderBPAnalysis === 'function') renderBPAnalysis();
  if (tab === 'budgetcontrol' && typeof renderBudgetControl === 'function') renderBudgetControl();
  if (tab === 'trend' && typeof renderTrend === 'function') renderTrend();
  if (tab === 'aitrend' && typeof renderAITrendSummary === 'function') renderAITrendSummary();
  refreshBIViewSoon();
}

// Tabs and report menu
const TAB_IDS = ['summary','liability','smhdetail','demandsmh','pumaster','monthwise','bpanalysis','budgetcontrol','trend','aitrend','remarks','upload'];

function syncReportNavigation(name) {
  document.querySelectorAll('[data-report-tab]').forEach(btn => {
    const active = btn.dataset.reportTab === name;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function jumpReport(name) {
  switchTab(name);
}

function initReportMenuButtons() {
  document.querySelectorAll('[data-report-tab]').forEach(btn => {
    if (btn.dataset.menuBound === '1') return;
    btn.dataset.menuBound = '1';
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const target = btn.dataset.reportTab;
      if (target) jumpReport(target);
    });
  });
  syncReportNavigation(activeTabName());
}

function setDashboardPinned(pinned) {
  const panel = document.getElementById('dashboardPanel');
  const pin = document.getElementById('dockPin');
  const toggle = document.getElementById('dockToggle');
  const state = document.getElementById('dockState');
  if (!panel || !pin || !toggle || !state) return;
  panel.classList.toggle('collapsed', !pinned);
  panel.classList.toggle('auto-hide', !pinned);
  document.body.classList.toggle('summary-auto', !pinned);
  pin.textContent = pinned ? 'PIN' : 'AUTO';
  pin.setAttribute('aria-pressed', pinned ? 'true' : 'false');
  toggle.setAttribute('aria-expanded', pinned ? 'true' : 'false');
  state.textContent = pinned ? 'PINNED' : 'AUTO-HIDE';
  try { sessionStorage.setItem('rlp_summary_pinned', pinned ? '1' : '0'); } catch(e) {}
}

function initDashboardDock() {
  const panel = document.getElementById('dashboardPanel');
  const pin = document.getElementById('dockPin');
  const toggle = document.getElementById('dockToggle');
  if (!panel || !pin || !toggle || pin.dataset.bound === '1') return;
  pin.dataset.bound = '1';
  let saved = '1';
  try { saved = sessionStorage.getItem('rlp_summary_pinned') || '1'; } catch(e) {}
  setDashboardPinned(saved !== '0');
  pin.addEventListener('click', () => {
    setDashboardPinned(pin.getAttribute('aria-pressed') !== 'true');
  });
  toggle.addEventListener('click', () => {
    setDashboardPinned(toggle.getAttribute('aria-expanded') !== 'true');
  });
  const dock = document.getElementById('dashboardDock');
  if (dock) {
    dock.addEventListener('dblclick', () => {
      setDashboardPinned(pin.getAttribute('aria-pressed') !== 'true');
    });
  }
}

const REPORT_LABELS = {
  summary:['Summary','Main points'],
  liability:['Main Report','Revenue Liability'],
  smhdetail:['DEPT-Demand','Department > Demand details'],
  demandsmh:['Demand SMH','Demand / SMH grant summary'],
  pumaster:['PU Master','Code reference'],
  monthwise:['Month-wise','Actuals and projection'],
  bpanalysis:['BP Analysis','Budget Proportionate'],
  budgetcontrol:['Budget Control','Saving/excess action'],
  trend:['Graphs','Trend Analysis Graphs'],
  aitrend:['AI Summary','PU risk remarks'],
  remarks:['Remarks','Sources and rules'],
  upload:['Upload','Admin data update']
};

function smartSearchItems() {
  const reportItems = Object.entries(REPORT_LABELS)
    .map(([key, val]) => ({type:'report', key, title:val[0], sub:val[1]}));
  const puItems = activePUMeta().map(pu => ({
    type:'pu',
    key:pu.code,
    title:`PU-${pu.code} ${pu.desc}`,
    sub:`${pu.puType} | ${pu.liab}`
  }));
  return reportItems.concat(puItems);
}

function renderQuickResults(term) {
  const box = document.getElementById('quickResults');
  if (!box) return;
  const q = String(term || '').trim().toLowerCase();
  if (!q) {
    box.classList.remove('show');
    box.innerHTML = '';
    return;
  }
  const results = smartSearchItems()
    .filter(item => (`${item.title} ${item.sub} ${item.key}`).toLowerCase().includes(q))
    .slice(0, 8);
  if (!results.length) {
    box.innerHTML = '<button class="quick-result" type="button"><strong>No match found</strong><small>Try PU code, report name or description</small></button>';
    box.classList.add('show');
    return;
  }
  box.innerHTML = results.map((item, idx) => `
    <button class="quick-result" type="button" data-search-index="${idx}">
      <strong>${htmlSafe(item.title)}</strong>
      <small>${htmlSafe(item.sub)}</small>
    </button>`).join('');
  box.classList.add('show');
  box.querySelectorAll('[data-search-index]').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = results[Number(btn.dataset.searchIndex)];
      if (!item) return;
      box.classList.remove('show');
      const input = document.getElementById('quickSearch');
      if (input) input.value = '';
      if (item.type === 'report') jumpReport(item.key);
      if (item.type === 'pu') openPUDetail(item.key);
    });
  });
}

function buildRiskSpotlightItems() {
  const rows = reportRowsForActivePUs();
  const over = rows.filter(r => r.over).sort((a,b) => Math.abs(b.balance) - Math.abs(a.balance))[0];
  const noExp = rows.filter(r => r.noExpense).sort((a,b) => b.budget - a.budget)[0];
  const highUtil = rows.filter(r => r.budget > 0).sort((a,b) => b.utilPct - a.utilPct)[0];
  const bigBalance = rows.filter(r => r.balance > 0).sort((a,b) => b.balance - a.balance)[0];
  const items = [];
  if (over) items.push({cls:'high', label:'Over Budget', pu:over.pu, value:textCr(Math.abs(over.balance)), sub:'Needs control/support'});
  if (noExp) items.push({cls:'warn', label:'No Expense', pu:noExp.pu, value:textCr(noExp.budget), sub:'Budget available'});
  if (highUtil) items.push({cls:highUtil.utilPct >= 100 ? 'high' : 'warn', label:'Top Util', pu:highUtil.pu, value:highUtil.utilPct.toFixed(1) + '%', sub:textCr(highUtil.actual)});
  if (bigBalance) items.push({cls:'good', label:'Largest Balance', pu:bigBalance.pu, value:textCr(bigBalance.balance), sub:'Available'});
  return items;
}

function renderRiskSpotlight() {
  const wrap = document.getElementById('riskItems');
  if (!wrap) return;
  const items = buildRiskSpotlightItems();
  wrap.innerHTML = items.map(item => `
    <button type="button" class="risk-chip ${item.cls}" data-risk-pu="${htmlSafe(item.pu.code)}">
      <span>${htmlSafe(item.label)}</span>
      <strong>PU-${htmlSafe(item.pu.code)} ${htmlSafe(item.value)}</strong>
      <small>${htmlSafe(item.sub)} | ${htmlSafe(item.pu.desc)}</small>
    </button>`).join('');
  wrap.querySelectorAll('[data-risk-pu]').forEach(btn => {
    btn.addEventListener('click', () => openPUDetail(btn.dataset.riskPu));
  });
}

function currentViewSnapshot() {
  return {
    tab: activeTabName(),
    mode: reportViewMode,
    top:{
      type:(document.getElementById('typeFilter') || {}).value || 'all',
      liab:(document.getElementById('liabFilter') || {}).value || 'all',
      activity:(document.getElementById('activityFilter') || {}).value || 'all',
      puFocus:(document.getElementById('puFocusFilter') || {}).value || 'all',
      utilCompare:(document.getElementById('utilCompare') || {}).value || 'all',
      utilPct:(document.getElementById('utilPctFilter') || {}).value || ''
    },
    smh:{
      dept:(document.getElementById('smhDeptFilter') || {}).value || 'all',
      demand:(document.getElementById('smhCodeFilter') || {}).value || 'all',
      pu:smhSelectedCodes(),
      mode:(document.getElementById('smhViewMode') || {}).value || 'report'
    },
    bp:{
      status:(document.getElementById('bpStatusFilter') || {}).value || 'all',
      type:(document.getElementById('bpTypeFilter') || {}).value || 'all',
      liability:(document.getElementById('bpLiabilityFilter') || {}).value || 'all'
    }
  };
}

function applyViewSnapshot(view) {
  if (!view) return;
  if (view.top) {
    const map = {typeFilter:view.top.type || 'all', liabFilter:view.top.liab || 'all', activityFilter:view.top.activity || 'all', puFocusFilter:view.top.puFocus || 'all', utilCompare:view.top.utilCompare || 'all', utilPctFilter:view.top.utilPct || ''};
    Object.entries(map).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.value = value; });
  }
  if (view.smh) {
    const map = {smhDeptFilter:view.smh.dept, smhCodeFilter:view.smh.demand, smhViewMode:view.smh.mode};
    Object.entries(map).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.value = value; });
    initSMHDetailFilters();
    applySMHPUSelection(view.smh.pu || view.smh.puCodes || ['all']);
  }
  if (view.bp) {
    const map = {bpStatusFilter:view.bp.status, bpTypeFilter:view.bp.type, bpLiabilityFilter:view.bp.liability};
    Object.entries(map).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.value = value; });
  }
  if (view.mode) setReportViewMode(view.mode);
  switchTab(view.tab || 'liability');
  setTimeout(() => {
    renderAll();
    if (view.tab === 'smhdetail') renderSMHDetail();
    if (view.tab === 'bpanalysis') renderBPAnalysis();
  }, 80);
}

function sessionViews() {
  try { return JSON.parse(sessionStorage.getItem('rlp_session_views') || '[]'); } catch(e) { return []; }
}

function saveSessionViews(views) {
  try { sessionStorage.setItem('rlp_session_views', JSON.stringify(views.slice(-12))); } catch(e) {}
}

function refreshSavedViews() {
  const sel = document.getElementById('savedViewSelect');
  if (!sel) return;
  const current = sel.value;
  const views = sessionViews();
  sel.innerHTML = '<option value="">Session Views</option>' + views.map((v, i) => `<option value="${i}">${htmlSafe(v.name)}</option>`).join('');
  sel.value = current;
}

function saveCurrentSessionView() {
  const tab = activeTabName();
  const label = (REPORT_LABELS[tab] || ['Current View'])[0];
  const now = new Date().toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});
  const views = sessionViews();
  views.push({name:`${label} - ${now}`, view:currentViewSnapshot()});
  saveSessionViews(views);
  refreshSavedViews();
  showFilterAlert('View saved for this browser session.');
}

const TOUR_STEPS = [
  ['Report Menu', 'Use these report boxes to jump directly to any major report without searching through filters.'],
  ['Quick Search', 'Type a PU code, PU name or report name. Select a result to open it immediately.'],
  ['Risk Spotlight', 'These cards surface urgent items like over-budget, no-expense and high-utilisation PUs.'],
  ['Summary Panel', 'Use PIN/AUTO to keep KPI cards open or auto-hide them for more table space.'],
  ['Officer Brief', 'Open a short higher-authority summary before downloading the full PDF report.']
];
let tourIndex = 0;

function showTourStep() {
  const bubble = document.getElementById('tourBubble');
  if (!bubble) return;
  const step = TOUR_STEPS[tourIndex] || TOUR_STEPS[0];
  const title = document.getElementById('tourTitle');
  const text = document.getElementById('tourText');
  if (title) title.textContent = `${tourIndex + 1}/${TOUR_STEPS.length} - ${step[0]}`;
  if (text) text.textContent = step[1];
  bubble.classList.add('show');
}

function closeTour() {
  const bubble = document.getElementById('tourBubble');
  if (bubble) bubble.classList.remove('show');
}

function startTour() {
  tourIndex = 0;
  showTourStep();
}

function openTopUtilisationBrief() {
  const rows = reportRowsForActivePUs()
    .filter(r => r.budget > 0 || r.actual !== 0)
    .sort((a,b) => b.utilPct - a.utilPct)
    .slice(0, 15);
  const top = rows[0];
  const bars = rows.map(r => {
    const pctVal = Math.max(0, Math.min(200, r.utilPct || 0));
    const col = r.utilPct >= 100 ? '#B00020' : r.utilPct >= 85 ? '#E85D04' : r.utilPct >= 60 ? '#C07000' : '#1A7A4A';
    const remark = r.over ? 'Over budget - control booking / seek support'
      : r.utilPct >= 85 ? 'High utilisation - watch before next booking'
      : r.noExpense ? 'Budget available but no expense'
      : 'Within current watch range';
    return `<div class="tu-row">
      <div class="tu-code">PU-${htmlSafe(r.pu.code)}</div>
      <div class="tu-main">
        <div class="tu-title">${htmlSafe(r.pu.desc)}</div>
        <div class="tu-bar"><span style="width:${Math.min(100,pctVal)}%;background:${col}"></span></div>
        <div class="tu-note">${htmlSafe(remark)}</div>
      </div>
      <div class="tu-val" style="color:${col}">${r.utilPct.toFixed(1)}%</div>
      <div class="tu-bal">${textCr(r.balance)}</div>
    </div>`;
  }).join('');
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Top Utilisation Brief | Revenue Liability Portal</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Tahoma,"Segoe UI",Arial,sans-serif;background:#F3F7FB;color:#0A1628;padding:18px}
    .brief-page{max-width:1120px;margin:0 auto;background:#fff;border:1px solid #D8E5F2;border-top:5px solid #C9A84C;border-radius:10px;box-shadow:0 10px 28px rgba(10,22,40,.12);overflow:hidden}
    .tu-head{background:#0A1628;color:#DDEEFF;padding:18px 22px;display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
    .tu-head h1{font-size:20px;color:#C9A84C;margin-bottom:4px}
    .tu-head p{font-size:11px;color:#A8C0D8}
    .tu-kpi{background:#FFF4C2;color:#071324;border-radius:8px;padding:10px 14px;text-align:center;min-width:150px}
    .tu-kpi span{display:block;font-size:9px;font-weight:900;text-transform:uppercase;color:#5A3E00}
    .tu-kpi strong{display:block;font-size:20px;margin-top:3px}
    .tu-body{padding:14px 18px}
    .tu-row{display:grid;grid-template-columns:70px minmax(0,1fr) 80px 110px;gap:12px;align-items:center;border:1px solid #E3ECF6;border-left:4px solid #1A4E9A;border-radius:8px;padding:10px;margin-bottom:8px;background:#F8FBFF}
    .tu-code{font-size:12px;font-weight:900;color:#123A63}
    .tu-title{font-size:12px;font-weight:900;color:#0A1628}
    .tu-bar{height:10px;background:#E8EFF8;border-radius:8px;overflow:hidden;margin:6px 0}
    .tu-bar span{display:block;height:100%;border-radius:8px}
    .tu-note{font-size:10px;color:#607080}
    .tu-val{font-size:14px;font-weight:900;text-align:right}
    .tu-bal{font-size:11px;font-weight:800;color:#33485F;text-align:right}
    .tu-footer{padding:10px 18px;border-top:1px solid #E3ECF6;font-size:10px;color:#607080;text-align:center}
    @media(max-width:700px){.tu-row{grid-template-columns:1fr}.tu-val,.tu-bal{text-align:left}.tu-head{display:block}.tu-kpi{margin-top:10px}}
  </style></head><body><div class="brief-page">
    <div class="tu-head">
      <div><h1>Top Utilisation Brief</h1><p>PU-wise high utilisation position for higher authority review. Figures are based on current portal data.</p></div>
      <div class="tu-kpi"><span>Highest Utilisation</span><strong>${top ? top.utilPct.toFixed(1) + '%' : '0.0%'}</strong><small>${top ? 'PU-' + htmlSafe(top.pu.code) + ' ' + htmlSafe(top.pu.desc) : 'No data'}</small></div>
    </div>
    <div class="tu-body">${bars || '<div class="tu-row">No utilisation data available.</div>'}</div>
    <div class="tu-footer">Revenue Liability Portal - Moradabad Division / Northern Railway - Generated ${new Date().toLocaleString('en-IN')}</div>
  </div></body></html>`;
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  } else {
    showFilterAlert('Popup blocked. Please allow popup to open Top Utilisation Brief.');
  }
}

function buildOfficerBriefData() {
  const rows = reportRowsForActivePUs();
  const totals = rows.reduce((t, r) => {
    t.budget += r.budget; t.actual += r.actual; t.balance += r.balance;
    return t;
  }, {budget:0, actual:0, balance:0});
  totals.util = totals.budget ? totals.actual / totals.budget * 100 : 0;
  const highWatchAll = rows.filter(r => r.high).sort((a,b) => Math.abs(b.balance) - Math.abs(a.balance));
  const overAll = rows.filter(r => r.over).sort((a,b) => Math.abs(b.balance) - Math.abs(a.balance));
  const noExpAll = rows.filter(r => r.noExpense).sort((a,b) => b.budget - a.budget);
  const high = rows.filter(r => r.budget > 0).sort((a,b) => b.utilPct - a.utilPct).slice(0, 5);
  const over = overAll.slice(0, 5);
  const noExp = noExpAll.slice(0, 5);
  const bcRows = typeof buildBudgetControlRows === 'function' ? buildBudgetControlRows() : [];
  const askTotal = bcRows.reduce((s,r) => s + (r.askAmount || 0), 0);
  const surrenderTotal = bcRows.reduce((s,r) => s + (r.surrenderAmount || 0), 0);
  const topAsk = bcRows.filter(r => r.askAmount > 0).sort((a,b) => b.askAmount - a.askAmount)[0];
  const topSurrender = bcRows.filter(r => r.surrenderAmount > 0).sort((a,b) => b.surrenderAmount - a.surrenderAmount)[0];
  const topUtil = high[0];
  return {rows, totals, highWatchAll, overAll, noExpAll, high, over, noExp, askTotal, surrenderTotal, topAsk, topSurrender, topUtil};
}

function openOfficerBriefPDF() {
  const d = buildOfficerBriefData();
  const {cur, actualMonths} = getMonthStatus();
  const generated = new Date().toLocaleString('en-IN');
  const explainRows = [
    ['High / Watch PUs', `${d.highWatchAll.length}`, d.highWatchAll[0] ? `Top: PU-${d.highWatchAll[0].pu.code} ${d.highWatchAll[0].pu.desc}` : 'No high/watch PU', 'PUs requiring close monitoring due to over-budget position, high utilisation, no-budget spend or other risk signals. These should be reviewed before next booking cycle.'],
    ['Over Budget', `${d.overAll.length}`, d.overAll[0] ? `PU-${d.overAll[0].pu.code}: ${textCr(Math.abs(d.overAll[0].balance))} over` : 'No over-budget PU', 'Items where committed expenditure has crossed the available budget ceiling. Booking control or additional budget support may be needed.'],
    ['Budget, No Expense', `${d.noExpAll.length}`, d.noExpAll[0] ? `Largest: PU-${d.noExpAll[0].pu.code} ${textCr(d.noExpAll[0].budget)}` : 'No no-expense item', 'Budget provision exists but no actual expenditure is visible. Confirm whether liability is pending or saving can be proposed.'],
    ['Amount to Ask', textCr(d.askTotal), d.topAsk ? `Top ask: PU-${d.topAsk.pu.code} ${textCr(d.topAsk.askAmount)}` : 'No additional grant projected', 'Projection indicates requirement above current budget ceiling. This is the amount to examine for AR/REA/RG/FME support.'],
    ['Possible Surrender', textCr(d.surrenderTotal), d.topSurrender ? `Top saving: PU-${d.topSurrender.pu.code} ${textCr(d.topSurrender.surrenderAmount)}` : 'No surrender signal projected', 'Projected saving against current ceiling. Confirm pending bills and committed liability before surrender proposal.'],
    ['Top Utilisation', d.topUtil ? d.topUtil.utilPct.toFixed(1) + '%' : '0.0%', d.topUtil ? `PU-${d.topUtil.pu.code} ${d.topUtil.pu.desc}` : 'No utilisation data', 'Highest utilisation head by current portal data. This needs special monitoring if it is near or above budget ceiling.']
  ];
  const cards = explainRows.map(([title,value,note]) => `<div class="ob-card"><span>${htmlSafe(title)}</span><strong>${htmlSafe(value)}</strong><small>${htmlSafe(note)}</small></div>`).join('');
  const explanations = explainRows.map(([title,value,note,explain]) => `<tr><td>${htmlSafe(title)}</td><td>${htmlSafe(value)}</td><td>${htmlSafe(note)}</td><td>${htmlSafe(explain)}</td></tr>`).join('');
  const watchList = (d.over.length ? d.over : d.high).map(r => `<tr><td>PU-${htmlSafe(r.pu.code)}</td><td>${htmlSafe(r.pu.desc)}</td><td>${textCr(r.balance)}</td><td>${r.utilPct.toFixed(1)}%</td><td>${r.over ? 'Over budget / support required' : 'High utilisation watch'}</td></tr>`).join('');
  const noExpRows = d.noExp.map(r => `<tr><td>PU-${htmlSafe(r.pu.code)}</td><td>${htmlSafe(r.pu.desc)}</td><td>${textCr(r.budget)}</td><td>Budget available but no actual expense booked</td></tr>`).join('');
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Officer Brief PDF | Revenue Liability Portal</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Tahoma,"Segoe UI",Arial,sans-serif;background:#F3F7FB;color:#0A1628;padding:16px}
    .page{max-width:1160px;margin:0 auto;background:#fff;border:1px solid #D8E5F2;border-top:5px solid #C9A84C;border-radius:10px;overflow:hidden;box-shadow:0 12px 30px rgba(10,22,40,.12)}
    .head{background:#0A1628;color:#DDEEFF;padding:18px 22px;display:flex;justify-content:space-between;gap:16px}
    h1{font-size:20px;color:#C9A84C;margin-bottom:4px}
    .head p{font-size:11px;color:#A8C0D8;line-height:1.45}
    .print{border:1px solid #C9A84C;background:#FFF4C2;color:#071324;border-radius:7px;padding:8px 12px;font-size:11px;font-weight:900;cursor:pointer;height:34px}
    .body{padding:16px 18px}
    .kpis,.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}
    .cards{grid-template-columns:repeat(3,1fr)}
    .kpi,.ob-card{border:1px solid #D8E5F2;border-left:4px solid #1A4E9A;border-radius:8px;background:#F8FBFF;padding:10px}
    .ob-card:nth-child(2),.ob-card:nth-child(4){border-left-color:#B00020}.ob-card:nth-child(3){border-left-color:#B88700}.ob-card:nth-child(5){border-left-color:#1A7A4A}.ob-card:nth-child(6){border-left-color:#E85D04}
    span{display:block;font-size:8px;font-weight:900;color:#607080;text-transform:uppercase}
    strong{display:block;font-size:17px;color:#0A1628;margin:4px 0;font-weight:900}
    small{display:block;font-size:10px;color:#496276;line-height:1.35}
    .sec{margin-top:12px;border:1px solid #D8E5F2;border-radius:8px;overflow:hidden}
    .sec h2{background:#1A3A6A;color:#DDEEFF;font-size:12px;padding:8px 10px}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{background:#2474B8;color:#fff;text-align:left;padding:7px;border:1px solid #B8D0E8}
    td{padding:7px;border:1px solid #D2E0EF;vertical-align:top;line-height:1.35}
    .foot{text-align:center;font-size:9px;color:#607080;padding:10px;border-top:1px solid #D8E5F2}
    @page{size:A4 landscape;margin:10mm}
    @media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0}.print{display:none}.body{padding:10px}.sec{break-inside:avoid}.kpis,.cards{gap:6px}.kpi,.ob-card{padding:8px}strong{font-size:14px}td,th{font-size:8.5px;padding:5px}}
  </style></head><body><div class="page">
    <div class="head"><div><h1>Officer Brief</h1><p>Revenue Liability Portal - Moradabad Division / Northern Railway<br>FY 2026-27 | Current month: ${cur.label} ${cur.year} | Completed months: ${actualMonths.length} | Generated: ${generated}</p></div><button class="print" onclick="window.print()">Print / Save PDF</button></div>
    <div class="body">
      <div class="kpis">
        <div class="kpi"><span>Gross Budget</span><strong>${textCr(d.totals.budget)}</strong><small>Active operational PU budget</small></div>
        <div class="kpi"><span>Actual Till Date</span><strong>${textCr(d.totals.actual)}</strong><small>Committed / actual visible in portal</small></div>
        <div class="kpi"><span>Balance</span><strong>${textCr(d.totals.balance)}</strong><small>Budget less committed</small></div>
        <div class="kpi"><span>Utilisation</span><strong>${d.totals.util.toFixed(1)}%</strong><small>Actual against budget</small></div>
      </div>
      <div class="cards">${cards}</div>
      <div class="sec"><h2>Brief Explanation of Each Point</h2><table><thead><tr><th>Point</th><th>Value</th><th>Current Signal</th><th>Brief Meaning / Action</th></tr></thead><tbody>${explanations}</tbody></table></div>
      <div class="sec"><h2>Top Over Budget / Watch PUs</h2><table><thead><tr><th>PU</th><th>Description</th><th>Balance</th><th>Utilisation</th><th>Action Remark</th></tr></thead><tbody>${watchList || '<tr><td colspan="5">No major watch item found.</td></tr>'}</tbody></table></div>
      <div class="sec"><h2>Budget Available But No Expense</h2><table><thead><tr><th>PU</th><th>Description</th><th>Budget</th><th>Remark</th></tr></thead><tbody>${noExpRows || '<tr><td colspan="4">No major no-expense item found.</td></tr>'}</tbody></table></div>
    </div>
    <div class="foot">For Official Use Only - Revenue Liability Portal</div>
  </div></body></html>`;
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => { try { w.print(); } catch(e) {} }, 250);
  } else {
    showFilterAlert('Popup blocked. Please allow popup to open Officer Brief PDF.');
  }
}

function renderOfficerBrief() {
  const body = document.getElementById('officerBriefBody');
  if (!body) return;
  const d = buildOfficerBriefData();
  const {totals, highWatchAll, overAll, noExpAll, high, over, noExp, askTotal, surrenderTotal, topAsk, topSurrender, topUtil} = d;
  body.innerHTML = `
    <div class="brief-kpis">
      <div class="brief-kpi"><span>Gross Budget</span><strong>${textCr(totals.budget)}</strong></div>
      <div class="brief-kpi"><span>Actual Till Date</span><strong>${textCr(totals.actual)}</strong></div>
      <div class="brief-kpi"><span>Balance</span><strong>${textCr(totals.balance)}</strong></div>
      <div class="brief-kpi"><span>Utilisation</span><strong>${totals.util.toFixed(1)}%</strong></div>
    </div>
    <div class="brief-exec-grid">
      <div class="brief-exec-card risk"><span>High / Watch PUs</span><strong>${highWatchAll.length}</strong><small>${highWatchAll[0] ? `Top: PU-${htmlSafe(highWatchAll[0].pu.code)} ${htmlSafe(highWatchAll[0].pu.desc)}` : 'No high/watch PU'}</small></div>
      <div class="brief-exec-card danger"><span>Over Budget</span><strong>${overAll.length}</strong><small>${overAll[0] ? `PU-${htmlSafe(overAll[0].pu.code)}: ${textCr(Math.abs(overAll[0].balance))} over` : 'No over-budget PU'}</small></div>
      <div class="brief-exec-card warn"><span>Budget, No Expense</span><strong>${noExpAll.length}</strong><small>${noExpAll[0] ? `Largest: PU-${htmlSafe(noExpAll[0].pu.code)} ${textCr(noExpAll[0].budget)}` : 'No no-expense item'}</small></div>
      <div class="brief-exec-card danger"><span>Amount to Ask</span><strong>${textCr(askTotal)}</strong><small>${topAsk ? `Top ask: PU-${htmlSafe(topAsk.pu.code)} ${textCr(topAsk.askAmount)}` : 'No additional grant projected'}</small></div>
      <div class="brief-exec-card good"><span>Possible Surrender</span><strong>${textCr(surrenderTotal)}</strong><small>${topSurrender ? `Top saving: PU-${htmlSafe(topSurrender.pu.code)} ${textCr(topSurrender.surrenderAmount)}` : 'No surrender signal projected'}</small></div>
      <button type="button" class="brief-exec-card clickable risk" onclick="openTopUtilisationBrief()"><span>Top Utilisation</span><strong>${topUtil ? topUtil.utilPct.toFixed(1) + '%' : '0.0%'}</strong><small>${topUtil ? `PU-${htmlSafe(topUtil.pu.code)} ${htmlSafe(topUtil.pu.desc)} - click for brief` : 'Click for brief page'}</small></button>
    </div>
    <div class="brief-list"><h4>Priority Observations</h4><ul>
      <li>${over.length} PU(s) are over budget or require close control.</li>
      <li>${noExp.length} major PU(s) have budget available but no expense booked.</li>
      <li>Highest utilisation PU: ${high[0] ? `PU-${high[0].pu.code} at ${high[0].utilPct.toFixed(1)}%` : 'not available'}.</li>
      <li>Use the full PDF Report for detailed annexures and source notes.</li>
    </ul></div>
    <div class="brief-list"><h4>Top Over Budget / Watch PUs</h4><ul>
      ${(over.length ? over : high).map(r => `<li>PU-${htmlSafe(r.pu.code)} ${htmlSafe(r.pu.desc)} - balance ${textCr(r.balance)}, utilisation ${r.utilPct.toFixed(1)}%</li>`).join('')}
    </ul></div>
    <div class="brief-list"><h4>Budget Available But No Expense</h4><ul>
      ${noExp.length ? noExp.map(r => `<li>PU-${htmlSafe(r.pu.code)} ${htmlSafe(r.pu.desc)} - budget ${textCr(r.budget)}</li>`).join('') : '<li>No major no-expense item found in current view.</li>'}
    </ul></div>`;
}

function openOfficerBrief() {
  renderOfficerBrief();
  const modal = document.getElementById('officerBriefModal');
  if (modal) {
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function closeOfficerBrief() {
  const modal = document.getElementById('officerBriefModal');
  if (modal) {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }
}

function initSmartTools() {
  const quick = document.getElementById('quickSearch');
  if (quick && quick.dataset.bound !== '1') {
    quick.dataset.bound = '1';
    quick.addEventListener('input', () => renderQuickResults(quick.value));
    quick.addEventListener('keydown', e => {
      if (e.key === 'Escape') renderQuickResults('');
    });
  }
  const saveBtn = document.getElementById('saveViewBtn');
  if (saveBtn && saveBtn.dataset.bound !== '1') {
    saveBtn.dataset.bound = '1';
    saveBtn.addEventListener('click', saveCurrentSessionView);
  }
  const savedSel = document.getElementById('savedViewSelect');
  if (savedSel && savedSel.dataset.bound !== '1') {
    savedSel.dataset.bound = '1';
    savedSel.addEventListener('change', () => {
      const idx = Number(savedSel.value);
      const item = sessionViews()[idx];
      if (item) applyViewSnapshot(item.view);
    });
  }
  const tourBtn = document.getElementById('startTourBtn');
  if (tourBtn && tourBtn.dataset.bound !== '1') {
    tourBtn.dataset.bound = '1';
    tourBtn.addEventListener('click', startTour);
  }
  const tourNext = document.getElementById('tourNextBtn');
  if (tourNext && tourNext.dataset.bound !== '1') {
    tourNext.dataset.bound = '1';
    tourNext.addEventListener('click', () => {
      tourIndex = (tourIndex + 1) % TOUR_STEPS.length;
      showTourStep();
    });
  }
  const tourClose = document.getElementById('tourCloseBtn');
  if (tourClose && tourClose.dataset.bound !== '1') {
    tourClose.dataset.bound = '1';
    tourClose.addEventListener('click', closeTour);
  }
  const briefBtn = document.getElementById('officerBriefBtn');
  if (briefBtn && briefBtn.dataset.bound !== '1') {
    briefBtn.dataset.bound = '1';
    briefBtn.addEventListener('click', openOfficerBrief);
  }
  const briefPdfBtn = document.getElementById('briefPdfBtn');
  if (briefPdfBtn && briefPdfBtn.dataset.bound !== '1') {
    briefPdfBtn.dataset.bound = '1';
    briefPdfBtn.addEventListener('click', openOfficerBriefPDF);
  }
  const briefClose = document.getElementById('briefCloseBtn');
  if (briefClose && briefClose.dataset.bound !== '1') {
    briefClose.dataset.bound = '1';
    briefClose.addEventListener('click', closeOfficerBrief);
  }
  refreshSavedViews();
  renderRiskSpotlight();
}

function switchTab(name) {
  if (name === 'upload' && !isUploadAdminUnlocked()) {
    requestUploadAdmin();
    return;
  }
  if (name !== activeTabName()) resetFiltersForNavigation();
  if(name==='summary'){setTimeout(renderSummaryPage,80);}
  if(name==='trend'){setTimeout(renderTrend,80);}
  if(name==='aitrend'){setTimeout(renderAITrendSummary,80);}
  if(name==='bpanalysis'){setTimeout(renderBPAnalysis,80);}
  if(name==='budgetcontrol'){setTimeout(renderBudgetControl,80);}
  if(name==='demandsmh'){setTimeout(renderDemandSMHSummary,80);}
  if(name==='remarks'){setTimeout(renderRemarks,80);}
  document.querySelectorAll('.tab').forEach((t,i) => {
    t.classList.toggle('active', TAB_IDS[i]===name);
  });
  syncReportNavigation(name);
  document.querySelectorAll('.tab-content').forEach(tc => {
    tc.classList.toggle('active', tc.id==='tab-'+name);
  });
  if(_pp){ _pp.style.opacity='0'; _pp.style.transform='translateY(6px)'; }
  if(['liability','monthwise','pumaster'].includes(name)){setTimeout(renderAll,50);}
  if(name==='upload') renderCurDataGrid();
  if(name==='smhdetail'){setTimeout(renderSMHDetail,80);}
  setTimeout(applyMobileTableLabels, 140);
  setTimeout(renderBIView, 160);
}

window.jumpReport = jumpReport;
window.switchTab = switchTab;

function textCr(n) {
  if (!n || isNaN(n)) return '0.00 Cr';
  return ((n * 1000) / 10000000).toFixed(2) + ' Cr';
}

function pctChangeText(curVal, baseVal) {
  if (!baseVal) return curVal ? 'new spend pattern' : 'no movement';
  const pctVal = ((curVal - baseVal) / Math.abs(baseVal)) * 100;
  return (pctVal >= 0 ? '+' : '') + pctVal.toFixed(1) + '%';
}

function signedCr(n) {
  const value = Number(n) || 0;
  if (!value) return '0.00 Cr';
  return (value > 0 ? '+' : '-') + textCr(Math.abs(value));
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function htmlSafe(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[ch]));
}

function trendRiskClass(item) {
  if (item.overSpent || item.noBudgetSpend || item.utilPct >= 100) return 'high';
  if (item.utilPct >= 85 || item.balanceRatio < 0.1 || item.projRise) return 'watch';
  return 'ok';
}

function includeInAITrendSummary(pu) {
  const isCommittedStaff = pu.puType === 'Staff PU' && String(pu.liab).includes('Committed');
  return isActiveDisplayPU(pu) && !isCommittedStaff;
}

function buildAITrendItems() {
  const {cur} = getMonthStatus();
  const prevIdx = Math.max(0, cur.idx - 1);
  const prevKey = FY_MONTHS[prevIdx];
  const curKey = cur.key;
  const prevLabel = FY_MONTH_LABELS[prevIdx];
  const curLabel = cur.label;
  const compareMonthKeys = FY_MONTHS.slice(0, cur.idx + 1);
  const compareMonthLabels = FY_MONTH_LABELS.slice(0, cur.idx + 1);

  return PU_META.filter(pu => includeInAITrendSummary(pu) && passesPUFocus(pu.code)).map(pu => {
    const md = MONTH[pu.code] || {};
    const py = MONTH_PY[pu.code] || {};
    const cv = compute(pu.code);
    const budget = cv.budget || 0;
    const cyPrev = Number(md[prevKey]) || 0;
    const cyCurRaw = Number(md[curKey]) || 0;
    const cyCur = Math.max(cyCurRaw, cv.curCommitted || 0);
    const pyPrev = Number(py[prevKey]) || 0;
    const pyCur = Number(py[curKey]) || 0;
    const monthRows = compareMonthKeys.map((key, idx) => {
      const cyMonth = idx === cur.idx ? cyCur : (Number(md[key]) || 0);
      const pyMonth = Number(py[key]) || 0;
      return {
        key,
        label: compareMonthLabels[idx],
        cy: cyMonth,
        py: pyMonth,
        diff: cyMonth - pyMonth,
        pct: pyMonth ? ((cyMonth - pyMonth) / Math.abs(pyMonth)) * 100 : null
      };
    });
    const cySamePeriod = monthRows.reduce((s,r) => s + r.cy, 0);
    const pySamePeriod = monthRows.reduce((s,r) => s + r.py, 0);
    const cyTotalAsOn = cv.totalCommitted || cySamePeriod;
    const pyTotalAsOn = pySamePeriod;
    const ytdDiff = cyTotalAsOn - pyTotalAsOn;
    const avgCyMonth = monthRows.length ? cySamePeriod / monthRows.length : 0;
    const utilPct = budget ? Math.abs((cv.totalCommitted / budget) * 100) : (cv.totalCommitted ? 999 : 0);
    const balanceRatio = budget ? cv.balanceBudget / Math.abs(budget) : 0;
    const overSpent = cv.balanceBudget < 0;
    const noBudgetSpend = budget === 0 && cv.totalCommitted !== 0;
    const projRise = avgCyMonth > 0 && cv.projPerMonth > avgCyMonth * 1.15;
    const budgetNoExpense = budget > 0 && Math.abs(cyTotalAsOn) === 0;
    const risk = budgetNoExpense ? 'watch' : trendRiskClass({overSpent, noBudgetSpend, utilPct, balanceRatio, projRise});

    return {
      pu, cv, budget, cyPrev, cyCur, pyPrev, pyCur, utilPct, balanceRatio,
      overSpent, noBudgetSpend, projRise, risk, prevLabel, curLabel,
      monthRows, cyTotalAsOn, pyTotalAsOn, ytdDiff, budgetNoExpense, avgCyMonth
    };
  }).sort((a,b) => {
    const riskScore = {high:3, watch:2, ok:1};
    return (riskScore[b.risk] - riskScore[a.risk]) ||
      (Math.abs(b.utilPct) - Math.abs(a.utilPct)) ||
      (Math.abs(b.cv.balanceBudget) - Math.abs(a.cv.balanceBudget));
  });
}

function renderAITrendSummary() {
  const wrap = document.getElementById('aiTrendSummary');
  if (!wrap) return;
  const scope = (document.getElementById('aiTrendScope') || {}).value || 'priority';
  const allItems = buildAITrendItems();
  const items = scope === 'all'
    ? allItems
    : scope === 'over'
      ? allItems.filter(x => x.risk === 'high' || x.risk === 'watch')
      : allItems.slice(0, 18);
  const meta = document.getElementById('aiTrendMeta');
  if (meta) {
    const sample = allItems[0];
    meta.textContent = sample
      ? `PU-wise ${sample.curLabel} as-on review: CY vs PY month trend, actuals, utilisation, overspend and liability projection`
      : 'PU-wise current year, previous year and projection risk summary';
  }
  if (!items.length) {
    wrap.innerHTML = '<div class="ai-pu-card risk-ok"><ul class="ai-bullets"><li>No high-risk or watch-list PU found for the selected scope.</li></ul></div>';
    refreshBIViewSoon();
    return;
  }
  wrap.innerHTML = items.map(item => {
    const riskLabel = item.risk === 'high' ? 'High Risk' : item.risk === 'watch' ? 'Watch' : 'Normal';
    const riskClass = item.risk === 'high' ? 'high' : item.risk === 'watch' ? 'watch' : 'ok';
    const cyMove = item.cyCur - item.cyPrev;
    const pyMove = item.pyCur - item.pyPrev;
    const yoyMove = item.cyCur - item.pyCur;
    const ytdPct = pctChangeText(item.cyTotalAsOn, item.pyTotalAsOn);
    const monthTable = item.monthRows.map(r => {
      const pctText = r.pct === null ? (r.cy ? 'new' : '-') : (r.pct >= 0 ? '+' : '') + r.pct.toFixed(1) + '%';
      const cls = r.diff > 0 ? 'up' : r.diff < 0 ? 'down' : '';
      return `<tr>
        <td>${htmlSafe(r.label)}</td>
        <td>${textCr(r.cy)}</td>
        <td>${textCr(r.py)}</td>
        <td class="${cls}">${signedCr(r.diff)}</td>
        <td class="${cls}">${htmlSafe(pctText)}</td>
      </tr>`;
    }).join('');
    const projectionImpact = item.noBudgetSpend
      ? 'Expense is booked without budget provision; budget allocation review is needed.'
      : item.budgetNoExpense
        ? 'Budget is available but no expense is booked yet; review whether work/order booking is pending.'
        : item.overSpent
          ? `Overspent by ${textCr(Math.abs(item.cv.balanceBudget))}; control further booking or arrange budget support.`
          : `Balance is ${textCr(item.cv.balanceBudget)} and remaining projection is ${textCr(item.cv.projPerMonth)} per month.`;
    const spendStatus = item.noBudgetSpend
      ? 'Spend booked without available budget.'
      : item.budgetNoExpense
        ? 'Budget exists but no CY actual expense is booked.'
      : item.utilPct >= 100
        ? 'Budget already fully consumed or exceeded.'
        : item.utilPct >= 85
          ? 'High utilisation; monitor before next booking cycle.'
          : 'Within current utilisation range.';
    const liabilityLine = item.overSpent
      ? 'Liability pressure is already above budget.'
      : item.utilPct >= 85
        ? 'Liability pressure is high; remaining balance may become tight.'
        : item.budgetNoExpense
          ? 'No liability trend yet; projection depends on future booking.'
          : 'Liability trend is manageable at current run rate.';
    return `<div class="ai-pu-card risk-${riskClass}">
      <div class="ai-pu-head">
        <div class="ai-pu-title">PU-${htmlSafe(item.pu.code)} - ${htmlSafe(item.pu.desc)}</div>
        <span class="ai-risk ${riskClass}">${riskLabel}</span>
      </div>
      <div class="ai-kpi-row">
        <div><span>CY Actual as on</span><strong>${textCr(item.cyTotalAsOn)}</strong></div>
        <div><span>PY Same Period</span><strong>${textCr(item.pyTotalAsOn)}</strong></div>
        <div><span>Utilisation</span><strong>${item.utilPct.toFixed(1)}%</strong></div>
        <div><span>Balance</span><strong>${textCr(item.cv.balanceBudget)}</strong></div>
      </div>
      <div class="ai-month-table-wrap">
        <table class="ai-month-table">
          <thead><tr><th>Month</th><th>CY</th><th>PY</th><th>Diff</th><th>YoY</th></tr></thead>
          <tbody>${monthTable}</tbody>
        </table>
      </div>
      <ul class="ai-bullets">
        <li><strong>Current month movement:</strong> CY ${item.prevLabel} to ${item.curLabel} moved from ${textCr(item.cyPrev)} to ${textCr(item.cyCur)} (${signedCr(cyMove)}); PY moved ${signedCr(pyMove)} for the same month pair.</li>
        <li><strong>CY vs PY as-on:</strong> CY total is ${textCr(item.cyTotalAsOn)} against PY same-period ${textCr(item.pyTotalAsOn)} (${ytdPct}; difference ${signedCr(item.ytdDiff)}).</li>
        <li><strong>Current month vs PY:</strong> ${item.curLabel} CY is ${textCr(item.cyCur)} against ${textCr(item.pyCur)} in PY (${pctChangeText(item.cyCur, item.pyCur)}; difference ${signedCr(yoyMove)}).</li>
        <li><strong>Budget and overspend:</strong> Budget ${textCr(item.budget)}, utilisation ${item.utilPct.toFixed(1)}%, balance ${textCr(item.cv.balanceBudget)}. ${spendStatus}</li>
        <li><strong>Liability AI analysis:</strong> ${projectionImpact} ${liabilityLine}</li>
      </ul>
    </div>`;
  }).join('');
}

function detailCr(value) {
  const n = Number(value) || 0;
  return (n / 10000).toFixed(2) + ' Cr';
}

function detailNum(value) {
  const n = Math.round(Number(value) || 0);
  return n ? n.toLocaleString('en-IN') : '-';
}

function detailBalanceClass(balance, budget) {
  if (balance < 0) return 'bal-neg';
  if (budget && balance < budget * 0.1) return 'bal-low';
  return 'bal-ok';
}
function isSMHBudgetNoExpense(rowOrTotal) {
  return (Number(rowOrTotal.budget) || 0) > 0 && Math.abs(Number(rowOrTotal.actualTill) || 0) === 0;
}

function noExpenseStatus(flag) {
  return flag ? 'Budget Available, No Expenses' : '';
}

function detailStatusText(rowOrTotal) {
  const budget = Number(rowOrTotal.budget) || 0;
  const actualTill = Number(rowOrTotal.actualTill) || 0;
  if (budget > 0 && Math.abs(actualTill) === 0) return 'Budget Available, No Expenses';
  if (budget === 0 && Math.abs(actualTill) !== 0) return 'No Budget, Expense Booked';
  if (budget - actualTill < 0) return 'Over Budget';
  return 'Within Budget';
}

function smhDemandCode(smhValue) {
  const raw = String(smhValue || '').trim();
  const code = (raw.match(/SMH\s*-\s*(.+)$/i) || [])[1] || raw.replace(/^SMH\s*/i, '').replace(/^-/, '').trim();
  const norm = code.trim().toUpperCase();
  const match = demandSMHRows().find(r => String(r.smh || '').trim().toUpperCase() === norm);
  const demand = match ? String(match.demand || '').trim().replace(/^Demand\s*/i, '') : '';
  return demand ? `DEMAND ${demand}/SMH-${norm}` : `SMH-${norm}`;
}

function detailBPStatus(rowOrTotal) {
  const {actualMonths} = getMonthStatus();
  const monthCount = actualMonths.length;
  const budget = Number(rowOrTotal.budget) || 0;
  const actualTill = Number(rowOrTotal.actualTill) || 0;
  const bp = (budget / 12) * monthCount;
  const variance = actualTill - bp;
  const overFullBudget = budget > 0 && actualTill > budget;
  const noExpense = budget > 0 && Math.abs(actualTill) === 0;
  const status = overFullBudget ? 'Over Full Budget'
    : noExpense ? 'Budget, No Expense'
    : variance > 0 ? 'Excess vs BP'
    : variance < 0 ? 'Saving vs BP'
    : 'On BP';
  const remark = overFullBudget ? 'Actual has crossed full year budget.'
    : noExpense ? 'Budget is available but no actual expense is booked.'
    : variance > 0 ? 'Actual spending is ahead of proportionate budget.'
    : variance < 0 ? 'Actual spending is below proportionate budget.'
    : 'Actual is aligned with proportionate budget.';
  return {bp, variance, status, remark, monthCount};
}

function smhSelectedCodes() {
  const all = document.getElementById('smhPUAll');
  if (!all) return ['all'];
  if (all.checked) return ['all'];
  return Array.from(document.querySelectorAll('#smhPUFilter .smh-pu-check:checked')).map(o => o.value);
}

function updateSMHPUSelectionCount() {
  const all = document.getElementById('smhPUAll');
  const count = document.getElementById('smhPUCount');
  const inline = document.getElementById('smhPUCountInline');
  const checks = Array.from(document.querySelectorAll('#smhPUFilter .smh-pu-check'));
  const label = all && all.checked
    ? 'All selected'
    : `${checks.filter(ch => ch.checked).length || 'No'} selected`;
  if (count) count.textContent = label;
  if (inline) inline.textContent = label;
}

function onSMHPUAllToggle(checked) {
  document.querySelectorAll('#smhPUFilter .smh-pu-check').forEach(ch => {
    ch.checked = false;
  });
  updateSMHPUSelectionCount();
  renderSMHDetail();
}

function onSMHPUChange() {
  const all = document.getElementById('smhPUAll');
  if (all) all.checked = false;
  updateSMHPUSelectionCount();
  renderSMHDetail();
}

function setSMHPUSelection(mode, silent) {
  const all = document.getElementById('smhPUAll');
  const checks = Array.from(document.querySelectorAll('#smhPUFilter .smh-pu-check'));
  if (all) all.checked = mode === 'all';
  checks.forEach(ch => {
    ch.checked = false;
  });
  updateSMHPUSelectionCount();
  if (!silent) renderSMHDetail();
}

function applySMHPUSelection(value) {
  const values = Array.isArray(value) ? value : [value || 'all'];
  const all = document.getElementById('smhPUAll');
  const checks = Array.from(document.querySelectorAll('#smhPUFilter .smh-pu-check'));
  const useAll = values.includes('all') || !values.length;
  if (all) all.checked = useAll;
  checks.forEach(ch => {
    ch.checked = !useAll && values.includes(ch.value);
  });
  updateSMHPUSelectionCount();
}

function initSMHDetailFilters() {
  const data = window.DETAIL_SMH_DATA;
  const deptSel = document.getElementById('smhDeptFilter');
  const smhSel = document.getElementById('smhCodeFilter');
  const puList = document.getElementById('smhPUFilter');
  if (!data || !deptSel || !smhSel || !puList || deptSel.dataset.ready === 'yes') return;
  const detailRows = data.rows.filter(r => !isSkippedDisplayPU(r.puCode));
  const depts = [...new Map(detailRows.map(r => [r.deptCode + '|' + r.deptName, r])).values()]
    .sort((a,b) => String(a.deptCode).localeCompare(String(b.deptCode), undefined, {numeric:true}));
  deptSel.innerHTML = '<option value="all">All Departments</option>' +
    depts.map(r => `<option value="${htmlSafe(r.deptCode)}">${htmlSafe(r.deptCode)} - ${htmlSafe(r.deptName)}</option>`).join('');
  const smhs = [...new Set(detailRows.map(r => r.smh))].sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric:true}));
  smhSel.innerHTML = '<option value="all">All Demand</option>' +
    smhs.map(s => `<option value="${htmlSafe(s)}">${htmlSafe(s)}</option>`).join('');
  const pus = [...new Map(detailRows.map(r => [r.puCode + '|' + r.puName, r])).values()]
    .sort((a,b) => String(a.puCode).localeCompare(String(b.puCode), undefined, {numeric:true}));
  puList.innerHTML = pus.map(r => `<label class="bp-check-item">
      <input type="checkbox" class="smh-pu-check" value="${htmlSafe(r.puCode)}" onchange="onSMHPUChange()">
      <span><strong>PU-${htmlSafe(r.puCode)}</strong> ${htmlSafe(r.puName)}</span>
    </label>`).join('');
  deptSel.dataset.ready = 'yes';
  updateSMHPUSelectionCount();
}

function aggregateDetailRows(rows, mode) {
  const monthKeys = window.DETAIL_SMH_DATA.monthKeys || [];
  const map = new Map();
  rows.forEach(r => {
    const key = mode === 'dept'
      ? `${r.deptCode}|${r.deptName}`
      : mode === 'smh'
        ? `${r.deptCode}|${r.deptName}|${r.smh}`
        : `${r.deptCode}|${r.deptName}|${r.smh}|${r.puCode}|${r.puName}`;
    if (!map.has(key)) {
      const months = {};
      monthKeys.forEach(m => months[m] = 0);
      map.set(key, {
        deptCode:r.deptCode, deptName:r.deptName, smh: mode === 'dept' ? '' : r.smh,
        puCode: mode === 'pu' ? r.puCode : '', puName: mode === 'pu' ? r.puName : '',
        budget:0, actualTill:0, months
      });
    }
    const item = map.get(key);
    item.budget += Number(r.budget) || 0;
    item.actualTill += Number(r.actualTill) || 0;
    monthKeys.forEach(m => item.months[m] += Number((r.months || {})[m]) || 0);
  });
  return Array.from(map.values()).sort((a,b) =>
    String(a.deptCode).localeCompare(String(b.deptCode), undefined, {numeric:true}) ||
    String(a.smh).localeCompare(String(b.smh), undefined, {numeric:true}) ||
    String(a.puCode).localeCompare(String(b.puCode), undefined, {numeric:true})
  );
}

function makeDetailTotal(rows) {
  const monthKeys = window.DETAIL_SMH_DATA.monthKeys || [];
  const total = {budget:0, actualTill:0, months:Object.fromEntries(monthKeys.map(m => [m,0]))};
  rows.forEach(r => {
    total.budget += Number(r.budget) || 0;
    total.actualTill += Number(r.actualTill) || 0;
    monthKeys.forEach(m => total.months[m] += Number((r.months || {})[m]) || 0);
  });
  return total;
}

function renderSMHReportRows(rows, monthKeys) {
  const depts = [...new Map(rows.map(r => [r.deptCode + '|' + r.deptName, r])).values()]
    .sort((a,b) => String(a.deptCode).localeCompare(String(b.deptCode), undefined, {numeric:true}));
  let html = '';
  depts.forEach(dept => {
    const deptRows = rows.filter(r => r.deptCode === dept.deptCode);
    const deptTotal = makeDetailTotal(deptRows);
    const blankDetailCells = monthKeys.length + 6;
    html += `<tr class="dept-row"><td>${htmlSafe(dept.deptCode)} - ${htmlSafe(dept.deptName)}</td><td></td><td></td>${'<td></td>'.repeat(blankDetailCells)}</tr>`;
    const smhs = [...new Set(deptRows.map(r => r.smh))].sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric:true}));
    smhs.forEach(smh => {
      const smhRows = deptRows.filter(r => r.smh === smh)
        .sort((a,b) => String(a.puCode).localeCompare(String(b.puCode), undefined, {numeric:true}));
      html += `<tr class="smh-row"><td></td><td>${htmlSafe(smh)}</td><td></td>${'<td></td>'.repeat(blankDetailCells)}</tr>`;
      smhRows.forEach(r => {
        const bal = r.budget - r.actualTill;
        const noExpCls = isSMHBudgetNoExpense(r) ? ' no-exp-row' : '';
        const bp = detailBPStatus(r);
        html += `<tr class="pu-row${noExpCls}${isImportantPU(r.puCode) ? ' important-pu-row' : ''}">
          <td></td>
          <td></td>
          <td>PU - ${htmlSafe(r.puCode)} - ${htmlSafe(r.puName)}</td>
          <td>${detailNum(r.budget)}</td>
          ${monthKeys.map(m => `<td>${detailNum((r.months || {})[m] || 0)}</td>`).join('')}
          <td><strong>${detailNum(r.actualTill)}</strong></td>
          <td class="${detailBalanceClass(bal, r.budget)}">${detailNum(bal)}</td>
          <td class="no-exp-status">${htmlSafe(noExpenseStatus(isSMHBudgetNoExpense(r)))}</td>
          <td><span class="bp-status ${bp.variance > 0 ? 'bp-excess' : bp.variance < 0 ? 'bp-saving' : ''}">${htmlSafe(bp.status)}</span></td>
          <td class="bp-remark">${htmlSafe(bp.remark)}</td>
        </tr>`;
      });
      const smhTotal = makeDetailTotal(smhRows);
      const smhBal = smhTotal.budget - smhTotal.actualTill;
      const smhNoExpCls = isSMHBudgetNoExpense(smhTotal) ? ' no-exp-row' : '';
      const smhBP = detailBPStatus(smhTotal);
      html += `<tr class="subtot${smhNoExpCls}">
        <td></td>
        <td></td>
        <td>Sub-Total: ${htmlSafe(smh)}</td>
        <td>${detailNum(smhTotal.budget)}</td>
        ${monthKeys.map(m => `<td>${detailNum(smhTotal.months[m] || 0)}</td>`).join('')}
        <td><strong>${detailNum(smhTotal.actualTill)}</strong></td>
        <td class="${detailBalanceClass(smhBal, smhTotal.budget)}">${detailNum(smhBal)}</td>
        <td class="no-exp-status">${htmlSafe(noExpenseStatus(isSMHBudgetNoExpense(smhTotal)))}</td>
        <td><span class="bp-status ${smhBP.variance > 0 ? 'bp-excess' : smhBP.variance < 0 ? 'bp-saving' : ''}">${htmlSafe(smhBP.status)}</span></td>
        <td class="bp-remark">${htmlSafe(smhBP.remark)}</td>
      </tr>`;
    });
    const deptBal = deptTotal.budget - deptTotal.actualTill;
    const deptNoExpCls = isSMHBudgetNoExpense(deptTotal) ? ' no-exp-row' : '';
    const deptBP = detailBPStatus(deptTotal);
    html += `<tr class="dept-total${deptNoExpCls}">
      <td></td>
      <td></td>
      <td>Total: ${htmlSafe(dept.deptCode)} - ${htmlSafe(dept.deptName)}</td>
      <td>${detailNum(deptTotal.budget)}</td>
      ${monthKeys.map(m => `<td>${detailNum(deptTotal.months[m] || 0)}</td>`).join('')}
      <td><strong>${detailNum(deptTotal.actualTill)}</strong></td>
      <td class="${detailBalanceClass(deptBal, deptTotal.budget)}">${detailNum(deptBal)}</td>
      <td class="no-exp-status">${htmlSafe(noExpenseStatus(isSMHBudgetNoExpense(deptTotal)))}</td>
      <td><span class="bp-status ${deptBP.variance > 0 ? 'bp-excess' : deptBP.variance < 0 ? 'bp-saving' : ''}">${htmlSafe(deptBP.status)}</span></td>
      <td class="bp-remark">${htmlSafe(deptBP.remark)}</td>
    </tr>`;
  });
  return html;
}

function renderSMHDetail() {
  const head = document.getElementById('smhDetailHead');
  const body = document.getElementById('smhDetailBody');
  if (!head || !body) return;
  try {
  const data = window.DETAIL_SMH_DATA;
  if (!data || !Array.isArray(data.rows)) {
    body.innerHTML = '<tr><td colspan="10">Detailed SMH data file not loaded.</td></tr>';
    refreshBIViewSoon();
    return;
  }
  initSMHDetailFilters();
  const dept = (document.getElementById('smhDeptFilter') || {}).value || 'all';
  const smh = (document.getElementById('smhCodeFilter') || {}).value || 'all';
  const selectedPUs = smhSelectedCodes();
  const activityFilter = (document.getElementById('activityFilter') || {}).value || 'all';
  const mode = (document.getElementById('smhViewMode') || {}).value || 'report';
  const monthKeys = data.monthKeys || [];
  const monthLabels = data.monthLabels || [];
  let lastActualIdx = 2;
  monthKeys.forEach((m, idx) => { if ((data.totals.months[m] || 0) !== 0) lastActualIdx = idx; });
  lastActualIdx = Math.max(2, lastActualIdx);
  const visibleMonthKeys = monthKeys.slice(0, Math.min(4, lastActualIdx + 1));
  const rows = data.rows.filter(r =>
    !isSkippedDisplayPU(r.puCode) &&
    passesPUFocus(r.puCode) &&
    (dept === 'all' || r.deptCode === dept) &&
    (smh === 'all' || r.smh === smh) &&
    (selectedPUs.includes('all') || selectedPUs.includes(r.puCode)) &&
    (activityFilter !== 'budget-no-exp' || isSMHBudgetNoExpense(r))
  );
  const grouped = aggregateDetailRows(rows, mode === 'report' ? 'pu' : mode);
  const totals = makeDetailTotal(rows);
  const balance = totals.budget - totals.actualTill;
  const util = totals.budget ? (totals.actualTill / totals.budget) * 100 : 0;
  const kpis = document.getElementById('smhKpis');
  if (kpis) {
    kpis.innerHTML = [
      ['BG_ISL Budget', detailCr(totals.budget), detailNum(totals.budget) + " in Rs'000s"],
      ['Actual Till Date', detailCr(totals.actualTill), util.toFixed(1) + '% utilised'],
      ['Balance', detailCr(balance), balance < 0 ? 'Over spent' : 'Budget minus actual'],
      ['Month Actuals', detailCr(visibleMonthKeys.reduce((s,m)=>s+(totals.months[m]||0),0)), `${monthLabels[0]} to ${monthLabels[visibleMonthKeys.length - 1]}`],
      ['Rows', (mode === 'report' ? rows.length : grouped.length).toLocaleString('en-IN'), mode === 'smh' ? 'Demand/SMH + Department groups' : mode === 'report' ? 'PU lines in report' : 'summary groups']
    ].map(([l,v,s]) => `<div class="smh-kpi"><div class="lbl">${l}</div><div class="val">${v}</div><div class="sub">${s}</div></div>`).join('');
  }
  const title = document.getElementById('smhTableTitle');
  if (title) {
    title.textContent = mode === 'report'
      ? `Department > Demand > Primary Unit - Budget vs Expenditure Report (${monthLabels[0]} to ${monthLabels[visibleMonthKeys.length - 1]})`
      : mode === 'dept'
        ? 'Department Summary - Budget vs Expenditure'
        : mode === 'smh'
          ? 'Demand wise Summary - DEMAND/SMH and Department month-wise actuals 2026-2027'
          : 'Department > Demand > PU Detail - Budget vs Expenditure';
  }
  const leftHeaders = mode === 'smh'
    ? '<th>Demand/SMH</th><th>Department</th>'
    : '<th>Department</th><th>Demand</th><th>Primary Unit (PU)</th>';
  head.innerHTML = `<tr>${leftHeaders}<th>Budget<br>2026-27</th>` +
    monthLabels.slice(0,visibleMonthKeys.length).map(l => `<th>${htmlSafe(l.replace(' 2026',''))}<br>Actual</th>`).join('') +
    '<th>Exp. Total</th><th>Balance<br>(Budget-Exp)</th>' +
    (mode === 'smh'
      ? '<th>Status</th><th>BP Status</th>'
      : mode === 'report'
      ? '<th>Status</th><th>BP Status</th><th>BP Remark</th>'
      : '<th>Util%</th><th>Status</th><th>BP Status</th><th>BP Remark</th>') + '</tr>';
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="10">No rows found for selected filters.</td></tr>';
    refreshBIViewSoon();
    return;
  }
  if (mode === 'smh') {
    const sortedRows = grouped.slice().sort((a,b) =>
      String(a.smh).localeCompare(String(b.smh), undefined, {numeric:true}) ||
      String(a.deptCode).localeCompare(String(b.deptCode), undefined, {numeric:true})
    );
    const totalBP = detailBPStatus(totals);
    const totalRow = `<tr class="dept-total">
      <td>Total</td>
      <td>All Departments</td>
      <td>${detailNum(totals.budget)}</td>
      ${visibleMonthKeys.map(m => `<td>${detailNum(totals.months[m] || 0)}</td>`).join('')}
      <td><strong>${detailNum(totals.actualTill)}</strong></td>
      <td class="${detailBalanceClass(balance, totals.budget)}">${detailNum(balance)}</td>
      <td>${htmlSafe(detailStatusText(totals))}</td>
      <td><span class="bp-status ${totalBP.variance > 0 ? 'bp-excess' : totalBP.variance < 0 ? 'bp-saving' : ''}">${htmlSafe(totalBP.status)}</span></td>
    </tr>`;
    body.innerHTML = sortedRows.map(r => {
      const bal = r.budget - r.actualTill;
      const noExp = isSMHBudgetNoExpense(r);
      const bp = detailBPStatus(r);
      return `<tr class="pu-row${noExp ? ' no-exp-row' : ''}">
        <td>${htmlSafe(smhDemandCode(r.smh))}</td>
        <td>${htmlSafe(r.deptCode)} - ${htmlSafe(r.deptName)}</td>
        <td>${detailNum(r.budget)}</td>
        ${visibleMonthKeys.map(m => `<td>${detailNum((r.months || {})[m] || 0)}</td>`).join('')}
        <td><strong>${detailNum(r.actualTill)}</strong></td>
        <td class="${detailBalanceClass(bal, r.budget)}">${detailNum(bal)}</td>
        <td class="no-exp-status">${htmlSafe(detailStatusText(r))}</td>
        <td><span class="bp-status ${bp.variance > 0 ? 'bp-excess' : bp.variance < 0 ? 'bp-saving' : ''}">${htmlSafe(bp.status)}</span></td>
      </tr>`;
    }).join('') + totalRow;
    setTimeout(applyMobileTableLabels, 40);
    refreshBIViewSoon();
    return;
  }
  if (mode === 'report') {
    body.innerHTML = renderSMHReportRows(rows, visibleMonthKeys);
    setTimeout(applyMobileTableLabels, 40);
    refreshBIViewSoon();
    return;
  }
  body.innerHTML = grouped.map(r => {
    const bal = r.budget - r.actualTill;
    const noExp = isSMHBudgetNoExpense(r);
    const bp = detailBPStatus(r);
    const rowClass = (mode === 'dept' ? 'dept-row' : mode === 'smh' ? 'smh-row' : 'pu-row') + (noExp ? ' no-exp-row' : '') + (mode === 'pu' && isImportantPU(r.puCode) ? ' important-pu-row' : '');
    const first = `${htmlSafe(r.deptCode)} - ${htmlSafe(r.deptName)}`;
    const second = mode === 'dept' ? 'All Demand' : htmlSafe(r.smh);
    const third = mode === 'pu' ? `PU - ${htmlSafe(r.puCode)} - ${htmlSafe(r.puName)}` : (mode === 'smh' ? 'Sub-total' : 'Department Total');
    return `<tr class="${rowClass}">
      <td>${first}</td>
      <td>${second}</td>
      <td>${third}</td>
      <td>${detailNum(r.budget)}</td>
      ${visibleMonthKeys.map(m => `<td>${detailNum(r.months[m] || 0)}</td>`).join('')}
      <td><strong>${detailNum(r.actualTill)}</strong></td>
      <td class="${detailBalanceClass(bal, r.budget)}">${detailNum(bal)}</td>
      <td>${r.budget ? ((r.actualTill / r.budget) * 100).toFixed(1) : '0.0'}%</td>
      <td class="no-exp-status">${htmlSafe(noExpenseStatus(noExp))}</td>
      <td><span class="bp-status ${bp.variance > 0 ? 'bp-excess' : bp.variance < 0 ? 'bp-saving' : ''}">${htmlSafe(bp.status)}</span></td>
      <td class="bp-remark">${htmlSafe(bp.remark)}</td>
    </tr>`;
  }).join('');
  setTimeout(applyMobileTableLabels, 40);
  refreshBIViewSoon();
  } catch (err) {
    console.error('SMH detail render failed', err);
    head.innerHTML = '<tr><th>Department</th><th>Demand</th><th>Primary Unit (PU)</th><th>Status</th></tr>';
    body.innerHTML = `<tr><td colspan="4" style="color:#9B0000;font-weight:700;padding:14px">Could not render DEPT-Demand Wise report: ${htmlSafe(err.message || err)}</td></tr>`;
    refreshBIViewSoon();
  }
}

function demandSMHData() {
  return window.DEMAND_SMH_SUMMARY_DATA || {rows:[], totals:{}, completedMonths:0};
}

function demandSMHRows() {
  const data = demandSMHData();
  return Array.isArray(data.rows) ? data.rows : [];
}

function isDemandSMHSuspense(row) {
  return !!row && (String(row.smh || '').toUpperCase() === '10N' || String(row.demand || '').toUpperCase().includes('12N/10N'));
}

function demandSMHOperationalRows() {
  return demandSMHRows().filter(r => !isDemandSMHSuspense(r));
}

function demandSMHSuspenseRows() {
  return demandSMHRows().filter(isDemandSMHSuspense);
}

function demandSMHTotals() {
  const data = demandSMHData();
  if (data.totals) return data.totals;
  const rows = demandSMHOperationalRows();
  const totals = rows.reduce((t, r) => {
    t.oba += Number(r.oba) || 0;
    t.ae += Number(r.ae) || 0;
    t.budgetRemaining += Number(r.budgetRemaining) || 0;
    return t;
  }, {oba:0, ae:0, budgetRemaining:0});
  totals.bp = Math.round(totals.oba / 12 * (Number(data.completedMonths) || 3));
  totals.variation = totals.ae - totals.bp;
  totals.bpPct = totals.bp ? Math.round((totals.ae / totals.bp) * 100) : 0;
  totals.obaUtil = totals.oba ? Math.round((totals.ae / totals.oba) * 100) : 0;
  return totals;
}

function demandSMHLabel(row) {
  if (!row) return '';
  if (String(row.demand || '').toLowerCase().includes('demand')) return row.demand;
  return `Demand ${row.demand}/${row.smh}`;
}

function renderDemandSMHSummary() {
  const body = document.getElementById('demandSmhBody');
  if (!body) return;
  const data = demandSMHData();
  const rows = demandSMHOperationalRows();
  const suspenseRows = demandSMHSuspenseRows();
  const totals = demandSMHTotals();
  const meta = document.getElementById('demandSmhMeta');
  if (meta) meta.textContent = `Current year Demand / SMH grant summary for FY ${data.fy || '2026-2027'}; BP uses ${data.completedMonths || 3} completed actual months. Demand 12N/10N Suspense Heads is separately calculated.`;
  const source = document.getElementById('demandSmhSource');
  if (source) source.textContent = `Source: ${data.sourceBudget || 'SMH Wise Budget'} | Code: ${data.sourceCode || 'DEMAND AND SMH'} | AE as on ${data.asOn || 'JUN 2026'} | Suspense kept separate`;
  const kpis = document.getElementById('demandSmhKpis');
  if (kpis) {
    kpis.innerHTML = [
      ['OBA / BG_ISL', detailCr(totals.oba), `${detailNum(totals.oba)} in Rs'000s`],
      ['BP Value', detailCr(totals.bp), `BG / 12 x ${data.completedMonths || 3} months`],
      ['Actual Expenditure', detailCr(totals.ae), `AE up to ${data.asOn || 'JUN 2026'}`],
      ['Variation vs BP', detailCr(totals.variation), totals.variation > 0 ? 'Excess against proportionate budget' : 'Saving against proportionate budget'],
      ['OBA Utilized', `${totals.obaUtil}%`, 'Actual as percentage of OBA'],
      ['Suspense Separate', suspenseRows[0] ? detailCr(suspenseRows[0].ae) : '0.00 Cr', 'Demand 12N/10N not netted in main total']
    ].map(([l,v,s]) => `<div class="demand-smh-kpi"><div class="lbl">${l}</div><div class="val">${v}</div><div class="sub">${htmlSafe(s)}</div></div>`).join('');
  }
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:18px">Demand / SMH summary data file not loaded.</td></tr>';
    refreshBIViewSoon();
    return;
  }
  const rowHtml = rows.map(r => {
    const riskCls = (Number(r.bpPct) || 0) >= 150 || (Number(r.budgetRemaining) || 0) < 0 ? ' high' : (Number(r.bpPct) || 0) >= 115 ? ' watch' : '';
    return `<tr class="demand-smh-row${riskCls}">
      <td><strong>${htmlSafe(demandSMHLabel(r))}</strong></td>
      <td><strong>${htmlSafe(r.dept)}</strong><span>${htmlSafe(r.description || '')}</span></td>
      <td>${detailNum(r.oba)}</td>
      <td>${detailNum(r.bp)}</td>
      <td>${detailNum(r.ae)}</td>
      <td class="${(Number(r.variation)||0) >= 0 ? 'dsmh-excess' : 'dsmh-saving'}">${detailNum(r.variation)}</td>
      <td class="${(Number(r.bpPct)||0) >= 150 || (Number(r.bpPct)||0) < 0 ? 'dsmh-red' : ''}">${detailNum(r.bpPct)}</td>
      <td class="${(Number(r.budgetRemaining)||0) < 0 ? 'dsmh-red' : ''}">${detailNum(r.budgetRemaining)}</td>
      <td class="${(Number(r.obaUtil)||0) >= 45 || (Number(r.obaUtil)||0) < 0 ? 'dsmh-red' : ''}">${detailNum(r.obaUtil)}</td>
    </tr>`;
  }).join('');
  const suspenseHtml = suspenseRows.map(r => `<tr class="demand-smh-suspense">
      <td><strong>Separate: ${htmlSafe(demandSMHLabel(r))}</strong></td>
      <td><strong>${htmlSafe(r.dept)}</strong><span>Separately calculated - not included in main total</span></td>
      <td>${detailNum(r.oba)}</td>
      <td>${detailNum(r.bp)}</td>
      <td>${detailNum(r.ae)}</td>
      <td class="dsmh-excess">${detailNum(r.variation)}</td>
      <td class="dsmh-red">${detailNum(r.bpPct)}</td>
      <td class="dsmh-red">${detailNum(r.budgetRemaining)}</td>
      <td class="dsmh-red">${detailNum(r.obaUtil)}</td>
    </tr>`).join('');
  body.innerHTML = rowHtml + `<tr class="demand-smh-total">
    <td>Total</td>
    <td></td>
    <td>${detailNum(totals.oba)}</td>
    <td>${detailNum(totals.bp)}</td>
    <td>${detailNum(totals.ae)}</td>
    <td>${detailNum(totals.variation)}</td>
    <td>${detailNum(totals.bpPct)}</td>
    <td>${detailNum(totals.budgetRemaining)}</td>
    <td>${detailNum(totals.obaUtil)}</td>
  </tr>${suspenseHtml}`;
  setTimeout(applyMobileTableLabels, 40);
  refreshBIViewSoon();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EXCEL DOWNLOAD using SheetJS CDN
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EXCEL DOWNLOAD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function downloadExcel() {
  document.body.dataset.exportStatus = 'excel-started';
  try {
  const useExcelJS = !!window.ExcelJS;
  const wb = useExcelJS ? new ExcelJS.Workbook() : XLSX.utils.book_new();
  if (useExcelJS) {
    wb.creator = 'Revenue Liability Portal';
    wb.created = new Date();
    wb.modified = new Date();
    wb.properties.date1904 = false;
  }
  const HDR_TITLE = 'REVENUE LIABILITY PORTAL - MORADABAD DIVISION';
  const HDR_SUB   = "Northern Railway  |  Financial Authority Dashboard  |  All figures in Rs Thousands ('000s) - multiply by 1,000 for actual rupees";
  const {cur} = getMonthStatus();

  // â”€â”€ Style helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function mkStyle(opts={}) {
    return {
      font:   { name:'Calibri', sz: opts.sz||10, bold:!!opts.bold, color:{rgb: opts.fc||'000000'} },
      fill:   opts.bg ? {patternType:'solid', fgColor:{rgb:opts.bg}} : undefined,
      border: opts.border ? {
        top:{style:'thin',color:{rgb:'B8C8E0'}}, bottom:{style:'thin',color:{rgb:'B8C8E0'}},
        left:{style:'thin',color:{rgb:'B8C8E0'}}, right:{style:'thin',color:{rgb:'B8C8E0'}}
      } : undefined,
      alignment:{ horizontal:opts.h||'left', vertical:'center', wrapText:!!opts.wrap }
    };
  }

  function addSheet(wb, sheetName, titleRow, subRow, headers, dataRows, colWidths) {
    if (useExcelJS) {
      const ws = wb.addWorksheet(sheetName, {
        views: [{state:'frozen', ySplit:4}],
        pageSetup: {orientation:'landscape', fitToPage:true, fitToWidth:1, fitToHeight:0, paperSize:9}
      });
      ws.addRow([titleRow]);
      ws.addRow([subRow]);
      ws.addRow([]);
      ws.addRow(headers);
      dataRows.forEach(r => ws.addRow(Array.from(r)));
      ws.columns = colWidths.map(w => ({width:w}));
      ws.mergeCells(1, 1, 1, headers.length);
      ws.mergeCells(2, 1, 2, headers.length);

      const border = {
        top:{style:'thin', color:{argb:'FFB8C8E0'}},
        left:{style:'thin', color:{argb:'FFB8C8E0'}},
        bottom:{style:'thin', color:{argb:'FFB8C8E0'}},
        right:{style:'thin', color:{argb:'FFB8C8E0'}}
      };
      const fill = color => ({type:'pattern', pattern:'solid', fgColor:{argb:'FF' + color}});
      const font = (color, bold=false, size=10) => ({name:'Calibri', size, bold, color:{argb:'FF' + color}});

      ws.getRow(1).height = 24;
      ws.getRow(1).eachCell(cell => {
        cell.fill = fill('0A1628');
        cell.font = font('C9A84C', true, 14);
        cell.alignment = {horizontal:'center', vertical:'middle', wrapText:true};
      });
      ws.getRow(2).height = 18;
      ws.getRow(2).eachCell(cell => {
        cell.fill = fill('1C3A5E');
        cell.font = font('DDEEFF', true, 9);
        cell.alignment = {horizontal:'center', vertical:'middle', wrapText:true};
      });
      ws.getRow(4).height = 22;
      ws.getRow(4).eachCell(cell => {
        cell.fill = fill('1A3A6A');
        cell.font = font('FFFFFF', true, 9);
        cell.border = border;
        cell.alignment = {horizontal:'center', vertical:'middle', wrapText:true};
      });

      dataRows.forEach((rowData, idx) => {
        const row = ws.getRow(idx + 5);
        let bg = 'FFFFFF';
        if (rowData) {
          const label = String(rowData[0] || '');
          if (label === '98' || rowData._neg) bg = 'FFE8E8';
          else if (rowData._noexp) bg = 'FFF4C2';
          else if (rowData._cs) bg = 'E8FAF0';
          else if (rowData._co) bg = 'FFF8E8';
          else if (rowData._tot) bg = 'E8EFF8';
        }
        row.eachCell({includeEmpty:true}, (cell, colNumber) => {
          cell.fill = fill(bg);
          cell.border = border;
          cell.font = font(rowData && rowData._tot ? '0A1628' : '1A2433', !!(rowData && rowData._tot), 10);
          cell.alignment = {horizontal: colNumber > 2 ? 'right' : 'left', vertical:'middle', wrapText:true};
          if (typeof cell.value === 'number') cell.numFmt = '#,##0';
          if (typeof cell.value === 'number' && cell.value < 0) cell.font = font('B00020', true, 10);
          const text = String(cell.value || '').toUpperCase();
          if (text.includes('OVER') || text.includes('EXCESS') || text.includes('NO BUDGET')) {
            cell.font = font('B00020', true, 10);
          }
          if (text.includes('BUDGET AVAILABLE, NO EXPENSES')) {
            cell.fill = fill('FFF1A8');
            cell.font = font('6C4700', true, 10);
          }
        });
      });
      ws.autoFilter = {from:{row:4,column:1}, to:{row:4,column:headers.length}};
      ws.eachRow(row => row.commit && row.commit());
      return;
    }

    const aoa = [];
    // Title rows
    aoa.push([titleRow]);
    aoa.push([subRow]);
    aoa.push([]); // blank spacer
    aoa.push(headers);
    dataRows.forEach(r => aoa.push(r));

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = colWidths.map(w => ({wch:w}));

    // Apply styles if XLSX supports it (xlsx-style or sheetjs pro - graceful fallback)
    try {
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let R=range.s.r; R<=range.e.r; R++) {
        for (let C=range.s.c; C<=range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({r:R,c:C});
          if (!ws[addr]) ws[addr]={v:'',t:'s'};
          if (R===0) ws[addr].s = mkStyle({bold:true,sz:13,bg:'0A1628',fc:'C9A84C',h:'center',wrap:true});
          else if (R===1) ws[addr].s = mkStyle({bold:true,sz:9,bg:'1C3A5E',fc:'B8D0F0',h:'center',wrap:true});
          else if (R===3) ws[addr].s = mkStyle({bold:true,sz:9,bg:'1A3A6A',fc:'FFFFFF',h:'center'});
          else {
            // Data rows - color by row type
            const rowData = dataRows[R-4];
            let bg = 'FFFFFF';
            if (rowData) {
              const label = String(rowData[0]||'');
              if (label==='98') bg='FFE8E8';
              else if (rowData._noexp) bg='FFF4C2';
              else if (rowData._cs) bg='E8FAF0';
              else if (rowData._co) bg='FFF8E8';
              else if (rowData._tot) bg='E8EFF8';
            }
            ws[addr].s = mkStyle({bg, border:true, h: C>1?'right':'left'});
          }
        }
      }
      // Merge title rows across all columns
      const maxC = headers.length - 1;
      ws['!merges'] = [
        {s:{r:0,c:0},e:{r:0,c:maxC}},
        {s:{r:1,c:0},e:{r:1,c:maxC}},
      ];
      ws['!rows'] = [{hpt:22},{hpt:16},{hpt:6},{hpt:18}];
    } catch(e) { /* style not supported - data still exports fine */ }

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // â”€â”€ Sheet 1: LIABILITY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const liabHdrs = ['PU','Description','PU Type','Liability Type',
    'Budget (Rs\'000s)','Budget (Rs Cr)',
    'APR Actual (Rs\'000s)','APR (Rs Cr)',
    'MAY Actual (Rs\'000s)','MAY (Rs Cr)',
    cur.label+' till date exp',''+cur.label+' Remaining',''+cur.label+' Total',''+cur.label+' % Done',
    'Total Committed (Rs\'000s)','Balance Budget (Rs\'000s)','Proj/Month (Rs\'000s)',
    '% Utilised','Status'];
  const liabRows=[];
  activePUMeta().forEach(pu=>{
    const cv=compute(pu.code); const md=MONTH[pu.code]||{};
    const apr=md.apr||0, may=md.may||0;
    const pctStr=cv.utilisedFlag==='no-budget'?'No Budget - Excess Spend':
                 cv.utilisedFlag==='none'?'Nil (no activity)':
                 cv.utilisedPct!=null?cv.utilisedPct.toFixed(1)+'%':'-';
    const status=isBudgetNoExpense(pu.code)?'BUDGET AVAILABLE, NO EXPENSES':
                 cv.utilisedFlag==='over'?'OVER BUDGET':
                 cv.utilisedFlag==='no-budget'?'NO BUDGET ALLOCATED':
                 cv.utilisedPct>85?'Near Exhausted':cv.utilisedPct>60?'Watch':'On Track';
    const row=[pu.code,pu.desc,pu.puType,pu.liab,
      cv.budget, parseFloat((cv.budget*1000/10000000).toFixed(2)),
      apr, parseFloat((apr*1000/10000000).toFixed(2)),
      may, parseFloat((may*1000/10000000).toFixed(2)),
      cv.curCommitted,cv.curRemaining,cv.curMonthTotal,
      cv.curDonePct!=null?parseFloat(cv.curDonePct.toFixed(1)):0,
      cv.totalCommitted,cv.balanceBudget,Math.round(cv.projPerMonth),
      pctStr, status];
    row._noexp = isBudgetNoExpense(pu.code);
    row._cs = (pu.puType==='Staff PU' && pu.liab==='Committed');
    row._co = (!row._cs && pu.liab==='Committed');
    liabRows.push(row);
  });
  // Total row
  const lt={};
  liabRows.forEach(r=>{ [4,6,8,10,11,12,14,15,16].forEach(i=>lt[i]=(lt[i]||0)+(r[i]||0)); });
  const totRow=['','GRAND TOTAL (excl. Recoveries)','','',
    lt[4],parseFloat((lt[4]*1000/10000000).toFixed(2)),
    lt[6],parseFloat((lt[6]*1000/10000000).toFixed(2)),
    lt[8],parseFloat((lt[8]*1000/10000000).toFixed(2)),
    lt[10],lt[11],lt[12],'',lt[14],lt[15],lt[16],
    lt[4]?parseFloat((lt[14]/lt[4]*100).toFixed(1))+'%':'-',''];
  totRow._tot=true; liabRows.push(totRow);
  addSheet(wb,'Revenue Liability',HDR_TITLE,HDR_SUB,liabHdrs,liabRows,
    [6,24,14,12,14,10,14,10,14,10,14,14,14,10,15,14,14,10,16]);

  // â”€â”€ Sheet 2: MONTH WISE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const mwHdrs=['PU','Description',
    'APR Actual','MAY Actual',
    cur.label+' till date exp',cur.label+' Remaining',cur.label+' Total',
    'JUL Proj','AUG Proj','SEP Proj','OCT Proj','NOV Proj','DEC Proj','JAN Proj','FEB Proj','MAR Proj',
    'Budget (Rs\'000s)','Total Committed','Balance','% Used','Status'];
  const mwRows=[];
  activePUMeta().forEach(pu=>{
    const cv=compute(pu.code); const md=MONTH[pu.code]||{};
    const proj=Math.round(cv.projPerMonth);
    const pct=cv.utilisedFlag==='no-budget'?'No Budget':
               cv.utilisedPct!=null?parseFloat(cv.utilisedPct.toFixed(1))+'%':'Nil';
    const status=isBudgetNoExpense(pu.code)?'BUDGET AVAILABLE, NO EXPENSES':'';
    const row=[pu.code,pu.desc,md.apr||0,md.may||0,
      cv.curCommitted,cv.curRemaining,cv.curMonthTotal,
      proj,proj,proj,proj,proj,proj,proj,proj,proj,
      cv.budget,cv.totalCommitted,cv.balanceBudget,pct,status];
    row._noexp=isBudgetNoExpense(pu.code);
    row._cs=(pu.puType==='Staff PU'&&pu.liab==='Committed');
    row._co=(!row._cs&&pu.liab==='Committed');
    mwRows.push(row);
  });
  // Total
  const mt={};
  mwRows.forEach(r=>{ [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].forEach(i=>mt[i]=(mt[i]||0)+(+r[i]||0)); });
  const mwTot=['','GRAND TOTAL',...[2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(i=>mt[i]),mt[16],mt[17],mt[18],
    mt[16]?parseFloat((mt[17]/mt[16]*100).toFixed(1))+'%':'-',''];
  mwTot._tot=true; mwRows.push(mwTot);
  addSheet(wb,'Month Wise',HDR_TITLE,HDR_SUB,mwHdrs,mwRows,
    [6,24,12,12,14,14,12,10,10,10,10,10,10,10,10,10,14,14,12,10,28]);

  // â”€â”€ Sheet 3: RECOVERIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const r98=compute('98'); const m98=MONTH['98']||{};
  const recHdrs=['PU','Description','Budget (Rs\'000s)','Budget (Rs Cr)',
    'APR Actual','MAY Actual',cur.label+' till date exp',cur.label+' Remaining',
    'Total Committed','Balance','Proj/Month','% Used'];
  const recRows=[[
    '98','Credit or Recoveries',r98.budget,parseFloat((r98.budget*1000/10000000).toFixed(2)),
    m98.apr||0,m98.may||0,r98.curCommitted,r98.curRemaining,
    r98.totalCommitted,r98.balanceBudget,Math.round(r98.projPerMonth),
    r98.utilisedPct!=null?parseFloat(r98.utilisedPct.toFixed(1))+'%':'-'
  ]];
  recRows[0]._neg=true;
  addSheet(wb,'Recoveries PU-98',HDR_TITLE,HDR_SUB,recHdrs,recRows,
    [6,24,14,12,12,12,14,14,15,14,12,10]);

  // â”€â”€ Sheet 4: PU MASTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pmHdrs=['PU Code','Description','Type of PU','Type of Liability',
    'BG_ISL Budget (Rs\'000s)','Budget (Rs Cr)','Actuals Till Date (Rs\'000s)','Remaining Budget (Rs\'000s)','Remaining Budget (Rs Cr)','% Utilised','Status'];
  const pmRows=[];
  PU_META.filter(pu => !isSkippedDisplayPU(pu.code)).forEach(pu=>{
    const bud=BUDGET[pu.code]||{}; const cv=compute(pu.code);
    const pct=cv.utilisedFlag==='no-budget'?'No Budget':
               cv.utilisedFlag==='none'?'Nil':
               cv.utilisedPct!=null?parseFloat(cv.utilisedPct.toFixed(1))+'%':'-';
    const status=isBudgetNoExpense(pu.code)?'BUDGET AVAILABLE, NO EXPENSES':'';
    const row=[pu.code,pu.desc,pu.puType,pu.liab,
      bud.bg_isl||0,parseFloat(((bud.bg_isl||0)*1000/10000000).toFixed(2)),
      bud.actuals_till||0,cv.balanceBudget,parseFloat((cv.balanceBudget*1000/10000000).toFixed(2)),pct,status];
    row._noexp=isBudgetNoExpense(pu.code);
    row._cs=(pu.puType==='Staff PU'&&pu.liab==='Committed');
    row._co=(!row._cs&&pu.liab==='Committed');
    row._neg=pu.isNeg;
    pmRows.push(row);
  });
  addSheet(wb,'PU Master',HDR_TITLE,HDR_SUB,pmHdrs,pmRows,
    [8,24,16,14,18,12,20,20,16,12,28]);

  // Sheet 5: Budget Proportionate Analysis
  const bpRowsSource = buildBPRows();
  const bpHdrs = ['PU','Description','PU Type','Liability','Budget Grant BG (Rs\'000s)','Completed Actual Months',
    'Budget Proportionate (Rs\'000s)','Actual Till Date (Rs\'000s)','Variance vs BP (Rs\'000s)','Utilisation %','BP Status','BP Remark'];
  const bpRows = bpRowsSource.map(r => {
    const row = [r.pu.code, r.pu.desc, r.pu.puType, r.pu.liab, r.budget, r.actualMonthCount,
      Math.round(r.bp), Math.round(r.actualTill), Math.round(r.variance),
      r.budget ? parseFloat(r.utilPct.toFixed(1)) + '%' : '0.0%', r.status, r.remark];
    row._noexp = r.noExpense;
    row._cs = (r.pu.puType === 'Staff PU' && r.pu.liab === 'Committed');
    row._co = (!row._cs && r.pu.liab === 'Committed');
    return row;
  });
  const bpTotals = bpRowsSource.reduce((t, r) => {
    t.budget += r.budget; t.bp += r.bp; t.actual += r.actualTill; t.variance += r.variance;
    return t;
  }, {budget:0, bp:0, actual:0, variance:0});
  const bpTotRow = ['', 'TOTAL SELECTED PUs', '', '', Math.round(bpTotals.budget),
    (getMonthStatus().actualMonths || []).length, Math.round(bpTotals.bp), Math.round(bpTotals.actual),
    Math.round(bpTotals.variance), bpTotals.budget ? parseFloat(((bpTotals.actual / bpTotals.budget) * 100).toFixed(1)) + '%' : '0.0%',
    bpTotals.variance >= 0 ? 'Net Excess' : 'Net Saving', 'Calculated on all active PUs.'];
  bpTotRow._tot = true;
  bpRows.push(bpTotRow);
  addSheet(wb,'Budget Proportionate',HDR_TITLE,'BP = Budget Grant / 12 x completed actual months; running month is excluded',bpHdrs,bpRows,
    [8,26,14,14,18,14,20,20,18,12,18,36]);

  // Sheet 6: DEPT-Demand Wise - visible report style, no internal raw JSON
  if (window.DETAIL_SMH_DATA && Array.isArray(window.DETAIL_SMH_DATA.rows)) {
    const smhData = window.DETAIL_SMH_DATA;
    const smhExportRows = smhData.rows.filter(r => !isSkippedDisplayPU(r.puCode));
    const smhMonthKeys = smhData.monthKeys || FY_MONTHS;
    let lastIdx = 2;
    smhMonthKeys.forEach((m, idx) => { if (((smhData.totals || {}).months || {})[m]) lastIdx = idx; });
    lastIdx = Math.min(3, Math.max(2, lastIdx));
    const smhVisibleMonths = smhMonthKeys.slice(0, lastIdx + 1);
    const smhHeaders = ['Department','Demand','Primary Unit (PU)',"Budget 2026-27 (Rs'000s)"]
      .concat(smhVisibleMonths.map(m => FY_MONTH_LABELS[FY_MONTHS.indexOf(m)] + " Actual (Rs'000s)"))
      .concat(["Exp. Total (Rs'000s)","Balance Budget-Exp (Rs'000s)",'Status','BP Status','BP Remark']);
    const smhRows = [];
    const depts = [...new Map(smhExportRows.map(r => [r.deptCode + '|' + r.deptName, r])).values()]
      .sort((a,b) => String(a.deptCode).localeCompare(String(b.deptCode), undefined, {numeric:true}));
    depts.forEach(dept => {
      const deptRows = smhExportRows.filter(r => r.deptCode === dept.deptCode);
      const deptTotal = makeDetailTotal(deptRows);
      const deptHeader = [`${dept.deptCode} - ${dept.deptName}`,'',''].concat(Array(smhHeaders.length - 3).fill(''));
      deptHeader._tot = true;
      smhRows.push(deptHeader);
      const smhs = [...new Set(deptRows.map(r => r.smh))]
        .sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric:true}));
      smhs.forEach(smh => {
        const demandHeader = ['',smh,''].concat(Array(smhHeaders.length - 3).fill(''));
        demandHeader._cs = true;
        smhRows.push(demandHeader);
        const demandRows = deptRows.filter(r => r.smh === smh)
          .sort((a,b) => String(a.puCode).localeCompare(String(b.puCode), undefined, {numeric:true}));
        demandRows.forEach(r => {
          const balance = (Number(r.budget) || 0) - (Number(r.actualTill) || 0);
          const bp = detailBPStatus(r);
          const smhPuRow = [
            '',
            '',
            `PU - ${r.puCode} - ${r.puName}`,
            Number(r.budget) || 0
          ].concat(smhVisibleMonths.map(m => Number((r.months || {})[m]) || 0))
           .concat([Number(r.actualTill) || 0, balance, isSMHBudgetNoExpense(r) ? 'BUDGET AVAILABLE, NO EXPENSES' : '', bp.status, bp.remark]);
          smhPuRow._noexp = isSMHBudgetNoExpense(r);
          smhRows.push(smhPuRow);
        });
        const demandTotal = makeDetailTotal(demandRows);
        const demandBalance = demandTotal.budget - demandTotal.actualTill;
        const demandBP = detailBPStatus(demandTotal);
        const demandTotalRow = [
          '',
          '',
          `Sub-Total: ${smh}`,
          demandTotal.budget
        ].concat(smhVisibleMonths.map(m => demandTotal.months[m] || 0))
         .concat([demandTotal.actualTill, demandBalance, isSMHBudgetNoExpense(demandTotal) ? 'BUDGET AVAILABLE, NO EXPENSES' : '', demandBP.status, demandBP.remark]);
        demandTotalRow._noexp = isSMHBudgetNoExpense(demandTotal);
        demandTotalRow._cs = true;
        smhRows.push(demandTotalRow);
      });
      const deptBalance = deptTotal.budget - deptTotal.actualTill;
      const deptBP = detailBPStatus(deptTotal);
      const deptTotalRow = [
        '',
        '',
        `Total: ${dept.deptCode} - ${dept.deptName}`,
        deptTotal.budget
      ].concat(smhVisibleMonths.map(m => deptTotal.months[m] || 0))
       .concat([deptTotal.actualTill, deptBalance, isSMHBudgetNoExpense(deptTotal) ? 'BUDGET AVAILABLE, NO EXPENSES' : '', deptBP.status, deptBP.remark]);
      deptTotalRow._noexp = isSMHBudgetNoExpense(deptTotal);
      deptTotalRow._tot = true;
      smhRows.push(deptTotalRow);
    });
    addSheet(wb,'DEPT-Demand Wise',HDR_TITLE,'Department > Demand > Primary Unit - Budget vs Expenditure',smhHeaders,smhRows,
      [18,14,32,16].concat(smhVisibleMonths.map(()=>14)).concat([16,18,28,18,36]));
  }

  // Sheet 7: Demand / SMH grant summary
  if (window.DEMAND_SMH_SUMMARY_DATA && Array.isArray(window.DEMAND_SMH_SUMMARY_DATA.rows)) {
    const dData = demandSMHData();
    const dTotals = demandSMHTotals();
    const dSuspenseRows = demandSMHSuspenseRows();
    const dHeaders = ['Demand / SMH','DEPT','OBA',"BP (BG/12 x months)",'AE','Variation','% BP','Budget Remaining','% OBA Utilized'];
    const dRows = demandSMHOperationalRows().map(r => {
      const row = [demandSMHLabel(r), r.dept, r.oba, r.bp, r.ae, r.variation, r.bpPct, r.budgetRemaining, r.obaUtil];
      if ((Number(r.bpPct) || 0) >= 150 || (Number(r.budgetRemaining) || 0) < 0) row._noexp = true;
      return row;
    });
    const dTotalRow = ['Total','', dTotals.oba, dTotals.bp, dTotals.ae, dTotals.variation, dTotals.bpPct, dTotals.budgetRemaining, dTotals.obaUtil];
    dTotalRow._tot = true;
    dRows.push(dTotalRow);
    dSuspenseRows.forEach(r => {
      const sRow = [`Separate: ${demandSMHLabel(r)}`, `${r.dept} - separately calculated, not netted in main total`, r.oba, r.bp, r.ae, r.variation, r.bpPct, r.budgetRemaining, r.obaUtil];
      sRow._noexp = true;
      dRows.push(sRow);
    });
    addSheet(wb,'Demand SMH Summary',HDR_TITLE,`Demand / SMH Wise | ${dData.note || 'Figures in Rs thousands'}`,dHeaders,dRows,
      [16,34,14,16,14,14,10,18,14]);
  }

  const fileDate = new Date().toISOString().slice(0,10);
  if (useExcelJS) {
    const buffer = await wb.xlsx.writeBuffer();
    saveBlob(new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),
      `Revenue_Liability_MBD_FY2026-27_${fileDate}.xlsx`);
  } else {
    XLSX.writeFile(wb, `Revenue_Liability_MBD_FY2026-27_${fileDate}.xlsx`);
  }
  document.body.dataset.exportStatus = 'excel-finished';
  } catch (err) {
    console.error('Excel export failed', err);
    document.body.dataset.exportStatus = 'excel-error';
    alert('Excel export failed: ' + (err.message || err));
  }
}


function reportRowsForActivePUs() {
  return activePUMeta().filter(pu => passesPUFocus(pu.code)).map(pu => {
    const cv = compute(pu.code);
    const budget = cv.budget || 0;
    const actual = cv.totalCommitted || 0;
    const utilPct = budget ? (actual / budget) * 100 : (actual ? 999 : 0);
    return {
      pu, cv, budget, actual, utilPct,
      balance: cv.balanceBudget || 0,
      noExpense: isBudgetNoExpense(pu.code),
      over: (cv.balanceBudget || 0) < 0,
      high: utilPct >= 85 || (cv.balanceBudget || 0) < 0 || (budget === 0 && actual !== 0)
    };
  });
}

function canvasDataUrl(width, height, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  drawFn(ctx, width, height);
  return canvas.toDataURL('image/png', 0.95);
}

function drawReportFrame(ctx, width, height, title) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#D8E5F2';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);
  ctx.fillStyle = '#0A1628';
  ctx.font = 'bold 18px Segoe UI, Arial';
  ctx.fillText(title, 18, 28);
  ctx.strokeStyle = '#1A3A6A';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(48, height - 44);
  ctx.lineTo(width - 20, height - 44);
  ctx.moveTo(48, 42);
  ctx.lineTo(48, height - 44);
  ctx.stroke();
}

function makeLineChart(title, labels, series) {
  return canvasDataUrl(900, 310, (ctx, width, height) => {
    drawReportFrame(ctx, width, height, title);
    const left = 55, right = width - 28, top = 50, bottom = height - 58;
    const max = Math.max(1, ...series.flatMap(s => s.values).map(Number)) * 1.12;
    const x = idx => left + (idx / Math.max(labels.length - 1, 1)) * (right - left);
    const y = val => bottom - (Number(val) / max) * (bottom - top);
    ctx.strokeStyle = '#EEF3F8';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const yy = top + i * (bottom - top) / 4;
      ctx.beginPath();
      ctx.moveTo(left, yy);
      ctx.lineTo(right, yy);
      ctx.stroke();
    }
    series.forEach(s => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      s.values.forEach((v, idx) => idx === 0 ? ctx.moveTo(x(idx), y(v)) : ctx.lineTo(x(idx), y(v)));
      ctx.stroke();
      ctx.fillStyle = s.color;
      s.values.forEach((v, idx) => {
        ctx.beginPath();
        ctx.arc(x(idx), y(v), 4, 0, Math.PI * 2);
        ctx.fill();
      });
    });
    ctx.font = '12px Segoe UI, Arial';
    ctx.fillStyle = '#33485F';
    labels.forEach((label, idx) => ctx.fillText(label, x(idx) - 10, height - 34));
    let lx = left;
    series.forEach(s => {
      ctx.fillStyle = s.color;
      ctx.fillRect(lx, height - 20, 12, 8);
      ctx.fillStyle = '#1A2433';
      ctx.fillText(s.name, lx + 18, height - 12);
      lx += 112;
    });
  });
}

function makeBarChart(title, labels, values, colors) {
  return canvasDataUrl(900, 310, (ctx, width, height) => {
    drawReportFrame(ctx, width, height, title);
    const left = 58, right = width - 28, top = 52, bottom = height - 60;
    const max = Math.max(1, ...values.map(Number)) * 1.12;
    const gap = 12;
    const bw = Math.max(16, (right - left - gap * (labels.length - 1)) / Math.max(labels.length, 1));
    ctx.strokeStyle = '#EEF3F8';
    for (let i = 0; i <= 4; i++) {
      const yy = top + i * (bottom - top) / 4;
      ctx.beginPath();
      ctx.moveTo(left, yy);
      ctx.lineTo(right, yy);
      ctx.stroke();
    }
    labels.forEach((label, idx) => {
      const h = (Number(values[idx]) / max) * (bottom - top);
      const x = left + idx * (bw + gap);
      ctx.fillStyle = colors[idx] || '#1A7A4A';
      ctx.fillRect(x, bottom - h, bw, h);
      ctx.fillStyle = '#33485F';
      ctx.font = '11px Segoe UI, Arial';
      ctx.save();
      ctx.translate(x + bw / 2, bottom + 13);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText(label, -8, 0);
      ctx.restore();
    });
  });
}

function makeGroupedBarChart(title, labels, budgetValues, actualValues) {
  return canvasDataUrl(900, 310, (ctx, width, height) => {
    drawReportFrame(ctx, width, height, title);
    const left = 58, right = width - 28, top = 52, bottom = height - 60;
    const max = Math.max(1, ...budgetValues, ...actualValues) * 1.12;
    const groupW = (right - left) / Math.max(labels.length, 1);
    const bw = Math.max(12, Math.min(28, groupW / 3));
    ctx.strokeStyle = '#EEF3F8';
    for (let i = 0; i <= 4; i++) {
      const yy = top + i * (bottom - top) / 4;
      ctx.beginPath();
      ctx.moveTo(left, yy);
      ctx.lineTo(right, yy);
      ctx.stroke();
    }
    labels.forEach((label, idx) => {
      const gx = left + idx * groupW + groupW / 2;
      const bh = (Number(budgetValues[idx]) / max) * (bottom - top);
      const ah = (Number(actualValues[idx]) / max) * (bottom - top);
      ctx.fillStyle = 'rgba(26,74,138,.65)';
      ctx.fillRect(gx - bw - 2, bottom - bh, bw, bh);
      ctx.fillStyle = 'rgba(26,122,74,.78)';
      ctx.fillRect(gx + 2, bottom - ah, bw, ah);
      ctx.fillStyle = '#33485F';
      ctx.font = '11px Segoe UI, Arial';
      ctx.fillText(label, gx - 18, bottom + 17);
    });
    ctx.fillStyle = 'rgba(26,74,138,.65)';
    ctx.fillRect(left, height - 22, 12, 8);
    ctx.fillStyle = '#1A2433';
    ctx.fillText('Budget', left + 18, height - 14);
    ctx.fillStyle = 'rgba(26,122,74,.78)';
    ctx.fillRect(left + 95, height - 22, 12, 8);
    ctx.fillStyle = '#1A2433';
    ctx.fillText('Actual', left + 113, height - 14);
  });
}

async function downloadPDFReport() {
  document.body.dataset.exportStatus = 'pdf-started';
  try {
  const jsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDF || !jsPDF.API.autoTable) {
    document.body.dataset.exportStatus = 'pdf-error';
    alert('PDF library not loaded. Please refresh and try again.');
    return;
  }
  const doc = new jsPDF({orientation:'landscape', unit:'pt', format:'a4'});
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 34;
  const today = new Date().toISOString().slice(0,10);
  const {cur, actualMonths} = getMonthStatus();
  const rows = reportRowsForActivePUs();
  const totals = rows.reduce((t, r) => {
    t.budget += r.budget;
    t.actual += r.actual;
    t.balance += r.balance;
    t.proj += r.cv.projPerMonth || 0;
    return t;
  }, {budget:0, actual:0, balance:0, proj:0});
  const util = totals.budget ? (totals.actual / totals.budget) * 100 : 0;
  const highRiskAll = rows.filter(r => r.high).sort((a,b) => Math.abs(b.balance) - Math.abs(a.balance));
  const highRisk = highRiskAll.slice(0, 18);
  const noExpAll = rows.filter(r => r.noExpense).sort((a,b) => b.budget - a.budget);
  const noExp = noExpAll.slice(0, 18);
  const bpAll = buildBPRows().sort((a,b) => Math.abs(b.variance) - Math.abs(a.variance));
  const bpRows = bpAll.slice(0, 18);
  const aiAll = buildAITrendItems();
  const aiRows = aiAll.slice(0, 14);
  const smhRows = (window.DETAIL_SMH_DATA && Array.isArray(window.DETAIL_SMH_DATA.rows)) ? window.DETAIL_SMH_DATA.rows : [];
  const smhDept = [...new Map(smhRows.filter(r => !isSkippedDisplayPU(r.puCode)).map(r => [r.deptCode + '|' + r.deptName, r])).values()]
    .map(d => {
      const dr = smhRows.filter(r => r.deptCode === d.deptCode && !isSkippedDisplayPU(r.puCode));
      const total = makeDetailTotal(dr);
      return {name:`${d.deptCode} - ${d.deptName}`, budget:total.budget, actual:total.actualTill, balance:total.budget - total.actualTill};
    }).sort((a,b) => b.actual - a.actual).slice(0, 12);
  const actualMonthLabels = actualMonths.map(m => FY_MONTH_LABELS[FY_MONTHS.indexOf(m)]);
  const completedMonthKeys = actualMonths.length ? actualMonths : FY_MONTHS.slice(0, Math.max(1, cur.idx));
  const portalSummaryRows = [
    ['PU coverage', `${rows.length} active expenditure PUs`, 'PU-72, 73, 74, 75 GST and PU-98 recovery are excluded from normal display.'],
    ['Risk coverage', `${highRiskAll.length} high/watch PUs`, 'Includes over-budget, high utilisation, no-budget spend and budget-with-no-expense cases.'],
    ['BP coverage', `${bpAll.length} PUs`, `BP uses ${actualMonths.length} completed actual month(s): ${actualMonthLabels.join(', ') || 'none'}.`],
    ['AI trend coverage', `${aiAll.length} non-staff/planned PUs`, 'Staff PU with committed liability is excluded from AI trend summary.'],
    ['SMH coverage', `${smhRows.filter(r => !isSkippedDisplayPU(r.puCode)).length} detail rows`, 'Department 00 and PU-98 recovery are excluded from SMH operational view.']
  ];
  const liabilityAnnexure = rows.slice().sort((a,b) => b.actual - a.actual).map(r => [
    'PU-' + r.pu.code,
    r.pu.desc,
    r.pu.puType,
    r.pu.liab,
    textCr(r.budget),
    textCr(r.actual),
    textCr(r.balance),
    r.budget ? r.utilPct.toFixed(1) + '%' : (r.actual ? 'No Budget' : '0.0%'),
    r.noExpense ? 'Budget, No Expense' : r.over ? 'Over Budget' : r.utilPct >= 85 ? 'High Utilisation' : 'Normal'
  ]);
  const monthWiseAnnexure = rows.slice().sort((a,b) => b.actual - a.actual).map(r => {
    const md = MONTH[r.pu.code] || {};
    return [
      'PU-' + r.pu.code,
      r.pu.desc,
      ...completedMonthKeys.map(m => textCr(Number(md[m]) || 0)),
      textCr(r.actual),
      textCr(r.balance)
    ];
  });
  const puMasterAnnexure = activePUMeta().map(pu => {
    const cv = compute(pu.code);
    return [
      'PU-' + pu.code,
      pu.desc,
      pu.puType,
      pu.liab,
      textCr(cv.budget),
      textCr(cv.totalCommitted),
      textCr(cv.balanceBudget),
      cv.utilisedPct != null ? cv.utilisedPct.toFixed(1) + '%' : (cv.totalCommitted ? 'No Budget' : '0.0%')
    ];
  });
  const sourceRows = Object.values(SOURCE_REGISTER).map(s => [s.label, s.fy, s.source, s.used || '', s.remarks || 'Pre-loaded / uploaded portal source']);
  const exclusionRows = [
    ['Department 00', 'Skipped in detailed SMH analysis', 'Non-operational/summary department code is not mixed with department expenditure review.'],
    ['PU-98', 'Skipped from normal expenditure view', 'Credit or recoveries are shown separately and not treated as expenditure.'],
    ['PU-72, PU-73, PU-74, PU-75', 'Skipped from portal display and analysis', 'GST/tax adjustment heads are excluded from operational PU expenditure analysis.'],
    ['Staff PU committed liability', 'Skipped from AI Trend Summary only', 'Committed staff liability is stable/obligatory and can distort AI trend prioritisation.']
  ];
  const smhDetailAnnexure = smhRows
    .filter(r => !isSkippedDisplayPU(r.puCode) && normPUCode(r.puCode) !== '98')
    .sort((a,b) => (Number(b.actualTill) || 0) - (Number(a.actualTill) || 0))
    .slice(0, 120)
    .map(r => {
      const bal = (Number(r.budget) || 0) - (Number(r.actualTill) || 0);
      const bp = detailBPStatus(r);
      return [
        `${r.deptCode} - ${r.deptName}`,
        r.smh,
        `PU-${r.puCode} - ${r.puName}`,
        detailCr(r.budget),
        detailCr(r.actualTill),
        detailCr(bal),
        isSMHBudgetNoExpense(r) ? 'Budget, No Expense' : bal < 0 ? 'Over Budget' : 'Normal',
        bp.status
      ];
    });
  const smhNoExpenseAnnexure = smhRows
    .filter(r => !isSkippedDisplayPU(r.puCode) && normPUCode(r.puCode) !== '98' && isSMHBudgetNoExpense(r))
    .sort((a,b) => (Number(b.budget) || 0) - (Number(a.budget) || 0))
    .slice(0, 80)
    .map(r => [`${r.deptCode} - ${r.deptName}`, r.smh, `PU-${r.puCode} - ${r.puName}`, detailCr(r.budget), 'Budget available but no actual expense booked']);
  const demandRows = demandSMHOperationalRows();
  const demandSuspenseRows = demandSMHSuspenseRows();
  const demandTotals = demandSMHTotals();
  const demandAnnexure = demandRows.map(r => [
    demandSMHLabel(r),
    r.dept,
    detailCr(r.oba),
    detailCr(r.bp),
    detailCr(r.ae),
    signedCr(r.variation),
    detailNum(r.bpPct) + '%',
    detailCr(r.budgetRemaining),
    detailNum(r.obaUtil) + '%'
  ]);
  const demandSuspenseAnnexure = demandSuspenseRows.map(r => [
    `Separate: ${demandSMHLabel(r)}`,
    `${r.dept} - separately calculated, not netted in main total`,
    detailCr(r.oba),
    detailCr(r.bp),
    detailCr(r.ae),
    signedCr(r.variation),
    detailNum(r.bpPct) + '%',
    detailCr(r.budgetRemaining),
    detailNum(r.obaUtil) + '%'
  ]);

  function header(title) {
    doc.setFillColor(10, 22, 40);
    doc.rect(0, 0, pageW, 44, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(title, margin, 27);
    doc.setTextColor(201, 168, 76);
    doc.setFontSize(9);
    doc.text(`FY 2026-27 | As on ${formatAsOnDate(_dataAsOnDate)} | Current Month ${cur.label} ${cur.year}`, pageW - margin, 27, {align:'right'});
  }
  function footer() {
    doc.setTextColor(96, 112, 128);
    doc.setFontSize(8);
    doc.text('Revenue Liability Portal - Moradabad Division / Northern Railway - For Official Use Only', margin, pageH - 16);
    doc.text(String(doc.internal.getNumberOfPages()), pageW - margin, pageH - 16, {align:'right'});
  }
  function addPage(title) {
    if (doc.internal.getNumberOfPages() > 1 || doc.lastAutoTable) doc.addPage();
    header(title);
    footer();
  }
  function autoTable(opts) {
    doc.autoTable(Object.assign({
      theme:'grid',
      margin:{left:margin, right:margin},
      styles:{fontSize:8, cellPadding:3, lineColor:[190,205,225], lineWidth:.4, overflow:'linebreak'},
      headStyles:{fillColor:[26,58,106], textColor:[255,255,255], fontStyle:'bold'},
      alternateRowStyles:{fillColor:[246,250,254]},
      didDrawPage: () => { header(opts.pageTitle || 'Revenue Liability Report'); footer(); }
    }, opts));
  }

  addPage('Revenue Liability Report - Executive Summary');
  doc.setTextColor(10, 22, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Revenue Liability Portal', margin, 96);
  doc.setFontSize(14);
  doc.text('Moradabad Division / Northern Railway', margin, 120);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Financial Year 2026-27 | Current Month: ${cur.label} ${cur.year} | Actual months: ${actualMonths.map(m => FY_MONTH_LABELS[FY_MONTHS.indexOf(m)]).join(', ')}`, margin, 145);
  doc.text(`Budget basis: ${isRGActive() ? 'RG Active' : 'RG not active - using BG_ISL'} | Excluded: PU-72, 73, 74, 75 GST heads and PU-98 recoveries from normal expenditure view.`, margin, 162);
  autoTable({
    startY: 190,
    pageTitle:'Revenue Liability Report - Executive Summary',
    head:[['KPI','Value']],
    body:[
      ['Gross Budget', textCr(totals.budget)],
      ['Actual / Committed', textCr(totals.actual)],
      ['Balance Budget', textCr(totals.balance)],
      ['Utilisation', util.toFixed(1) + '%'],
      ['Projection / Month', textCr(totals.proj)],
      ['High / Watch PUs', String(highRiskAll.length)],
      ['Budget but No Expense PUs', String(noExpAll.length)]
    ],
    columnStyles:{0:{fontStyle:'bold', fillColor:[232,239,248]}, 1:{halign:'right', fontStyle:'bold'}},
    tableWidth:360
  });
  autoTable({
    startY: doc.lastAutoTable.finalY + 18,
    pageTitle:'Revenue Liability Report - Executive Summary',
    head:[['Data Area','FY','Source / File']],
    body:sourceRows.map(r => [r[0], r[1], r[2]]),
    columnStyles:{2:{cellWidth:320}}
  });
  autoTable({
    startY: doc.lastAutoTable.finalY + 18,
    pageTitle:'Revenue Liability Report - Executive Summary',
    head:[['Coverage Area','Current Position','Officer Note']],
    body:portalSummaryRows.concat([['Demand / SMH Summary', `${demandRows.length} grant rows + Suspense separate`, `OBA ${detailCr(demandTotals.oba)}, AE ${detailCr(demandTotals.ae)}, BP utilisation ${detailNum(demandTotals.bpPct)}%. Demand 12N/10N Suspense Heads is separately calculated.`]]),
    columnStyles:{2:{cellWidth:360}}
  });

  addPage('Revenue Liability Report - Graphs');
  const monthLabels = FY_MONTH_LABELS.map((m,i) => m + (i <= 8 ? '-26' : '-27'));
  const cyMonthly = FY_MONTHS.map(m => rows.reduce((s,r) => s + (Number((MONTH[r.pu.code] || {})[m]) || 0), 0) / 10000);
  const pyMonthly = FY_MONTHS.map(m => rows.reduce((s,r) => s + (Number((MONTH_PY[r.pu.code] || {})[m]) || 0), 0) / 10000);
  const topUtil = rows.filter(r => r.budget > 0).sort((a,b) => b.utilPct - a.utilPct).slice(0, 10);
  const topActual = rows.slice().sort((a,b) => b.actual - a.actual).slice(0, 10);
  doc.addImage(makeLineChart('CY vs PY Monthly Actuals (Rs Cr)', monthLabels, [
    {name:'CY 2026-27', values:cyMonthly, color:'#1A7A4A'},
    {name:'PY 2025-26', values:pyMonthly, color:'#1A4E9A'}
  ]), 'PNG', margin, 62, 360, 124);
  doc.addImage(makeBarChart('Top Utilisation PUs (%)', topUtil.map(r => 'PU-' + r.pu.code), topUtil.map(r => Math.min(150, r.utilPct)), topUtil.map(r => r.utilPct > 100 ? '#B00020' : r.utilPct > 85 ? '#E85D04' : '#1A7A4A')), 'PNG', margin + 395, 62, 360, 124);
  doc.addImage(makeGroupedBarChart('Major PUs - Budget vs Actual (Rs Cr)', topActual.map(r => 'PU-' + r.pu.code), topActual.map(r => r.budget / 10000), topActual.map(r => r.actual / 10000)), 'PNG', margin, 216, 755, 124);

  addPage('Revenue Liability Report - Risk Analysis');
  autoTable({
    startY: 58,
    pageTitle:'Revenue Liability Report - Risk Analysis',
    head:[['PU','Description','Budget','Actual','Balance','Util %','Status','Suggested Review']],
    body:highRisk.map(r => ['PU-' + r.pu.code, r.pu.desc, textCr(r.budget), textCr(r.actual), textCr(r.balance), r.utilPct.toFixed(1) + '%', r.over ? 'Over Budget' : r.utilPct >= 85 ? 'High Utilisation' : 'Watch', r.over ? 'Budget support / booking control' : r.noExpense ? 'Check pending booking' : 'Monitor next booking cycle']),
    columnStyles:{2:{halign:'right'},3:{halign:'right'},4:{halign:'right'},5:{halign:'right'}}
  });
  autoTable({
    startY: doc.lastAutoTable.finalY + 16,
    pageTitle:'Revenue Liability Report - Risk Analysis',
    head:[['PU','Description','Budget','Remark']],
    body:noExp.map(r => ['PU-' + r.pu.code, r.pu.desc, textCr(r.budget), 'Budget available but no expense booked']),
    columnStyles:{2:{halign:'right'}}
  });

  addPage('Revenue Liability Report - BP and AI Summary');
  autoTable({
    startY: 58,
    pageTitle:'Revenue Liability Report - BP and AI Summary',
    head:[['PU','Description','Budget','BP','Actual','Variance','Util %','BP Status','Accounts Remark']],
    body:bpRows.map(r => ['PU-' + r.pu.code, r.pu.desc, textCr(r.budget), textCr(r.bp), textCr(r.actualTill), signedCr(r.variance), r.budget ? r.utilPct.toFixed(1) + '%' : '0.0%', r.status, r.remark]),
    columnStyles:{2:{halign:'right'},3:{halign:'right'},4:{halign:'right'},5:{halign:'right'}}
  });
  autoTable({
    startY: doc.lastAutoTable.finalY + 16,
    pageTitle:'Revenue Liability Report - BP and AI Summary',
    head:[['PU','AI Trend / Liability Remark']],
    body:aiRows.map(r => ['PU-' + r.pu.code, `${r.risk.toUpperCase()}: CY as-on ${textCr(r.cyTotalAsOn)} vs PY ${textCr(r.pyTotalAsOn)}; balance ${textCr(r.cv.balanceBudget)}; utilisation ${r.utilPct.toFixed(1)}%.`]),
    columnStyles:{1:{cellWidth:620}}
  });

  addPage('Revenue Liability Report - PU-wise Liability Annexure');
  autoTable({
    startY: 58,
    pageTitle:'Revenue Liability Report - PU-wise Liability Annexure',
    head:[['PU','Description','Type','Liability','Budget','Actual','Balance','Util %','Status']],
    body:liabilityAnnexure,
    styles:{fontSize:7, cellPadding:2.5, overflow:'linebreak'},
    columnStyles:{1:{cellWidth:170},4:{halign:'right'},5:{halign:'right'},6:{halign:'right'},7:{halign:'right'}}
  });

  addPage('Revenue Liability Report - Month-wise Actual Annexure');
  autoTable({
    startY: 58,
    pageTitle:'Revenue Liability Report - Month-wise Actual Annexure',
    head:[['PU','Description'].concat(completedMonthKeys.map(m => FY_MONTH_LABELS[FY_MONTHS.indexOf(m)])).concat(['Total Actual','Balance'])],
    body:monthWiseAnnexure,
    styles:{fontSize:7, cellPadding:2.5, overflow:'linebreak'},
    columnStyles:{1:{cellWidth:170}}
  });

  addPage('Revenue Liability Report - PU Master Annexure');
  autoTable({
    startY: 58,
    pageTitle:'Revenue Liability Report - PU Master Annexure',
    head:[['PU','Description','PU Type','Liability','Budget','Actual','Balance','Util %']],
    body:puMasterAnnexure,
    styles:{fontSize:7, cellPadding:2.5, overflow:'linebreak'},
    columnStyles:{1:{cellWidth:210},4:{halign:'right'},5:{halign:'right'},6:{halign:'right'},7:{halign:'right'}}
  });

  addPage('Revenue Liability Report - Sources and Clarifications');
  autoTable({
    startY: 58,
    pageTitle:'Revenue Liability Report - Sources and Clarifications',
    head:[['Data Area','FY','Source / File','Used In','Remarks']],
    body:sourceRows,
    styles:{fontSize:7.5, cellPadding:3, overflow:'linebreak'},
    columnStyles:{2:{cellWidth:210},3:{cellWidth:170},4:{cellWidth:190}}
  });
  autoTable({
    startY: doc.lastAutoTable.finalY + 16,
    pageTitle:'Revenue Liability Report - Sources and Clarifications',
    head:[['Code / Rule','Treatment in Portal','Clarification']],
    body:exclusionRows,
    columnStyles:{2:{cellWidth:440}}
  });

  addPage('Revenue Liability Report - DEPT-Demand Summary');
  autoTable({
    startY: 58,
    pageTitle:'Revenue Liability Report - DEPT-Demand Summary',
    head:[['Department','Budget','Actual','Balance']],
    body:smhDept.map(r => [r.name, detailCr(r.budget), detailCr(r.actual), detailCr(r.balance)]),
    columnStyles:{1:{halign:'right'},2:{halign:'right'},3:{halign:'right'}}
  });
  autoTable({
    startY: doc.lastAutoTable.finalY + 16,
    pageTitle:'Revenue Liability Report - DEPT-Demand Summary',
    head:[['Department','Demand','Primary Unit','Budget','Actual','Balance','Status','BP Status']],
    body:smhDetailAnnexure,
    styles:{fontSize:6.8, cellPadding:2.2, overflow:'linebreak'},
    columnStyles:{0:{cellWidth:120},2:{cellWidth:185},3:{halign:'right'},4:{halign:'right'},5:{halign:'right'}}
  });
  if (smhNoExpenseAnnexure.length) {
    addPage('Revenue Liability Report - Budget Available No Expense');
    autoTable({
      startY: 58,
      pageTitle:'Revenue Liability Report - Budget Available No Expense',
      head:[['Department','Demand','Primary Unit','Budget','Remark']],
      body:smhNoExpenseAnnexure,
      styles:{fontSize:7.5, cellPadding:3, overflow:'linebreak'},
      columnStyles:{2:{cellWidth:260},3:{halign:'right'},4:{cellWidth:230}}
    });
  }

  if (demandAnnexure.length) {
    addPage('Revenue Liability Report - Demand / SMH Grant Summary');
    autoTable({
      startY: 58,
      pageTitle:'Revenue Liability Report - Demand / SMH Grant Summary',
      head:[['Demand / SMH','DEPT','OBA','BP','AE','Variation','% BP','Budget Remaining','% OBA Utilized']],
      body:demandAnnexure
        .concat([['Total','', detailCr(demandTotals.oba), detailCr(demandTotals.bp), detailCr(demandTotals.ae), signedCr(demandTotals.variation), detailNum(demandTotals.bpPct) + '%', detailCr(demandTotals.budgetRemaining), detailNum(demandTotals.obaUtil) + '%']])
        .concat(demandSuspenseAnnexure),
      styles:{fontSize:7.3, cellPadding:2.5, overflow:'linebreak'},
      columnStyles:{1:{cellWidth:170},2:{halign:'right'},3:{halign:'right'},4:{halign:'right'},5:{halign:'right'},6:{halign:'right'},7:{halign:'right'},8:{halign:'right'}}
    });
  }

  doc.save(`Revenue_Liability_MBD_Report_FY2026-27_${today}.pdf`);
  document.body.dataset.exportStatus = 'pdf-finished';
  } catch (err) {
    console.error('PDF export failed', err);
    document.body.dataset.exportStatus = 'pdf-error';
    alert('PDF export failed: ' + (err.message || err));
  }
}

window.downloadExcel = downloadExcel;
window.downloadPDFReport = downloadPDFReport;

function initExportButtons() {
  const excelBtn = document.getElementById('downloadExcelBtn');
  const pdfBtn = document.getElementById('downloadPdfBtn');
  if (excelBtn && !excelBtn.dataset.bound) {
    excelBtn.dataset.bound = '1';
    excelBtn.addEventListener('click', downloadExcel);
  }
  if (pdfBtn && !pdfBtn.dataset.bound) {
    pdfBtn.dataset.bound = '1';
    pdfBtn.addEventListener('click', downloadPDFReport);
  }
}


// â”€â”€ PU DETAIL PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openPUDetail(code) {
  const pu   = PU_META.find(p => p.code === code);
  if (!pu) return;
  const cv   = compute(code);
  const md   = MONTH[code] || {};
  const b    = BUDGET[code] || {};
  const {futureMonths, cur} = getMonthStatus();

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function fCr(n)  { if(!n||n===0) return '-'; return (Math.abs(n)*1000/10000000).toFixed(2)+' Cr'; }
  function fT(n)   { if(!n||n===0) return '-'; return (n<0?'('+Math.abs(Math.round(n)).toLocaleString('en-IN')+')':Math.round(n).toLocaleString('en-IN'))+' Rs\'000s'; }
  function pctStr(cv) {
    if (cv.utilisedFlag==='no-budget') return '<span style="color:#CC0000;font-weight:700">Warning No Budget Allocated - Excess Spend</span>';
    if (cv.utilisedFlag==='none')      return '<span style="color:#aaa">- Nil (no activity)</span>';
    if (cv.utilisedFlag==='over')      return `<span style="color:#CC0000;font-weight:700">${Math.abs(cv.utilisedPct).toFixed(1)}% (OVER BUDGET)</span>`;
    const p = cv.utilisedPct;
    const col = p>85?'#CC0000':p>60?'#E85D04':p>30?'#C07000':'#1A7A4A';
    return `<span style="color:${col};font-weight:700">${p.toFixed(1)}%</span>`;
  }
  const typeCol = pu.puType.includes('Staff PU')&&!pu.puType.includes('Non')?'#1A7A4A':
                  pu.puType.includes('Contractual')?'#9A5A00':'#1C3A5E';

  // â”€â”€ All 12 FY months â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const FY_LABELS=['APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC','JAN','FEB','MAR'];
  const FY_KEYS  =['apr','may','jun','jul','aug','sep','oct','nov','dec','jan','feb','mar'];
  const curIdx   = FY_KEYS.indexOf(cur.key);
  const monthRows = FY_LABELS.map((lbl,i) => {
    const isPast    = i < curIdx;
    const isCurrent = i === curIdx;
    const isFuture  = i > curIdx;
    const val       = isPast||isCurrent ? (md[FY_KEYS[i]]||0) : Math.round(cv.projPerMonth)||0;
    const valCr     = (Math.abs(val)*1000/10000000).toFixed(2);
    const tag       = isPast?'Actual':isCurrent?'Committed (Till Date)':'Projected';
    const bg        = isCurrent?'#FFF8E0':isFuture?'#F0F6FF':'#FAFAFA';
    const tagCol    = isCurrent?'#8A5A00':isFuture?'#1A4A8A':'#607080';
    const barW      = cv.budget ? Math.min(100, Math.abs(val)/Math.abs(cv.budget/12)*100) : 0;
    const barCol    = isFuture?'#1E6FD9':isCurrent?'#F4A932':'#1C3A5E';
    return `<tr style="background:${bg}">
      <td style="padding:7px 12px;font-weight:700;color:#0A1628;border-bottom:1px solid #E8EFF8">${lbl} ${i<=8?2026:2027}</td>
      <td style="padding:7px 12px;color:${tagCol};font-size:10px;border-bottom:1px solid #E8EFF8"><em>${tag}</em></td>
      <td style="padding:7px 12px;text-align:right;font-family:monospace;border-bottom:1px solid #E8EFF8">${val?val.toLocaleString('en-IN'):'-'}</td>
      <td style="padding:7px 12px;text-align:right;font-weight:600;border-bottom:1px solid #E8EFF8">${valCr} Cr</td>
      <td style="padding:7px 20px;border-bottom:1px solid #E8EFF8">
        <div style="background:#E8EFF8;border-radius:3px;height:10px;min-width:120px;overflow:hidden">
          <div style="width:${barW}%;height:100%;background:${barCol};border-radius:3px;transition:width .4s"></div>
        </div>
      </td>
    </tr>`;
  }).join('');

  // â”€â”€ Budget breakdown rows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const summaryRows = [
    ['BG_ISL Budget', b.bg_isl||0, '#0A1628'],
    ['Revised Grant (RG)', b.rg||0, '#1C3A5E'],
    ['Current Budget (Active)', cv.budget, '#1A4E9A'],
    ['APR 2026 Actuals', md.apr||0, '#607080'],
    ['MAY 2026 Actuals', md.may||0, '#607080'],
    [`${cur.label} ${cur.year} Committed`, cv.curCommitted, '#8A5A00'],
    [`${cur.label} Remaining (this month)`, cv.curRemaining, '#1A7A4A'],
    ['Total Committed (Till Date)', cv.totalCommitted, '#1A4E9A'],
    ['Balance Budget', cv.balanceBudget, cv.balanceBudget<0?'#CC0000':'#1A7A4A'],
    [`Projected per Month (${futureMonths.length} months left)`, Math.round(cv.projPerMonth), '#0F5A8A'],
    ['Actuals Till Date (Budget Report)', b.actuals_till||0, '#607080'],
  ].map(([lbl,val,col]) => `<tr>
    <td style="padding:7px 14px;color:#4A6A90;border-bottom:1px solid #EEF2F8;width:55%">${lbl}</td>
    <td style="padding:7px 14px;text-align:right;font-family:monospace;border-bottom:1px solid #EEF2F8;font-weight:600;color:${col}">${val?(val<0?'('+Math.abs(Math.round(val)).toLocaleString('en-IN')+')':Math.round(val).toLocaleString('en-IN')):'-'}</td>
    <td style="padding:7px 14px;text-align:right;border-bottom:1px solid #EEF2F8;color:${col};font-weight:700">${fCr(val)}</td>
  </tr>`).join('');

  // â”€â”€ Build full HTML page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pctVal = cv.utilisedPct!==null ? Math.min(100,Math.abs(cv.utilisedPct)) : 0;
  const ringCol = cv.utilisedFlag==='over'||cv.utilisedFlag==='no-budget'?'#CC0000':
                  cv.utilisedPct>85?'#E85D04':cv.utilisedPct>60?'#C07000':'#1A7A4A';
  const r=54, circ=2*Math.PI*r, dash=(pctVal/100)*circ;
  const pctLabel = cv.utilisedFlag==='no-budget'?'No Budget':
                   cv.utilisedFlag==='none'?'0%':Math.abs(cv.utilisedPct).toFixed(1)+'%';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PU-${pu.code} - ${pu.desc} | Revenue Liability Portal</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#F0F4FA;color:#0A1628;font-size:13px}
  .page-hdr{background:linear-gradient(135deg,#0A1628 0%,#1A3A6A 100%);color:#fff;padding:16px 32px;display:flex;align-items:center;gap:16px;border-bottom:3px solid #C9A84C}
  .pu-num{font-size:36px;font-weight:800;color:#C9A84C;line-height:1}
  .pu-info h1{font-size:18px;font-weight:700;color:#fff}
  .pu-info p{font-size:11px;color:#A8C0D8;margin-top:3px}
  .badges{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
  .pbadge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.3);color:#fff}
  .print-tools{margin-left:auto;position:relative;min-width:98px}
  .print-tools summary{list-style:none;background:#C9A84C;color:#0A1628;border:none;padding:7px 12px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:800;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.18)}
  .print-tools summary::-webkit-details-marker{display:none}
  .print-tools summary:hover{background:#E8C050}
  .print-menu{position:absolute;right:0;top:34px;z-index:20;background:#fff;border:1px solid #D8E5F2;border-radius:8px;box-shadow:0 10px 24px rgba(10,22,40,.20);padding:6px;display:grid;gap:5px;min-width:170px}
  .print-menu button{border:0;border-radius:6px;background:#F4F8FE;color:#0A1628;padding:8px 10px;text-align:left;cursor:pointer;font-size:11px;font-weight:800}
  .print-menu button:hover{background:#E8F0FF}
  .print-menu small{display:block;color:#607080;font-size:9px;font-weight:600;margin-top:1px}
  .section{background:#fff;border-radius:8px;padding:20px 24px;margin:16px 24px;box-shadow:0 2px 10px rgba(10,22,40,.08);border:1px solid #E0EAF4}
  .sec-title{font-size:13px;font-weight:700;color:#1C3A5E;border-bottom:2px solid #E0EAF4;padding-bottom:8px;margin-bottom:14px;display:flex;align-items:center;gap:8px}
  .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
  .kpi{background:#F5F8FC;border-radius:6px;padding:14px 16px;border-left:3px solid ${typeCol}}
  .kpi-lbl{font-size:9px;color:#607080;font-weight:600;text-transform:uppercase;letter-spacing:.4px}
  .kpi-val{font-size:18px;font-weight:700;color:#0A1628;margin:4px 0 2px}
  .kpi-sub{font-size:9px;color:#607080}
  .ring-wrap{display:flex;align-items:center;gap:24px;flex-wrap:wrap}
  .ring-info{flex:1;min-width:200px}
  .ring-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #EEF2F8;font-size:12px}
  .ring-row:last-child{border-bottom:none}
  .ring-row .lbl{color:#607080}
  .ring-row .val{font-weight:700;color:#0A1628}
  table.data-tbl{width:100%;border-collapse:collapse}
  table.data-tbl thead tr{background:#1A3A6A}
  table.data-tbl thead th{padding:8px 12px;color:#B8D0F0;font-size:10px;font-weight:600;text-align:left;letter-spacing:.3px;text-transform:uppercase}
  table.data-tbl thead th.r{text-align:right}
  footer{text-align:center;padding:16px;font-size:10px;color:#8AAAC8;border-top:1px solid #E0EAF4;margin-top:8px}
  @page{size:A4 landscape;margin:10mm}
  @media print{
    body{background:#fff;font-size:10px}
    .print-tools{display:none}
    .page-hdr{padding:10px 16px;border-bottom:2px solid #C9A84C}
    .pu-num{font-size:28px}
    .pu-info h1{font-size:15px}
    .pu-info p{font-size:9px}
    .section{box-shadow:none;border:1px solid #CBD7E5;margin:8px 10px;padding:10px 12px;break-inside:avoid}
    .sec-title{font-size:11px;margin-bottom:8px;padding-bottom:5px}
    .kpi-grid{grid-template-columns:repeat(6,1fr);gap:6px}
    .kpi{padding:8px 9px}
    .kpi-val{font-size:13px}
    .kpi-lbl,.kpi-sub{font-size:7px}
    .ring-wrap{gap:14px}
    .ring-wrap svg{width:100px;height:100px}
    table.data-tbl thead th{font-size:8px;padding:5px 7px}
    table.data-tbl td{font-size:9px!important;padding:5px 7px!important}
    footer{font-size:8px;padding:8px}
    body.print-one .print-detail{display:none!important}
    body.print-one .section{margin:7px 10px;padding:9px 11px}
    body.print-two .print-page-2{break-before:page;page-break-before:always}
  }
</style>
<script>
  function setPrintMode(mode){
    document.body.classList.remove('print-one','print-two');
    document.body.classList.add(mode === 'one' ? 'print-one' : 'print-two');
    document.documentElement.setAttribute('data-print-mode', mode);
    setTimeout(function(){ window.print(); }, 80);
  }
</script>
</head>
<body>
<div class="page-hdr">
  <div class="pu-num">PU-${pu.code}</div>
  <div class="pu-info">
    <h1>${pu.desc}</h1>
    <p>Moradabad Division / Northern Railway  -  FY 2026-27  -  All figures in Rs '000s</p>
    <div class="badges">
      <span class="pbadge" style="background:${typeCol}">${pu.puType}</span>
      <span class="pbadge" style="background:${pu.liab==='Committed'?'#1A7A4A':pu.liab==='Recovery'?'#8B0000':'#4A6A90'}">${pu.liab}</span>
      <span class="pbadge" style="background:#8A5A00">${cur.label} ${cur.year} - Active Month</span>
    </div>
  </div>
  <details class="print-tools">
    <summary>Print/PDF</summary>
    <div class="print-menu">
      <button type="button" onclick="setPrintMode('one')">1 Page Summary<small>KPI and utilisation view</small></button>
      <button type="button" onclick="setPrintMode('two')">2 Page Detail<small>Summary + table pages</small></button>
      <button type="button" onclick="window.print()">Normal Print<small>Full visible page</small></button>
    </div>
  </details>
</div>

<!-- KPI CARDS -->
<div class="section print-summary">
  <div class="sec-title">Key Performance Indicators</div>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-lbl">BG_ISL Budget</div><div class="kpi-val">${fCr(b.bg_isl||0)}</div><div class="kpi-sub">${(b.bg_isl||0).toLocaleString('en-IN')} Rs'000s</div></div>
    <div class="kpi"><div class="kpi-lbl">Total Committed</div><div class="kpi-val" style="color:${typeCol}">${fCr(cv.totalCommitted)}</div><div class="kpi-sub">${cv.totalCommitted.toLocaleString('en-IN')} Rs'000s</div></div>
    <div class="kpi"><div class="kpi-lbl">Balance Budget</div><div class="kpi-val" style="color:${cv.balanceBudget<0?'#CC0000':'#1A7A4A'}">${fCr(cv.balanceBudget)}</div><div class="kpi-sub">${cv.balanceBudget.toLocaleString('en-IN')} Rs'000s</div></div>
    <div class="kpi"><div class="kpi-lbl">% Budget Used</div><div class="kpi-val" style="color:${ringCol}">${pctLabel}</div><div class="kpi-sub">${pctStr(cv)}</div></div>
    <div class="kpi"><div class="kpi-lbl">Projected / Month</div><div class="kpi-val" style="color:#1A4E9A">${fCr(cv.projPerMonth)}</div><div class="kpi-sub">${futureMonths.length} months remaining</div></div>
    <div class="kpi"><div class="kpi-lbl">${cur.label} Committed</div><div class="kpi-val" style="color:#8A5A00">${fCr(cv.curCommitted)}</div><div class="kpi-sub">Remaining: ${fCr(cv.curRemaining)}</div></div>
  </div>
</div>

<!-- UTILISATION RING -->
<div class="section print-summary">
  <div class="sec-title">Budget Utilisation</div>
  <div class="ring-wrap">
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r="${r}" fill="none" stroke="#E8EFF8" stroke-width="14"/>
      <circle cx="70" cy="70" r="${r}" fill="none" stroke="${ringCol}" stroke-width="14"
        stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}"
        stroke-dashoffset="${(circ/4).toFixed(1)}" stroke-linecap="round"/>
      <text x="70" y="65" text-anchor="middle" font-size="20" font-weight="800" fill="${ringCol}">${pctLabel}</text>
      <text x="70" y="82" text-anchor="middle" font-size="10" fill="#607080">Utilised</text>
    </svg>
    <div class="ring-info">
      <div class="ring-row"><span class="lbl">BG_ISL Budget</span><span class="val">${fCr(b.bg_isl||0)}</span></div>
      <div class="ring-row"><span class="lbl">APR Actuals</span><span class="val">${fCr(md.apr||0)}</span></div>
      <div class="ring-row"><span class="lbl">MAY Actuals</span><span class="val">${fCr(md.may||0)}</span></div>
      <div class="ring-row"><span class="lbl">${cur.label} Committed</span><span class="val">${fCr(cv.curCommitted)}</span></div>
      <div class="ring-row"><span class="lbl">Total Committed</span><span class="val" style="color:${typeCol}">${fCr(cv.totalCommitted)}</span></div>
      <div class="ring-row"><span class="lbl">Balance</span><span class="val" style="color:${cv.balanceBudget<0?'#CC0000':'#1A7A4A'}">${fCr(cv.balanceBudget)}</span></div>
    </div>
  </div>
</div>

<!-- BUDGET BREAKDOWN TABLE -->
<div class="section print-detail">
  <div class="sec-title">Budget Breakdown</div>
  <table class="data-tbl">
    <thead><tr><th>Parameter</th><th class="r">Rs '000s</th><th class="r">Rs Crore</th></tr></thead>
    <tbody>${summaryRows}</tbody>
  </table>
</div>

<!-- MONTHLY PROJECTION TABLE -->
<div class="section print-detail print-page-2">
  <div class="sec-title">Month-wise Actuals & Projections - FY 2026-27</div>
  <table class="data-tbl">
    <thead><tr>
      <th>Month</th><th>Type</th>
      <th class="r">Amount (Rs '000s)</th><th class="r">Amount (Rs Cr)</th>
      <th>vs Monthly Allocation</th>
    </tr></thead>
    <tbody>${monthRows}</tbody>
  </table>
</div>

<footer>
  PU-${pu.code}: ${pu.desc}  -  Moradabad Division / Northern Railway  -  FY 2026-27  -  For Official Use Only<br>
  Generated: ${new Date().toLocaleString('en-IN')}  -  Revenue Liability Portal v4.0
</footer>
</body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

// â”€â”€ Event delegation: one listener on document covers all tables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.addEventListener('mouseover', function(e){
  // Don't re-trigger if mouse moves within the popup itself
  if (e.target.closest('#puPopup')) return;
  const tr = e.target.closest('tr[data-pu]');
  if (!tr) return;
  clearTimeout(_ppTimer);
  showPUPopup(e, tr.dataset.pu);
});
document.addEventListener('mouseout', function(e){
  if (e.target.closest('#puPopup')) return;
  const tr = e.target.closest('tr[data-pu]');
  if (!tr) return;
  if (!tr.contains(e.relatedTarget) && !_pp.contains(e.relatedTarget)) hidePUPopup();
});
document.addEventListener('click', function(e){
  // Don't close popup if clicking inside it
  if (e.target.closest('#puPopup')) return;
  const tr = e.target.closest('tr[data-pu]');
  if (tr) { clearTimeout(_ppTimer); showPUPopup(e, tr.dataset.pu); }
});

// Live clock
(function tick(){
  const el=document.getElementById('liveClock');
  if(el) el.textContent=new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  setTimeout(tick,1000);
})();

// Dual scroll sync
function addDualScroll(){
  document.querySelectorAll('.twrap').forEach(wrap=>{
    if(wrap.dataset.ds) return; wrap.dataset.ds='1';
    const top=document.createElement('div'); top.className='scroll-top';
    const inner=document.createElement('div'); top.appendChild(inner); inner.style.height='1px';
    wrap.parentNode.insertBefore(top,wrap);
    function syncW(){ const t=wrap.querySelector('table'); if(t) inner.style.width=t.scrollWidth+'px'; }
    syncW(); top.addEventListener('scroll',()=>wrap.scrollLeft=top.scrollLeft);
    wrap.addEventListener('scroll',()=>top.scrollLeft=wrap.scrollLeft);
    try {
      if (window.ResizeObserver && wrap instanceof Element) {
        new ResizeObserver(syncW).observe(wrap);
      }
    } catch (e) {
      setTimeout(syncW, 200);
    }
  });
}


let currentPopupCode=null;
function showPUPopup(e,code){
  initPopup(); // ensure _pp exists
  currentPopupCode=code;
  clearTimeout(_ppTimer);
  const pu=PU_META.find(p=>p.code===code); if(!pu) return;
  const cv=compute(code); const md=MONTH[code]||{};
  const {futureMonths}=getMonthStatus();
  const pctVal=cv.utilisedPct!=null?Math.abs(cv.utilisedPct):0;
  const pctStr=cv.utilisedFlag==='no-budget'?'No Budget':cv.utilisedFlag==='none'?'Nil':pctVal.toFixed(1)+'%';
  const col=cv.utilisedFlag==='over'||cv.utilisedFlag==='no-budget'?'#CC0000':pctVal>85?'#E85D04':pctVal>60?'#C07000':'#1A7A4A';
  const r=22,circ=2*Math.PI*r,dash=(Math.min(100,pctVal)/100)*circ;
  const vals=[md.apr||0,md.may||0,cv.curCommitted];
  const maxV=Math.max(...vals,cv.projPerMonth,1);
  const bars=['APR','MAY','JUN'].map((m,i)=>`
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
      <div style="font-size:8px;color:#607080;width:36px">${m}</div>
      <div style="flex:1;background:#EDF1F7;border-radius:2px;height:7px;overflow:hidden">
        <div style="width:${Math.min(100,vals[i]/maxV*100)}%;height:100%;background:${i===2?'#F4A932':'#1C3A5E'};border-radius:2px"></div>
      </div>
      <div style="font-size:8px;width:55px;text-align:right;font-family:monospace">${vals[i]?vals[i].toLocaleString('en-IN'):'-'}</div>
    </div>`).join('');
  const projBar=`<div style="display:flex;align-items:center;gap:6px">
    <div style="font-size:8px;color:#607080;width:36px">Proj</div>
    <div style="flex:1;background:#EDF1F7;border-radius:2px;height:7px;overflow:hidden">
      <div style="width:${Math.min(100,cv.projPerMonth/maxV*100)}%;height:100%;background:#0FBCB0;border-radius:2px"></div>
    </div>
    <div style="font-size:8px;width:55px;text-align:right;font-family:monospace">${cv.projPerMonth>0?Math.round(cv.projPerMonth).toLocaleString('en-IN'):'-'}</div>
  </div>`;
  const typeCol = pu.puType.includes('Staff PU')&&!pu.puType.includes('Non')?'#1A7A4A':pu.puType.includes('Contractual')?'#C07000':'#1C3A5E';
  _pp.innerHTML=`
    <div style="background:${typeCol};padding:8px 14px 7px;display:flex;align-items:center;gap:8px">
      <div style="font-size:15px;font-weight:700;color:#fff;min-width:36px">PU-${pu.code}</div>
      <div><div style="font-size:11px;font-weight:700;color:#fff">${pu.desc}</div><div style="font-size:8px;color:rgba(255,255,255,.75);margin-top:1px">${pu.puType} - ${pu.liab}</div></div>
    </div>
    <div style="padding:12px 14px">
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
      <div style="position:relative;width:56px;height:56px;flex-shrink:0">
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="${r}" fill="none" stroke="#E0EAF4" stroke-width="6"/>
          <circle cx="28" cy="28" r="${r}" fill="none" stroke="${col}" stroke-width="6"
            stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}"
            stroke-dashoffset="${(circ/4).toFixed(1)}" style="transition:stroke-dasharray .4s"/>
        </svg>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:${col}">${pctStr}</div>
      </div>
      <div style="flex:1;font-size:9px">
        <div style="margin-bottom:3px">Budget: <strong>${cv.budget?(cv.budget*1000/10000000).toFixed(2)+' Cr':'-'}</strong></div>
        <div style="margin-bottom:3px">Committed: <strong>${(cv.totalCommitted*1000/10000000).toFixed(2)} Cr</strong></div>
        <div style="margin-bottom:3px">Balance: <strong style="color:${cv.balanceBudget<0?'#CC0000':'#1A7A4A'}">${(cv.balanceBudget*1000/10000000).toFixed(2)} Cr</strong></div>
        <div>Proj/Mo: <strong>${cv.projPerMonth>0?(cv.projPerMonth*1000/10000000).toFixed(2)+' Cr':'-'}</strong></div>
      </div>
    </div>
    <div style="border-top:1px solid #E0EAF4;padding-top:8px">
      <div style="font-size:8px;color:#607080;text-transform:uppercase;letter-spacing:.3px;margin-bottom:5px">Monthly Spend (Rs'000s)</div>
      ${bars}${projBar}
    </div>
    </div>
    <div style="background:#F5F8FC;border-top:1px solid #E0EAF4;padding:6px 14px;display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:8px;color:#8AAAC8">Quick Summary View</span>
      <span style="font-size:8px;color:#1A7A4A;font-weight:700">Click PU Code cell for Full Details</span>
    </div>
    </div>`;
  const vw=window.innerWidth,vh=window.innerHeight;
  let x=e.clientX+14, y=e.clientY+8;
  if(x+320>vw) x=e.clientX-320;
  if(y+320>vh) y=e.clientY-320;
  _pp.style.left=x+'px'; _pp.style.top=y+'px';
  _pp.style.opacity='1'; _pp.style.transform='translateY(0)'; _pp.style.pointerEvents='auto';
}
function hidePUPopup(){ _ppTimer=setTimeout(()=>{_pp.style.opacity='0';_pp.style.transform='translateY(6px)';_pp.style.pointerEvents='none';},200); }
function attachPUPopup(){
  initPopup();
  // Using event delegation on document - works after every re-render, no re-binding needed
  // (listeners are only added once)
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// UPLOAD TAB - File parsing, auto-sense, apply
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

let _pendingBudget = null;  // parsed budget data waiting to apply
let _pendingMonth  = null;  // parsed month data waiting to apply
let _pendingSMHBudget = null;
let _pendingSMHMonth = null;
let _uploadHistory = [];    // log entries

// Drag-and-drop helpers
function dzDrag(e,type){ e.preventDefault(); const el=document.getElementById('dz-'+type); if(el) el.classList.add('drag-over'); }
function dzLeave(type){ const el=document.getElementById('dz-'+type); if(el) el.classList.remove('drag-over'); }
function dzDrop(e,type){
  e.preventDefault(); dzLeave(type);
  if (!isUploadAdminUnlocked()) {
    requestUploadAdmin();
    return;
  }
  const file = e.dataTransfer.files[0];
  const parts=type.split('-'), t=parts.slice(0,-1).join('-') || parts[0], yr=(parts[parts.length-1]==='py')?'py':'cy';
  if(file) parseUpload(file, t, yr);
}

function handleFileEx(e, type, year) {
  if (!isUploadAdminUnlocked()) {
    if (e && e.target) e.target.value = '';
    requestUploadAdmin();
    return;
  }
  const file = e.target.files[0];
  if(file) parseUpload(file, type, year||'cy');
}
function handleFile(e, type) { handleFileEx(e, type, 'cy'); }

function setDZState(type, state, msg) {
  const dz   = document.getElementById('dz-'+type);
  const icon = document.getElementById('dz-'+type+'-icon');
  const stat = document.getElementById('dz-'+type+'-status');
  if(!dz||!stat) return;
  dz.classList.remove('done','error','drag-over');
  if(state==='done'){ dz.classList.add('done'); icon.textContent='OK'; stat.className='dz-status ok'; }
  else if(state==='error'){ dz.classList.add('error'); icon.textContent='Error'; stat.className='dz-status err'; }
  else { icon.textContent='...'; stat.className='dz-status'; }
  stat.textContent = msg||'';
  // Enable apply button if at least one pending
  document.getElementById('applyBtn').disabled = !(_pendingBudget || _pendingMonth || _pendingSMHBudget || _pendingSMHMonth);
}

function smhEmptyMonths() {
  return Object.fromEntries(FY_MONTHS.map(m => [m, 0]));
}

function smhNorm(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function smhNormUpper(value) {
  return smhNorm(value).toUpperCase();
}

function smhDeptParts(value) {
  const raw = smhNorm(value);
  const m = raw.match(/^(\d+)\s*-\s*(.*)$/);
  return m ? {code:m[1], name:m[2].trim()} : {code:raw, name:''};
}

function smhPUParts(value) {
  const raw = smhNorm(value);
  const m = raw.match(/PU\s*-\s*(\d+)\s*-\s*(.*)$/i);
  return m ? {code:m[1].padStart(2,'0'), name:m[2].trim()} : null;
}

function smhKeyFromParts(dept, smh, pu) {
  return `${dept.code}|${dept.name}|${smh}|${pu.code}|${pu.name}`;
}

function parseSMHDetailUpload(rows, kind) {
  function findHdrRow(testFn) {
    for (let i=0; i<Math.min(14, rows.length); i++) {
      if ((rows[i] || []).some(c => testFn(smhNormUpper(c)))) return i;
    }
    return -1;
  }
  const hr = kind === 'budget'
    ? findHdrRow(n => n.includes('BG_ISL') || n.includes('BG ISL'))
    : findHdrRow(n => /^APR(IL)?(\s|$|-|_)/.test(n) || n === 'APR 2026');
  if (hr < 0) throw new Error(kind === 'budget' ? 'Cannot find BG_ISL header in SMH budget file.' : 'Cannot find APR-MAR headers in SMH month-wise file.');
  const hdr = rows[hr].map(c => smhNormUpper(c));
  const deptC = hdr.findIndex(h => h.includes('DEPARTMENTCODE') || h.includes('DEPARTMENT CODE'));
  const smhC = hdr.findIndex(h => h === 'SMH' || h.includes('DEMAND'));
  const puC = hdr.findIndex(h => h === 'PUCODE' || h === 'PU CODE' || h === 'PU');
  if (deptC < 0 || smhC < 0 || puC < 0) throw new Error('Cannot map Department, SMH/Demand and PU columns.');
  const map = {};
  const monthCols = {};
  if (kind === 'budget') {
    var budgetC = hdr.findIndex(h => h.includes('BG_ISL') || h.includes('BG ISL'));
    var actualC = hdr.findIndex(h => h.includes('ACTUALS') && h.includes('2026-2027') && h.includes('TILL DATE'));
    if (actualC < 0) actualC = hdr.reduce((best,h,i) => (h.includes('ACTUALS') && h.includes('TILL') && i > best) ? i : best, -1);
    if (budgetC < 0 || actualC < 0) throw new Error('Cannot map BG_ISL or Actuals Till Date columns.');
  } else {
    FY_MONTHS.forEach((mk, idx) => {
      const ml = FY_MONTH_LABELS[idx].toUpperCase();
      const abbr = mk.toUpperCase();
      const ci = hdr.findIndex(h => h === abbr || h.startsWith(abbr + ' ') || h === ml || h.startsWith(ml + ' '));
      if (ci >= 0) monthCols[mk] = ci;
    });
    if (Object.keys(monthCols).length < 3) throw new Error('Could not map at least 3 month columns.');
  }
  let n = 0;
  for (let i=hr+1; i<rows.length; i++) {
    const row = rows[i] || [];
    const dept = smhDeptParts(row[deptC]);
    const pu = smhPUParts(row[puC]);
    const smh = smhNorm(row[smhC]);
    if (!dept.code || dept.code === '00' || !pu || pu.code === '98' || isSkippedDisplayPU(pu.code) || !smh) continue;
    const key = smhKeyFromParts(dept, smh, pu);
    if (!map[key]) {
      map[key] = {deptCode:dept.code, deptName:dept.name, smh, puCode:pu.code, puName:pu.name, budget:0, actualTill:0, months:smhEmptyMonths()};
    }
    if (kind === 'budget') {
      map[key].budget += Number(row[budgetC]) || 0;
      map[key].actualTill += Number(row[actualC]) || 0;
    } else {
      FY_MONTHS.forEach(m => { map[key].months[m] += monthCols[m] !== undefined ? (Number(row[monthCols[m]]) || 0) : 0; });
    }
    n++;
  }
  if (n === 0) throw new Error('No SMH detail rows found after excluding Department 00 and PU-98.');
  return {rows:Object.values(map), rowCount:n};
}

function mergeSMHDetailRows(baseRows, updateRows, mode) {
  const map = {};
  (baseRows || []).forEach(r => {
    const key = `${r.deptCode}|${r.deptName}|${r.smh}|${r.puCode}|${r.puName}`;
    map[key] = {...r, months:{...smhEmptyMonths(), ...(r.months || {})}};
  });
  updateRows.forEach(r => {
    const key = `${r.deptCode}|${r.deptName}|${r.smh}|${r.puCode}|${r.puName}`;
    if (!map[key]) map[key] = {...r, budget:0, actualTill:0, months:smhEmptyMonths()};
    if (mode === 'budget') {
      map[key].budget = r.budget;
      map[key].actualTill = r.actualTill;
    } else {
      map[key].months = {...smhEmptyMonths(), ...(r.months || {})};
      const monthTotal = FY_MONTHS.reduce((s,m) => s + (map[key].months[m] || 0), 0);
      if (!map[key].actualTill) map[key].actualTill = monthTotal;
    }
  });
  return Object.values(map);
}

function rebuildSMHDetailTotals() {
  const data = window.DETAIL_SMH_DATA;
  if (!data || !Array.isArray(data.rows)) return;
  const totals = {budget:0, actualTill:0, months:smhEmptyMonths()};
  data.rows.forEach(r => {
    totals.budget += Number(r.budget) || 0;
    totals.actualTill += Number(r.actualTill) || 0;
    FY_MONTHS.forEach(m => { totals.months[m] += Number((r.months || {})[m]) || 0; });
  });
  data.totals = totals;
}

function parseUpload(file, type, year) {
  if (!isUploadAdminUnlocked()) {
    requestUploadAdmin();
    return;
  }
  year = year || 'cy';
  const fileTimestamp = uploadFileTimestamp(file);
  const dzId = type + '-' + year;
  setDZState(dzId, 'loading', 'Reading file...');
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb   = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:0});

      function norm(v){ return String(v==null?'':v).replace(/\s+/g,' ').trim().toUpperCase(); }
      function extractPU(v){
        const s=norm(v); if(!s||s==='PUCODE'||s==='PU CODE'||s==='TOTAL'||s==='GRAND TOTAL') return null;
        let m=s.match(/^PU\s*-?\s*(\d+)/); if(m) return m[1].padStart(2,'0');
        m=s.match(/^(\d{1,2})$/); if(m) return m[1].padStart(2,'0'); return null;
      }
      function findHdrRow(rows,testFn){ for(let i=0;i<Math.min(12,rows.length);i++){if(rows[i].some(c=>testFn(norm(c)))) return i;} return -1; }

      if(type==='smhbudget' || type==='smhmonth') {
        if (year !== 'cy') throw new Error('SMH detail upload is currently for CY 2026-27 only.');
        const parsed = parseSMHDetailUpload(rows, type === 'smhbudget' ? 'budget' : 'month');
        if (type === 'smhbudget') {
          _pendingSMHBudget = {rows:parsed.rows, filename:file.name, rowCount:parsed.rowCount, at:new Date()};
          setDZState(dzId,'done','Parsed '+parsed.rowCount+' SMH budget rows');
          addLog('SMH Budget CY 2026-27', file.name, parsed.rowCount, null);
        } else {
          _pendingSMHMonth = {rows:parsed.rows, filename:file.name, rowCount:parsed.rowCount, at:new Date()};
          const latestIdx = FY_MONTHS.reduce((best,m,idx) => parsed.rows.some(r => (r.months || {})[m] !== 0) ? idx : best, 0);
          setDZState(dzId,'done','Parsed '+parsed.rowCount+' SMH month rows - Latest: '+FY_MONTH_LABELS[latestIdx]);
          addLog('SMH Month Wise CY 2026-27', file.name, parsed.rowCount, FY_MONTH_LABELS[latestIdx]);
        }

      } else if(type==='budget'){
        const hr=findHdrRow(rows,n=>n.includes('BG_ISL')||n.includes('BG ISL'));
        if(hr<0) throw new Error('Cannot find BG_ISL column header.');
        const hdr=rows[hr].map(c=>norm(c));
        const bgC=hdr.findIndex(h=>h.includes('BG_ISL')||h.includes('BG ISL'));
        const rgC=hdr.findIndex(h=>h==='RG'||h.includes('REVISED GRANT'));
        const atC=hdr.findIndex(h=>h.includes('TILL DATE')||(h.includes('ACTUALS')&&h.includes('TILL')));
        const atC2=atC>=0?atC:hdr.reduce((best,h,i)=>(h.includes('ACTUALS')&&i>best)?i:best,-1);
        const puC=hdr.findIndex(h=>h==='PUCODE'||h==='PU CODE'||h==='PU');
        let parsed={},n=0;
        for(let i=hr+1;i<rows.length;i++){
          const row=rows[i],code=extractPU(row[puC>=0?puC:1]); if(!code) continue;
          parsed[code]={bg_isl:bgC>=0?(Number(row[bgC])||0):0,rg:rgC>=0?(Number(row[rgC])||0):0,actuals_till:atC2>=0?(Number(row[atC2])||0):0};
          n++;
        }
        if(n===0) throw new Error('No PU rows found. Check PUCODE and BG_ISL columns.');
        if(year==='cy'){ _pendingBudget={data:parsed,filename:file.name,puCount:n,at:new Date()}; }
        else           { _pendingBudgetPY={data:parsed,filename:file.name,puCount:n,at:new Date()}; }
        setDZState(dzId,'done','OK Parsed '+n+' PUs - '+(year==='cy'?'CY 2026-27':'PY 2025-26'));
        addLog((year==='cy'?'Budget CY 2026-27':'Budget PY 2025-26'),file.name,n,null);

      } else {
        const APR_RE=/^APR(IL)?[\s\-_]?\d{0,4}$/;
        const ANY_M=/^(APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|JAN|FEB|MAR)/;
        let hr=findHdrRow(rows,n=>APR_RE.test(n));
        if(hr<0) hr=findHdrRow(rows,n=>ANY_M.test(n));
        if(hr<0) throw new Error('Cannot find APR-MAR month headers.');
        const hdr=rows[hr].map(c=>norm(c));
        const mCols={};
        FY_MONTHS.forEach((mk,idx2)=>{
          const ml=FY_MONTH_LABELS[idx2];
          const ci=hdr.findIndex(h=>h===ml||h.startsWith(ml+' ')||h.startsWith(ml+'-')||(ml==='APR'&&h==='APRIL'));
          if(ci>=0) mCols[mk]=ci;
        });
        if(Object.keys(mCols).length<3) throw new Error('Could not map at least 3 month columns. Check headers.');
        const puC=hdr.findIndex(h=>h==='PUCODE'||h==='PU CODE'||h==='PU');
        let parsed={},n=0,latestIdx=0;
        for(let i=hr+1;i<rows.length;i++){
          const row=rows[i],code=extractPU(row[puC>=0?puC:1]); if(!code) continue;
          const vals={}; FY_MONTHS.forEach((mk,i2)=>{vals[mk]=mCols[mk]!==undefined?(Number(row[mCols[mk]])||0):0;});
          parsed[code]=vals; n++;
          FY_MONTHS.forEach((mk,i2)=>{if(vals[mk]!==0&&i2>=latestIdx) latestIdx=i2;});
        }
        if(n===0) throw new Error('No PU rows found.');
        const dml=FY_MONTH_LABELS[latestIdx];
        if(year==='cy'){ _pendingMonth={data:parsed,filename:file.name,puCount:n,detectedMonthIdx:latestIdx,detectedMonthKey:FY_MONTHS[latestIdx],detectedMonthLabel:dml,detectedYear:latestIdx<=8?2026:2027,at:new Date()}; }
        else           { _pendingMonthPY={data:parsed,filename:file.name,puCount:n,detectedMonthIdx:latestIdx,at:new Date()}; }
        setDZState(dzId,'done','OK Parsed '+n+' PUs - Latest: '+dml+' | '+(year==='cy'?'CY':'PY'));
        addLog((year==='cy'?'Month Wise CY 2026-27':'Month Wise PY 2025-26'),file.name,n,dml);
      }
    } catch(err) {
      setDZState(type+'-'+year,'error','Error '+err.message);
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}
function addLog(fileType, filename, puCount, monthDetected) {
  _uploadHistory.unshift({
    fileType, filename, puCount, monthDetected,
    at: new Date().toLocaleString('en-IN')
  });
  updateSourceRegisterFromUpload(fileType, filename, puCount, monthDetected);
  renderUploadLog();
}

function updateSourceRegisterFromUpload(fileType, filename, puCount, monthDetected) {
  const key = fileType.includes('SMH Budget') ? 'smhBudgetCY'
    : fileType.includes('SMH Month') ? 'smhMonthCY'
    : fileType.includes('Budget CY') ? 'budgetCY'
    : fileType.includes('Month Wise CY') ? 'monthCY'
    : fileType.includes('Budget PY') ? 'budgetPY'
    : fileType.includes('Month Wise PY') ? 'monthPY'
    : '';
  if (!key || !SOURCE_REGISTER[key]) return;
  SOURCE_REGISTER[key].source = filename || SOURCE_REGISTER[key].source;
  SOURCE_REGISTER[key].remarks = [
    'Uploaded from IPAS download in this browser session',
    puCount ? `${puCount} rows/PUs parsed` : '',
    monthDetected ? `latest month detected: ${monthDetected}` : ''
  ].filter(Boolean).join('; ');
}

function renderUploadLog() {
  const tbody = document.getElementById('uploadLogTbody');
  if(!tbody) return;
  if(!_uploadHistory.length){
    tbody.innerHTML='<tr><td colspan="6" style="color:#8AAAC8;text-align:center;padding:16px">No uploads yet - using pre-loaded data</td></tr>';
    return;
  }
  tbody.innerHTML = _uploadHistory.map(e=>`
    <tr>
      <td><strong>${e.fileType}</strong></td>
      <td style="font-family:monospace;font-size:9px">${e.filename}</td>
      <td>${e.at}</td>
      <td>${e.monthDetected||'<span style="color:#aaa">N/A</span>'}</td>
      <td>${e.puCount} PUs</td>
      <td><span class="log-dot ok"></span><strong style="color:#1A7A4A">Applied</strong></td>
    </tr>`).join('');
}

function applyUploads() {
  if (!isUploadAdminUnlocked()) {
    requestUploadAdmin();
    return;
  }
  let monthChanged = false;
  const hadCYUpdate = !!(_pendingBudget || _pendingMonth);
  const hadPYUpdate = !!(_pendingBudgetPY || _pendingMonthPY);
  const hadSMHUpdate = !!(_pendingSMHBudget || _pendingSMHMonth);
  const pendingNames = {
    cyBudget:_pendingBudget && _pendingBudget.filename,
    cyMonth:_pendingMonth && _pendingMonth.filename,
    pyBudget:_pendingBudgetPY && _pendingBudgetPY.filename,
    pyMonth:_pendingMonthPY && _pendingMonthPY.filename,
    smhBudget:_pendingSMHBudget && _pendingSMHBudget.filename,
    smhMonth:_pendingSMHMonth && _pendingSMHMonth.filename
  };

  // â”€â”€ Apply budget data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if(_pendingBudget) {
    Object.entries(_pendingBudget.data).forEach(([code,vals])=>{
      if(!BUDGET[code]) BUDGET[code]={bg_isl:0,rg:0,actuals_till:0};
      BUDGET[code].bg_isl       = vals.bg_isl;
      BUDGET[code].rg           = vals.rg;
      BUDGET[code].actuals_till = vals.actuals_till;
    });
    _pendingBudget=null;
  }

  // â”€â”€ Apply month data + override current month detection â”€â”€â”€â”€
  if(_pendingMonth) {
    Object.entries(_pendingMonth.data).forEach(([code,vals])=>{
      MONTH[code]=vals;
    });
    _uploadedMonthIdx = _pendingMonth.detectedMonthIdx;
    _latestActualMonthIdx = _pendingMonth.detectedMonthIdx;
    _dataAsOnDate = new Date();
    monthChanged = true;
    _pendingMonth=null;
  }

  // â”€â”€ Re-render everything â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if(_pendingBudgetPY){
    Object.entries(_pendingBudgetPY.data).forEach(([c,v])=>{ BUDGET_PY[c]={bg_isl:v.bg_isl,rg:v.rg,actuals_till:v.actuals_till}; });
    SOURCE_REGISTER.budgetPY.source = _pendingBudgetPY.filename || SOURCE_REGISTER.budgetPY.source;
    _pendingBudgetPY=null;
  }
  if(_pendingMonthPY){
    Object.entries(_pendingMonthPY.data).forEach(([c,v])=>{ MONTH_PY[c]=v; });
    SOURCE_REGISTER.monthPY.source = _pendingMonthPY.filename || SOURCE_REGISTER.monthPY.source;
    _pendingMonthPY=null;
  }
  if(_pendingSMHBudget || _pendingSMHMonth) {
    if (!window.DETAIL_SMH_DATA) {
      window.DETAIL_SMH_DATA = {
        source:'Uploaded SMH detail reports',
        generatedAt:new Date().toISOString(),
        rules:'Skipped DEPARTMENTCODE 00 and PU 98 Credit or Recoveries',
        monthLabels:['April 2026','May 2026','June 2026','July 2026','August 2026','September 2026','October 2026','November 2026','December 2026','January 2027','February 2027','March 2027'],
        monthKeys:FY_MONTHS,
        totals:{budget:0,actualTill:0,months:smhEmptyMonths()},
        rows:[]
      };
    }
    if(_pendingSMHBudget) {
      window.DETAIL_SMH_DATA.rows = mergeSMHDetailRows(window.DETAIL_SMH_DATA.rows, _pendingSMHBudget.rows, 'budget');
      _pendingSMHBudget = null;
    }
    if(_pendingSMHMonth) {
      window.DETAIL_SMH_DATA.rows = mergeSMHDetailRows(window.DETAIL_SMH_DATA.rows, _pendingSMHMonth.rows, 'month');
      _pendingSMHMonth = null;
    }
    window.DETAIL_SMH_DATA.generatedAt = new Date().toISOString();
    rebuildSMHDetailTotals();
    const deptSel = document.getElementById('smhDeptFilter');
    if (deptSel) delete deptSel.dataset.ready;
    initSMHDetailFilters();
  }
  if(hadCYUpdate) saveCYUploadState();
  if(hadPYUpdate) {
    savePYUploadState({
      budgetFile:pendingNames.pyBudget || SOURCE_REGISTER.budgetPY.source,
      monthFile:pendingNames.pyMonth || SOURCE_REGISTER.monthPY.source
    });
    SOURCE_REGISTER.budgetPY.remarks = `Previous year data uploaded and confirmed ${indianDateTime(_pyUploadMeta && _pyUploadMeta.confirmedAt)}.`;
    SOURCE_REGISTER.monthPY.remarks = SOURCE_REGISTER.budgetPY.remarks;
    setPYUpdateMode(false);
  }
  if(hadCYUpdate || hadPYUpdate || hadSMHUpdate) {
    const parts = [];
    if (hadCYUpdate) parts.push('CY PU data');
    if (hadSMHUpdate) parts.push('CY DEPT-Demand detail');
    if (hadPYUpdate) parts.push('PY comparison data');
    const files = Object.values(pendingNames).filter(Boolean).join(' | ');
    addUploadConfirmation({
      label:'Confirmed upload',
      detail:parts.join(', ') || 'Portal data refreshed',
      files
    });
  }
  renderAll();
  renderCurDataGrid();
  renderUploadConfirmHistory();
  renderRemarks();
  renderUploadLog();
  if(typeof renderTrend==='function') renderTrend();
  if(hadSMHUpdate && typeof renderSMHDetail==='function') renderSMHDetail();

  // Flash the apply button to confirm
  const btn = document.getElementById('applyBtn');
  btn.textContent = 'OK Applied! Tables Updated.';
  btn.style.background='#1A7A4A';
  btn.disabled=true;
  setTimeout(()=>{
    btn.textContent='OK Apply Uploaded Data & Refresh All Tables';
    btn.style.background='';
    btn.disabled=true; // reset - need new upload to enable again
  },3000);

  if(monthChanged){
    // Show confirmation banner at top
    const banner=document.createElement('div');
    banner.style.cssText='position:fixed;top:70px;right:20px;z-index:9998;background:#1A7A4A;color:#fff;padding:10px 18px;border-radius:8px;font-size:11px;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,.2)';
    banner.textContent='OK Data applied - current month auto-updated from uploaded file';
    document.body.appendChild(banner);
    setTimeout(()=>banner.remove(),4000);
  }
}

function renderCurDataGrid() {
  const {cur,futureMonths} = getMonthStatus();
  const pus = activePUMeta();
  let totB=0,totC=0;
  pus.forEach(p=>{const cv=compute(p.code);totB+=cv.budget;totC+=cv.totalCommitted;});
  const grid=document.getElementById('curDataGrid');
  if(!grid) return;
  const dataSource = _uploadedMonthIdx !== null
    ? `Uploaded file (${FY_MONTH_LABELS[_uploadedMonthIdx]} ${_uploadedMonthIdx<=8?2026:2027})`
    : 'Pre-loaded (JUN 2026)';
  const lastConfirm = _uploadConfirmHistory[0] ? indianDateTime(_uploadConfirmHistory[0].at) : 'Not confirmed this browser';
  const pySource = _pyUploadMeta ? `Stored PY (${indianDateTime(_pyUploadMeta.confirmedAt)})` : 'Pre-loaded PY static';
  grid.innerHTML=`
    <div class="cdb-item"><div class="cdb-lbl">Data Source</div><div class="cdb-val" style="font-size:10px">${dataSource}</div></div>
    <div class="cdb-item"><div class="cdb-lbl">Current Month</div><div class="cdb-val" style="color:#1A4E9A">${cur.label} ${cur.year}</div></div>
    <div class="cdb-item"><div class="cdb-lbl">Gross Budget</div><div class="cdb-val">${(totB*1000/10000000).toFixed(0)} Cr</div></div>
    <div class="cdb-item"><div class="cdb-lbl">Committed Till Date</div><div class="cdb-val" style="color:#1A7A4A">${(totC*1000/10000000).toFixed(0)} Cr</div></div>
    <div class="cdb-item"><div class="cdb-lbl">Remaining Months</div><div class="cdb-val">${futureMonths.length}</div></div>
    <div class="cdb-item"><div class="cdb-lbl">Budget Mode</div><div class="cdb-val" style="font-size:10px">${isRGActive()?'OK RG Active':'BG_ISL'}</div></div>
    <div class="cdb-item"><div class="cdb-lbl">PY Source</div><div class="cdb-val" style="font-size:10px">${htmlSafe(pySource)}</div></div>
    <div class="cdb-item"><div class="cdb-lbl">Last Confirm</div><div class="cdb-val" style="font-size:10px">${htmlSafe(lastConfirm)}</div></div>
  `;
  renderUploadConfirmHistory();
}

function renderRemarks() {
  const kpiWrap = document.getElementById('remarksKpis');
  const sourceBody = document.getElementById('remarksSourceBody');
  const ruleBody = document.getElementById('remarksRuleBody');
  const puBody = document.getElementById('remarksPUBody');
  if (!kpiWrap || !sourceBody || !ruleBody || !puBody) return;

  const activePus = activePUMeta();
  const gstExcluded = PU_META.filter(pu => isSkippedDisplayPU(pu.code));
  const recoveryPU = PU_META.find(pu => pu.code === '98');
  const staffCommitted = PU_META.filter(pu => pu.puType === 'Staff PU' && String(pu.liab).includes('Committed') && !pu.isNeg);
  const smhRows = (window.DETAIL_SMH_DATA && Array.isArray(window.DETAIL_SMH_DATA.rows)) ? window.DETAIL_SMH_DATA.rows : [];
  const smhVisibleRows = smhRows.filter(r => !isSkippedDisplayPU(r.puCode) && normPUCode(r.puCode) !== '98');
  const {cur, actualMonths} = getMonthStatus();

  kpiWrap.innerHTML = [
    ['Current Year Used', '2026-2027', 'CY budget and actual files'],
    ['Previous Year Used', '2025-2026', 'PY comparison base'],
    ['Visible PU Count', activePus.length, 'after display exclusions'],
    ['Actual Months', actualMonths.map(m => FY_MONTH_LABELS[FY_MONTHS.indexOf(m)]).join(', ') || 'None', `current running month: ${cur.label} ${cur.year}`],
    ['SMH Rows Used', smhVisibleRows.length, 'after Dept 00, PU-98 and GST display rules'],
    ['Excluded PU Codes', '72, 73, 74, 75, 98', 'GST and recoveries display rules']
  ].map(([label, value, note]) => `
    <div class="remarks-kpi">
      <span>${htmlSafe(label)}</span>
      <strong>${htmlSafe(value)}</strong>
      <em>${htmlSafe(note)}</em>
    </div>`).join('');

  sourceBody.innerHTML = Object.values(SOURCE_REGISTER).map(row => `
    <tr>
      <td><strong>${htmlSafe(row.label)}</strong></td>
      <td>${htmlSafe(row.fy)}</td>
      <td class="remarks-source-file">${htmlSafe(row.source)}</td>
      <td>${htmlSafe(row.used)}</td>
      <td>${htmlSafe(row.remarks || 'Static/pre-loaded portal data unless replaced through Data Upload.')}</td>
    </tr>`).join('');

  const aiSkipCodes = staffCommitted.map(pu => `PU-${pu.code}`).join(', ');
  ruleBody.innerHTML = [
    ['Department skip from IPAS detail file', 'DEPARTMENTCODE = 00', 'DEPT-Demand Wise import/parsing', 'Department 00 rows are treated as non-operational/control rows and are not included in detail display.'],
    ['Credit / recovery skip', 'PU-98 Credit or Recoveries', 'All normal budget/expense display; kept separately for recovery reference/export', 'Recoveries are negative/credit nature and are not mixed with expenditure analysis.'],
    ['GST PU display skip', 'PU-72 CGST, PU-73 SGST, PU-74 UTGST, PU-75 IGST', 'All visible tabs/tables and analysis pages', 'These are tax adjustment heads and are excluded from operational expenditure view.'],
    ['AI Trend committed staff skip', aiSkipCodes, 'AI Trend Analysis Summary only', 'Staff committed liability is regular payroll type spending, so AI Trend focuses on controllable/non-committed pressure.'],
    ['Budget source rule', isRGActive() ? 'RG active' : 'RG not active - BG_ISL used', 'Budget values across portal', isRGActive() ? 'Revised Grant is being used because RG values are active.' : 'Budget calculations are currently based on BG_ISL.']
  ].map(([rule, codes, where, clarification]) => `
    <tr>
      <td><strong>${htmlSafe(rule)}</strong></td>
      <td>${htmlSafe(codes)}</td>
      <td>${htmlSafe(where)}</td>
      <td>${htmlSafe(clarification)}</td>
    </tr>`).join('');

  const excludedPus = [...gstExcluded, recoveryPU].filter(Boolean);
  puBody.innerHTML = excludedPus.map(pu => {
    const bud = BUDGET[pu.code] || {};
    const reason = pu.code === '98'
      ? 'Credit or Recoveries - shown separately, excluded from normal expense view'
      : 'GST tax head - excluded from operational display';
    return `<tr>
      <td><strong>PU-${htmlSafe(pu.code)}</strong></td>
      <td>${htmlSafe(pu.desc)}</td>
      <td class="n">${fmtT(Number(bud.bg_isl) || 0)}</td>
      <td class="n">${fmtT(Number(bud.actuals_till) || 0)}</td>
      <td>${htmlSafe(reason)}</td>
    </tr>`;
  }).join('');
  refreshBIViewSoon();
}


let _tCharts={};
function _dC(id){if(_tCharts[id]){_tCharts[id].destroy();delete _tCharts[id];}}
function _mC(id,cfg){_dC(id);const ctx=document.getElementById(id);if(!ctx)return;_tCharts[id]=new Chart(ctx,cfg);return _tCharts[id];}

const FOCUS_PUS = Array.from(IMPORTANT_PUS);
const FOCUS_DESC={'27':'Materials from stock','28':'Materials-Dir. purchase','30':'Cost Of Elec. Energy/Traction Energy Procurement','32':'Contractual payments','60':'Fuel/Power'};

function renderTrend(){
  if(!window.Chart)return;
  const puSel  =(document.getElementById('trendPUSelect') ||{}).value||'ALL';
  const useBPSelection = !!((document.getElementById('trendUseBPPU') || {}).checked);
  const cType  =(document.getElementById('trendChartType')||{}).value||'monthly';
  const topNv  =(document.getElementById('trendTopN')     ||{}).value||'10';
  const showPY =((document.getElementById('trendShowPY')  ||{}).checked!==false);
  const topN   =topNv==='999'?999:parseInt(topNv);
  const hasPY  =Object.keys(MONTH_PY).length>0||Object.keys(BUDGET_PY).length>0;
  const MK=FY_MONTHS, ML=FY_MONTH_LABELS;
  const monthStatus = getMonthStatus();
  const CUR_IDX = monthStatus.cur.idx;
  const actualDoneIdxs = monthStatus.actualMonths.map(m => MK.indexOf(m)).filter(i => i >= 0);
  if (!actualDoneIdxs.includes(CUR_IDX)) actualDoneIdxs.push(CUR_IDX);
  const ML_S=['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
  const activePUs=activePUMeta().filter(p => passesPUFocus(p.code));
  const trendSelectedCodes = useBPSelection ? bpSelectedCodes() : (puSel === 'ALL' ? ['all'] : [puSel]);
  const puList=trendSelectedCodes.includes('all')
    ? activePUs
    : activePUs.filter(p=>trendSelectedCodes.includes(p.code));
  const trendScopeLabel = useBPSelection
    ? (trendSelectedCodes.includes('all') ? 'BP ticks: All PUs' : `BP ticks: ${trendSelectedCodes.length} PU(s)`)
    : (puSel==='ALL'?'All PUs':'PU-'+puSel);

  function fCr(v){return v?(Math.abs(v)*1000/10000000).toFixed(1)+' Cr':'-';}
  function fN(v){return v?Math.round(v).toLocaleString('en-IN'):'-';}
  function sumM(pus,ds){return MK.map((_,mi)=>pus.reduce((s,p2)=>s+(ds[p2.code]?ds[p2.code][MK[mi]]||0:0),0));}

  // â”€â”€ KPI Strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const strip=document.getElementById('trendKPIStrip');
  if(strip){
    const totB=puList.reduce((s,p2)=>s+(BUDGET[p2.code]?BUDGET[p2.code].bg_isl||0:0),0);
    const totA=puList.reduce((s,p2)=>s+(BUDGET[p2.code]?BUDGET[p2.code].actuals_till||0:0),0);
    const bal=totB-totA, util=totB?(totA/totB*100):0;
    const pyA=hasPY&&showPY?puList.reduce((s,p2)=>s+(BUDGET_PY[p2.code]?BUDGET_PY[p2.code].actuals_till||0:0),0):null;
    const yoy=pyA&&pyA!==0?((totA-pyA)/Math.abs(pyA)*100):null;
    const activeMths=sumM(puList,MONTH).filter(v=>v>0).length;
    strip.innerHTML=[
      ['Budget BG_ISL',fCr(totB),trendScopeLabel],
      ['Actuals Till Date',fCr(totA),util.toFixed(1)+'% utilised'],
      ['Balance',fCr(Math.abs(bal)),(bal<0?'Warning Over Budget':'Remaining')],
      ['Months Active',activeMths+'/12','APR 2026 to MAR 2027'],
      yoy!==null?['YoY Change',(yoy>=0?'+':'')+yoy.toFixed(1)+'%','vs full year PY 2025-26']:
                 ['PY Data','Pre-loaded OK','27-Jun-2026 static file'],
    ].map(([l,v,s])=>`<div class="trend-kpi"><div class="tk-lbl">${l}</div><div class="tk-val">${v}</div><div class="tk-sub">${s}</div></div>`).join('');
  }
  const note=document.getElementById('trendDataNote');
  if(note) note.textContent='Data: 29-Jun-2026 (CY) | PY: 2025-26 full year';

  // â”€â”€ Main Chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const titleEl=document.getElementById('mainChartTitle');
  const cyV=sumM(puList,MONTH), pyV=hasPY&&showPY?sumM(puList,MONTH_PY):null;
  let mainLabels = ML_S.map((m,i)=>m+(i<=8?'\'26':'\'27'));
  let mainTooltipCallbacks = null;
  if(['monthly','actualdone','cumulative','yoy'].includes(cType)){
    let ds=[];
    if(cType==='actualdone'){
      const doneIdxs = actualDoneIdxs.filter(i => cyV[i] || i <= CUR_IDX);
      mainLabels = doneIdxs.map(i => ML_S[i] + (i <= 8 ? '\'26' : '\'27'));
      const doneCY = doneIdxs.map(i => (cyV[i] * 1000 / 10000000).toFixed(1));
      ds = [{
        label:'CY Actual Expenses Done',
        data:doneCY,
        backgroundColor:doneIdxs.map(i => i === CUR_IDX ? 'rgba(244,169,50,.88)' : 'rgba(26,122,74,.78)'),
        borderColor:'#1A7A4A',
        borderWidth:1.5,
        borderRadius:4
      }];
      if(pyV){
        ds.push({
          label:'PY Same Months',
          data:doneIdxs.map(i => (pyV[i] * 1000 / 10000000).toFixed(1)),
          type:'line',
          borderColor:'#C9A84C',
          backgroundColor:'transparent',
          borderWidth:2.5,
          tension:.28,
          pointRadius:4,
          borderDash:[4,2]
        });
      }
      const rangeLabel = mainLabels.length ? ` (${mainLabels[0]} to ${mainLabels[mainLabels.length - 1]})` : '';
      if(titleEl) titleEl.textContent='Actual Expenses Done Months'+rangeLabel+' - '+trendScopeLabel;
      mainTooltipCallbacks = {afterLabel:c=>c.dataIndex===doneIdxs.indexOf(CUR_IDX)?'Current month till-date / committed':''};
    } else if(cType==='cumulative'){
      let cc=0,cp=0;
      const cumCY=cyV.map(v=>{cc+=v;return(cc*1000/10000000).toFixed(1);});
      ds=[{label:'CY 2026-27 Cumulative (RsCr)',data:cumCY,borderColor:'#1C6FD9',backgroundColor:'rgba(28,111,217,.12)',fill:true,tension:.35,pointRadius:4,type:'line'}];
      if(pyV){const cumPY=pyV.map(v=>{cp+=v;return(cp*1000/10000000).toFixed(1);}); ds.push({label:'PY 2025-26 Cumulative (RsCr)',data:cumPY,borderColor:'#C9A84C',fill:false,tension:.35,pointRadius:4,type:'line',borderDash:[5,3]});}
      if(titleEl) titleEl.textContent='Cumulative Spend - APR to MAR';
    } else if(cType==='yoy'){
      if(!pyV||!hasPY){if(titleEl) titleEl.textContent='YoY - PY data pre-loaded'; return;}
      const yoyD=cyV.map((v,i)=>pyV[i]?((v-pyV[i])/Math.abs(pyV[i])*100).toFixed(1):null);
      ds=[{label:'YoY % Change',data:yoyD,backgroundColor:yoyD.map(v=>parseFloat(v)>=0?'rgba(26,122,74,.75)':'rgba(204,0,0,.75)'),borderRadius:4}];
      if(titleEl) titleEl.textContent='Month-wise Year-on-Year % Change (CY vs PY)';
    } else {
      const barsClr=cyV.map((_,i)=>i<CUR_IDX?'rgba(28,111,217,.75)':i===CUR_IDX?'rgba(244,169,50,.85)':'rgba(28,111,217,.2)');
      ds=[{label:'CY 2026-27 Actuals',data:cyV.map(v=>(v*1000/10000000).toFixed(1)),backgroundColor:barsClr,borderRadius:3}];
      if(pyV) ds.push({label:'PY 2025-26',data:pyV.map(v=>(v*1000/10000000).toFixed(1)),type:'line',borderColor:'#C9A84C',backgroundColor:'transparent',borderWidth:2.5,tension:.3,pointRadius:4,borderDash:[4,2]});
      if(titleEl) titleEl.textContent='Monthly Actuals - '+trendScopeLabel;
    }
    _mC('trendMainChart',{type:'bar',data:{labels:mainLabels,datasets:ds},options:{responsive:true,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{boxWidth:12,font:{size:10}}},tooltip:{callbacks:mainTooltipCallbacks||{}}},scales:{x:{ticks:{font:{size:10}}},y:{title:{display:true,text:'Rs Crore'},ticks:{font:{size:10}}}}}});
  } else {
    const sorted=activePUs.filter(p2=>BUDGET[p2.code]&&BUDGET[p2.code].bg_isl>0).sort((a,b)=>(BUDGET[b.code].actuals_till||0)-(BUDGET[a.code].actuals_till||0)).slice(0,topN);
    if(cType==='pubar'){
      _mC('trendMainChart',{type:'bar',data:{labels:sorted.map(p2=>'PU-'+p2.code),datasets:[{label:'Budget',data:sorted.map(p2=>(BUDGET[p2.code].bg_isl/10000).toFixed(0)),backgroundColor:'rgba(26,74,138,.45)',borderRadius:3},{label:'Actuals',data:sorted.map(p2=>(BUDGET[p2.code].actuals_till/10000).toFixed(0)),backgroundColor:'rgba(26,122,74,.75)',borderRadius:3}]},options:{responsive:true,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{boxWidth:12,font:{size:10}}}},scales:{x:{ticks:{font:{size:9},maxRotation:35}},y:{title:{display:true,text:'Rs Cr'},ticks:{font:{size:10}}}}}});
      if(titleEl) titleEl.textContent='Top '+sorted.length+' PUs - Budget vs Actuals (Rs Cr)';
    } else {
      const utD=sorted.map(p2=>Math.min(150,Math.round((BUDGET[p2.code].actuals_till||0)/Math.max(BUDGET[p2.code].bg_isl||1,1)*100)));
      _mC('trendMainChart',{type:'bar',data:{labels:sorted.map(p2=>'PU-'+p2.code),datasets:[{label:'Utilisation %',data:utD,backgroundColor:utD.map(u=>u>100?'rgba(204,0,0,.75)':u>85?'rgba(232,93,4,.75)':u>60?'rgba(192,112,0,.65)':'rgba(26,122,74,.75)'),borderRadius:3}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{font:{size:9},maxRotation:35}},y:{max:155,title:{display:true,text:'%'},ticks:{callback:v=>v+'%',font:{size:10}}}}}});
      if(titleEl) titleEl.textContent='Budget Utilisation Ranking (Top '+sorted.length+')';
    }
  }

  // â”€â”€ Utilisation bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const topU=activePUs.filter(p2=>BUDGET[p2.code]&&BUDGET[p2.code].bg_isl>0).sort((a,b)=>{return (BUDGET[b.code].actuals_till||0)/Math.max(BUDGET[b.code].bg_isl||1,1)-(BUDGET[a.code].actuals_till||0)/Math.max(BUDGET[a.code].bg_isl||1,1);}).slice(0,10);
  _mC('trendUtilChart',{type:'bar',data:{labels:topU.map(p2=>'PU-'+p2.code+': '+p2.desc.substring(0,14)),datasets:[{label:'Utilisation %',data:topU.map(p2=>Math.min(150,Math.round((BUDGET[p2.code].actuals_till||0)/Math.max(BUDGET[p2.code].bg_isl||1,1)*100))),backgroundColor:topU.map(p2=>{const u=(BUDGET[p2.code].actuals_till||0)/Math.max(BUDGET[p2.code].bg_isl||1,1)*100;return u>100?'rgba(204,0,0,.75)':u>85?'rgba(232,93,4,.75)':u>60?'rgba(192,112,0,.65)':'rgba(26,122,74,.75)';}),borderRadius:3}]},options:{indexAxis:'y',responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.raw+'% utilised'}}},scales:{x:{max:155,title:{display:true,text:'%'},ticks:{callback:v=>v+'%',font:{size:9}}},y:{ticks:{font:{size:8}}}}}});

  // â”€â”€ Top 15 Budget vs Actuals bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const top15=activePUs.filter(p2=>BUDGET[p2.code]&&(BUDGET[p2.code].actuals_till||0)>0).sort((a,b)=>(BUDGET[b.code].actuals_till||0)-(BUDGET[a.code].actuals_till||0)).slice(0,15);
  _mC('trendTopPUChart',{type:'bar',data:{labels:top15.map(p2=>'PU-'+p2.code+': '+p2.desc.substring(0,14)),datasets:[{label:'Budget (RsCr)',data:top15.map(p2=>((BUDGET[p2.code].bg_isl||0)/10000).toFixed(0)),backgroundColor:'rgba(26,74,138,.4)',borderRadius:2},{label:'Actuals (RsCr)',data:top15.map(p2=>((BUDGET[p2.code].actuals_till||0)/10000).toFixed(0)),backgroundColor:'rgba(26,122,74,.75)',borderRadius:2}]},options:{responsive:true,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{boxWidth:12,font:{size:10}}}},scales:{x:{ticks:{font:{size:8},maxRotation:35}},y:{title:{display:true,text:'Rs Cr'},ticks:{font:{size:10}}}}}});

  // â”€â”€ Heatmap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const hmDiv=document.getElementById('trendHeatmap');
  if(hmDiv){
    const hmPUs=activePUs.filter(p2=>MK.some(mk=>MONTH[p2.code]&&MONTH[p2.code][mk]>0)).slice(0,18);
    const allV=[];hmPUs.forEach(p2=>MK.forEach(mk=>{if(MONTH[p2.code]&&MONTH[p2.code][mk]>0)allV.push(MONTH[p2.code][mk]);}));
    const maxV=Math.max(...allV,1);
    function hC(v){const r=Math.round(28+(v/maxV)*176),g=Math.round(111*(v/maxV)),b=Math.round(217-(v/maxV)*160);return 'rgb('+r+','+g+','+b+')';}
    const hdr='<tr><th style="text-align:left;background:#0A1628;position:sticky;left:0;z-index:3">PU</th>'+ML.map((m,i)=>'<th>'+m+'<br><span style="font-size:7px">'+(i<=8?'26':'27')+'</span></th>').join('')+'</tr>';
    const rows=hmPUs.map(pu=>'<tr><td style="text-align:left;font-weight:700;background:#F5F8FC;position:sticky;left:0;z-index:2;white-space:nowrap">PU-'+pu.code+'</td>'+MK.map((mk,i)=>{const v=MONTH[pu.code]?MONTH[pu.code][mk]||0:0;const cr2=(v*1000/10000000).toFixed(1);const bg=v>0?hC(v):'#F8FAFB';const fg=v>maxV*0.4?'#fff':'#0A1628';return '<td style="background:'+bg+';color:'+fg+'">'+(v>0?cr2:'-')+'</td>';}).join('')+'</tr>').join('');
    hmDiv.innerHTML='<table><thead>'+hdr+'</thead><tbody>'+rows+'</tbody></table>';
  }

  // â”€â”€ Focus PUs YoY chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const focusDs=[];
  const cyColors=['#1C6FD9','#1A7A4A','#E85D04','#9B2226','#6A4C93','#C9A84C'];
  FOCUS_PUS.forEach((code,fi)=>{
    const cyVf=MK.map((_,mi)=>((MONTH[code]?MONTH[code][MK[mi]]||0:0)*1000/10000000).toFixed(1));
    const pyVf=hasPY&&showPY?MK.map((_,mi)=>((MONTH_PY[code]?MONTH_PY[code][MK[mi]]||0:0)*1000/10000000).toFixed(1)):null;
    focusDs.push({label:'PU-'+code+' CY',data:cyVf,borderColor:cyColors[fi],backgroundColor:'transparent',borderWidth:2.5,tension:.3,pointRadius:4});
    if(pyVf) focusDs.push({label:'PU-'+code+' PY',data:pyVf,borderColor:cyColors[fi],backgroundColor:'transparent',borderWidth:1.5,tension:.3,pointRadius:2,borderDash:[4,3],opacity:.5});
  });
  _mC('trendFocusChart',{type:'line',data:{labels:ML_S.map((m,i)=>m+(i<=8?'\'26':'\'27')),datasets:focusDs},options:{responsive:true,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{boxWidth:10,font:{size:8},filter:i=>!i.text.includes('PY')||showPY}}},scales:{x:{ticks:{font:{size:9}}},y:{title:{display:true,text:'Rs Cr'},ticks:{font:{size:9}}}}}});

  // â”€â”€ Analytics Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const thead=document.getElementById('trendTHead'),tbody=document.getElementById('trendTBody');
  if(thead&&tbody){
    thead.innerHTML='<tr><th style="text-align:left">PU</th><th style="text-align:left">Description</th><th>Type</th><th>Budget</th><th>Actuals CY</th><th>Util%</th><th>Status</th><th>PY Actuals</th><th>YoY</th>'+MK.map((mk,i)=>'<th>'+ML[i]+'</th>').join('')+'<th>Total</th></tr>';
    tbody.innerHTML=activePUs.map(pu=>{
      const b=BUDGET[pu.code]||{},mo=MONTH[pu.code]||{},bpy=BUDGET_PY[pu.code]||{};
      const util=b.bg_isl?Math.round((b.actuals_till||0)/b.bg_isl*100):0;
      const uC=util>100?'#CC0000':util>85?'#E85D04':util>60?'#C07000':'#1A7A4A';
      const pyAct=bpy.actuals_till||0;
      const yoy=pyAct?((b.actuals_till||0)-pyAct)/Math.abs(pyAct)*100:null;
      const total=MK.reduce((s,mk)=>s+(mo[mk]||0),0);
      const isFocus=FOCUS_PUS.includes(pu.code);
      const noExp = isBudgetNoExpense(pu.code);
      return '<tr style="'+(noExp?'background:#FFF4C2;box-shadow:inset 4px 0 0 #B88700;':isFocus?'background:#FFFBF0;':'')+(isFocus?'font-weight:600':'')+'">'+
        '<td style="font-weight:700;color:#1C3A5E;cursor:pointer" onclick="openPUDetail(\''+pu.code+'\')">PU-'+pu.code+(isFocus?' *':'')+'</td>'+
        '<td>'+pu.desc+'</td>'+
        '<td style="font-size:9px">'+(pu.puType==='Staff PU'?'<span style="color:#1A7A4A">Staff</span>':'<span style="color:#1A4E9A">Non-Staff</span>')+'</td>'+
        '<td>'+fN(b.bg_isl||0)+'</td>'+
        '<td>'+fN(b.actuals_till||0)+'</td>'+
        '<td style="color:'+uC+';font-weight:700">'+util+'%</td>'+
        '<td class="no-exp-status">'+htmlSafe(noExpenseStatus(noExp))+'</td>'+
        '<td>'+fN(pyAct)+'</td>'+
        '<td style="color:'+(yoy===null?'#888':yoy>=0?'#CC0000':'#1A7A4A')+';font-weight:700">'+(yoy===null?'-':(yoy>=0?'+':'')+yoy.toFixed(1)+'%')+'</td>'+
        MK.map((mk,i)=>{const v=mo[mk]||0;const isCur=i===CUR_IDX,isFut=i>CUR_IDX;return '<td style="'+(v>0&&isCur?'background:#FFF8E0;font-weight:700;':'')+(isFut?'color:#B0C0D8;':'')+'font-size:9px">'+(v>0?v.toLocaleString('en-IN'):'<span style="color:#ddd">-</span>')+'</td>';}).join('')+
        '<td style="font-weight:700;font-size:10px">'+fN(total)+'</td>'+
        '</tr>';
    }).join('');
  }
  refreshBIViewSoon();
}

function renderMonthwise() {
  const pus = getFiltered();
  const {pastMonths, futureMonths, cur} = getMonthStatus();
  const futurePadCount = Math.max(0, 9 - futureMonths.length);
  const pastHdr = pastMonths.map(m => {
    const idx = FY_MONTHS.indexOf(m);
    return `<th>${FY_MONTH_LABELS[idx]}<br>Actual</th>`;
  }).join('');
  const futureHdr = futureMonths.map(m => {
    const idx = FY_MONTHS.indexOf(m);
    return `<th style="background:#1A3A6A;color:#DDEEFF">${FY_MONTH_LABELS[idx]}<br>Projected</th>`;
  }).join('') + '<th style="color:#aaa">-</th>'.repeat(futurePadCount);
  const mwHead = document.getElementById('mw-thead');
  if (mwHead) {
    mwHead.innerHTML = `
      <tr>
        <th class="la" style="min-width:40px">PU</th>
        <th class="la" style="min-width:160px">Description</th>
        ${pastHdr}
        <th style="background:#7A5A00;color:#FFF9E0">${cur.label} till<br>date exp</th>
        <th style="background:#7A5A00;color:#FFF9E0">${cur.label}<br>Remaining</th>
        <th style="background:#7A5A00;color:#FFF9E0">${cur.label}<br>Total</th>
        ${futureHdr}
        <th>Budget<br>(Rs'000s)</th>
        <th>Committed<br>Till Date</th>
        <th>Balance<br>Budget</th>
        <th>%<br>Used</th>
        <th>Status</th>
      </tr>`;
  }

  let rows = '';
  const tots = {curC:0, curR:0, curT:0, tB:0, tC:0, tBal:0};
  pastMonths.forEach(m => tots[m] = 0);
  futureMonths.forEach(m => tots[m] = 0);

  pus.forEach(pu => {
    const md = MONTH[pu.code] || {};
    const c = compute(pu.code);
    const proj = c.projPerMonth;
    const pastCells = pastMonths.map(m => {
      const v = md[m] || 0;
      tots[m] += v;
      return `<td class="n">${fmtT(v)}</td>`;
    }).join('');
    tots.curC += c.curCommitted;
    tots.curR += c.curRemaining;
    tots.curT += c.curMonthTotal;
    tots.tB += c.budget;
    tots.tC += c.totalCommitted;
    tots.tBal += c.balanceBudget;
    futureMonths.forEach(m => tots[m] += (proj || 0));

    const util = Math.min(100, c.utilisedPct);
    const col = utilColor(util);
    const noExp = isBudgetNoExpense(pu.code);
    let futureCells = futureMonths.map(() => `<td class="n" style="color:#1A4A8A;background:#F0F6FF">${fmtT(proj)}</td>`).join('');
    if (futurePadCount) futureCells += '<td class="n" style="color:#aaa">-</td>'.repeat(futurePadCount);
    const balCls = c.balanceBudget < 0 ? 'neg' : c.balanceBudget < c.budget * 0.1 ? 'low' : 'ok';
    rows += `<tr class="${getRowClass(pu)}" data-pu="${pu.code}" style="cursor:pointer">
      <td class="puc puc-link" title="Open Full Details: PU-${pu.code}" onclick="event.stopPropagation();openPUDetail('${pu.code}')">${pu.code}</td>
      <td class="desc" title="${pu.desc}" style="font-weight:700">${pu.desc}</td>
      ${pastCells}
      <td class="n" style="background:#FFF9E0;font-weight:600">${fmtT(c.curCommitted)}</td>
      <td class="n" style="background:#FFF9E0;color:var(--muted)">${fmtT(c.curRemaining)}</td>
      <td class="n" style="background:#FFF9E0;font-weight:700">${fmtT(c.curMonthTotal)}</td>
      ${futureCells}
      <td class="n">${fmtT(c.budget)}</td>
      <td class="n" style="font-weight:700">${fmtT(c.totalCommitted)}</td>
      <td class="n rem ${balCls}">${fmtT(c.balanceBudget)}</td>
      <td>${miniProg(util, col)}</td>
      <td class="no-exp-status">${htmlSafe(noExpenseStatus(noExp))}</td>
    </tr>`;
  });

  const futTotCells = futureMonths.map(m =>
    `<td class="n" style="color:#1A4A8A;background:#E8F0FF;font-weight:700">${fmtT(tots[m] || 0)}</td>`).join('');
  let ftPad = futTotCells;
  for (let i = 0; i < futurePadCount; i++) ftPad += '<td class="n" style="color:#aaa">-</td>';
  const totalPastCells = pastMonths.map(m => `<td class="n">${fmtT(tots[m] || 0)}</td>`).join('');
  const tUtil = pct(tots.tC, tots.tB);
  rows += `<tr class="tot">
    <td colspan="2" style="text-align:left">GRAND TOTAL</td>
    ${totalPastCells}
    <td class="n" style="background:#FFF0C0">${fmtT(tots.curC)}</td>
    <td class="n" style="background:#FFF0C0">${fmtT(tots.curR)}</td>
    <td class="n" style="background:#FFF0C0">${fmtT(tots.curT)}</td>
    ${ftPad}
    <td class="n">${fmtT(tots.tB)}</td>
    <td class="n">${fmtT(tots.tC)}</td>
    <td class="n rem ${tots.tBal < 0 ? 'neg' : 'ok'}">${fmtT(tots.tBal)}</td>
    <td>${miniProg(Math.min(100, tUtil), utilColor(tUtil))}</td>
    <td>-</td>
  </tr>`;
  document.getElementById('mw-tbody').innerHTML = rows;
}

function renderAll() {
  initPopup();
  initExportButtons();
  initReportMenuButtons();
  initDashboardDock();
  initSmartTools();
  initReportViewMode();
  renderCards();
  renderJuneBars();
  renderSummaryPage();
  renderLiability();
  renderMonthwise();
  renderPUMaster();
  renderDemandSMHSummary();
  renderBPAnalysis();
  renderBudgetControl();
  renderRemarks();
  renderBIView();
  document.getElementById('rgNote').textContent=isRGActive()?'RG Active':'BG_ISL';
  const {cur:_cur}=getMonthStatus();
  const _cmb=document.getElementById('curMonBadge'); if(_cmb) _cmb.textContent=_cur.label+' '+_cur.year;
  setTimeout(()=>{addDualScroll();attachPUPopup();applyMobileTableLabels();},80);
}

function tableHeaderLabels(table) {
  const rows = Array.from((table.tHead || table.querySelector('thead'))?.rows || []);
  if (!rows.length) return [];
  const grid = [];
  rows.forEach((row, r) => {
    grid[r] = grid[r] || [];
    let c = 0;
    Array.from(row.cells).forEach(cell => {
      while (grid[r][c]) c++;
      const rs = Math.max(1, cell.rowSpan || 1);
      const cs = Math.max(1, cell.colSpan || 1);
      const text = cell.textContent.replace(/\s+/g, ' ').trim();
      for (let rr = 0; rr < rs; rr++) {
        grid[r + rr] = grid[r + rr] || [];
        for (let cc = 0; cc < cs; cc++) {
          const existing = grid[r + rr][c + cc];
          grid[r + rr][c + cc] = existing ? `${existing} ${text}`.trim() : text;
        }
      }
      c += cs;
    });
  });
  const width = Math.max(...grid.map(r => r.length));
  return Array.from({length:width}, (_, c) => {
    const parts = grid.map(r => r[c]).filter(Boolean);
    return [...new Set(parts)].join(' - ').replace(/\s+-\s+$/, '') || 'Value';
  });
}

function applyMobileTableLabels() {
  document.querySelectorAll('table').forEach(table => {
    const labels = tableHeaderLabels(table);
    if (!labels.length) return;
    Array.from(table.tBodies || []).forEach(tbody => {
      Array.from(tbody.rows).forEach(row => {
        Array.from(row.cells).forEach((cell, i) => {
          if (!cell.dataset.label) cell.dataset.label = labels[i] || `Column ${i + 1}`;
        });
      });
    });
  });
}

// SheetJS embedded inline above

// INIT
initPortalTheme();
initBlockStyle();
loadCYUploadState();
loadUploadAdminState();
initSMHDetailFilters();
restoreLoginSession();
renderAll();
renderUploadConfirmHistory();
setTimeout(renderSMHDetail, 120);
(function(){
  const sel=document.getElementById('trendPUSelect'); if(!sel) return;
  activePUMeta().forEach(pu=>{
    const o=document.createElement('option'); o.value=pu.code;
    o.textContent='PU-'+pu.code+' - '+pu.desc; sel.appendChild(o);
  });
})();


