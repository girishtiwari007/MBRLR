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

function setPortalTheme(themeName) {
  const theme = PORTAL_THEMES[themeName] !== undefined ? themeName : 'default';
  const link = document.getElementById('themeStylesheet');
  if (link) link.setAttribute('href', PORTAL_THEMES[theme]);
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('rlp_theme', theme);
  const sel = document.getElementById('themeSelect');
  if (sel && sel.value !== theme) sel.value = theme;
}

function initPortalTheme() {
  const savedTheme = localStorage.getItem('rlp_theme');
  setPortalTheme(savedTheme && savedTheme !== 'default' ? savedTheme : 'digital-india');
}

function setBlockStyle(styleName) {
  const style = styleName === 'raised' ? 'raised' : 'flat';
  document.documentElement.setAttribute('data-block-style', style);
  localStorage.setItem('rlp_block_style', style);
  const sel = document.getElementById('blockStyleSelect');
  if (sel && sel.value !== style) sel.value = style;
}

function initBlockStyle() {
  setBlockStyle(localStorage.getItem('rlp_block_style') || 'flat');
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
  MB: '511c501d71fc3274085c2210ba4bf794d925db384614cac2ff0726816a354b75',
  ITCENTRE: '3bf748dccad2d317e16250586b69eb809f2cb4418b5a2882d5fd35c69cf6a3eb',
  ADMIN: 'b8824be5a97f2673f084e8d91336ffa24752344e361e9f25655e70aeeb12d104'
});

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

async function doLogin() {
  const user = document.getElementById('loginUser').value.trim().toUpperCase();
  const pwd  = document.getElementById('loginPwd').value;
  const err  = document.getElementById('loginErr');
  if (!AUTH_DIGESTS[user]) {
    err.textContent = 'âŒ User ID not found. Contact administrator.';
    setTimeout(()=>err.textContent='', 3000);
    return;
  }
  const digest = await sha256Hex(`${user}:${pwd}`);
  if (AUTH_DIGESTS[user] !== digest) {
    err.textContent = 'âŒ Incorrect password. Please try again.';
    document.getElementById('loginPwd').value = '';
    setTimeout(()=>err.textContent='', 3000);
    return;
  }
  document.getElementById('loginOverlay').classList.add('hidden');
  if (user === 'ADMIN') {
    document.getElementById('uploadTab').style.display = '';
  }
  renderAll(); // Re-render after login to ensure tables are populated
  setTimeout(()=>{addDualScroll();attachPUPopup();},100);
}

// Always require sign-in on page open. This prevents a previous browser session
// from opening the dashboard directly.
sessionStorage.removeItem('rlp_auth');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MASTER DATA â€” from uploaded files (figures in â‚¹ '000s)
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
  // PU-98: Recoveries â€” kept in data for Recovery tab reference only
  {code:'98',desc:'Credit or Recoveries',puType:'Staff PU',liab:'Recovery',isNeg:true},
];

// Budget data from BudgetReport (BG_ISL col, RG col) â€” â‚¹'000s
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

// Month-wise actuals from MONTH WISE report â€” â‚¹'000s
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

