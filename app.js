(() => {
  const STORAGE_KEY = "h_management_cockpit_v1";
  const config = window.H_CONFIG;
  let state = loadState();
  let currentView = "dashboard";
  let editing = null;

  const titles = {
    dashboard:["Cockpit Executivo","Visão integrada da esteira comercial, delivery, crescimento e caixa."],
    pipeline:["Pipeline Comercial","Oportunidades S0–S4 com valor, owner, sponsor, próximo passo e previsão de fechamento."],
    backlog:["Backlog","Contratos assinados aguardando ou preparando mobilização e início."],
    delivery:["Delivery","Projetos ativos com economics, status, riscos, sponsor health e hipótese de expansão."],
    recurring:["Recorrentes","Contratos fixos com receita, custo, contribuição, renovação e expansão."],
    expansion:["Expansão","Próximas waves, advisory, PMO/TMO, retainer, sustentação e indicações."],
    cashflow:["Caixa","Planejamento aberto de receita, custos, impostos, retiradas e geração de caixa."],
    meetings:["Modo Reunião","Roteiro executivo para a reunião interna da H! com decisões e ações."]
  };

  const schemas = {
    pipeline:[
      ["client","Cliente / Conta","text"],["opportunity","Oportunidade","text"],["stage","Etapa","stage"],
      ["value","Valor potencial","number"],["probability","Probabilidade (%)","number"],["owner","Account Owner","text"],
      ["sponsor","Sponsor / Influenciador","text"],["pain","Dor / oportunidade","textarea"],["nextStep","Próximo passo","text"],
      ["nextStepDate","Data próximo passo","date"],["closeForecast","Previsão de fechamento","date"],["health","Semáforo","health"],
      ["notes","Observações","textarea"]
    ],
    backlog:[
      ["client","Cliente","text"],["project","Projeto / Contrato","text"],["totalValue","Valor total","number"],
      ["remainingRevenue","Receita ainda não reconhecida","number"],["startDate","Data de início","date"],["endDate","Data de término","date"],
      ["projectLead","Project Lead","text"],["team","Time / capacidade","textarea"],["expectedMargin","Margem prevista (%)","number"],
      ["billingPlan","Plano de faturamento","textarea"],["risks","Riscos iniciais","textarea"],["health","Semáforo","health"]
    ],
    delivery:[
      ["client","Cliente","text"],["project","Projeto","text"],["revenue","Receita contratada","number"],
      ["consultantCost","Custo consultores","number"],["taxes","Impostos","number"],["progress","% executado","number"],
      ["projectLead","Project Lead","text"],["deadlineStatus","Status prazo","health"],["scopeStatus","Status escopo","health"],
      ["sponsorHealth","Sponsor Health","health"],["financialStatus","Status financeiro","health"],
      ["risks","Riscos / decisões","textarea"],["nextDecision","Próxima decisão","text"],["expansionHypothesis","Hipótese de expansão","textarea"]
    ],
    recurring:[
      ["client","Cliente","text"],["contract","Contrato / Retainer","text"],["monthlyRevenue","Receita mensal","number"],
      ["monthlyCost","Custo mensal","number"],["taxes","Impostos mensais","number"],["renewalDate","Data de renovação","date"],
      ["owner","Account Owner","text"],["scope","Escopo / capacidade reservada","textarea"],
      ["expansion","Possibilidades de expansão","textarea"],["health","Semáforo","health"]
    ],
    expansion:[
      ["client","Cliente","text"],["currentProject","Projeto atual / origem","text"],["opportunity","Próxima oportunidade","text"],
      ["type","Tipo","expansionType"],["potentialValue","Valor potencial","number"],["sponsor","Sponsor","text"],
      ["approachDate","Momento ideal de abordagem","date"],["owner","Responsável","text"],["status","Status / próximo movimento","text"],
      ["notes","Observações","textarea"]
    ],
    cashflow:[
      ["month","Mês / período","month"],["forecastRevenue","Receita prevista","number"],["actualRevenue","Receita realizada","number"],
      ["consultantCost","Custo consultores","number"],["taxes","Impostos","number"],["fixedCosts","Custos fixos","number"],
      ["withdrawals","Retiradas","number"],["other","Outros (+/-)","number"],["notes","Observações","textarea"]
    ],
    meetings:[
      ["date","Data da reunião","date"],["topic","Tema / decisão","text"],["owner","Responsável","text"],
      ["dueDate","Prazo","date"],["status","Status","text"],["notes","Notas","textarea"]
    ]
  };

  const $ = s => document.querySelector(s);
  const content = $("#content");

  function clone(o){ return JSON.parse(JSON.stringify(o)); }
  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        return {...clone(window.H_DEFAULT_DATA), ...parsed};
      }
    }catch(e){}
    return clone(window.H_DEFAULT_DATA);
  }
  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function id(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
  function n(v){ const x=Number(v); return Number.isFinite(x)?x:0; }
  function money(v){ return n(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}); }
  function dateBR(v){ if(!v)return "—"; const [y,m,d]=v.split("-"); return d&&m&&y?`${d}/${m}/${y}`:v; }
  function healthBadge(v){
    const cls=v==="Verde"?"green":v==="Amarelo"?"orange":v==="Vermelho"?"red":"gray";
    return `<span class="badge ${cls}"><span class="dot"></span>${v||"Sem status"}</span>`;
  }
  function weighted(o){ return n(o.value)*(n(o.probability)/100); }
  function contributionDelivery(o){ return n(o.revenue)-n(o.consultantCost)-n(o.taxes); }
  function contributionRecurring(o){ return n(o.monthlyRevenue)-n(o.monthlyCost)-n(o.taxes); }

  function setView(view){
    currentView=view;
    document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
    $("#viewTitle").textContent=titles[view][0];
    $("#viewSubtitle").textContent=titles[view][1];
    $("#quickAddBtn").style.display=view==="dashboard"?"none":"inline-block";
    render();
  }

  function render(){
    const fn={
      dashboard:renderDashboard,pipeline:()=>renderTableView("pipeline"),backlog:()=>renderTableView("backlog"),
      delivery:()=>renderTableView("delivery"),recurring:()=>renderTableView("recurring"),
      expansion:()=>renderTableView("expansion"),cashflow:renderCashflow,meetings:renderMeetings
    }[currentView];
    fn();
  }

  function renderDashboard(){
    const pipelineValue=state.pipeline.reduce((s,o)=>s+n(o.value),0);
    const weightedValue=state.pipeline.reduce((s,o)=>s+weighted(o),0);
    const backlogValue=state.backlog.reduce((s,o)=>s+n(o.remainingRevenue||o.totalValue),0);
    const recurringContribution=state.recurring.reduce((s,o)=>s+contributionRecurring(o),0);
    const deliveryContribution=state.delivery.reduce((s,o)=>s+contributionDelivery(o),0);
    const alerts=[];
    const today = new Date(); today.setHours(0,0,0,0);
    state.pipeline.forEach(o=>{
      if(!o.nextStep) alerts.push({type:"orange",text:`${o.client||"Conta"} — oportunidade sem próximo passo.`});
      if(o.nextStepDate){
        const d=new Date(o.nextStepDate+"T00:00:00");
        if(d<today) alerts.push({type:"red",text:`${o.client||"Conta"} — próximo passo vencido em ${dateBR(o.nextStepDate)}.`});
      }
    });
    state.delivery.forEach(o=>{
      if(["Vermelho"].includes(o.deadlineStatus)||["Vermelho"].includes(o.scopeStatus)||["Vermelho"].includes(o.financialStatus))
        alerts.push({type:"red",text:`${o.client||"Cliente"} / ${o.project||"Projeto"} — projeto com status vermelho.`});
      if(!o.expansionHypothesis) alerts.push({type:"orange",text:`${o.client||"Cliente"} / ${o.project||"Projeto"} — sem hipótese de expansão registrada.`});
    });

    const stages=config.stages.map(s=>{
      let value=0,count=0;
      if(["S0","S1","S2","S3","S4"].includes(s.id)){
        const arr=state.pipeline.filter(o=>o.stage===s.id); count=arr.length; value=arr.reduce((a,o)=>a+n(o.value),0);
      }else if(s.id==="S5"){count=state.backlog.length;value=backlogValue}
      else if(s.id==="S6"){count=state.delivery.length;value=state.delivery.reduce((a,o)=>a+n(o.revenue),0)}
      else {count=state.expansion.length;value=state.expansion.reduce((a,o)=>a+n(o.potentialValue),0)}
      return `<div class="stage-card"><strong>${s.id}</strong><span>${s.label}</span><small>${count} registros<br>${money(value)}</small></div>`;
    }).join("");

    content.innerHTML=`
      <div class="kpi-grid">
        ${kpi("Pipeline bruto",money(pipelineValue),`${state.pipeline.length} oportunidades`)}
        ${kpi("Pipeline ponderado",money(weightedValue),"Valor x probabilidade")}
        ${kpi("Backlog aberto",money(backlogValue),`${state.backlog.length} contratos`)}
        ${kpi("Contribuição recorrente",money(recurringContribution),`${state.recurring.length} contratos/mês`)}
      </div>
      <div class="panel" style="margin-bottom:16px">
        <div class="section-head"><div><h3>Esteira H!</h3><div class="panel-sub">S0 Radar → S7 Expand. Todos os valores são abertos e alimentados pelos registros.</div></div></div>
        <div class="stage-row">${stages}</div>
      </div>
      <div class="grid-2">
        <div class="panel">
          <h3>Delivery em foco</h3>
          <div class="panel-sub">Contribuição contratual calculada com base nos valores preenchidos.</div>
          ${state.delivery.length?`<div class="cards-list">${state.delivery.slice(0,6).map(o=>`
            <div class="list-card">
              <div class="list-card-top"><div><h4>${o.client||"Cliente"} — ${o.project||"Projeto"}</h4><p>Project Lead: ${o.projectLead||"—"} • Execução: ${n(o.progress)}%</p></div>${healthBadge(o.sponsorHealth)}</div>
              <div class="progress" style="margin-top:12px"><span style="width:${Math.max(0,Math.min(100,n(o.progress)))}%"></span></div>
              <p>Contribuição estimada: <strong>${money(contributionDelivery(o))}</strong> • Próxima decisão: ${o.nextDecision||"—"}</p>
            </div>`).join("")}</div>`:`<div class="empty">Nenhum projeto ativo cadastrado.</div>`}
        </div>
        <div class="panel">
          <h3>Alertas de gestão</h3>
          <div class="panel-sub">Pendências que merecem atenção na próxima reunião.</div>
          ${alerts.length?`<div class="alert-list">${alerts.slice(0,10).map(a=>`<div class="alert ${a.type}">${a.text}</div>`).join("")}</div>`:`<div class="empty">Nenhum alerta gerado com os dados atuais.</div>`}
        </div>
      </div>
      <div class="grid-3" style="margin-top:16px">
        ${kpiPanel("Contribuição de Delivery",money(deliveryContribution),"Receita - consultores - impostos")}
        ${kpiPanel("Expansões mapeadas",String(state.expansion.length),money(state.expansion.reduce((s,o)=>s+n(o.potentialValue),0))+" em valor potencial")}
        ${kpiPanel("Ações de reunião",String(state.meetings.filter(o=>(o.status||"").toLowerCase()!=="concluído").length),"Itens ainda não concluídos")}
      </div>`;
  }

  function kpi(label,value,foot){return `<div class="kpi-card"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></div>`}
  function kpiPanel(label,value,foot){return `<div class="panel"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></div>`}

  function tableColumns(type){
    return {
      pipeline:[["client","Cliente"],["opportunity","Oportunidade"],["stage","Etapa"],["value","Valor"],["probability","Prob."],["owner","Owner"],["sponsor","Sponsor"],["nextStep","Próximo passo"],["nextStepDate","Data"],["closeForecast","Fechamento"],["health","Status"]],
      backlog:[["client","Cliente"],["project","Projeto"],["totalValue","Valor"],["remainingRevenue","Saldo receita"],["startDate","Início"],["endDate","Fim"],["projectLead","Project Lead"],["expectedMargin","Margem"],["health","Status"]],
      delivery:[["client","Cliente"],["project","Projeto"],["revenue","Receita"],["consultantCost","Consultores"],["taxes","Impostos"],["progress","Execução"],["projectLead","Project Lead"],["deadlineStatus","Prazo"],["scopeStatus","Escopo"],["sponsorHealth","Sponsor"],["financialStatus","Financeiro"]],
      recurring:[["client","Cliente"],["contract","Contrato"],["monthlyRevenue","Receita/mês"],["monthlyCost","Custo/mês"],["taxes","Impostos"],["renewalDate","Renovação"],["owner","Owner"],["health","Status"]],
      expansion:[["client","Cliente"],["currentProject","Origem"],["opportunity","Oportunidade"],["type","Tipo"],["potentialValue","Valor"],["sponsor","Sponsor"],["approachDate","Abordagem"],["owner","Responsável"],["status","Status"]],
      meetings:[["date","Data"],["topic","Tema / decisão"],["owner","Responsável"],["dueDate","Prazo"],["status","Status"]]
    }[type];
  }

  function renderTableView(type){
    const rows=state[type]; const cols=tableColumns(type);
    content.innerHTML=`
      <div class="panel">
        <div class="section-head">
          <div><h3>${titles[type][0]}</h3><div class="panel-sub">${rows.length} registro(s). Clique em editar para atualizar qualquer campo.</div></div>
          <button class="primary" id="addInsideBtn">+ Adicionar</button>
        </div>
        <div class="table-wrap">
          <table><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join("")}<th>Ações</th></tr></thead>
          <tbody>${rows.length?rows.map(o=>`<tr>${cols.map(c=>`<td>${formatCell(c[0],o[c[0]],o)}</td>`).join("")}
          <td><div class="inline-actions"><button class="mini-btn edit" data-id="${o.id}">Editar</button><button class="mini-btn danger delete" data-id="${o.id}">Excluir</button>${type==="pipeline"&&o.stage==="S4"?`<button class="mini-btn convert" data-id="${o.id}">Fechar → Backlog</button>`:""}</div></td></tr>`).join(""):`<tr><td colspan="${cols.length+1}" class="empty">Nenhum registro cadastrado.</td></tr>`}</tbody></table>
        </div>
      </div>`;
    $("#addInsideBtn").addEventListener("click",()=>openModal(type));
    bindRowActions(type);
  }

  function formatCell(key,v,o){
    if(["value","totalValue","remainingRevenue","revenue","consultantCost","taxes","monthlyRevenue","monthlyCost","potentialValue"].includes(key)) return money(v);
    if(["startDate","endDate","nextStepDate","closeForecast","renewalDate","approachDate","date","dueDate"].includes(key)) return dateBR(v);
    if(key==="stage"){ const s=config.stages.find(x=>x.id===v); return s?`${s.id} • ${s.label}`:"—"; }
    if(["health","deadlineStatus","scopeStatus","sponsorHealth","financialStatus"].includes(key)) return healthBadge(v);
    if(key==="probability"||key==="expectedMargin"||key==="progress") return `${n(v)}%`;
    return (v??"")!==""?String(v):"—";
  }

  function bindRowActions(type){
    document.querySelectorAll(".edit").forEach(b=>b.addEventListener("click",()=>openModal(type,b.dataset.id)));
    document.querySelectorAll(".delete").forEach(b=>b.addEventListener("click",()=>{
      if(confirm("Excluir este registro?")){ state[type]=state[type].filter(x=>x.id!==b.dataset.id); saveState(); render(); }
    }));
    document.querySelectorAll(".convert").forEach(b=>b.addEventListener("click",()=>convertToBacklog(b.dataset.id)));
  }

  function convertToBacklog(pid){
    const p=state.pipeline.find(x=>x.id===pid); if(!p)return;
    state.backlog.push({id:id(),client:p.client||"",project:p.opportunity||"",totalValue:p.value||"",remainingRevenue:p.value||"",projectLead:"",team:"",expectedMargin:"",billingPlan:"",risks:"",health:"Verde",startDate:"",endDate:""});
    state.pipeline=state.pipeline.filter(x=>x.id!==pid);
    saveState(); setView("backlog");
  }

  function renderCashflow(){
    const rows=state.cashflow.slice().sort((a,b)=>(a.month||"").localeCompare(b.month||""));
    let accumulated=0;
    const cards=rows.map(o=>{
      const generated=n(o.actualRevenue)-n(o.consultantCost)-n(o.taxes)-n(o.fixedCosts)-n(o.withdrawals)+n(o.other);
      accumulated+=generated;
      return `<div class="cash-card">
        <h4>${o.month||"Período"}</h4>
        <dl>
          <dt>Receita prevista</dt><dd>${money(o.forecastRevenue)}</dd>
          <dt>Receita realizada</dt><dd>${money(o.actualRevenue)}</dd>
          <dt>Consultores</dt><dd>${money(o.consultantCost)}</dd>
          <dt>Impostos</dt><dd>${money(o.taxes)}</dd>
          <dt>Custos fixos</dt><dd>${money(o.fixedCosts)}</dd>
          <dt>Retiradas</dt><dd>${money(o.withdrawals)}</dd>
          <dt>Outros</dt><dd>${money(o.other)}</dd>
          <dt class="cash-result">Caixa gerado</dt><dd class="cash-result">${money(generated)}</dd>
          <dt>Acumulado</dt><dd>${money(accumulated)}</dd>
        </dl>
        <div class="inline-actions" style="margin-top:12px"><button class="mini-btn editCash" data-id="${o.id}">Editar</button><button class="mini-btn danger deleteCash" data-id="${o.id}">Excluir</button></div>
      </div>`;
    }).join("");
    content.innerHTML=`
      <div class="panel">
        <div class="section-head"><div><h3>Planejamento de Caixa</h3><div class="panel-sub">Sem metas travadas. Adicione os períodos e premissas que quiser.</div></div><button class="primary" id="addCashBtn">+ Período</button></div>
        <div class="cash-months">${cards||`<div class="empty">Nenhum período de caixa cadastrado.</div>`}</div>
      </div>`;
    $("#addCashBtn").addEventListener("click",()=>openModal("cashflow"));
    document.querySelectorAll(".editCash").forEach(b=>b.addEventListener("click",()=>openModal("cashflow",b.dataset.id)));
    document.querySelectorAll(".deleteCash").forEach(b=>b.addEventListener("click",()=>{if(confirm("Excluir período?")){state.cashflow=state.cashflow.filter(x=>x.id!==b.dataset.id);saveState();render();}}));
  }

  function renderMeetings(){
    const openActions=state.meetings.filter(o=>(o.status||"").toLowerCase()!=="concluído");
    const redProjects=state.delivery.filter(o=>[o.deadlineStatus,o.scopeStatus,o.financialStatus,o.sponsorHealth].includes("Vermelho"));
    const stale=state.pipeline.filter(o=>!o.nextStep);
    content.innerHTML=`
      <div class="grid-2">
        <div class="panel">
          <div class="section-head"><div><h3>Roteiro sugerido</h3><div class="panel-sub">Use esta sequência como agenda da reunião interna.</div></div><button class="primary" id="addActionBtn">+ Ação / decisão</button></div>
          <div class="meeting-flow">
            ${meetingStep(1,"Caixa e recebimentos",`${state.cashflow.length} períodos registrados para revisão.`)}
            ${meetingStep(2,"Pipeline comercial",`${money(state.pipeline.reduce((s,o)=>s+n(o.value),0))} em pipeline bruto; ${stale.length} sem próximo passo.`)}
            ${meetingStep(3,"Próximos 30 / 60 / 90 dias","Revisar datas de próximo passo e previsão de fechamento das oportunidades.")}
            ${meetingStep(4,"Backlog contratado",`${money(state.backlog.reduce((s,o)=>s+n(o.remainingRevenue||o.totalValue),0))} de receita aberta no backlog.`)}
            ${meetingStep(5,"Projetos em risco",`${redProjects.length} projeto(s) com algum indicador vermelho.`)}
            ${meetingStep(6,"Margem e economics","Revisar custos, impostos, contribuição e desvios dos projetos ativos.")}
            ${meetingStep(7,"Capacidade / pessoas","Validar início, fim, Project Leads e necessidade de especialistas.")}
            ${meetingStep(8,"Expansão",`${state.expansion.length} oportunidade(s) de expansão registrada(s).`)}
            ${meetingStep(9,"Decisões pendentes",`${openActions.length} ação(ões) ou decisão(ões) em aberto.`)}
            ${meetingStep(10,"Ações da semana","Fechar owner e prazo de cada ação antes de terminar a reunião.")}
          </div>
        </div>
        <div class="panel">
          <h3>Action Log</h3>
          <div class="panel-sub">Decisões e compromissos das reuniões internas.</div>
          ${state.meetings.length?`<div class="table-wrap"><table style="min-width:650px"><thead><tr><th>Data</th><th>Tema</th><th>Owner</th><th>Prazo</th><th>Status</th><th>Ações</th></tr></thead><tbody>${state.meetings.map(o=>`<tr><td>${dateBR(o.date)}</td><td>${o.topic||"—"}</td><td>${o.owner||"—"}</td><td>${dateBR(o.dueDate)}</td><td>${o.status||"—"}</td><td><div class="inline-actions"><button class="mini-btn meetingEdit" data-id="${o.id}">Editar</button><button class="mini-btn danger meetingDelete" data-id="${o.id}">Excluir</button></div></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Nenhuma ação registrada.</div>`}
        </div>
      </div>`;
    $("#addActionBtn").addEventListener("click",()=>openModal("meetings"));
    document.querySelectorAll(".meetingEdit").forEach(b=>b.addEventListener("click",()=>openModal("meetings",b.dataset.id)));
    document.querySelectorAll(".meetingDelete").forEach(b=>b.addEventListener("click",()=>{if(confirm("Excluir ação?")){state.meetings=state.meetings.filter(x=>x.id!==b.dataset.id);saveState();render();}}));
  }

  function meetingStep(num,title,text){return `<div class="meeting-step"><div class="meeting-num">${num}</div><div><h4>${title}</h4><p>${text}</p></div></div>`}

  function openModal(type, recId=null){
    editing={type,id:recId};
    const rec=recId?state[type].find(x=>x.id===recId):{};
    $("#modalTitle").textContent=(recId?"Editar ":"Novo ")+titles[type][0];
    $("#formFields").innerHTML=schemas[type].map(([key,label,kind])=>fieldHTML(key,label,kind,rec?.[key])).join("");
    $("#modalBackdrop").classList.remove("hidden");
    $("#modalBackdrop").setAttribute("aria-hidden","false");
    setTimeout(()=>$("#formFields input, #formFields select, #formFields textarea")?.focus(),50);
  }

  function fieldHTML(key,label,kind,val=""){
    let input="";
    if(kind==="textarea") input=`<textarea name="${key}">${escapeHtml(val)}</textarea>`;
    else if(kind==="stage") input=`<select name="${key}"><option value="">Selecione...</option>${config.stages.slice(0,5).map(s=>`<option value="${s.id}" ${val===s.id?"selected":""}>${s.id} • ${s.label}</option>`).join("")}</select>`;
    else if(kind==="health") input=`<select name="${key}"><option value="">Selecione...</option>${config.health.map(x=>`<option ${val===x?"selected":""}>${x}</option>`).join("")}</select>`;
    else if(kind==="expansionType") input=`<select name="${key}"><option value="">Selecione...</option>${config.expansionTypes.map(x=>`<option ${val===x?"selected":""}>${x}</option>`).join("")}</select>`;
    else input=`<input name="${key}" type="${kind}" value="${escapeAttr(val)}" ${kind==="number"?'step="any"':''}/>`;
    return `<div class="field ${kind==="textarea"?"full":""}"><label>${label}</label>${input}</div>`;
  }

  function closeModal(){
    editing=null; $("#modalBackdrop").classList.add("hidden"); $("#modalBackdrop").setAttribute("aria-hidden","true"); $("#recordForm").reset();
  }

  function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
  function escapeAttr(v){return escapeHtml(v)}

  $("#recordForm").addEventListener("submit",e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget); const obj={};
    for(const [k,v] of fd.entries()) obj[k]=v;
    const {type,id:rid}=editing;
    if(rid){
      const idx=state[type].findIndex(x=>x.id===rid); state[type][idx]={...state[type][idx],...obj};
    }else state[type].push({id:id(),...obj});
    saveState(); closeModal(); render();
  });

  $("#closeModalBtn").addEventListener("click",closeModal);
  $("#cancelModalBtn").addEventListener("click",closeModal);
  $("#modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal()});
  $("#mainNav").addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(b)setView(b.dataset.view)});
  $("#quickAddBtn").addEventListener("click",()=>openModal(currentView));

  $("#exportBtn").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`H_Cockpit_Backup_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);
  });
  $("#importInput").addEventListener("change",async e=>{
    const file=e.target.files[0]; if(!file)return;
    try{
      const parsed=JSON.parse(await file.text());
      state={...clone(window.H_DEFAULT_DATA),...parsed}; saveState(); render(); alert("Backup importado com sucesso.");
    }catch(err){alert("Não foi possível importar o arquivo.");}
    e.target.value="";
  });
  $("#resetBtn").addEventListener("click",()=>{
    if(confirm("Limpar todos os dados do cockpit neste navegador?")){
      state=clone(window.H_DEFAULT_DATA); saveState(); setView("dashboard");
    }
  });

  setView("dashboard");
})();