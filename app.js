const KEY_USERS="mazeBankUsers"; const KEY_SESSION="mazeBankSession";
const rates={libre:.0145,vehiculo:.0115,vivienda:.0085,estudio:.0075,negocio:.0125};

const seedUser={name:"Usuario Demo",id:"1000000000",email:"demo@mazebank.local",birth:"2000-01-01",password:"1234",balance:25000000,movements:[
  {date:"09/09/2026",desc:"Depósito inicial",amount:25000000,type:"in"},
  {date:"08/09/2026",desc:"Compra tarjeta Maze",amount:-185000,type:"out"},
  {date:"07/09/2026",desc:"Transferencia recibida",amount:750000,type:"in"}
],loans:[]};

function users(){return JSON.parse(localStorage.getItem(KEY_USERS)||"[]")}
function saveUsers(u){localStorage.setItem(KEY_USERS,JSON.stringify(u))}
function session(){return localStorage.getItem(KEY_SESSION)}
function currentUser(){return users().find(u=>u.id===session())}
function money(n){return new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n)}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function ensureSeed(){let u=users(); if(!u.some(x=>x.id===seedUser.id)){u.push(seedUser);saveUsers(u)}}
ensureSeed();

const authModal=document.getElementById("authModal");
function openAuth(mode="login"){authModal.classList.remove("hidden"); switchAuth(mode)}
function closeModal(id){document.getElementById(id).classList.add("hidden")}
function switchAuth(mode){document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.auth===mode));document.getElementById("registerForm").classList.toggle("hidden",mode!=="register");document.getElementById("modalLoginForm").classList.toggle("hidden",mode!=="login")}

document.getElementById("openLogin").onclick=()=>openAuth("login");
document.getElementById("openRegister").onclick=()=>openAuth("register");
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>switchAuth(b.dataset.auth));

function doLogin(id,pw){
  const u=users().find(x=>x.id===id.trim() || x.email.toLowerCase()===id.trim().toLowerCase());
  if(!u || u.password!==pw){toast("Usuario o contraseña incorrectos.");return false}
  localStorage.setItem(KEY_SESSION,u.id); closeModal("authModal"); updateNav(); openDashboard(); toast(`Bienvenido, ${u.name.split(" ")[0]}.`); return true;
}
document.getElementById("loginForm").onsubmit=e=>{e.preventDefault();doLogin(loginId.value,loginPassword.value)}
document.getElementById("modalLoginForm").onsubmit=e=>{e.preventDefault();doLogin(modalLoginId.value,modalLoginPassword.value)}

document.getElementById("registerForm").onsubmit=e=>{
  e.preventDefault();
  const name=regName.value.trim(), id=regId.value.trim(), email=regEmail.value.trim();
  if(regPassword.value!==regPassword2.value){toast("Las contraseñas no coinciden.");return}
  let u=users();
  if(u.some(x=>x.id===id)){toast("Ya existe una cuenta con esa cédula.");return}
  if(u.some(x=>x.email.toLowerCase()===email.toLowerCase())){toast("Ese correo ya está registrado.");return}
  const nu={name,id,email,birth:regBirth.value,password:regPassword.value,balance:1000000,movements:[{date:new Date().toLocaleDateString("es-CO"),desc:"Depósito de apertura",amount:1000000,type:"in"}],loans:[]};
  u.push(nu);saveUsers(u);localStorage.setItem(KEY_SESSION,id);closeModal("authModal");updateNav();openDashboard();toast("Cuenta creada correctamente. Saldo ficticio de apertura: $1.000.000.");
};

function updateNav(){
  const u=currentUser(); document.getElementById("openLogin").classList.toggle("hidden",!!u);
  const av=document.getElementById("openDashboard"); av.classList.toggle("hidden",!u); if(u)av.textContent=u.name.charAt(0).toUpperCase();
}
updateNav();

const dashModal=document.getElementById("dashboardModal");
function openDashboard(){if(!currentUser()){openAuth();return}dashModal.classList.remove("hidden");renderDashboard("overview")}
document.getElementById("openDashboard").onclick=openDashboard;
document.getElementById("logoutBtn").onclick=()=>{localStorage.removeItem(KEY_SESSION);closeModal("dashboardModal");updateNav();toast("Sesión cerrada.")}