// FY Month order APRâ†’MAR and their keys
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
const DEFAULT_DATA_AS_ON_DATE = new Date('2026-07-02T15:12:25+05:30');
let _dataAsOnDate = new Date(DEFAULT_DATA_AS_ON_DATE);
const RLP_BUILD_ID = 'rlp-mbd-2026-07-03-v2.1.1';
const RLP_UPLOAD_STATE_KEY = 'rlp_cy_upload_state_' + RLP_BUILD_ID;

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
  // VERIFIED FORMULA â€” Budget balances exactly across 12 months
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Budget = APR_actual + MAY_actual + JUN_total + JUL_projÃ—9
  // where:
  //   JUN_total      = proj_per_month  (one equal share of remaining)
  //   JUN_remaining  = proj_per_month âˆ’ JUN_committed
  //   proj_per_month = (Budget âˆ’ pastActuals) Ã· (1 + futureMonths.length)
  //
  // CHECK: APR + MAY + projÃ—10 = Budget âœ…
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

  // proj_per_month = remaining after past actuals Ã· 10 equal months
  // (current month remainder counts as 1 full projected month)
  const totalRemainingMonths = 1 + futureMonths.length;  // e.g. 10 for JUN
  const projPerMonth = totalRemainingMonths > 0
    ? (budget - pastActuals) / totalRemainingMonths
    : 0;

  // JUN_remaining = proj_per_month âˆ’ committed (what's left of this month's share)
  // JUN_total     = proj_per_month  (always equal to one projected month)
  const curRemaining  = Math.max(0, projPerMonth - curCommitted);
  const curMonthTotal = projPerMonth;  // = committed + remaining = proj_per_month âœ…

  // % of this month's allocation already committed
  const curDonePct = projPerMonth > 0
    ? Math.min(100, (curCommitted / projPerMonth) * 100)
    : 0;

  // Balance shown = budget âˆ’ all committed spend (past + current month)
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
function fmtT(n) { // â‚¹'000s display with commas
  if (n===null||n===undefined||isNaN(n)||n===0) return '<span style="color:#aaa">â€“</span>';
  const abs = Math.abs(Math.round(n));
  const s = abs.toLocaleString('en-IN');
  return n < 0 ? `<span class="neg-val">(${s})</span>` : s;
}
function fmtCr(n) { // Convert â‚¹'000s â†’ Crore
  if (!n || n===0) return '<span style="color:#aaa">â€“</span>';
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
function getRowClass(pu) {
  if (pu.isNeg) return 'neg-row';
  if (pu.puType==='Staff PU' && pu.liab==='Committed') return 'cs-row';
  if (pu.liab==='Committed') return 'co-row';
  return 'pl-row';
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
  const uc = document.getElementById('utilCompare') ? document.getElementById('utilCompare').value : 'all';
  const uvRaw = document.getElementById('utilPctFilter') ? document.getElementById('utilPctFilter').value : '';
  const uv = uvRaw === '' ? null : Number(uvRaw);
  return PU_META.filter(pu => {
    if (pu.isNeg) return false; // PU-98 shown only in Recoveries tab
    if (tf !== 'all') {
      if (tf === 'Staff'     && pu.puType !== 'Staff PU')     return false;
      if (tf === 'Non Staff' && pu.puType !== 'Non Staff PU') return false;
    }
    if (lf !== 'all' && pu.liab !== lf) return false;
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
  const pus = PU_META.filter(p=>!p.isNeg);
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
      <div class="cv">${fmtCr(totB)}</div><div class="cs2">${Math.round(totB).toLocaleString('en-IN')} â‚¹'000s</div></div>
    <div class="card gold"><div class="cl">Net Budget (excl. Recoveries)</div>
      <div class="cv">${fmtCr(netBudget)}</div><div class="cs2">${Math.round(netBudget).toLocaleString('en-IN')} â‚¹'000s</div></div>
    <div class="card a"><div class="cl">Total Committed (Till ${cur.label})</div>
      <div class="cv">${fmtCr(totC)}</div><div class="cs2">${util}% of gross budget</div></div>
    <div class="card"><div class="cl">Balance Available</div>
      <div class="cv">${fmtCr(totBal)}</div><div class="cs2">Includes ${cur.label} remaining + ${futureMonths.length} future months</div></div>
    <div class="card"><div class="cl">${isRGActive()?'RG Active':'Budget Mode'}</div>
      <div class="cv" style="font-size:14px">${isRGActive()?'RG':'BG_ISL'}</div>
      <div class="cs2">${isRGActive()?'Revised Grant':'Awaiting RG (Jan 2027)'}</div></div>
  `;
  document.getElementById('rgNote').textContent = isRGActive() ? 'âœ… RG Active' : 'âš  RG not active â€” using BG_ISL';
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
    return `<th class="sub" style="min-width:90px">${lbl} Actual<br>(â‚¹'000s)</th>`;
  }).join('');
  const firstFuture = futureMonths.length ? FY_MONTH_LABELS[FY_MONTHS.indexOf(futureMonths[0])] : cur.label;
  document.getElementById('liab-thead').innerHTML = `
    <tr>
      <th class="la" rowspan="2">PU</th>
      <th class="la" rowspan="2" style="min-width:160px">Description</th>
      <th class="la" rowspan="2">PU Type</th>
      <th class="la" rowspan="2">Liability</th>
      <th rowspan="2">Budget<br>(â‚¹'000s)</th>
      ${topPast}
      <th class="sub" colspan="4" id="curMonHdr" style="background:rgba(244,169,50,.15)">${cur.label} ${cur.year} â€” Till Date Exp + Remaining</th>
      <th rowspan="2">Total Committed<br>(â‚¹'000s)</th>
      <th rowspan="2">Balance Budget<br>(â‚¹'000s)</th>
      <th rowspan="2">Proj./Month<br>${futureMonths.length ? firstFuture + 'â€“MAR' : 'Completed'} (â‚¹'000s)</th>
      <th rowspan="2">% Utilised</th>
      <th rowspan="2">Status</th>
    </tr>
    <tr>
      ${subPast}
      <th class="sub" style="min-width:100px">${cur.label} till date exp<br>(â‚¹'000s)</th>
      <th class="sub" style="min-width:90px">${cur.label}<br>Remaining</th>
      <th class="sub" style="min-width:90px">${cur.label} Total<br>(â‚¹'000s)</th>
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
      ? `Balance after ${cur.label} Total Ã· ${futureMonths.length} remaining months (${FY_MONTH_LABELS[FY_MONTHS.indexOf(futureMonths[0])]}-MAR) = Projected per month`
      : `FY completed after ${cur.label}`;
    noteFormula.textContent = `${actualText} + ${cur.label} ${cur.year} Till-Date Exp + ${cur.label} ${cur.year} Remaining = ${cur.label} ${cur.year} Total Liability | ${nextText}.`;
  }
  const el = document.getElementById('curMonHdr');
  if (el) el.textContent = `${cur.label} ${cur.year} â€” till date exp`;

  let html = '';
  const showPUs = PU_META
    .filter(p => !p.isNeg)
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
    const flag   = c.utilisedFlag==='over' ? ' ðŸ”´' : c.utilisedFlag==='no-budget' ? ' ðŸš¨' : '';
    const lbl    = c.utilisedFlag==='no-budget' ? 'No Budget' : pctVal.toFixed(1)+'%';
    html += `<div class="prog-item" data-pu="${pu.code}" style="cursor:pointer">
      <div class="prog-lbl">PU-${pu.code}: ${pu.desc.substring(0,22)}${flag}</div>
      <div class="prog-wrap"><div class="prog-fill" style="width:${Math.min(100,pctVal)}%;background:${col}"></div></div>
      <div class="prog-pct" style="color:${col}">${lbl}</div></div>`;
  });
  document.getElementById('juneBars').innerHTML = html;
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
    if (c.utilisedFlag==='no-budget') statusHtml='<span style="color:#CC0000;font-weight:700">ðŸš¨ No Budget</span>';
    else if (c.utilisedFlag==='over') statusHtml=`<span style="color:#CC0000;font-weight:700">ðŸ”´ Over ${Math.abs(_pct).toFixed(0)}%</span>`;
    else if (c.utilisedFlag==='none') statusHtml='<span style="color:#aaa">â€” Nil</span>';
    else if (_pct > 85) statusHtml = '<span style="color:#CC0000;font-weight:700">âš  Near Limit</span>';
    else if (_pct > 60) statusHtml = '<span style="color:#C07000">ðŸ”¶ Watch</span>';
    else if (pu.liab==='Committed'||pu.liab==='Committed Liability') statusHtml = '<span style="color:var(--green)">âœ” On Track</span>';
    else statusHtml = '<span style="color:var(--muted)">â€” Planned</span>';

    rows += `<tr class="${getRowClass(pu)}" data-pu="${pu.code}" style="cursor:pointer">
      <td class="puc puc-link" title="ðŸ“„ Open Full Details: PU-${pu.code}" onclick="event.stopPropagation();openPUDetail('${pu.code}')">${pu.code} ðŸ”</td>
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
    <td class="n">${fmtT(tJunT)}</td><td>â€“</td>
    <td class="n">${fmtT(tC)}</td><td class="n rem ${tBal<0?'neg':'ok'}">${fmtT(tBal)}</td>
    <td class="n">â€“</td><td>${miniProg(Math.min(100,tUtil),tc2)}</td><td>â€“</td>
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
    if (futureMonths.length < 9) futureCells += '<td class="n" style="color:#aaa">â€“</td>'.repeat(9 - futureMonths.length);

    const balCls = c.balanceBudget<0?'neg':c.balanceBudget<c.budget*0.1?'low':'ok';
    rows += `<tr class="${getRowClass(pu)}" data-pu="${pu.code}" style="cursor:pointer">
      <td class="puc puc-link" title="ðŸ“„ Open Full Details: PU-${pu.code}" onclick="event.stopPropagation();openPUDetail('${pu.code}')">${pu.code} ðŸ”</td>
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
  for(let i=0;i<padNeeded2;i++) ftPad += '<td class="n" style="color:#aaa">â€“</td>';
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
      <div class="cs2">${Math.round(c.budget).toLocaleString('en-IN')} â‚¹'000s</div></div>
    <div class="rec-card"><div class="cl">APR Recoveries</div>
      <div class="cv" style="color:#CC0000;font-size:16px">${fmtCr(apr)}</div>
      <div class="cs2">${apr.toLocaleString('en-IN')} â‚¹'000s</div></div>
    <div class="rec-card"><div class="cl">MAY Recoveries</div>
      <div class="cv" style="color:#CC0000;font-size:16px">${fmtCr(may)}</div>
      <div class="cs2">${may.toLocaleString('en-IN')} â‚¹'000s</div></div>
    <div class="rec-card"><div class="cl">${cur.label} Committed</div>
      <div class="cv" style="color:#CC0000;font-size:16px">${fmtCr(c.curCommitted)}</div>
      <div class="cs2">${c.curCommitted.toLocaleString('en-IN')} â‚¹'000s</div></div>
    <div class="rec-card"><div class="cl">Total Committed</div>
      <div class="cv" style="color:#CC0000;font-size:16px">${fmtCr(c.totalCommitted)}</div>
      <div class="cs2">${c.utilisedPct.toFixed(1)}% of recovery budget</div></div>
    <div class="rec-card"><div class="cl">Proj./Month (${futureMonths.length} months)</div>
      <div class="cv" style="color:#CC0000;font-size:16px">${fmtCr(c.projPerMonth)}</div>
      <div class="cs2">${Math.round(c.projPerMonth).toLocaleString('en-IN')} â‚¹'000s</div></div>
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
  let cells = allMonths.map(m => `<td class="n neg-val">${md[m]?fmtT(md[m]):'<span style="color:#aaa">â€“</span>'}</td>`).join('');
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
    rows += `<tr class="${getRowClass(pu)}" data-pu="${pu.code}" style="cursor:pointer">
      <td class="puc puc-link" title="ðŸ“„ Open Full Details: PU-${pu.code}" onclick="event.stopPropagation();openPUDetail('${pu.code}')">${pu.code} ðŸ”</td>
      <td class="desc pu-desc" title="${pu.desc}">${pu.desc}</td>
      <td>${puBadge(pu.puType)}</td>
      <td>${liabBadge(pu.liab)}</td>
      <td class="n ${remCls}">${fmtT(c.balanceBudget)}<span class="cr-sub">${fmtCr(c.balanceBudget)}</span></td>
      <td class="n">${fmtT(b.bg_isl||0)}</td>
      <td class="n">${fmtCr(b.bg_isl||0)}</td>
      <td class="n">${fmtT(b.actuals_till||0)}</td>
    </tr>`;
  });
  document.getElementById('pu-tbody').innerHTML = rows;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TABS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function switchTab(name) {
  if(name==='trend'){setTimeout(renderTrend,80);}
  if(name==='aitrend'){setTimeout(renderAITrendSummary,80);}
  if(name==='smhdetail'){setTimeout(renderSMHDetail,80);}
  const ids = ['liability','monthwise','pumaster','trend','aitrend','smhdetail','upload'];
  document.querySelectorAll('.tab').forEach((t,i) => {
    t.classList.toggle('active', ids[i]===name);
  });
  document.querySelectorAll('.tab-content').forEach(tc => {
    tc.classList.toggle('active', tc.id==='tab-'+name);
  });
  if(_pp){ _pp.style.opacity='0'; _pp.style.transform='translateY(6px)'; }
  if(name==='upload') renderCurDataGrid();
}

function textCr(n) {
  if (!n || isNaN(n)) return '0.00 Cr';
  return ((n * 1000) / 10000000).toFixed(2) + ' Cr';
}

function pctChangeText(curVal, baseVal) {
  if (!baseVal) return curVal ? 'new spend pattern' : 'no movement';
  const pctVal = ((curVal - baseVal) / Math.abs(baseVal)) * 100;
  return (pctVal >= 0 ? '+' : '') + pctVal.toFixed(1) + '%';
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

function buildAITrendItems() {
  const {cur} = getMonthStatus();
  const prevIdx = Math.max(0, cur.idx - 1);
  const prevKey = FY_MONTHS[prevIdx];
  const curKey = cur.key;
  const prevLabel = FY_MONTH_LABELS[prevIdx];
  const curLabel = cur.label;

  return PU_META.filter(p => !p.isNeg).map(pu => {
    const md = MONTH[pu.code] || {};
    const py = MONTH_PY[pu.code] || {};
    const cv = compute(pu.code);
    const budget = cv.budget || 0;
    const cyPrev = Number(md[prevKey]) || 0;
    const cyCurRaw = Number(md[curKey]) || 0;
    const cyCur = Math.max(cyCurRaw, cv.curCommitted || 0);
    const pyPrev = Number(py[prevKey]) || 0;
    const pyCur = Number(py[curKey]) || 0;
    const utilPct = budget ? Math.abs((cv.totalCommitted / budget) * 100) : (cv.totalCommitted ? 999 : 0);
    const balanceRatio = budget ? cv.balanceBudget / Math.abs(budget) : 0;
    const overSpent = cv.balanceBudget < 0;
    const noBudgetSpend = budget === 0 && cv.totalCommitted !== 0;
    const projRise = cyPrev > 0 && cv.projPerMonth > cyPrev * 1.15;
    const risk = trendRiskClass({overSpent, noBudgetSpend, utilPct, balanceRatio, projRise});

    return {
      pu, cv, budget, cyPrev, cyCur, pyPrev, pyCur, utilPct, balanceRatio,
      overSpent, noBudgetSpend, projRise, risk, prevLabel, curLabel
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
      ? `${sample.prevLabel} vs ${sample.curLabel} CY, PY comparison and remaining projection risk`
      : 'PU-wise current year, previous year and projection risk summary';
  }
  if (!items.length) {
    wrap.innerHTML = '<div class="ai-pu-card risk-ok"><ul class="ai-bullets"><li>No high-risk or watch-list PU found for the selected scope.</li></ul></div>';
    return;
  }
  wrap.innerHTML = items.map(item => {
    const riskLabel = item.risk === 'high' ? 'High Risk' : item.risk === 'watch' ? 'Watch' : 'Normal';
    const riskClass = item.risk === 'high' ? 'high' : item.risk === 'watch' ? 'watch' : 'ok';
    const cyMove = item.cyCur - item.cyPrev;
    const pyMove = item.pyCur - item.pyPrev;
    const yoyMove = item.cyCur - item.pyCur;
    const projectionImpact = item.overSpent
      ? `Overspent by ${textCr(Math.abs(item.cv.balanceBudget))}; future projection needs budget support or expenditure control.`
      : `Remaining projection is ${textCr(item.cv.projPerMonth)} per month with balance ${textCr(item.cv.balanceBudget)}.`;
    const spendStatus = item.noBudgetSpend
      ? 'Spend booked without available budget.'
      : item.utilPct >= 100
        ? 'Budget already fully consumed or exceeded.'
        : item.utilPct >= 85
          ? 'High utilisation; monitor before next booking cycle.'
          : 'Within current utilisation range.';
    return `<div class="ai-pu-card risk-${riskClass}">
      <div class="ai-pu-head">
        <div class="ai-pu-title">PU-${htmlSafe(item.pu.code)} Â· ${htmlSafe(item.pu.desc)}</div>
        <span class="ai-risk ${riskClass}">${riskLabel}</span>
      </div>
      <ul class="ai-bullets">
        <li>CY ${item.prevLabel} vs ${item.curLabel}: ${textCr(item.cyPrev)} to ${textCr(item.cyCur)} (${pctChangeText(item.cyCur, item.cyPrev)}; movement ${textCr(cyMove)}).</li>
        <li>PY ${item.prevLabel} vs ${item.curLabel}: ${textCr(item.pyPrev)} to ${textCr(item.pyCur)} (${pctChangeText(item.pyCur, item.pyPrev)}; movement ${textCr(pyMove)}).</li>
        <li>CY ${item.curLabel} vs PY ${item.curLabel}: ${textCr(item.cyCur)} against ${textCr(item.pyCur)} (${pctChangeText(item.cyCur, item.pyCur)}; difference ${textCr(yoyMove)}).</li>
        <li>${projectionImpact}</li>
        <li>Utilisation ${item.utilPct.toFixed(1)}%: ${spendStatus}</li>
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

function initSMHDetailFilters() {
  const data = window.DETAIL_SMH_DATA;
  const deptSel = document.getElementById('smhDeptFilter');
  const smhSel = document.getElementById('smhCodeFilter');
  const puSel = document.getElementById('smhPUFilter');
  if (!data || !deptSel || !smhSel || !puSel || deptSel.dataset.ready === 'yes') return;
  const depts = [...new Map(data.rows.map(r => [r.deptCode + '|' + r.deptName, r])).values()]
    .sort((a,b) => String(a.deptCode).localeCompare(String(b.deptCode), undefined, {numeric:true}));
  deptSel.innerHTML = '<option value="all">All Departments</option>' +
    depts.map(r => `<option value="${htmlSafe(r.deptCode)}">${htmlSafe(r.deptCode)} - ${htmlSafe(r.deptName)}</option>`).join('');
  const smhs = [...new Set(data.rows.map(r => r.smh))].sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric:true}));
  smhSel.innerHTML = '<option value="all">All Demand</option>' +
    smhs.map(s => `<option value="${htmlSafe(s)}">${htmlSafe(s)}</option>`).join('');
  const pus = [...new Map(data.rows.map(r => [r.puCode + '|' + r.puName, r])).values()]
    .sort((a,b) => String(a.puCode).localeCompare(String(b.puCode), undefined, {numeric:true}));
  puSel.innerHTML = '<option value="all">All PU</option>' +
    pus.map(r => `<option value="${htmlSafe(r.puCode)}">PU-${htmlSafe(r.puCode)} - ${htmlSafe(r.puName)}</option>`).join('');
  deptSel.dataset.ready = 'yes';
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
    html += `<tr class="dept-row"><td>${htmlSafe(dept.deptCode)} - ${htmlSafe(dept.deptName)}</td><td></td><td></td>${'<td></td>'.repeat(7)}</tr>`;
    const smhs = [...new Set(deptRows.map(r => r.smh))].sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric:true}));
    smhs.forEach(smh => {
      const smhRows = deptRows.filter(r => r.smh === smh)
        .sort((a,b) => String(a.puCode).localeCompare(String(b.puCode), undefined, {numeric:true}));
      html += `<tr class="smh-row"><td></td><td>${htmlSafe(smh)}</td><td></td>${'<td></td>'.repeat(7)}</tr>`;
      smhRows.forEach(r => {
        const bal = r.budget - r.actualTill;
        html += `<tr class="pu-row">
          <td></td>
          <td></td>
          <td>PU - ${htmlSafe(r.puCode)} - ${htmlSafe(r.puName)}</td>
          <td>${detailNum(r.budget)}</td>
          ${monthKeys.map(m => `<td>${detailNum((r.months || {})[m] || 0)}</td>`).join('')}
          <td><strong>${detailNum(r.actualTill)}</strong></td>
          <td class="${detailBalanceClass(bal, r.budget)}">${detailNum(bal)}</td>
        </tr>`;
      });
      const smhTotal = makeDetailTotal(smhRows);
      const smhBal = smhTotal.budget - smhTotal.actualTill;
      html += `<tr class="subtot">
        <td></td>
        <td></td>
        <td>Sub-Total: ${htmlSafe(smh)}</td>
        <td>${detailNum(smhTotal.budget)}</td>
        ${monthKeys.map(m => `<td>${detailNum(smhTotal.months[m] || 0)}</td>`).join('')}
        <td><strong>${detailNum(smhTotal.actualTill)}</strong></td>
        <td class="${detailBalanceClass(smhBal, smhTotal.budget)}">${detailNum(smhBal)}</td>
      </tr>`;
    });
    const deptBal = deptTotal.budget - deptTotal.actualTill;
    html += `<tr class="dept-total">
      <td></td>
      <td></td>
      <td>Total: ${htmlSafe(dept.deptCode)} - ${htmlSafe(dept.deptName)}</td>
      <td>${detailNum(deptTotal.budget)}</td>
      ${monthKeys.map(m => `<td>${detailNum(deptTotal.months[m] || 0)}</td>`).join('')}
      <td><strong>${detailNum(deptTotal.actualTill)}</strong></td>
      <td class="${detailBalanceClass(deptBal, deptTotal.budget)}">${detailNum(deptBal)}</td>
    </tr>`;
  });
  return html;
}

function renderSMHDetail() {
  const data = window.DETAIL_SMH_DATA;
  const head = document.getElementById('smhDetailHead');
  const body = document.getElementById('smhDetailBody');
  if (!head || !body) return;
  if (!data || !Array.isArray(data.rows)) {
    body.innerHTML = '<tr><td colspan="10">Detailed SMH data file not loaded.</td></tr>';
    return;
  }
  initSMHDetailFilters();
  const dept = (document.getElementById('smhDeptFilter') || {}).value || 'all';
  const smh = (document.getElementById('smhCodeFilter') || {}).value || 'all';
  const puFilter = (document.getElementById('smhPUFilter') || {}).value || 'all';
  const mode = (document.getElementById('smhViewMode') || {}).value || 'report';
  const monthKeys = data.monthKeys || [];
  const monthLabels = data.monthLabels || [];
  let lastActualIdx = 2;
  monthKeys.forEach((m, idx) => { if ((data.totals.months[m] || 0) !== 0) lastActualIdx = idx; });
  lastActualIdx = Math.max(2, lastActualIdx);
  const visibleMonthKeys = monthKeys.slice(0, Math.min(4, lastActualIdx + 1));
  const rows = data.rows.filter(r =>
    (dept === 'all' || r.deptCode === dept) &&
    (smh === 'all' || r.smh === smh) &&
    (puFilter === 'all' || r.puCode === puFilter)
  );
  const grouped = aggregateDetailRows(rows, mode === 'report' ? 'pu' : mode);
  const totals = makeDetailTotal(rows);
  const balance = totals.budget - totals.actualTill;
  const util = totals.budget ? (totals.actualTill / totals.budget) * 100 : 0;
  const kpis = document.getElementById('smhKpis');
  if (kpis) {
    kpis.innerHTML = [
      ['BG_ISL Budget', detailCr(totals.budget), detailNum(totals.budget) + " in â‚¹'000s"],
      ['Actual Till Date', detailCr(totals.actualTill), util.toFixed(1) + '% utilised'],
      ['Balance', detailCr(balance), balance < 0 ? 'Over spent' : 'Budget minus actual'],
      ['Month Actuals', detailCr(visibleMonthKeys.reduce((s,m)=>s+(totals.months[m]||0),0)), `${monthLabels[0]} to ${monthLabels[visibleMonthKeys.length - 1]}`],
      ['Rows', (mode === 'report' ? rows.length : grouped.length).toLocaleString('en-IN'), mode === 'report' ? 'PU lines in report' : 'summary groups']
    ].map(([l,v,s]) => `<div class="smh-kpi"><div class="lbl">${l}</div><div class="val">${v}</div><div class="sub">${s}</div></div>`).join('');
  }
  const title = document.getElementById('smhTableTitle');
  if (title) {
    title.textContent = mode === 'report'
      ? `Department > Demand > Primary Unit - Budget vs Expenditure Report (${monthLabels[0]} to ${monthLabels[visibleMonthKeys.length - 1]})`
      : mode === 'dept'
        ? 'Department Summary - Budget vs Expenditure'
        : mode === 'smh'
          ? 'Department + Demand Summary - Budget vs Expenditure'
          : 'Department > Demand > PU Detail - Budget vs Expenditure';
  }
  const leftHeaders = '<th>Department</th><th>Demand</th><th>Primary Unit (PU)</th>';
  head.innerHTML = `<tr>${leftHeaders}<th>Budget<br>2026-27</th>` +
    monthLabels.slice(0,visibleMonthKeys.length).map(l => `<th>${htmlSafe(l.replace(' 2026',''))}<br>Actual</th>`).join('') +
    '<th>Exp. Total</th><th>Balance<br>(Budget-Exp)</th>' + (mode === 'report' ? '' : '<th>Util%</th>') + '</tr>';
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="10">No rows found for selected filters.</td></tr>';
    return;
  }
  if (mode === 'report') {
    body.innerHTML = renderSMHReportRows(rows, visibleMonthKeys);
    return;
  }
  body.innerHTML = grouped.map(r => {
    const bal = r.budget - r.actualTill;
    const rowClass = mode === 'dept' ? 'dept-row' : mode === 'smh' ? 'smh-row' : 'pu-row';
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
    </tr>`;
  }).join('');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EXCEL DOWNLOAD using SheetJS CDN
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EXCEL DOWNLOAD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function downloadExcel() {
  const wb = XLSX.utils.book_new();
  const HDR_TITLE = 'REVENUE LIABILITY PORTAL â€” MORADABAD DIVISION';
  const HDR_SUB   = "Northern Railway  |  Financial Authority Dashboard  |  All figures in â‚¹ Thousands ('000s) â€” multiply by 1,000 for actual rupees";
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
    const aoa = [];
    // Title rows
    aoa.push([titleRow]);
    aoa.push([subRow]);
    aoa.push([]); // blank spacer
    aoa.push(headers);
    dataRows.forEach(r => aoa.push(r));

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = colWidths.map(w => ({wch:w}));

    // Apply styles if XLSX supports it (xlsx-style or sheetjs pro â€” graceful fallback)
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
            // Data rows â€” color by row type
            const rowData = dataRows[R-4];
            let bg = 'FFFFFF';
            if (rowData) {
              const label = String(rowData[0]||'');
              if (label==='98') bg='FFE8E8';
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
    } catch(e) { /* style not supported â€” data still exports fine */ }

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // â”€â”€ Sheet 1: LIABILITY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const liabHdrs = ['PU','Description','PU Type','Liability Type',
    'Budget (â‚¹\'000s)','Budget (â‚¹ Cr)',
    'APR Actual (â‚¹\'000s)','APR (â‚¹ Cr)',
    'MAY Actual (â‚¹\'000s)','MAY (â‚¹ Cr)',
    cur.label+' till date exp',''+cur.label+' Remaining',''+cur.label+' Total',''+cur.label+' % Done',
    'Total Committed (â‚¹\'000s)','Balance Budget (â‚¹\'000s)','Proj/Month (â‚¹\'000s)',
    '% Utilised','Status'];
  const liabRows=[];
  PU_META.filter(p=>!p.isNeg).forEach(pu=>{
    const cv=compute(pu.code); const md=MONTH[pu.code]||{};
    const apr=md.apr||0, may=md.may||0;
    const pctStr=cv.utilisedFlag==='no-budget'?'No Budget â€” Excess Spend':
                 cv.utilisedFlag==='none'?'Nil (no activity)':
                 cv.utilisedPct!=null?cv.utilisedPct.toFixed(1)+'%':'â€“';
    const status=cv.utilisedFlag==='over'?'OVER BUDGET':
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
    lt[4]?parseFloat((lt[14]/lt[4]*100).toFixed(1))+'%':'â€“',''];
  totRow._tot=true; liabRows.push(totRow);
  addSheet(wb,'Revenue Liability',HDR_TITLE,HDR_SUB,liabHdrs,liabRows,
    [6,24,14,12,14,10,14,10,14,10,14,14,14,10,15,14,14,10,16]);

  // â”€â”€ Sheet 2: MONTH WISE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const mwHdrs=['PU','Description',
    'APR Actual','MAY Actual',
    cur.label+' till date exp',cur.label+' Remaining',cur.label+' Total',
    'JUL Proj','AUG Proj','SEP Proj','OCT Proj','NOV Proj','DEC Proj','JAN Proj','FEB Proj','MAR Proj',
    'Budget (â‚¹\'000s)','Total Committed','Balance','% Used'];
  const mwRows=[];
  PU_META.filter(p=>!p.isNeg).forEach(pu=>{
    const cv=compute(pu.code); const md=MONTH[pu.code]||{};
    const proj=Math.round(cv.projPerMonth);
    const pct=cv.utilisedFlag==='no-budget'?'No Budget':
               cv.utilisedPct!=null?parseFloat(cv.utilisedPct.toFixed(1))+'%':'Nil';
    const row=[pu.code,pu.desc,md.apr||0,md.may||0,
      cv.curCommitted,cv.curRemaining,cv.curMonthTotal,
      proj,proj,proj,proj,proj,proj,proj,proj,proj,
      cv.budget,cv.totalCommitted,cv.balanceBudget,pct];
    row._cs=(pu.puType==='Staff PU'&&pu.liab==='Committed');
    row._co=(!row._cs&&pu.liab==='Committed');
    mwRows.push(row);
  });
  // Total
  const mt={};
  mwRows.forEach(r=>{ [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].forEach(i=>mt[i]=(mt[i]||0)+(+r[i]||0)); });
  const mwTot=['','GRAND TOTAL',...[2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(i=>mt[i]),mt[16],mt[17],mt[18],
    mt[16]?parseFloat((mt[17]/mt[16]*100).toFixed(1))+'%':'â€“'];
  mwTot._tot=true; mwRows.push(mwTot);
  addSheet(wb,'Month Wise',HDR_TITLE,HDR_SUB,mwHdrs,mwRows,
    [6,24,12,12,14,14,12,10,10,10,10,10,10,10,10,10,14,14,12,10]);

  // â”€â”€ Sheet 3: RECOVERIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const r98=compute('98'); const m98=MONTH['98']||{};
  const recHdrs=['PU','Description','Budget (â‚¹\'000s)','Budget (â‚¹ Cr)',
    'APR Actual','MAY Actual',cur.label+' till date exp',cur.label+' Remaining',
    'Total Committed','Balance','Proj/Month','% Used'];
  const recRows=[[
    '98','Credit or Recoveries',r98.budget,parseFloat((r98.budget*1000/10000000).toFixed(2)),
    m98.apr||0,m98.may||0,r98.curCommitted,r98.curRemaining,
    r98.totalCommitted,r98.balanceBudget,Math.round(r98.projPerMonth),
    r98.utilisedPct!=null?parseFloat(r98.utilisedPct.toFixed(1))+'%':'â€“'
  ]];
  recRows[0]._neg=true;
  addSheet(wb,'Recoveries PU-98',HDR_TITLE,HDR_SUB,recHdrs,recRows,
    [6,24,14,12,12,12,14,14,15,14,12,10]);

  // â”€â”€ Sheet 4: PU MASTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pmHdrs=['PU Code','Description','Type of PU','Type of Liability',
    'BG_ISL Budget (â‚¹\'000s)','Budget (â‚¹ Cr)','Actuals Till Date (â‚¹\'000s)','Remaining Budget (â‚¹\'000s)','Remaining Budget (â‚¹ Cr)','% Utilised'];
  const pmRows=[];
  PU_META.forEach(pu=>{
    const bud=BUDGET[pu.code]||{}; const cv=compute(pu.code);
    const pct=cv.utilisedFlag==='no-budget'?'No Budget':
               cv.utilisedFlag==='none'?'Nil':
               cv.utilisedPct!=null?parseFloat(cv.utilisedPct.toFixed(1))+'%':'â€“';
    const row=[pu.code,pu.desc,pu.puType,pu.liab,
      bud.bg_isl||0,parseFloat(((bud.bg_isl||0)*1000/10000000).toFixed(2)),
      bud.actuals_till||0,cv.balanceBudget,parseFloat((cv.balanceBudget*1000/10000000).toFixed(2)),pct];
    row._cs=(pu.puType==='Staff PU'&&pu.liab==='Committed');
    row._co=(!row._cs&&pu.liab==='Committed');
    row._neg=pu.isNeg;
    pmRows.push(row);
  });
  addSheet(wb,'PU Master',HDR_TITLE,HDR_SUB,pmHdrs,pmRows,
    [8,24,16,14,18,12,20,20,16,12]);

  // Sheet 5: Dept SMH Analysis - visible report style, no internal raw JSON
  if (window.DETAIL_SMH_DATA && Array.isArray(window.DETAIL_SMH_DATA.rows)) {
    const smhData = window.DETAIL_SMH_DATA;
    const smhMonthKeys = smhData.monthKeys || FY_MONTHS;
    let lastIdx = 2;
    smhMonthKeys.forEach((m, idx) => { if (((smhData.totals || {}).months || {})[m]) lastIdx = idx; });
    lastIdx = Math.min(3, Math.max(2, lastIdx));
    const smhVisibleMonths = smhMonthKeys.slice(0, lastIdx + 1);
    const smhHeaders = ['Department','Demand','Primary Unit (PU)','Budget 2026-27 (₹000s)']
      .concat(smhVisibleMonths.map(m => FY_MONTH_LABELS[FY_MONTHS.indexOf(m)] + ' Actual (₹000s)'))
      .concat(['Exp. Total (₹000s)','Balance Budget-Exp (₹000s)']);
    const smhRows = [];
    const depts = [...new Map(smhData.rows.map(r => [r.deptCode + '|' + r.deptName, r])).values()]
      .sort((a,b) => String(a.deptCode).localeCompare(String(b.deptCode), undefined, {numeric:true}));
    depts.forEach(dept => {
      const deptRows = smhData.rows.filter(r => r.deptCode === dept.deptCode);
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
          smhRows.push([
            '',
            '',
            `PU - ${r.puCode} - ${r.puName}`,
            Number(r.budget) || 0
          ].concat(smhVisibleMonths.map(m => Number((r.months || {})[m]) || 0))
           .concat([Number(r.actualTill) || 0, balance]));
        });
        const demandTotal = makeDetailTotal(demandRows);
        const demandBalance = demandTotal.budget - demandTotal.actualTill;
        const demandTotalRow = [
          '',
          '',
          `Sub-Total: ${smh}`,
          demandTotal.budget
        ].concat(smhVisibleMonths.map(m => demandTotal.months[m] || 0))
         .concat([demandTotal.actualTill, demandBalance]);
        demandTotalRow._cs = true;
        smhRows.push(demandTotalRow);
      });
      const deptBalance = deptTotal.budget - deptTotal.actualTill;
      const deptTotalRow = [
        '',
        '',
        `Total: ${dept.deptCode} - ${dept.deptName}`,
        deptTotal.budget
      ].concat(smhVisibleMonths.map(m => deptTotal.months[m] || 0))
       .concat([deptTotal.actualTill, deptBalance]);
      deptTotalRow._tot = true;
      smhRows.push(deptTotalRow);
    });
    addSheet(wb,'Dept SMH Analysis',HDR_TITLE,'Department > Demand > Primary Unit - Budget vs Expenditure',smhHeaders,smhRows,
      [18,14,32,16].concat(smhVisibleMonths.map(()=>14)).concat([16,18]));
  }

  XLSX.writeFile(wb, `Revenue_Liability_MBD_FY2026-27_${new Date().toISOString().slice(0,10)}.xlsx`);
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
  function fCr(n)  { if(!n||n===0) return 'â€“'; return (Math.abs(n)*1000/10000000).toFixed(2)+' Cr'; }
  function fT(n)   { if(!n||n===0) return 'â€“'; return (n<0?'('+Math.abs(Math.round(n)).toLocaleString('en-IN')+')':Math.round(n).toLocaleString('en-IN'))+' â‚¹\'000s'; }
  function pctStr(cv) {
    if (cv.utilisedFlag==='no-budget') return '<span style="color:#CC0000;font-weight:700">âš  No Budget Allocated â€” Excess Spend</span>';
    if (cv.utilisedFlag==='none')      return '<span style="color:#aaa">â€” Nil (no activity)</span>';
    if (cv.utilisedFlag==='over')      return `<span style="color:#CC0000;font-weight:700">ðŸ”´ ${Math.abs(cv.utilisedPct).toFixed(1)}% (OVER BUDGET)</span>`;
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
    <td style="padding:7px 14px;text-align:right;font-family:monospace;border-bottom:1px solid #EEF2F8;font-weight:600;color:${col}">${val?(val<0?'('+Math.abs(Math.round(val)).toLocaleString('en-IN')+')':Math.round(val).toLocaleString('en-IN')):'â€“'}</td>
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
<title>PU-${pu.code} â€” ${pu.desc} | Revenue Liability Portal</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#F0F4FA;color:#0A1628;font-size:13px}
  .page-hdr{background:linear-gradient(135deg,#0A1628 0%,#1A3A6A 100%);color:#fff;padding:16px 32px;display:flex;align-items:center;gap:16px;border-bottom:3px solid #C9A84C}
  .pu-num{font-size:36px;font-weight:800;color:#C9A84C;line-height:1}
  .pu-info h1{font-size:18px;font-weight:700;color:#fff}
  .pu-info p{font-size:11px;color:#A8C0D8;margin-top:3px}
  .badges{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
  .pbadge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.3);color:#fff}
  .print-btn{margin-left:auto;background:#C9A84C;color:#0A1628;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700}
  .print-btn:hover{background:#E8C050}
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
  @media print{.print-btn{display:none}.section{box-shadow:none;border:1px solid #ccc}}
</style>
</head>
<body>
<div class="page-hdr">
  <div class="pu-num">PU-${pu.code}</div>
  <div class="pu-info">
    <h1>${pu.desc}</h1>
    <p>Moradabad Division / Northern Railway &nbsp;Â·&nbsp; FY 2026-27 &nbsp;Â·&nbsp; All figures in â‚¹ '000s</p>
    <div class="badges">
      <span class="pbadge" style="background:${typeCol}">${pu.puType}</span>
      <span class="pbadge" style="background:${pu.liab==='Committed'?'#1A7A4A':pu.liab==='Recovery'?'#8B0000':'#4A6A90'}">${pu.liab}</span>
      <span class="pbadge" style="background:#8A5A00">${cur.label} ${cur.year} â€” Active Month</span>
    </div>
  </div>
  <button class="print-btn" onclick="window.print()">ðŸ–¨ Print / PDF</button>
</div>

<!-- KPI CARDS -->
<div class="section">
  <div class="sec-title">ðŸ“Š Key Performance Indicators</div>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-lbl">BG_ISL Budget</div><div class="kpi-val">${fCr(b.bg_isl||0)}</div><div class="kpi-sub">${(b.bg_isl||0).toLocaleString('en-IN')} â‚¹'000s</div></div>
    <div class="kpi"><div class="kpi-lbl">Total Committed</div><div class="kpi-val" style="color:${typeCol}">${fCr(cv.totalCommitted)}</div><div class="kpi-sub">${cv.totalCommitted.toLocaleString('en-IN')} â‚¹'000s</div></div>
    <div class="kpi"><div class="kpi-lbl">Balance Budget</div><div class="kpi-val" style="color:${cv.balanceBudget<0?'#CC0000':'#1A7A4A'}">${fCr(cv.balanceBudget)}</div><div class="kpi-sub">${cv.balanceBudget.toLocaleString('en-IN')} â‚¹'000s</div></div>
    <div class="kpi"><div class="kpi-lbl">% Budget Used</div><div class="kpi-val" style="color:${ringCol}">${pctLabel}</div><div class="kpi-sub">${pctStr(cv)}</div></div>
    <div class="kpi"><div class="kpi-lbl">Projected / Month</div><div class="kpi-val" style="color:#1A4E9A">${fCr(cv.projPerMonth)}</div><div class="kpi-sub">${futureMonths.length} months remaining</div></div>
    <div class="kpi"><div class="kpi-lbl">${cur.label} Committed</div><div class="kpi-val" style="color:#8A5A00">${fCr(cv.curCommitted)}</div><div class="kpi-sub">Remaining: ${fCr(cv.curRemaining)}</div></div>
  </div>
</div>

<!-- UTILISATION RING -->
<div class="section">
  <div class="sec-title">ðŸŽ¯ Budget Utilisation</div>
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
<div class="section">
  <div class="sec-title">ðŸ“‹ Budget Breakdown</div>
  <table class="data-tbl">
    <thead><tr><th>Parameter</th><th class="r">â‚¹ '000s</th><th class="r">â‚¹ Crore</th></tr></thead>
    <tbody>${summaryRows}</tbody>
  </table>
</div>

<!-- MONTHLY PROJECTION TABLE -->
<div class="section">
  <div class="sec-title">ðŸ“… Month-wise Actuals & Projections â€” FY 2026-27</div>
  <table class="data-tbl">
    <thead><tr>
      <th>Month</th><th>Type</th>
      <th class="r">Amount (â‚¹ '000s)</th><th class="r">Amount (â‚¹ Cr)</th>
      <th>vs Monthly Allocation</th>
    </tr></thead>
    <tbody>${monthRows}</tbody>
  </table>
</div>

<footer>
  PU-${pu.code}: ${pu.desc} &nbsp;Â·&nbsp; Moradabad Division / Northern Railway &nbsp;Â·&nbsp; FY 2026-27 &nbsp;Â·&nbsp; For Official Use Only<br>
  Generated: ${new Date().toLocaleString('en-IN')} &nbsp;Â·&nbsp; Revenue Liability Portal v4.0
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
    new ResizeObserver(syncW).observe(wrap);
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
      <div><div style="font-size:11px;font-weight:700;color:#fff">${pu.desc}</div><div style="font-size:8px;color:rgba(255,255,255,.75);margin-top:1px">${pu.puType} Â· ${pu.liab}</div></div>
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
        <div style="margin-bottom:3px">Budget: <strong>${cv.budget?(cv.budget*1000/10000000).toFixed(2)+' Cr':'â€“'}</strong></div>
        <div style="margin-bottom:3px">Committed: <strong>${(cv.totalCommitted*1000/10000000).toFixed(2)} Cr</strong></div>
        <div style="margin-bottom:3px">Balance: <strong style="color:${cv.balanceBudget<0?'#CC0000':'#1A7A4A'}">${(cv.balanceBudget*1000/10000000).toFixed(2)} Cr</strong></div>
        <div>Proj/Mo: <strong>${cv.projPerMonth>0?(cv.projPerMonth*1000/10000000).toFixed(2)+' Cr':'â€“'}</strong></div>
      </div>
    </div>
    <div style="border-top:1px solid #E0EAF4;padding-top:8px">
      <div style="font-size:8px;color:#607080;text-transform:uppercase;letter-spacing:.3px;margin-bottom:5px">Monthly Spend (â‚¹'000s)</div>
      ${bars}${projBar}
    </div>
    </div>
    <div style="background:#F5F8FC;border-top:1px solid #E0EAF4;padding:6px 14px;display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:8px;color:#8AAAC8">ðŸ“Š Quick Summary View</span>
      <span style="font-size:8px;color:#1A7A4A;font-weight:700">ðŸ‘† Click PU Code cell for Full Details</span>
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
  // Using event delegation on document â€” works after every re-render, no re-binding needed
  // (listeners are only added once)
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// UPLOAD TAB â€” File parsing, auto-sense, apply
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
  const file = e.dataTransfer.files[0];
  const parts=type.split('-'), t=parts.slice(0,-1).join('-') || parts[0], yr=(parts[parts.length-1]==='py')?'py':'cy';
  if(file) parseUpload(file, t, yr);
}

function handleFileEx(e, type, year) {
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
  if(state==='done'){ dz.classList.add('done'); icon.textContent='âœ…'; stat.className='dz-status ok'; }
  else if(state==='error'){ dz.classList.add('error'); icon.textContent='âŒ'; stat.className='dz-status err'; }
  else { icon.textContent='â³'; stat.className='dz-status'; }
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
      const ml = FY_MONTH_LABELS[idx];
      const ci = hdr.findIndex(h => h === ml || h.startsWith(ml + ' ') || (ml === 'APR' && h.startsWith('APRIL')));
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
    if (!dept.code || dept.code === '00' || !pu || pu.code === '98' || !smh) continue;
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
  year = year || 'cy';
  const fileTimestamp = uploadFileTimestamp(file);
  const dzId = type + '-' + year;
  setDZState(dzId, 'loading', 'Reading fileâ€¦');
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
        setDZState(dzId,'done','âœ… Parsed '+n+' PUs â€” '+(year==='cy'?'CY 2026-27':'PY 2025-26'));
        addLog((year==='cy'?'Budget CY 2026-27':'Budget PY 2025-26'),file.name,n,null);

      } else {
        const APR_RE=/^APR(IL)?[\s\-_]?\d{0,4}$/;
        const ANY_M=/^(APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|JAN|FEB|MAR)/;
        let hr=findHdrRow(rows,n=>APR_RE.test(n));
        if(hr<0) hr=findHdrRow(rows,n=>ANY_M.test(n));
        if(hr<0) throw new Error('Cannot find APRâ€“MAR month headers.');
        const hdr=rows[hr].map(c=>norm(c));
        const mCols={};
        FY_MONTHS.forEach((mk,idx2)=>{
          const ml=FY_MONTH_LABELS[idx2];
          const ci=hdr.findIndex(h=>h===ml||h.startsWith(ml+' ')||h.startsWith(ml+'-')||(ml==='APR'&&h==='APRIL'));
          if(ci>=0) mCols[mk]=ci;
        });
        if(Object.keys(mCols).length<3) throw new Error('Could not map â‰¥3 month columns. Check headers.');
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
        setDZState(dzId,'done','âœ… Parsed '+n+' PUs â€” Latest: '+dml+' | '+(year==='cy'?'CY':'PY'));
        addLog((year==='cy'?'Month Wise CY 2026-27':'Month Wise PY 2025-26'),file.name,n,dml);
      }
    } catch(err) {
      setDZState(type+'-'+year,'error','âŒ '+err.message);
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
  renderUploadLog();
}

function renderUploadLog() {
  const tbody = document.getElementById('uploadLogTbody');
  if(!tbody) return;
  if(!_uploadHistory.length){
    tbody.innerHTML='<tr><td colspan="6" style="color:#8AAAC8;text-align:center;padding:16px">No uploads yet â€” using pre-loaded data</td></tr>';
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
  let monthChanged = false;
  const hadCYUpdate = !!(_pendingBudget || _pendingMonth);
  const hadSMHUpdate = !!(_pendingSMHBudget || _pendingSMHMonth);

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
    _pendingBudgetPY=null;
  }
  if(_pendingMonthPY){
    Object.entries(_pendingMonthPY.data).forEach(([c,v])=>{ MONTH_PY[c]=v; });
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
  renderAll();
  renderCurDataGrid();
  renderUploadLog();
  if(typeof renderTrend==='function') renderTrend();
  if(hadSMHUpdate && typeof renderSMHDetail==='function') renderSMHDetail();

  // Flash the apply button to confirm
  const btn = document.getElementById('applyBtn');
  btn.textContent = 'âœ… Applied! Tables Updated.';
  btn.style.background='#1A7A4A';
  btn.disabled=true;
  setTimeout(()=>{
    btn.textContent='âœ… Apply Uploaded Data & Refresh All Tables';
    btn.style.background='';
    btn.disabled=true; // reset â€” need new upload to enable again
  },3000);

  if(monthChanged){
    // Show confirmation banner at top
    const banner=document.createElement('div');
    banner.style.cssText='position:fixed;top:70px;right:20px;z-index:9998;background:#1A7A4A;color:#fff;padding:10px 18px;border-radius:8px;font-size:11px;font-weight:700;box-shadow:0 4px 16px rgba(0,0,0,.2)';
    banner.textContent='âœ… Data applied â€” current month auto-updated from uploaded file';
    document.body.appendChild(banner);
    setTimeout(()=>banner.remove(),4000);
  }
}

function renderCurDataGrid() {
  const {cur,futureMonths} = getMonthStatus();
  const pus = PU_META.filter(p=>!p.isNeg);
  let totB=0,totC=0;
  pus.forEach(p=>{const cv=compute(p.code);totB+=cv.budget;totC+=cv.totalCommitted;});
  const grid=document.getElementById('curDataGrid');
  if(!grid) return;
  const dataSource = _uploadedMonthIdx !== null
    ? `Uploaded file (${FY_MONTH_LABELS[_uploadedMonthIdx]} ${_uploadedMonthIdx<=8?2026:2027})`
    : 'Pre-loaded (JUN 2026)';
  grid.innerHTML=`
    <div class="cdb-item"><div class="cdb-lbl">Data Source</div><div class="cdb-val" style="font-size:10px">${dataSource}</div></div>
    <div class="cdb-item"><div class="cdb-lbl">Current Month</div><div class="cdb-val" style="color:#1A4E9A">${cur.label} ${cur.year}</div></div>
    <div class="cdb-item"><div class="cdb-lbl">Gross Budget</div><div class="cdb-val">${(totB*1000/10000000).toFixed(0)} Cr</div></div>
    <div class="cdb-item"><div class="cdb-lbl">Committed Till Date</div><div class="cdb-val" style="color:#1A7A4A">${(totC*1000/10000000).toFixed(0)} Cr</div></div>
    <div class="cdb-item"><div class="cdb-lbl">Remaining Months</div><div class="cdb-val">${futureMonths.length}</div></div>
    <div class="cdb-item"><div class="cdb-lbl">Budget Mode</div><div class="cdb-val" style="font-size:10px">${isRGActive()?'âœ… RG Active':'BG_ISL'}</div></div>
  `;
}


let _tCharts={};
function _dC(id){if(_tCharts[id]){_tCharts[id].destroy();delete _tCharts[id];}}
function _mC(id,cfg){_dC(id);const ctx=document.getElementById(id);if(!ctx)return;_tCharts[id]=new Chart(ctx,cfg);return _tCharts[id];}

const FOCUS_PUS=['27','28','30','32','60','99'];
const FOCUS_DESC={'27':'Materials from stock','28':'Materials-Dir. purchase','30':'Cost Of Elec. Energy/Traction Energy Procurement','32':'Contractual payments','60':'Fuel/Power','99':'Other Expenses/Misc'};

function renderTrend(){
  if(!window.Chart)return;
  const puSel  =(document.getElementById('trendPUSelect') ||{}).value||'ALL';
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
  const activePUs=PU_META.filter(p=>!p.isNeg);
  const puList=puSel==='ALL'?activePUs:activePUs.filter(p=>p.code===puSel);

  function fCr(v){return v?(Math.abs(v)*1000/10000000).toFixed(1)+' Cr':'â€”';}
  function fN(v){return v?Math.round(v).toLocaleString('en-IN'):'â€”';}
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
      ['Budget BG_ISL',fCr(totB),puSel==='ALL'?'All PUs combined':'PU-'+puSel],
      ['Actuals Till Date',fCr(totA),util.toFixed(1)+'% utilised'],
      ['Balance',fCr(Math.abs(bal)),(bal<0?'âš  Over Budget':'Remaining')],
      ['Months Active',activeMths+'/12','APR 2026 â†’ MAR 2027'],
      yoy!==null?['YoY Change',(yoy>=0?'+':'')+yoy.toFixed(1)+'%','vs full year PY 2025-26']:
                 ['PY Data','Pre-loaded âœ…','27-Jun-2026 static file'],
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
      if(titleEl) titleEl.textContent='Actual Expenses Done Months'+rangeLabel+' â€” '+(puSel==='ALL'?'All PUs':'PU-'+puSel);
      mainTooltipCallbacks = {afterLabel:c=>c.dataIndex===doneIdxs.indexOf(CUR_IDX)?'Current month till-date / committed':''};
    } else if(cType==='cumulative'){
      let cc=0,cp=0;
      const cumCY=cyV.map(v=>{cc+=v;return(cc*1000/10000000).toFixed(1);});
      ds=[{label:'CY 2026-27 Cumulative (â‚¹Cr)',data:cumCY,borderColor:'#1C6FD9',backgroundColor:'rgba(28,111,217,.12)',fill:true,tension:.35,pointRadius:4,type:'line'}];
      if(pyV){const cumPY=pyV.map(v=>{cp+=v;return(cp*1000/10000000).toFixed(1);}); ds.push({label:'PY 2025-26 Cumulative (â‚¹Cr)',data:cumPY,borderColor:'#C9A84C',fill:false,tension:.35,pointRadius:4,type:'line',borderDash:[5,3]});}
      if(titleEl) titleEl.textContent='Cumulative Spend â€” APR â†’ MAR';
    } else if(cType==='yoy'){
      if(!pyV||!hasPY){if(titleEl) titleEl.textContent='YoY â€” PY data pre-loaded'; return;}
      const yoyD=cyV.map((v,i)=>pyV[i]?((v-pyV[i])/Math.abs(pyV[i])*100).toFixed(1):null);
      ds=[{label:'YoY % Change',data:yoyD,backgroundColor:yoyD.map(v=>parseFloat(v)>=0?'rgba(26,122,74,.75)':'rgba(204,0,0,.75)'),borderRadius:4}];
      if(titleEl) titleEl.textContent='Month-wise Year-on-Year % Change (CY vs PY)';
    } else {
      const barsClr=cyV.map((_,i)=>i<CUR_IDX?'rgba(28,111,217,.75)':i===CUR_IDX?'rgba(244,169,50,.85)':'rgba(28,111,217,.2)');
      ds=[{label:'CY 2026-27 Actuals',data:cyV.map(v=>(v*1000/10000000).toFixed(1)),backgroundColor:barsClr,borderRadius:3}];
      if(pyV) ds.push({label:'PY 2025-26',data:pyV.map(v=>(v*1000/10000000).toFixed(1)),type:'line',borderColor:'#C9A84C',backgroundColor:'transparent',borderWidth:2.5,tension:.3,pointRadius:4,borderDash:[4,2]});
      if(titleEl) titleEl.textContent='Monthly Actuals â€” '+(puSel==='ALL'?'All PUs':'PU-'+puSel);
    }
    _mC('trendMainChart',{type:'bar',data:{labels:mainLabels,datasets:ds},options:{responsive:true,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{boxWidth:12,font:{size:10}}},tooltip:{callbacks:mainTooltipCallbacks||{}}},scales:{x:{ticks:{font:{size:10}}},y:{title:{display:true,text:'â‚¹ Crore'},ticks:{font:{size:10}}}}}});
  } else {
    const sorted=activePUs.filter(p2=>BUDGET[p2.code]&&BUDGET[p2.code].bg_isl>0).sort((a,b)=>(BUDGET[b.code].actuals_till||0)-(BUDGET[a.code].actuals_till||0)).slice(0,topN);
    if(cType==='pubar'){
      _mC('trendMainChart',{type:'bar',data:{labels:sorted.map(p2=>'PU-'+p2.code),datasets:[{label:'Budget',data:sorted.map(p2=>(BUDGET[p2.code].bg_isl/10000).toFixed(0)),backgroundColor:'rgba(26,74,138,.45)',borderRadius:3},{label:'Actuals',data:sorted.map(p2=>(BUDGET[p2.code].actuals_till/10000).toFixed(0)),backgroundColor:'rgba(26,122,74,.75)',borderRadius:3}]},options:{responsive:true,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{boxWidth:12,font:{size:10}}}},scales:{x:{ticks:{font:{size:9},maxRotation:35}},y:{title:{display:true,text:'â‚¹ Cr'},ticks:{font:{size:10}}}}}});
      if(titleEl) titleEl.textContent='Top '+sorted.length+' PUs â€” Budget vs Actuals (â‚¹ Cr)';
    } else {
      const utD=sorted.map(p2=>Math.min(150,Math.round((BUDGET[p2.code].actuals_till||0)/Math.max(BUDGET[p2.code].bg_isl||1,1)*100)));
      _mC('trendMainChart',{type:'bar',data:{labels:sorted.map(p2=>'PU-'+p2.code),datasets:[{label:'Utilisation %',data:utD,backgroundColor:utD.map(u=>u>100?'rgba(204,0,0,.75)':u>85?'rgba(232,93,4,.75)':u>60?'rgba(192,112,0,.65)':'rgba(26,122,74,.75)'),borderRadius:3}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{font:{size:9},maxRotation:35}},y:{max:155,title:{display:true,text:'%'},ticks:{callback:v=>v+'%',font:{size:10}}}}}});
      if(titleEl) titleEl.textContent='Budget Utilisation Ranking (Top '+sorted.length+')';
    }
  }

  // â”€â”€ Utilisation bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const topU=activePUs.filter(p2=>BUDGET[p2.code]&&BUDGET[p2.code].bg_isl>0).sort((a,b)=>{return (BUDGET[b.code].actuals_till||0)/Math.max(BUDGET[b.code].bg_isl||1,1)-(BUDGET[a.code].actuals_till||0)/Math.max(BUDGET[a.code].bg_isl||1,1);}).slice(0,10);
  _mC('trendUtilChart',{type:'bar',data:{labels:topU.map(p2=>'PU-'+p2.code+': '+p2.desc.substring(0,14)),datasets:[{label:'Utilisation %',data:topU.map(p2=>Math.min(150,Math.round((BUDGET[p2.code].actuals_till||0)/Math.max(BUDGET[p2.code].bg_isl||1,1)*100))),backgroundColor:topU.map(p2=>{const u=(BUDGET[p2.code].actuals_till||0)/Math.max(BUDGET[p2.code].bg_isl||1,1)*100;return u>100?'rgba(204,0,0,.75)':u>85?'rgba(232,93,4,.75)':u>60?'rgba(192,112,0,.65)':'rgba(26,122,74,.75)';}),borderRadius:3}]},options:{indexAxis:'y',responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.raw+'% utilised'}}},scales:{x:{max:155,title:{display:true,text:'%'},ticks:{callback:v=>v+'%',font:{size:9}}},y:{ticks:{font:{size:8}}}}}});

  // â”€â”€ Staff vs Non-Staff doughnut â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const sA=activePUs.filter(p2=>p2.puType==='Staff PU').reduce((s,p2)=>s+(BUDGET[p2.code]?BUDGET[p2.code].actuals_till||0:0),0);
  const nA=activePUs.filter(p2=>p2.puType==='Non Staff PU').reduce((s,p2)=>s+(BUDGET[p2.code]?BUDGET[p2.code].actuals_till||0:0),0);
  const sB=activePUs.filter(p2=>p2.puType==='Staff PU').reduce((s,p2)=>s+(BUDGET[p2.code]?BUDGET[p2.code].bg_isl||0:0),0);
  const nB=activePUs.filter(p2=>p2.puType==='Non Staff PU').reduce((s,p2)=>s+(BUDGET[p2.code]?BUDGET[p2.code].bg_isl||0:0),0);
  _mC('trendTypeChart',{type:'doughnut',data:{labels:['Staff â€” Actuals','Non-Staff â€” Actuals','Staff â€” Budget','Non-Staff â€” Budget'],datasets:[{data:[sA,nA,0,0],backgroundColor:['rgba(26,122,74,.85)','rgba(28,111,217,.85)','transparent','transparent'],borderWidth:2},{data:[0,0,sB,nB],backgroundColor:['transparent','transparent','rgba(26,122,74,.25)','rgba(28,111,217,.25)'],borderWidth:1}]},options:{responsive:true,cutout:'55%',plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:9}}},tooltip:{callbacks:{label:c=>(c.label||'')+': â‚¹'+(c.raw*1000/10000000).toFixed(1)+' Cr'}}}}});

  // â”€â”€ Top 15 Budget vs Actuals bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const top15=activePUs.filter(p2=>BUDGET[p2.code]&&(BUDGET[p2.code].actuals_till||0)>0).sort((a,b)=>(BUDGET[b.code].actuals_till||0)-(BUDGET[a.code].actuals_till||0)).slice(0,15);
  _mC('trendTopPUChart',{type:'bar',data:{labels:top15.map(p2=>'PU-'+p2.code+': '+p2.desc.substring(0,14)),datasets:[{label:'Budget (â‚¹Cr)',data:top15.map(p2=>((BUDGET[p2.code].bg_isl||0)/10000).toFixed(0)),backgroundColor:'rgba(26,74,138,.4)',borderRadius:2},{label:'Actuals (â‚¹Cr)',data:top15.map(p2=>((BUDGET[p2.code].actuals_till||0)/10000).toFixed(0)),backgroundColor:'rgba(26,122,74,.75)',borderRadius:2}]},options:{responsive:true,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{boxWidth:12,font:{size:10}}}},scales:{x:{ticks:{font:{size:8},maxRotation:35}},y:{title:{display:true,text:'â‚¹ Cr'},ticks:{font:{size:10}}}}}});

  // â”€â”€ Heatmap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const hmDiv=document.getElementById('trendHeatmap');
  if(hmDiv){
    const hmPUs=activePUs.filter(p2=>MK.some(mk=>MONTH[p2.code]&&MONTH[p2.code][mk]>0)).slice(0,18);
    const allV=[];hmPUs.forEach(p2=>MK.forEach(mk=>{if(MONTH[p2.code]&&MONTH[p2.code][mk]>0)allV.push(MONTH[p2.code][mk]);}));
    const maxV=Math.max(...allV,1);
    function hC(v){const r=Math.round(28+(v/maxV)*176),g=Math.round(111*(v/maxV)),b=Math.round(217-(v/maxV)*160);return 'rgb('+r+','+g+','+b+')';}
    const hdr='<tr><th style="text-align:left;background:#0A1628;position:sticky;left:0;z-index:3">PU</th>'+ML.map((m,i)=>'<th>'+m+'<br><span style="font-size:7px">'+(i<=8?'26':'27')+'</span></th>').join('')+'</tr>';
    const rows=hmPUs.map(pu=>'<tr><td style="text-align:left;font-weight:700;background:#F5F8FC;position:sticky;left:0;z-index:2;white-space:nowrap">PU-'+pu.code+'</td>'+MK.map((mk,i)=>{const v=MONTH[pu.code]?MONTH[pu.code][mk]||0:0;const cr2=(v*1000/10000000).toFixed(1);const bg=v>0?hC(v):'#F8FAFB';const fg=v>maxV*0.4?'#fff':'#0A1628';return '<td style="background:'+bg+';color:'+fg+'">'+(v>0?cr2:'â€”')+'</td>';}).join('')+'</tr>').join('');
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
  _mC('trendFocusChart',{type:'line',data:{labels:ML_S.map((m,i)=>m+(i<=8?'\'26':'\'27')),datasets:focusDs},options:{responsive:true,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{boxWidth:10,font:{size:8},filter:i=>!i.text.includes('PY')||showPY}}},scales:{x:{ticks:{font:{size:9}}},y:{title:{display:true,text:'â‚¹ Cr'},ticks:{font:{size:9}}}}}});

  // â”€â”€ Analytics Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const thead=document.getElementById('trendTHead'),tbody=document.getElementById('trendTBody');
  if(thead&&tbody){
    thead.innerHTML='<tr><th style="text-align:left">PU</th><th style="text-align:left">Description</th><th>Type</th><th>Budget</th><th>Actuals CY</th><th>Util%</th><th>PY Actuals</th><th>YoY</th>'+MK.map((mk,i)=>'<th>'+ML[i]+'</th>').join('')+'<th>Total</th></tr>';
    tbody.innerHTML=activePUs.map(pu=>{
      const b=BUDGET[pu.code]||{},mo=MONTH[pu.code]||{},bpy=BUDGET_PY[pu.code]||{};
      const util=b.bg_isl?Math.round((b.actuals_till||0)/b.bg_isl*100):0;
      const uC=util>100?'#CC0000':util>85?'#E85D04':util>60?'#C07000':'#1A7A4A';
      const pyAct=bpy.actuals_till||0;
      const yoy=pyAct?((b.actuals_till||0)-pyAct)/Math.abs(pyAct)*100:null;
      const total=MK.reduce((s,mk)=>s+(mo[mk]||0),0);
      const isFocus=FOCUS_PUS.includes(pu.code);
      return '<tr style="'+(isFocus?'background:#FFFBF0;':'')+(isFocus?'font-weight:600':'')+'">'+
        '<td style="font-weight:700;color:#1C3A5E;cursor:pointer" onclick="openPUDetail(\''+pu.code+'\')">PU-'+pu.code+(isFocus?' â­':'')+'</td>'+
        '<td>'+pu.desc+'</td>'+
        '<td style="font-size:9px">'+(pu.puType==='Staff PU'?'<span style="color:#1A7A4A">Staff</span>':'<span style="color:#1A4E9A">Non-Staff</span>')+'</td>'+
        '<td>'+fN(b.bg_isl||0)+'</td>'+
        '<td>'+fN(b.actuals_till||0)+'</td>'+
        '<td style="color:'+uC+';font-weight:700">'+util+'%</td>'+
        '<td>'+fN(pyAct)+'</td>'+
        '<td style="color:'+(yoy===null?'#888':yoy>=0?'#CC0000':'#1A7A4A')+';font-weight:700">'+(yoy===null?'â€”':(yoy>=0?'+':'')+yoy.toFixed(1)+'%')+'</td>'+
        MK.map((mk,i)=>{const v=mo[mk]||0;const isCur=i===CUR_IDX,isFut=i>CUR_IDX;return '<td style="'+(v>0&&isCur?'background:#FFF8E0;font-weight:700;':'')+(isFut?'color:#B0C0D8;':'')+'font-size:9px">'+(v>0?v.toLocaleString('en-IN'):'<span style="color:#ddd">â€”</span>')+'</td>';}).join('')+
        '<td style="font-weight:700;font-size:10px">'+fN(total)+'</td>'+
        '</tr>';
    }).join('');
  }
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
        <th>Budget<br>(â‚¹'000s)</th>
        <th>Committed<br>Till Date</th>
        <th>Balance<br>Budget</th>
        <th>%<br>Used</th>
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
  </tr>`;
  document.getElementById('mw-tbody').innerHTML = rows;
}

function renderAll() {
  initPopup();
  renderCards();
  renderJuneBars();
  renderLiability();
  renderMonthwise();
  renderPUMaster();
  document.getElementById('rgNote').textContent=isRGActive()?'âœ… RG Active':'âš  RG not active â€” using BG_ISL';
  const {cur:_cur}=getMonthStatus();
  const _cmb=document.getElementById('curMonBadge'); if(_cmb) _cmb.textContent=_cur.label+' '+_cur.year;
  setTimeout(()=>{addDualScroll();attachPUPopup();},80);
}

// SheetJS embedded inline above

// INIT
initPortalTheme();
initBlockStyle();
loadCYUploadState();
initSMHDetailFilters();
renderAll();
(function(){
  const sel=document.getElementById('trendPUSelect'); if(!sel) return;
  PU_META.filter(p=>!p.isNeg).forEach(pu=>{
    const o=document.createElement('option'); o.value=pu.code;
    o.textContent='PU-'+pu.code+' â€” '+pu.desc; sel.appendChild(o);
  });
})();