function renderDashboard(page){
  document.querySelectorAll(".dash-page").forEach(p=>p.classList.add("hidden"));
  const el=document.getElementById("dash-"+page); if(el)el.classList.remove("hidden");
  document.querySelectorAll(".dash-link").forEach(b=>b.classList.toggle("active",b.dataset.dash===page));
  const u=currentUser(); if(!u)return;
  document.getElementById("welcomeName").textContent=`Hola, ${u.name.split(" ")[0]}`;
  document.getElementById("dashBalance").textContent=money(u.balance);
  renderMovements();
  document.getElementById("userLoans").innerHTML=u.loans.length?u.loans.map(l=>`<div class="movement"><span><b>${l.type}</b><br>${l.term} meses · ${l.rate}% mensual</span><strong>${money(l.amount)}</strong></div>`).join(""):"<p style='color:#777;font-size:12px'>Aún no tienes créditos simulados.</p>";
  document.getElementById("profileData").innerHTML=`<p><b>Nombre</b>${u.name}</p><p><b>Cédula</b>${u.id}</p><p><b>Correo</b>${u.email}</p><p><b>Fecha nacimiento</b>${u.birth}</p><p><b>Saldo ficticio</b>${money(u.balance)}</p>`;
}
function renderMovements(){
  const u=currentUser(); if(!u)return;
  const list=u.movements.slice().reverse();
  const html=list.map(m=>`<div class="movement"><span>${m.desc}<br><small>${m.date}</small></span><strong class="${m.amount>=0?"positive":"negative"}">${m.amount>=0?"+":""}${money(m.amount)}</strong></div>`).join("")||"<p>Sin movimientos.</p>";
  document.getElementById("recentMovements").innerHTML=list.slice(0,4).map(m=>`<div class="movement"><span>${m.desc}</span><strong class="${m.amount>=0?"positive":"negative"}">${m.amount>=0?"+":""}${money(m.amount)}</strong></div>`).join("");
  document.getElementById("allMovements").innerHTML=html;
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-dash]");if(b&&b.dataset.dash){e.preventDefault();if(b.dataset.dash==="loan-simulator"){closeModal("dashboardModal");document.getElementById("loans").scrollIntoView({behavior:"smooth"});return}renderDashboard(b.dataset.dash)}});

document.getElementById("transferForm").onsubmit=e=>{
  e.preventDefault(); const u=currentUser(); if(!u)return;
  const amount=Number(transferAmount.value);
  if(amount>u.balance){toast("Saldo ficticio insuficiente.");return}
  if(amount<1000){toast("El monto mínimo es $1.000.");return}
  u.balance-=amount;u.movements.push({date:new Date().toLocaleDateString("es-CO"),desc:`Transferencia a ${transferTo.value} · ${transferConcept.value}`,amount:-amount,type:"out"});
  const us=users();us[us.findIndex(x=>x.id===u.id)]=u;saveUsers(us);e.target.reset();renderDashboard("overview");toast("Transferencia simulada realizada.");};

function calcLoan(){
  const type=loanType.value, P=Number(loanAmount.value), n=Number(loanTerm.value), r=rates[type];
  const payment=P*r/(1-Math.pow(1+r,-n)); const total=payment*n;
  monthlyPayment.textContent=money(payment);monthlyRate.textContent=(r*100).toFixed(2)+"%";totalInterest.textContent=money(total-P);totalPay.textContent=money(total);termLabel.textContent=n+" meses";
  return {type:loanType.options[loanType.selectedIndex].text.split(" — ")[0],amount:P,term:n,rate:(r*100).toFixed(2),payment};
}
document.getElementById("loanForm").onsubmit=e=>{e.preventDefault();calcLoan();toast("Simulación actualizada.")}; calcLoan();
document.getElementById("requestLoan").onclick=()=>{
  const u=currentUser(); if(!u){openAuth("login");toast("Inicia sesión para guardar el crédito simulado.");return}
  const x=calcLoan();u.loans.push(x);const us=users();us[us.findIndex(a=>a.id===u.id)]=u;saveUsers(us);toast("Crédito guardado en tu perfil como simulación.");openDashboard();renderDashboard("loan");
};

document.getElementById("calcInvestment").onclick=()=>{
  const P=Number(invCapital.value),r=Number(invRate.value)/100,n=Number(invYears.value),total=P*Math.pow(1+r,n);
  investmentTotal.textContent=money(total);
}; document.getElementById("calcInvestment").click();

document.getElementById("searchBtn").onclick=()=>toast("Buscador demo: usa el menú para navegar por productos.");
document.getElementById("forgotBtn").onclick=()=>toast("Demo: para recuperar acceso, registra una nueva cuenta o usa el usuario demo.");

document.querySelectorAll("[data-page]").forEach(a=>a.addEventListener("click",e=>{
  const p=a.dataset.page;if(!p||p==="home")return;
  e.preventDefault();document.getElementById(p)?.scrollIntoView({behavior:"smooth"});
}));
window.addEventListener("load",()=>{if(location.hash==="#loans")document.getElementById("loans").scrollIntoView()});
