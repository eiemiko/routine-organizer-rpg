/* RoutineOrganizerRPG: aplicativo local, sem bibliotecas nem serviços externos. */
(() => {
  'use strict';
  const STORAGE_KEY = 'minha-casa-v1'; // Mantido para preservar os dados das versões anteriores.
  const ENERGY = {low:'Baixa',normal:'Normal',high:'Alta'};
  const ENERGY_HINT = {low:'Versões mínimas disponíveis',normal:'Um ritmo sustentável',high:'Mais disposição, com pausas'};
  const PRIORITY = {essential:'Essencial',recommended:'Recomendada',optional:'Opcional'};
  const MISSION_TYPES = {main:'Missão Principal',daily:'Missão Diária',side:'Side Quest',boss:'Boss Fight'};
  const MISSION_HELP = {main:'Cuidado central da rotina, como higiene ou segurança.',daily:'Pequena ação recorrente que ajuda a manter o dia.',side:'Tarefa complementar que pode ser feita quando couber.',boss:'Tarefa maior que pode ser dividida em até três fases com XP.'};
  const STATUS = {pending:'Pendente',started:'Iniciada',paused:'Pausada',done:'Concluída'};
  const VIEWS = {hoje:['Hoje','⌂'],semana:['Semana','▦'],mes:['Mês','▤'],alimentacao:['Alimentação','◷'],missoes:['Missões e recompensas','✦'],configuracoes:['Configurações','⚙']};
  const SITE_VERSION = '1.8.1';
  // Registre aqui apenas funcionalidades adicionadas, removidas ou movidas.
  // Correções e pequenos ajustes pertencem ao CHANGELOG.md.
  const FEATURE_NOTES = [
    {version:'1.8.0',date:'22/09/2026',changes:[
      {type:'Adicionado',description:'Ajuda na seção Marcar o dia para explicar Completo, Mínimo, Recuperação e Pausa.'},
      {type:'Adicionado',description:'Botão Voltar um dia ao lado de Passar o dia em Hoje, preservando os registros das duas datas.'},
      {type:'Alterado',description:'Adicionar nova missão saiu do menu lateral e do cabeçalho de Missões e recompensas. Nas demais telas, fica no topo também no celular; na aba Missões, continua junto ao catálogo.'}
    ]},
    {version:'1.7.0',date:'21/09/2026',changes:[
      {type:'Adicionado',description:'Botão Passar o dia na tela Hoje para avançar manualmente a rotina. Cada data mostra suas próprias missões, refeições, cuidados e XP do dia.'},
      {type:'Alterado',description:'O ícone da aba agora usa o calendário em pixel art fornecido para o projeto.'}
    ]},
    {version:'1.6.0',date:'21/09/2026',changes:[
      {type:'Adicionado',description:'Controle de início, pausa, retomada e conclusão diretamente nos três próximos passos de Hoje, com a próxima missão entrando na lista ao concluir.'},
      {type:'Alterado',description:'Rótulos de estado das missões com cores consistentes: pendente em laranja, iniciada em rosa, pausada em azul e concluída em verde.'}
    ]},
    {version:'1.5.0',date:'21/09/2026',changes:[
      {type:'Adicionado',description:'Calendário próprio para escolher a data de missões avulsas e de reagendamentos, integrado ao visual do site.'}
    ]},
    {version:'1.4.0',date:'21/09/2026',changes:[
      {type:'Adicionado',description:'Abas Missões e Recompensas, com catálogo completo e edição do tipo de cada missão.'},
      {type:'Adicionado',description:'Ajuda ao lado do tipo de missão, marcos de XP adicionais e indicador de XP do dia em Hoje.'},
      {type:'Alterado',description:'XP recente e XP das ações marcadas são exibidos na aba Recompensas; fases de Boss Fight ficam na aba Missões.'}
    ]},
    {version:'1.3.0',date:'21/09/2026',changes:[
      {type:'Adicionado',description:'Edição das missões e categorias de cada semana na tela Mês, com as quatro sugestões iniciais reutilizáveis.'}
    ]},
    {version:'1.2.0',date:'21/09/2026',changes:[
      {type:'Adicionado',description:'Registro rápido e reagendamento da próxima oportunidade de alimentação na tela Hoje, com avanço automático para o próximo horário pendente.'},
      {type:'Adicionado',description:'Mensagem de conclusão das oportunidades de alimentação do dia com a imagem de parabéns ao lado.'}
    ]},
    {version:'1.1.0',date:'21/09/2026',changes:[
      {type:'Adicionado',description:'Botão de ajuda no canto inferior, com informações sobre a finalidade do site e o armazenamento local.'},
      {type:'Adicionado',description:'Área de patch notes dentro do modal de ajuda para acompanhar mudanças nas funcionalidades.'}
    ]},
    {version:'1.0.0',date:'21/09/2026',changes:[
      {type:'Adicionado',description:'Rotina adaptativa por energia, com tarefas diárias, semanais e mensais.'},
      {type:'Adicionado',description:'Alimentação flexível, alimentos seguros, estoque, compras e opções de refeições.'},
      {type:'Adicionado',description:'Modo Sobrevivência, protocolos de reinício, XP, recompensas e proteção da sequência.'},
      {type:'Adicionado',description:'Configurações, salvamento local e backup por exportação ou importação de JSON.'}
    ]}
  ];
  const WEEKDAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => Array.from(root.querySelectorAll(selector));
  const uid = () => (globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cap = text => text.charAt(0).toUpperCase()+text.slice(1);
  const dateISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const todayISO = () => dateISO(new Date());
  const dateFrom = iso => {const [y,m,d]=iso.split('-').map(Number);return new Date(y,m-1,d,12);};
  const addDays = (iso,n) => {const d=dateFrom(iso);d.setDate(d.getDate()+n);return dateISO(d);};
  const weekStart = iso => addDays(iso,-((dateFrom(iso).getDay()+6)%7));
  const monthWeek = iso => Math.min(4,Math.ceil(dateFrom(iso).getDate()/7));
  const dateLabel = (iso,opts={weekday:'long',day:'numeric',month:'long'}) => new Intl.DateTimeFormat('pt-BR',opts).format(dateFrom(iso));
  const shortDate = iso => dateLabel(iso,{day:'2-digit',month:'2-digit'});
  function parseDisplayDate(text){
    const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(text||'').trim());
    if(!match)return null;
    const day=Number(match[1]),month=Number(match[2]),year=Number(match[3]);
    if(year<1000||month<1||month>12||day<1||day>31)return null;
    const date=new Date(year,month-1,day,12);
    return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?dateISO(date):null;
  }
  function displayDate(iso){
    const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||''));
    if(!match)return '';
    const value=`${match[3]}/${match[2]}/${match[1]}`;
    return parseDisplayDate(value)===iso?value:'';
  }
  function activeDayFor(data){return displayDate(data?.activeDay)?data.activeDay:todayISO();}
  function advanceDayIn(data){data.activeDay=addDays(activeDayFor(data),1);return data.activeDay;}
  function retreatDayIn(data){data.activeDay=addDays(activeDayFor(data),-1);return data.activeDay;}
  function calendarGridFor(iso){
    const selected=displayDate(iso)?iso:todayISO(),date=dateFrom(selected),year=date.getFullYear(),month=date.getMonth();
    const leading=(new Date(year,month,1,12).getDay()+6)%7,count=new Date(year,month+1,0,12).getDate();
    return {label:cap(new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(date)),leading,
      days:Array.from({length:count},(_,i)=>({day:i+1,iso:dateISO(new Date(year,month,i+1,12))}))};
  }
  const frequencyFieldsFor = (frequency,fixedWeek=false) => ({weekday:frequency==='weekly',monthWeek:frequency==='monthly'&&!fixedWeek,dueDate:frequency==='once'});
  function time24FromInput(value){
    const raw=String(value||'').trim(),compact=/^\d{4}$/.test(raw)?`${raw.slice(0,2)}:${raw.slice(2)}`:raw;
    const match=/^(\d{1,2}):([0-5]\d)$/.exec(compact);
    if(!match)return null;
    const normalized=`${match[1].padStart(2,'0')}:${match[2]}`;
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)?normalized:null;
  }
  function formatTimeTyping(value,deleting=false){
    const raw=String(value||'');
    if(/^\d{1,2}:\d{0,2}$/.test(raw))return raw;
    const digits=raw.replace(/\D/g,'').slice(0,4);
    return digits.length>2?`${digits.slice(0,2)}:${digits.slice(2)}`:digits.length===2&&!deleting?`${digits}:`:digits;
  }
  function formatDateTyping(value,deleting=false){
    const raw=String(value||'');
    if(/^\d{2}\/\d{0,2}(?:\/\d{0,4})?$/.test(raw))return raw;
    const digits=raw.replace(/\D/g,'').slice(0,8);
    if(digits.length>4)return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
    if(digits.length>2)return `${digits.slice(0,2)}/${digits.slice(2)}${digits.length===4&&!deleting?'/':''}`;
    return digits.length===2&&!deleting?`${digits}/`:digits;
  }
  const minutesOf = time => {const [h,m]=String(time||'09:00').split(':').map(Number);return h*60+m;};
  const timeOf = minutes => `${String(Math.floor(((minutes%1440)+1440)%1440/60)).padStart(2,'0')}:${String(((minutes%60)+60)%60).padStart(2,'0')}`;
  const integer = (value,fallback,min=0,max=100000) => {const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,Math.round(n))):fallback;};
  const missionTypeFor = t => MISSION_TYPES[t?.missionType]?t.missionType:t?.frequency==='monthly'?'boss':t?.frequency==='weekly'?'side':t?.priority==='essential'?'main':'daily';

  function task(id,title,category,priority,frequency,low,normal,high,extra={}){
    return {id,title,category,priority,frequency,missionType:missionTypeFor({priority,frequency,...extra}),owner:'shared',weekday:1,monthWeek:1,dueDate:todayISO(),
      versions:{low:{description:low[0],minutes:low[1]},normal:{description:normal[0],minutes:normal[1]},high:{description:high[0],minutes:high[1]}},
      firstStep:'Separar o que será usado.',trigger:'Quando houver uma abertura no dia.',criterion:'A etapa escolhida foi feita.',xpType:'',hard:false,...extra};
  }
  function seedState(){
    return {version:1,activeDay:todayISO(),settings:{people:['Pessoa 1','Pessoa 2'],wake:'09:00',sleep:'23:00',mealCount:5,mealOffsets:[30,210,390,570,750],blockMinutes:15,
      reduceMotion:false,hideExtras:false,notifications:false,
      xp:{energy:5,meal:5,mealCap:25,hygiene:10,dishes:10,hazard:10,objects:10,weeklyStart:10,block:5,blockCap:2,bossPhase:15,difficultStart:5,minimum:10},
      milestones:[{id:'m50',target:50,reward:'Escolher um jogo para curtir'},{id:'m120',target:120,reward:'Tempo protegido para assistir a algo'},{id:'m250',target:250,reward:'Reservar uma tarde para um hobby'},{id:'m500',target:500,reward:'Planejar uma experiência especial de lazer'}]},
      tasks:[
        task('energy','Avaliar minha energia','Bem-estar','essential','daily',['Responder às três perguntas ou escolher um nível.',2],['Responder às três perguntas e ajustar o dia.',3],['Responder e planejar um bloco com pausas.',4],{firstStep:'Perceber como está o corpo.',trigger:'Ao acordar.',criterion:'Um nível de energia foi registrado.',xpType:'energy',owner:'person1'}),
        task('hygiene','Higiene pessoal básica','Higiene','essential','daily',['Higiene por dois minutos, como rosto e dentes.',2],['Higiene básica com banho ou cuidado equivalente.',12],['Rotina completa com um cuidado adicional.',20],{firstStep:'Ir até o banheiro e separar um item.',trigger:'Depois de levantar.',criterion:'O cuidado escolhido foi realizado.',xpType:'hygiene',owner:'person1'}),
        task('food','Alimentar-se em oportunidades flexíveis','Alimentação','essential','daily',['Escolher um alimento seguro e acessível.',5],['Registrar refeições ou lanches nas oportunidades disponíveis.',15],['Preparar algo simples para uma próxima oportunidade.',25],{firstStep:'Olhar as opções seguras disponíveis.',trigger:'Ao acordar e aproximadamente a cada três horas.',criterion:'Ao menos uma refeição ou lanche foi registrado.',xpType:'',owner:'shared'}),
        task('dishes','Louça para a próxima refeição','Cozinha','essential','daily',['Garantir um prato, um copo e um utensílio limpos.',5],['Limpar o que será necessário no próximo uso.',12],['Limpar o necessário e deixar a pia livre.',25],{firstStep:'Separar apenas o próximo conjunto de louça.',trigger:'Depois da refeição.',criterion:'Há louça utilizável para o próximo uso.',xpType:'dishes'}),
        task('trash','Verificar lixo urgente','Segurança','essential','daily',['Remover somente lixo com cheiro, vazamento ou risco.',3],['Verificar lixeiras e retirar o que pede atenção.',8],['Retirar o lixo e limpar um ponto necessário.',15],{firstStep:'Observar se há cheiro ou vazamento.',trigger:'Ao entrar na cozinha ou no banheiro.',criterion:'Riscos de lixo urgente foram resolvidos; se não havia risco, a verificação foi feita.',xpType:'hazard'}),
        task('path','Liberar passagens obstruídas','Segurança','essential','daily',['Tirar um obstáculo da passagem.',2],['Liberar as passagens principais.',6],['Liberar passagens e guardar os obstáculos.',12],{firstStep:'Olhar o caminho entre os cômodos.',trigger:'Na primeira circulação pela casa.',criterion:'É possível circular sem obstáculos perigosos.',xpType:'hazard'}),
        task('objects','Guardar cinco objetos','Organização','recommended','daily',['Colocar cinco objetos em um cesto de transição.',5],['Guardar cinco objetos nos lugares deles.',10],['Guardar cinco objetos e esvaziar parte do cesto.',20],{firstStep:'Pegar o primeiro objeto ao alcance.',trigger:'Depois da primeira refeição.',criterion:'Cinco objetos foram guardados ou separados no cesto.',xpType:'objects'}),
        task('tomorrow','Definir a primeira alimentação de amanhã','Alimentação','recommended','daily',['Escolher uma opção segura para amanhã.',2],['Escolher a opção e conferir os ingredientes.',5],['Deixar alguns componentes preparados.',10],{firstStep:'Abrir a lista de opções seguras.',trigger:'No fim do dia.',criterion:'Uma primeira opção está definida.',xpType:''}),
        task('laundry','Roupas','Lavanderia','recommended','weekly',['Juntar uma carga ou separar roupas por cinco minutos.',5],['Lavar e encaminhar uma carga de roupa.',35],['Lavar, estender e guardar uma pequena parte.',55],{weekday:1,firstStep:'Levar o cesto até a máquina.',trigger:'Segunda-feira, após a primeira refeição.',criterion:'A etapa planejada foi iniciada ou concluída.',hard:true}),
        task('bathroom','Banheiro','Limpeza','recommended','weekly',['Limpar vaso ou pia por cinco minutos.',5],['Limpar pia, vaso e uma superfície.',30],['Limpar banheiro e piso em etapas.',50],{weekday:2,firstStep:'Separar pano e produto tolerável.',trigger:'Terça-feira.',criterion:'A área escolhida foi limpa.',hard:true}),
        task('floors','Pisos','Limpeza','recommended','weekly',['Limpar um trecho de passagem por cinco minutos.',5],['Varrer ou limpar os pisos mais usados.',30],['Limpar os pisos da casa em etapas.',50],{weekday:3,firstStep:'Escolher um cômodo e separar a ferramenta.',trigger:'Quarta-feira.',criterion:'O trecho escolhido foi limpo.',hard:true}),
        task('bedding','Roupa de cama e toalhas','Lavanderia','recommended','weekly',['Trocar uma fronha ou separar toalhas.',5],['Trocar roupa de cama e toalhas em uso.',25],['Trocar e lavar o conjunto retirado.',50],{weekday:4,firstStep:'Separar uma peça limpa.',trigger:'Quinta-feira.',criterion:'As peças escolhidas foram trocadas ou separadas.',hard:true}),
        task('groceries','Verificar alimentos e compras','Alimentação','recommended','weekly',['Verificar três itens e anotar o que falta.',5],['Conferir geladeira e despensa, montar lista e comprar o necessário.',40],['Revisar estoque, compras e porções para a semana.',60],{weekday:5,firstStep:'Abrir geladeira e escolher uma prateleira.',trigger:'Sexta-feira.',criterion:'Uma lista utilizável foi montada.',hard:true}),
        task('prep','Preparo antecipado e cozinha','Cozinha','recommended','weekly',['Separar uma opção segura ou limpar uma superfície.',5],['Preparar porções e manter a bancada utilizável.',45],['Preparar algumas porções, guardar e limpar a cozinha.',70],{weekday:6,firstStep:'Escolher uma refeição repetível.',trigger:'Sábado.',criterion:'Uma porção ou etapa da cozinha está pronta.',hard:true}),
        task('rest','Descanso e recuperação opcional','Bem-estar','optional','weekly',['Descansar; nenhuma tarefa é exigida.',0],['Se quiser, até 20 minutos de recuperação.',20],['Descansar e encerrar uma pendência pequena, se fizer sentido.',20],{weekday:0,firstStep:'Decidir se a pausa é o melhor passo.',trigger:'Domingo.',criterion:'Descanso escolhido ou pequena recuperação encerrada.'}),
        task('month-food','Geladeira e alimentos vencidos','Alimentos e geladeira','optional','monthly',['Verificar uma prateleira por cinco minutos.',5],['Verificar vencimentos e limpar parte da geladeira ou freezer.',25],['Verificar e limpar uma área maior, em blocos.',45],{monthWeek:1,weekday:3,firstStep:'Escolher somente uma prateleira.',trigger:'Semana 1 do mês.',criterion:'Uma área foi verificada e limpa.',hard:true}),
        task('month-appliance','Limpar um eletrodoméstico','Eletrodomésticos','optional','monthly',['Limpar um detalhe externo por cinco minutos.',5],['Limpar um eletrodoméstico escolhido.',25],['Limpar o aparelho em duas etapas.',45],{monthWeek:2,weekday:3,firstStep:'Escolher um aparelho e desligá-lo, se necessário.',trigger:'Semana 2 do mês.',criterion:'A etapa escolhida do aparelho foi limpa.',hard:true}),
        task('month-drawer','Organizar gaveta ou prateleira','Organização','optional','monthly',['Separar cinco itens de uma gaveta.',5],['Organizar uma gaveta ou prateleira.',25],['Organizar uma área e encaminhar itens separados.',45],{monthWeek:3,weekday:3,firstStep:'Escolher uma gaveta pequena.',trigger:'Semana 3 do mês.',criterion:'A área escolhida ficou utilizável.',hard:true}),
        task('month-supplies','Revisar produtos e manutenção','Produtos e manutenção','optional','monthly',['Verificar um produto ou uma pequena manutenção.',5],['Revisar produtos de higiene, limpeza e uma manutenção.',25],['Montar lista e resolver uma pequena manutenção.',45],{monthWeek:4,weekday:3,firstStep:'Olhar o primeiro produto ao alcance.',trigger:'Semana 4 do mês.',criterion:'A revisão ou manutenção escolhida foi feita.',hard:true})
      ],
      taskLog:{},reschedules:{},days:{},mealLog:{},xpLedger:{},notificationLog:{},
      foods:{safe:['Arroz','Ovos','Pão','Banana'],avoid:[],inventory:[{id:'inv1',name:'Arroz',place:'Despensa',quantity:2},{id:'inv2',name:'Ovos',place:'Geladeira',quantity:6},{id:'inv3',name:'Porção de arroz pronta',place:'Freezer',quantity:2}],shopping:[]},
      meals:[{id:'meal1',name:'Pão com ovo',parts:['Pão separado','Ovo'],energy:'low',favorite:true,emergency:true,portions:0},
        {id:'meal2',name:'Arroz e ovo',parts:['Arroz','Ovo separado'],energy:'normal',favorite:true,emergency:false,portions:2},
        {id:'meal3',name:'Prato montado em etapas',parts:['Arroz','Proteína escolhida','Acompanhamento separado'],energy:'high',favorite:false,emergency:false,portions:0}],
      timer:null};
  }
  function normalize(raw){
    const base=seedState();
    const record=x=>x&&typeof x==='object'&&!Array.isArray(x);
    if(!record(raw)||raw.version!==1||(raw.activeDay!==undefined&&!displayDate(raw.activeDay))||!record(raw.settings)||!Array.isArray(raw.tasks)||!Array.isArray(raw.meals)||
      raw.tasks.some(t=>!t||typeof t.id!=='string'||typeof t.title!=='string'||!t.versions||!['daily','weekly','monthly','once'].includes(t.frequency))||
      raw.meals.some(m=>!m||typeof m.id!=='string'||typeof m.name!=='string'||!Array.isArray(m.parts))||
      (raw.settings.people&&(!Array.isArray(raw.settings.people)||raw.settings.people.length!==2))||
      (raw.settings.milestones&&(!Array.isArray(raw.settings.milestones)||raw.settings.milestones.some(m=>!record(m)||typeof m.reward!=='string'||!Number.isFinite(Number(m.target)))))||
      ['taskLog','reschedules','days','mealLog','xpLedger','notificationLog'].some(key=>raw[key]!==undefined&&!record(raw[key]))||
      (raw.foods&&(!record(raw.foods)||!Array.isArray(raw.foods.safe)||!Array.isArray(raw.foods.avoid)||!Array.isArray(raw.foods.inventory)||!Array.isArray(raw.foods.shopping)||
        raw.foods.inventory.some(i=>!record(i)||typeof i.id!=='string'||typeof i.name!=='string')||raw.foods.shopping.some(i=>!record(i)||typeof i.id!=='string'||typeof i.name!=='string')))) throw Error('Formato de backup inválido.');
    return {...base,...raw,tasks:raw.tasks.map(t=>({...t,missionType:missionTypeFor(t)})),settings:{...base.settings,...raw.settings,xp:{...base.settings.xp,...raw.settings.xp},milestones:Array.isArray(raw.settings.milestones)?raw.settings.milestones:base.settings.milestones},
      foods:{...base.foods,...raw.foods},taskLog:raw.taskLog||{},reschedules:raw.reschedules||{},days:raw.days||{},mealLog:raw.mealLog||{},xpLedger:raw.xpLedger||{},notificationLog:raw.notificationLog||{}};
  }
  function saveMonthlyWeekIn(data,week,details,existingId=''){
    if(!Number.isInteger(week)||week<1||week>4)throw Error('Escolha uma semana válida.');
    const existing=existingId?data.tasks.find(t=>t.id===existingId):null;
    if(existingId&&(!existing||existing.frequency!=='monthly'||Number(existing.monthWeek)!==week))throw Error('Esta missão não pertence à semana selecionada.');
    if(!existing&&data.tasks.some(t=>t.frequency==='monthly'&&Number(t.monthWeek)===week))throw Error('Esta semana já tem uma missão mensal. Edite a missão existente.');
    const {title,category,priority,owner,weekday,versions,firstStep,trigger,criterion}=details;
    if(![title,category,firstStep,trigger,criterion].every(value=>typeof value==='string'&&value.trim())||
      !PRIORITY[priority]||!['person1','person2','shared'].includes(owner)||!Number.isInteger(weekday)||weekday<0||weekday>6||
      !['low','normal','high'].every(level=>typeof versions?.[level]?.description==='string'&&versions[level].description.trim()&&Number.isInteger(versions[level].minutes)&&versions[level].minutes>=0&&versions[level].minutes<=480))throw Error('Revise os dados da missão mensal.');
    const updated=existing||task(uid(),'','','optional','monthly',['',5],['',25],['',45]);
    Object.assign(updated,{title:title.trim(),category:category.trim(),priority,owner,frequency:'monthly',monthWeek:week,weekday,
      firstStep:firstStep.trim(),trigger:trigger.trim(),criterion:criterion.trim(),versions:Object.fromEntries(Object.keys(ENERGY).map(level=>[level,{...versions[level]}])),
      xpType:details.xpType||'',hard:!!details.hard,missionType:MISSION_TYPES[details.missionType]?details.missionType:missionTypeFor(updated)});
    if(!existing)data.tasks.push(updated);
    return updated;
  }
  function classifyEnergy(answers){
    const total=Number(answers.body)+Number(answers.focus)+Number(answers.sensory);
    if(![answers.body,answers.focus,answers.sensory].every(n=>Number.isInteger(Number(n))&&Number(n)>=0&&Number(n)<=2))throw Error('Respostas de energia inválidas.');
    return total<=2?'low':total<=4?'normal':'high';
  }
  function awardOnce(data,id,amount,label,date,at=new Date().toISOString()){
    if(!data.xpLedger[id]&&Number(amount)>0)data.xpLedger[id]={id,amount:Number(amount),label,date,at};
    else if(data.xpLedger[id])data.xpLedger[id].lastActionAt=at;
  }
  function xpEntryActive(data,entry){
    if(entry.active===false)return false;
    const id=String(entry.id||'');
    if(id.startsWith('meal:')){const [,date,slot]=id.split(':');return !!data.mealLog[date]?.[slot];}
    const prefix=['complete:','minimum:','weekly-start:','hard-start:','block:','boss:'].find(p=>id.startsWith(p));
    if(!prefix)return true;
    const source=prefix==='block:'||prefix==='boss:'?id.slice(prefix.length,id.lastIndexOf(':')):id.slice(prefix.length);
    if(!data.tasks.some(t=>source.startsWith(`${t.id}|`)))return false;
    const status=data.taskLog[source]?.status;
    if(prefix==='boss:')return true;
    if(prefix==='complete:'||prefix==='minimum:')return status==='done';
    if(!['started','paused','done'].includes(status))return false;
    if(prefix==='weekly-start:')return Number(data.taskLog[source].startedMinutes)>=5;
    if(prefix==='block:')return Number(data.taskLog[source].blocks)>=Number(id.slice(id.lastIndexOf(':')+1));
    return true;
  }
  function xpSummaryFor(data,iso){
    const all=Object.values(data.xpLedger).filter(entry=>entry&&typeof entry==='object'),activeEntries=all.filter(entry=>xpEntryActive(data,entry));
    return {active:activeEntries.reduce((sum,entry)=>sum+Number(entry.amount||0),0),
      today:activeEntries.filter(entry=>entry.date===iso).reduce((sum,entry)=>sum+Number(entry.amount||0),0),
      earned:all.reduce((sum,entry)=>sum+Number(entry.amount||0),0),
      recent:activeEntries.filter(entry=>Number(entry.amount)>0).sort((a,b)=>String(b.lastActionAt||b.at).localeCompare(String(a.lastActionAt||a.at))).slice(0,8)};
  }
  function rewardProgressFor(data,iso){
    const xp=xpSummaryFor(data,iso),milestones=[...data.settings.milestones].sort((a,b)=>a.target-b.target);
    return {xp,milestones,next:milestones.find(m=>xp.active<m.target),level:1+milestones.filter(m=>xp.active>=m.target).length};
  }
  function saveMilestonesIn(data,rows){
    if(!Array.isArray(rows)||rows.some(m=>!m||typeof m.id!=='string'||!m.id||!Number.isInteger(m.target)||m.target<1||m.target>999999||typeof m.reward!=='string'||!m.reward.trim()||m.reward.length>200)||
      new Set(rows.map(m=>m.id)).size!==rows.length)throw Error('Revise o XP e a descrição de cada marco.');
    data.settings.milestones=rows.map(m=>({id:m.id,target:m.target,reward:m.reward.trim()}));
  }
  function toggleBossPhaseIn(data,item,phase,at=new Date().toISOString()){
    if(missionTypeFor(item?.task)!=='boss'||!Number.isInteger(phase)||phase<1||phase>3)throw Error('Fase de Boss Fight inválida.');
    const entryId=`boss:${item.key}:${phase}`,entry=data.xpLedger[entryId];
    if(entry){entry.active=entry.active===false;entry.lastActionAt=at;}
    else data.xpLedger[entryId]={id:entryId,amount:integer(data.settings.xp.bossPhase,15,0,1000),label:`Fase ${phase}: ${item.task.title}`,date:item.date,at,active:true};
    return xpEntryActive(data,data.xpLedger[entryId]||{id:entryId,active:false});
  }
  function occurrencesFor(data,iso){
    const list=[];
    for(const task of data.tasks){if(occursOn(task,iso)){const key=completionKey(task,iso);if(!data.reschedules[key]||data.reschedules[key]===iso)list.push({task,key,date:iso});}}
    for(const [key,target] of Object.entries(data.reschedules)){if(target!==iso)continue;const task=data.tasks.find(t=>key.startsWith(`${t.id}|`));if(task&&!list.some(item=>item.key===key))list.push({task,key,date:iso});}
    return list.sort((a,b)=>({essential:0,recommended:1,optional:2}[a.task.priority]-{essential:0,recommended:1,optional:2}[b.task.priority]));
  }
  function suggestedSideQuestsFor(data,iso,energy){
    if(!['normal','high'].includes(energy)||data.days[iso]?.survival||dateFrom(iso).getDay()===0)return [];
    const scheduled=occurrencesFor(data,iso),scheduledIds=new Set(scheduled.map(item=>item.task.id));
    const sideQuestsToday=scheduled.filter(item=>missionTypeFor(item.task)==='side').length;
    const limit=Math.max(0,(energy==='normal'?1:2)-sideQuestsToday);
    if(!limit)return [];
    const weekday=(dateFrom(iso).getDay()+6)%7;
    const distance=task=>(((Number(task.weekday)+6)%7)-weekday+7)%7;
    return data.tasks.filter(task=>task.frequency==='weekly'&&missionTypeFor(task)==='side'&&
      ['recommended','optional'].includes(task.priority)&&task.id!=='rest'&&!scheduledIds.has(task.id))
      .map(task=>({task,key:completionKey(task,iso),date:iso,suggested:true}))
      .filter(item=>{
        const record=data.taskLog[item.key];
        return !data.reschedules[item.key]&&(!record||record.status==='pending'||record.date===iso);
      })
      .sort((a,b)=>Number(b.date===data.taskLog[b.key]?.date)-Number(a.date===data.taskLog[a.key]?.date)||
        distance(a.task)-distance(b.task)||
        a.task.title.localeCompare(b.task.title,'pt-BR'))
      .slice(0,limit);
  }
  function todayMissionGroupsFor(data,iso,energy){
    const items=occurrencesFor(data,iso),sideQuests=suggestedSideQuestsFor(data,iso,energy);
    const plannedSideQuests=energy==='low'?[]:items.filter(item=>item.task.priority==='recommended'&&missionTypeFor(item.task)==='side');
    return {items,sideQuests,
      essential:items.filter(item=>item.task.priority==='essential'),
      recommended:items.filter(item=>item.task.priority==='recommended'&&!plannedSideQuests.includes(item)),
      optional:[...items.filter(item=>item.task.priority==='optional'),...plannedSideQuests,...sideQuests]};
  }
  function mealSlotsFor(settings){
    const wake=minutesOf(settings.wake),sleep=minutesOf(settings.sleep),available=sleep<=wake?sleep+1440-wake:sleep-wake;
    const count=integer(settings.mealCount,5,1,10),offsets=Array.isArray(settings.mealOffsets)?settings.mealOffsets:[];
    return Array.from({length:count},(_,i)=>({index:i,offset:integer(offsets[i],30+i*180,0,1439)})).filter(slot=>slot.offset<=available).sort((a,b)=>a.offset-b.offset||a.index-b.index).map(slot=>({...slot,time:timeOf(wake+slot.offset)}));
  }
  function nextMealStateFor(data,iso){
    const slots=mealSlotsFor(data.settings),log=data.mealLog[iso]||{};
    if(!slots.length)return {status:'empty',slot:null,done:0,total:0};
    const slot=slots.find(entry=>!log[entry.index])||null;
    return {status:slot?'pending':'complete',slot,done:slots.filter(entry=>!!log[entry.index]).length,total:slots.length};
  }
  function rescheduleMealIn(data,index,time){
    const settings=data.settings,count=integer(settings.mealCount,5,1,10);
    if(!Number.isInteger(index)||index<0||index>=count||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Horário inválido.');
    const wake=minutesOf(settings.wake),sleep=minutesOf(settings.sleep),available=sleep<=wake?sleep+1440-wake:sleep-wake;
    let offset=minutesOf(time)-wake;if(offset<0)offset+=1440;
    if(offset>available)throw Error('Escolha um horário dentro do período em que estiver acordado.');
    if(!Array.isArray(settings.mealOffsets))settings.mealOffsets=[];
    settings.mealOffsets[index]=offset;
  }
  function setEnergyIn(data,iso,level,answers=null,at=new Date().toISOString()){
    if(!ENERGY[level])throw Error('Nível de energia inválido.');
    const day=data.days[iso]||{};day.energy={level,answers,at};data.days[iso]=day;
    const key=`energy|${iso}`;data.taskLog[key]={...(data.taskLog[key]||{}),status:'done',date:iso,minutes:2};
    awardOnce(data,`complete:${key}`,data.settings.xp.energy,'Avaliar energia',iso,at);
  }
  function completeTaskIn(data,item,energy,at=new Date().toISOString()){
    const {task:t,key,date}=item,v=t.versions?.[energy]||t.versions?.normal;
    const record=data.taskLog[key]||{};record.status='done';record.date=date;record.minutes=integer(v?.minutes,5,0,480);record.completedAt=at;data.taskLog[key]=record;
    if(t.xpType)awardOnce(data,`complete:${key}`,data.settings.xp[t.xpType]||0,`Concluir ${t.title}`,date,at);
    if(energy==='low')awardOnce(data,`minimum:${key}`,data.settings.xp.minimum,`Versão mínima: ${t.title}`,date,at);
  }
  function recordFiveMinutesIn(data,item){
    if(item.task.frequency!=='weekly')return false;
    awardOnce(data,`weekly-start:${item.key}`,data.settings.xp.weeklyStart,`Cinco minutos: ${item.task.title}`,item.date);
    const previous=data.taskLog[item.key]||{};
    data.taskLog[item.key]={...previous,status:previous.status==='paused'?'paused':'started',date:item.date,startedMinutes:5};
    return true;
  }
  function recordBlockIn(data,item){
    const cap=integer(data.settings.xp.blockCap,2,0,20);let n=1;
    while(data.xpLedger[`block:${item.key}:${n}`]&&n<=cap)n++;
    if(n>cap)return false;
    awardOnce(data,`block:${item.key}:${n}`,data.settings.xp.block,`Bloco de ${data.settings.blockMinutes} min: ${item.task.title}`,item.date);
    const previous=data.taskLog[item.key]||{};
    data.taskLog[item.key]={...previous,status:previous.status==='done'?'done':'started',date:item.date,blocks:n};
    return true;
  }
  function recordMealIn(data,slot,optionId,label,iso,time){
    data.mealLog[iso] ||= {};const was=!!data.mealLog[iso][slot];data.mealLog[iso][slot]={optionId,label,time};
    if(!was){const xp=data.settings.xp,already=Object.entries(data.xpLedger).filter(([key])=>key.startsWith(`meal:${iso}:`)).reduce((sum,[,v])=>sum+Number(v.amount||0),0);
      const amount=Math.max(0,Math.min(Number(xp.meal)||0,Number(xp.mealCap)-already));awardOnce(data,`meal:${iso}:${slot}`,amount,'Registrar alimentação',iso);}
    const key=`food|${iso}`;data.taskLog[key]={...(data.taskLog[key]||{}),status:'done',date:iso,minutes:5};
  }
  function unmarkMealIn(data,slot,iso){
    if(!data.mealLog[iso]?.[slot])return;
    delete data.mealLog[iso][slot];
    const record=data.taskLog[`food|${iso}`];
    if(record?.status==='done'&&!record.completedAt&&!Object.keys(data.mealLog[iso]).length)record.status='pending';
  }
  function activateSurvivalIn(data,iso){const day=data.days[iso]||{};day.survival=true;day.mark ||= 'Mínimo';day.survivalSteps ||= {};data.days[iso]=day;}
  function protectedDaysFor(data,iso){let day=data.days[iso]?.mark?iso:addDays(iso,-1),count=0;while(data.days[day]?.mark){count++;day=addDays(day,-1);}return count;}
  function isReturningFor(data,iso){const marked=Object.keys(data.days).filter(d=>d<iso&&data.days[d]?.mark).sort();return marked.length>0&&marked.at(-1)<addDays(iso,-1);}
  function createTimer(minutes,iso){return {minutes,remaining:minutes*60,currentStep:0,status:'ready',date:iso};}
  function timerRemainingFor(timer,now){return timer.status==='running'?Math.max(0,Math.ceil((timer.endsAt-now)/1000)):timer.remaining;}
  function startTimer(timer,now){timer.endsAt=now+timer.remaining*1000;timer.status='running';}
  function pauseTimer(timer,now){timer.remaining=timerRemainingFor(timer,now);timer.status='paused';delete timer.endsAt;}
  function tickTimer(timer,now){
    if(timer.status!=='running')return false;
    const remaining=timerRemainingFor(timer,now),steps=protocolSteps(timer.minutes);
    if(remaining<=0){timer.status='finished';timer.remaining=0;timer.currentStep=steps.length-1;delete timer.endsAt;return true;}
    timer.currentStep=Math.max(timer.currentStep,Math.min(steps.length-1,Math.floor((timer.minutes*60-remaining)/(timer.minutes*60/steps.length))));
    return false;
  }
  if(typeof module==='object'&&module.exports){
    module.exports={seedState,normalize,activeDayFor,advanceDayIn,retreatDayIn,rewardProgressFor,missionTypeFor,saveMonthlyWeekIn,saveMilestonesIn,xpSummaryFor,toggleBossPhaseIn,classifyEnergy,occurrencesFor,suggestedSideQuestsFor,todayMissionGroupsFor,completionKey,mealSlotsFor,nextMealStateFor,rescheduleMealIn,renderNextMealCardFor,renderNextStepFor,setEnergyIn,completeTaskIn,recordFiveMinutesIn,recordBlockIn,recordMealIn,unmarkMealIn,activateSurvivalIn,protectedDaysFor,isReturningFor,createTimer,timerRemainingFor,startTimer,pauseTimer,tickTimer,parseDisplayDate,displayDate,calendarGridFor,frequencyFieldsFor,time24FromInput,formatTimeTyping,formatDateTyping};
    return;
  }
  let state,needsDateSave=false;
  try {const stored=localStorage.getItem(STORAGE_KEY),parsed=stored?JSON.parse(stored):null;state=parsed?normalize(parsed):seedState();needsDateSave=!parsed||parsed.activeDay===undefined;}
  catch(e){state=seedState();setTimeout(()=>toast('Não foi possível ler os dados salvos. Você pode importar um backup JSON.'),500);}
  let selectedWeekDay=activeDayFor(state),monthCursor=activeDayFor(state),missionTab='missions',undoAction=null,toastTimeout=null;
  function activeDayISO(){return activeDayFor(state);}
  const viewName = () => {const hash=decodeURIComponent(location.hash.slice(1));return VIEWS[hash]?hash:'hoje';};
  function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch(e){toast('Não foi possível salvar. Exporte um backup e libere espaço no navegador.');return false;}}
  if(needsDateSave)save();
  function currentDay(){return state.days[activeDayISO()]||{};}
  function energyFor(iso=activeDayISO()){return state.days[iso]?.energy?.level||'normal';}
  function grant(id,amount,label,date=activeDayISO()){awardOnce(state,id,amount,label,date);}
  function completionKey(task,iso){return `${task.id}|${frequencyKey(task,iso)}`;}
  function frequencyKey(task,iso){if(task.frequency==='weekly')return weekStart(iso);if(task.frequency==='monthly')return `${iso.slice(0,7)}-S${monthWeek(iso)}`;return iso;}
  function occursOn(task,iso){const d=dateFrom(iso),dow=d.getDay();if(task.frequency==='daily')return true;if(task.frequency==='weekly')return Number(task.weekday)===dow;
    if(task.frequency==='monthly')return d.getDate()<=28&&monthWeek(iso)===Number(task.monthWeek)&&Number(task.weekday)===dow;
    return task.dueDate===iso;}
  function occurrences(iso){return occurrencesFor(state,iso);}
  function taskStatus(item){return state.taskLog[item.key]?.status||'pending';}
  function mealSlots(){return mealSlotsFor(state.settings);}
  function dailyMinutes(iso=activeDayISO()){return Object.values(state.taskLog).filter(v=>v.date===iso).reduce((n,v)=>n+Math.max(v.status==='done'?(Number(v.minutes)||0):0,(Number(v.startedMinutes)||0)+(Number(v.blocks)||0)*integer(state.settings.blockMinutes,15)),0);}
  function isReturning(){return isReturningFor(state,activeDayISO());}
  function protectedDays(){return protectedDaysFor(state,activeDayISO());}
  function toast(message,undo){const el=$('#toast');clearTimeout(toastTimeout);el.replaceChildren();el.append(document.createTextNode(message));if(undo){const b=document.createElement('button');b.className='button small subtle';b.textContent='Desfazer';b.addEventListener('click',()=>{undoAction?.();undoAction=null;el.hidden=true;});el.append(b);}el.hidden=false;toastTimeout=setTimeout(()=>{el.hidden=true;undoAction=null;},9000);}
  function confirmAction(title,message,accept='Confirmar'){
    return new Promise(resolve=>{const d=$('#confirm-dialog');d.returnValue='';$('#confirm-title').textContent=title;$('#confirm-message').textContent=message;$('#confirm-accept').textContent=accept;
      d.addEventListener('close',()=>resolve(d.returnValue==='confirm'),{once:true});d.showModal();});
  }
  function openDialog(html){const d=$('#form-dialog');$('#dialog-content').innerHTML=html;d.showModal();$('#dialog-content input:not([type=hidden]),#dialog-content select,#dialog-content textarea')?.focus();}
  function closeDialog(){if($('#form-dialog').open)$('#form-dialog').close();}
  function closeCalendar(pop,restoreFocus=false){
    if(!pop||pop.hidden)return;
    pop.hidden=true;
    const toggle=$('.calendar-toggle',pop.closest('.date-widget'));
    toggle?.setAttribute('aria-expanded','false');
    if(restoreFocus)toggle?.focus();
  }
  function renderCalendar(pop){
    const widget=pop.closest('.date-widget'),input=$('.date-input',widget),selected=parseDisplayDate(input.value),cursor=pop.dataset.cursor||selected||todayISO();
    const grid=calendarGridFor(cursor),currentMonth=grid.days[0].iso.slice(0,7),focusDate=selected?.startsWith(currentMonth)?selected:grid.days[0].iso;
    pop.innerHTML=`<div class="calendar-header">${actionButton('‹','calendar-prev','aria-label="Mês anterior"','ghost small')}<strong aria-live="polite">${escapeHTML(grid.label)}</strong>${actionButton('›','calendar-next','aria-label="Próximo mês"','ghost small')}</div><div class="calendar-weekdays" aria-hidden="true">${['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(day=>`<span>${day}</span>`).join('')}</div><div class="calendar-days">${Array.from({length:grid.leading},()=>'<span aria-hidden="true"></span>').join('')}${grid.days.map(day=>`<button type="button" class="calendar-day ${selected===day.iso?'selected':''} ${todayISO()===day.iso?'today':''}" data-action="calendar-select" data-date="${day.iso}" aria-label="${escapeHTML(dateLabel(day.iso))}" aria-pressed="${selected===day.iso}" ${todayISO()===day.iso?'aria-current="date"':''} tabindex="${focusDate===day.iso?0:-1}">${day.day}</button>`).join('')}</div><div class="calendar-actions">${actionButton('Hoje','calendar-today','','ghost small')}${actionButton('Fechar','calendar-close','','subtle small')}</div>`;
  }
  function syncFrequencyFields(form){
    const frequency=form.elements.namedItem('frequency')?.value||'daily',visible=frequencyFieldsFor(frequency,!!form.dataset.monthWeek);
    $$('[data-frequency-field]',form).forEach(field=>{
      const show=!!visible[field.dataset.frequencyField];field.hidden=!show;
      $$('input,select,button',field).forEach(control=>{control.disabled=!show;if(control.classList.contains('date-input'))control.required=show;});
      if(!show)closeCalendar($('.calendar-popover',field));
    });
  }
  function setAboutTab(tab){
    const notes=tab==='notes';
    $('#about-overview').hidden=notes;$('#about-notes').hidden=!notes;
    $$('#about-dialog [data-action="about-tab"]').forEach(button=>{
      const selected=button.dataset.tab===tab;
      button.setAttribute('aria-pressed',String(selected));
      button.classList.toggle('active',selected);
      button.classList.toggle('subtle',!selected);
    });
  }
  function openAbout(){
    $('#about-version').textContent=`Versão ${SITE_VERSION} · aplicativo para uso local, sem cadastro ou internet.`;
    $('#feature-notes').innerHTML=FEATURE_NOTES.map(release=>`<article class="release-note"><h4>Versão ${escapeHTML(release.version)} <span class="small muted">· ${escapeHTML(release.date)}</span></h4><ul>${release.changes.map(change=>`<li><strong>${escapeHTML(change.type)}:</strong> ${escapeHTML(change.description)}</li>`).join('')}</ul></article>`).join('');
    setAboutTab('about');
    $('#about-dialog').showModal();
  }
  function navigate(view){location.hash=view;render();window.scrollTo({top:0,behavior:state.settings.reduceMotion?'auto':'smooth'});}
  function renderNav(){const current=viewName();const navItem=(key,mobile=false)=>`<button type="button" class="nav-button" data-action="navigate" data-view="${key}" ${current===key?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${VIEWS[key][1]}</span><span>${mobile&&key==='alimentacao'?'Comer':VIEWS[key][0]}</span></button>`;
    $('#side-nav').innerHTML=Object.keys(VIEWS).map(k=>navItem(k)).join('');
    const more=['mes','missoes','configuracoes'].includes(current);
    $('#mobile-nav').innerHTML=['hoje','semana','alimentacao'].map(k=>navItem(k,true)).join('')+`<button type="button" class="nav-button" data-action="mobile-more" aria-expanded="false" aria-controls="mobile-menu" ${more?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">☷</span><span>Mais</span></button><div class="mobile-menu" id="mobile-menu" hidden>${['mes','missoes','configuracoes'].map(k=>navItem(k)).join('')}</div>`;
  }
  function render(){
    document.body.classList.toggle('hide-extras',!!state.settings.hideExtras);
    document.body.classList.toggle('reduce-motion',!!state.settings.reduceMotion);
    document.body.style.scrollBehavior=state.settings.reduceMotion?'auto':'';
    renderNav();const view=viewName();$('#page-kicker').textContent='ROUTINEORGANIZERRPG';$('#page-title').textContent=VIEWS[view][0];$('#header-date').textContent=dateLabel(activeDayISO());
    $('#header-add-task').hidden=view==='missoes';$('#header-actions').classList.toggle('only-date',view==='missoes');
    const pages={hoje:renderToday,semana:renderWeek,mes:renderMonth,alimentacao:renderFood,missoes:renderMissions,configuracoes:renderSettings};
    $('#main').innerHTML=pages[view]();updateTimerDisplay();
  }
  function actionButton(label,action,attrs='',className='subtle small'){return `<button type="button" class="button ${className}" data-action="${action}" ${attrs}>${label}</button>`;}
  function statusBadge(status){const kind=STATUS[status]?status:'pending';return `<span class="pill status-${kind}">${STATUS[kind]}</span>`;}
  function renderNextStepFor(data,item,index){
    const status=data.taskLog[item.key]?.status||'pending',attrs=`data-key="${escapeHTML(item.key)}" data-date="${escapeHTML(item.date)}"`;
    if(status==='done')return '';
    return `<li class="next-step" data-step-key="${escapeHTML(item.key)}"><span class="next-index" aria-hidden="true">${index+1}</span><div class="next-step-content"><div class="next-step-heading"><strong>${escapeHTML(item.task.title)}</strong>${statusBadge(status)}</div><p class="small muted">${escapeHTML(item.task.firstStep)}</p><div class="task-controls next-step-actions">${actionButton(status==='started'?'Pausar':status==='paused'?'Retomar':'Iniciar',status==='started'?'task-pause':'task-start',attrs,'ghost small')}${actionButton('Marcar como feita','task-complete',attrs,'small')}</div></div></li>`;
  }
  function dateField(id,name,iso,label,enabled=true){
    return `<div class="date-widget"><div class="date-control"><input id="${id}" name="${name}" class="date-input" type="text" inputmode="numeric" autocomplete="off" maxlength="10" pattern="(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/[0-9]{4}" placeholder="DD/MM/AAAA" aria-describedby="hint-${id}" value="${escapeHTML(displayDate(iso))}" ${enabled?'required':'disabled'}><button type="button" class="button ghost small calendar-toggle" data-action="calendar-toggle" data-target="${id}" aria-controls="calendar-${id}" aria-expanded="false" aria-label="Abrir calendário para ${escapeHTML(label)}" ${enabled?'':'disabled'}>▦ Calendário</button></div><small id="hint-${id}">DD/MM/AAAA</small><div id="calendar-${id}" class="calendar-popover" data-input="${id}" role="group" aria-label="Calendário para ${escapeHTML(label)}" hidden></div></div>`;
  }
  function time24Field(id,name,value){
    return `<input id="${id}" name="${name}" class="time-24" type="text" inputmode="numeric" autocomplete="off" maxlength="5" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" placeholder="HH:MM" aria-describedby="hint-${id}" value="${escapeHTML(value)}" required><small id="hint-${id}">Horário em 24h · HH:MM</small>`;
  }
  function renderTaskCard(item){
    const t=item.task,status=taskStatus(item),energy=energyFor(item.date),v=t.versions?.[energy]||t.versions?.normal||{description:'Etapa a definir.',minutes:5};
    const owner=t.owner==='shared'?'Compartilhado':t.owner==='person2'?state.settings.people[1]:state.settings.people[0];
    const attrs=`data-key="${escapeHTML(item.key)}" data-date="${escapeHTML(item.date)}"`;
    const isDone=status==='done';
    let controls=isDone?actionButton('Reabrir','task-reopen',attrs):`${actionButton(status==='pending'?'Iniciar':status==='paused'?'Retomar':'Pausar',status==='started'?'task-pause':'task-start',attrs)} ${actionButton('Concluir','task-complete',attrs,'small')}`;
    if(status==='started'||status==='paused')controls+=` ${t.frequency==='weekly'&&!state.xpLedger[`weekly-start:${item.key}`]?actionButton('Registrar 5 min','task-five',attrs):''} ${actionButton('Registrar bloco','task-block',attrs)}`;
    controls+=` ${actionButton('Editar','task-edit',`data-id="${escapeHTML(t.id)}"`)} ${actionButton('Reagendar','task-reschedule',attrs)} ${actionButton('Excluir','task-delete',`data-id="${escapeHTML(t.id)}"`,'danger-outline small')}`;
    const kind=MISSION_TYPES[missionTypeFor(t)];
    return `<article class="card task-card ${isDone?'done':''}">
      <div class="task-head"><input class="mini-check" type="checkbox" data-action="task-check" ${attrs} aria-label="${isDone?'Reabrir':'Concluir'} ${escapeHTML(t.title)}" ${isDone?'checked':''}>
      <div class="task-copy"><div class="task-title-row"><h3>${escapeHTML(t.title)}</h3>${statusBadge(status)}</div>
      <div class="task-meta"><span>${escapeHTML(t.category)}</span><span aria-hidden="true">·</span><span>${kind}</span><span aria-hidden="true">·</span><span>${escapeHTML(owner)}</span><span aria-hidden="true">·</span><span>${integer(v.minutes,5)} min</span></div>
      ${item.suggested?'<p class="small side-quest-note">Side Quest opcional sugerida pela energia. Se não fizer hoje, não vira pendência.</p>':''}
      <p class="task-version">${escapeHTML(v.description)}</p><details class="task-details"><summary>Primeiro passo e critério</summary><p><strong>Começar:</strong> ${escapeHTML(t.firstStep)}</p><p><strong>Gatilho:</strong> ${escapeHTML(t.trigger)}</p><p><strong>Concluída quando:</strong> ${escapeHTML(t.criterion)}</p><p><strong>Frequência:</strong> ${t.frequency==='daily'?'Diária':t.frequency==='weekly'?'Semanal':t.frequency==='monthly'?'Mensal':'Avulsa'} · <strong>Energia:</strong> ${ENERGY[energy]}</p></details>
      <div class="task-controls">${controls}</div></div></div></article>`;
  }
  function taskGroup(title,items,empty,note=''){return `<section><div class="section-heading"><h2>${title}</h2><span class="quiet small">${items.length} ${items.length===1?'missão':'missões'}</span></div>${note?`<p class="small muted">${escapeHTML(note)}</p>`:''}<div class="task-list">${items.length?items.map(renderTaskCard).join(''):`<div class="empty"><p>${empty}</p></div>`}</div></section>`;}
  function renderNextMealCardFor(data,iso){
    const meal=nextMealStateFor(data,iso);
    const content=meal.status==='pending'?`<div class="meal-slot next-meal-slot"><div><strong class="next-meal-time">${escapeHTML(meal.slot.time)}</strong><p>Escolha o que fizer sentido.</p></div><div class="task-controls">${actionButton('Registrar feito','meal-quick-register',`data-slot="${meal.slot.index}"`,'small')}${actionButton('Remarcar','slot-edit',`data-slot="${meal.slot.index}" data-origin="today"`,'ghost small')}</div></div><p class="note">Se quiser, detalhe o que comeu depois em Alimentação.</p>`:
      meal.status==='complete'?`<div class="meal-complete"><p><strong>Parabéns, todas as refeições hoje foram cumpridas mantenha o foco amanhã</strong></p><img src="assets/HelloKittyJoinha.png" alt="Hello Kitty feliz mostrando um joinha" width="104" height="104" decoding="async"></div>`:
      `<div class="empty"><p>Não há horários dentro do período acordado. Ajuste seus horários de alimentação.</p></div>`;
    return `<section class="card next-meal-card" aria-live="polite"><div class="section-heading"><h2>Próxima alimentação</h2><span class="pill ${meal.status==='complete'?'green':''}">${meal.done}/${meal.total}</span></div>${content}${meal.status==='empty'?actionButton('Ajustar horários','navigate','data-view="alimentacao"','ghost small'):''}</section>`;
  }
  function renderToday(){
    const iso=activeDayISO(),day=currentDay(),energy=energyFor(),survival=!!day.survival;
    const groups=todayMissionGroupsFor(state,iso,energy),{items,sideQuests}=groups,xpToday=xpSummaryFor(state,iso).today;
    const done=survival?[0,1,2,3,4].filter(i=>day.survivalSteps?.[i]).length:items.filter(i=>taskStatus(i)==='done').length;
    const total=survival?5:items.length,pending=[...items,...sideQuests].filter(i=>taskStatus(i)!=='done').slice(0,3);
    const scoreText=survival?'Cada cuidado conta.':'O que couber hoje já tem valor.';
    return `<div class="view">
      <div class="hero-grid ${survival?'solo':''}"><section class="card hero-card important"><div><span class="section-label">${survival?'UM DIA MAIS SIMPLES':'SEU DIA, NO SEU RITMO'}</span><div class="today-date-line"><div class="date-heading">${escapeHTML(dateLabel(iso))}</div><div class="day-nav">${actionButton('Voltar um dia','day-prev',`aria-label="Voltar para ${escapeHTML(dateLabel(addDays(iso,-1)))}"`,'ghost small')}${actionButton('Passar o dia','day-next',`aria-label="Passar para ${escapeHTML(dateLabel(addDays(iso,1)))}"`,'ghost small')}</div></div><p class="lead">${survival?'Cinco ações pequenas. Pare quando precisar.':scoreText}</p><p class="day-xp" role="status">✦ ${xpToday} XP hoje <span>em ações marcadas</span></p></div><div><div class="stat-line"><strong>Progresso de hoje</strong><strong>${done}/${total}</strong></div><progress max="${Math.max(total,1)}" value="${done}" aria-label="${done} de ${total} ações concluídas"></progress><p class="small">${day.mark?`Dia marcado como ${escapeHTML(day.mark)}.`:'Nenhuma meta obrigatória para validar o dia.'}</p></div></section>
      ${survival?'':`<section class="card"><div class="section-heading"><h2>Como está sua energia?</h2><span class="pill green">${ENERGY[energy]}</span></div><p class="small">Três perguntas ajudam a escolher as versões das tarefas.</p><div class="energy-options">${Object.keys(ENERGY).map(k=>`<button type="button" class="button subtle ${energy===k?'selected':''}" data-action="energy-manual" data-energy="${k}" aria-pressed="${energy===k}"><span class="dot" aria-hidden="true"></span>${ENERGY[k]}</button>`).join('')}</div><p class="small green-text">${ENERGY_HINT[energy]}</p>${actionButton('Responder às três perguntas','energy-assess','','ghost small')}</section>`}</div>
      ${survival?renderSurvival():`<div class="grid two">${renderNextMealCardFor(state,iso)}<section class="card next-steps" aria-labelledby="next-steps-title"><h2 id="next-steps-title">Até três próximos passos</h2><ol class="next-list" aria-live="polite" aria-relevant="additions text">${pending.length?pending.map((i,n)=>renderNextStepFor(state,i,n)).join(''):'<li>As ações previstas para hoje foram atendidas. Descanse se quiser.</li>'}</ol></section></div>
      ${isReturning()&&!day.returnDone?`<section class="callout green"><div class="row wrap"><div><strong>Retorno à Base</strong><p>Escolha um único primeiro passo. Dias sem registro não viraram dívida.</p></div>${actionButton('Fiz um primeiro passo','return-complete')}</div></section>`:''}
      <section class="card survival"><div class="row wrap"><div><h2>Modo Sobrevivência</h2><p>Cinco cuidados essenciais, sem tarefas semanais ou mensais.</p></div>${actionButton('Ativar modo','survival-on','','ghost')}</div></section>
      ${energy==='high'&&dailyMinutes()>=90?`<div class="callout amber" role="status"><strong>Já foram ${dailyMinutes()} minutos de tarefas domésticas hoje.</strong><p>Uma pausa pode ajudar. Sugestão: no máximo um Boss Fight ou duas Side Quests no dia.</p></div>`:''}
      <section class="task-groups">${taskGroup('Essenciais',groups.essential,'Nenhuma missão essencial prevista.')}${taskGroup('Recomendadas',groups.recommended,'Nenhuma missão recomendada prevista.')}${taskGroup('Opcionais',groups.optional,'Nenhuma missão opcional prevista. Cadastre uma Side Quest para ter mais opções.',energy==='low'?'':'Side Quests previstas também são opcionais nesta energia. Até '+(energy==='normal'?'uma':'duas')+' no dia; sugestões extras não criam pendências.')}</section>
      <section>${renderTimer()}</section>`}
      ${survival?'':`<section class="card flat" aria-labelledby="day-mark-title"><div class="section-heading day-mark-heading"><div class="day-mark-title"><h2 id="day-mark-title">Marcar o dia</h2>${actionButton('?','day-help-open','id="day-mark-help" aria-label="Explicar as opções de Marcar o dia" aria-haspopup="dialog" aria-controls="day-help-dialog"','ghost small day-mark-help')}</div><span class="small muted">Todas as opções preservam a continuidade</span></div><div class="status-options">${['Completo','Mínimo','Recuperação','Pausa'].map(mark=>actionButton(mark,'day-mark',`data-mark="${mark}" aria-pressed="${day.mark===mark}"`,day.mark===mark?'active':'subtle')).join('')}</div><p class="note" style="margin-top:12px">Uma pausa não gera tarefas atrasadas nem remove XP.</p></section>`}
    </div>`;
  }
  function renderSurvival(){const texts=[['Escolher alimentação segura e fácil','Uma opção repetível basta.'],['Deixar uma bebida acessível','Coloque a bebida ao alcance.'],['Fazer dois minutos de higiene','Escolha um cuidado possível.'],['Garantir um prato, copo e utensílio','O suficiente para o próximo uso.'],['Resolver apenas riscos','Lixo urgente, vazamentos ou obstáculos.']];const steps=currentDay().survivalSteps||{};
    return `<section class="card survival"><div class="row wrap"><div><h2>Modo Sobrevivência</h2><p>O dia já está protegido. Escolha apenas o que for possível.</p></div>${actionButton('Voltar à rotina','survival-off','','ghost')}</div><div class="survival-list">${texts.map(([title,detail],i)=>`<div class="survival-item"><input type="checkbox" id="survival-${i}" data-action="survival-step" data-step="${i}" ${steps[i]?'checked':''}><label for="survival-${i}"><strong>${i+1}. ${title}</strong><small>${detail}</small></label></div>`).join('')}</div></section>`;}
  function renderTimer(){const timer=state.timer,active=timer&&timer.date===activeDayISO();const steps=active?protocolSteps(timer.minutes):[];
    return `<div class="card"><div class="section-heading"><h2>Protocolo de reinício</h2><span class="pill gray">10 · 20 · 40 min</span></div><p>Passos em sequência para recomeçar. Você pode parar ao final.</p>
      <div class="action-strip">${[10,20,40].map(n=>actionButton(`${n} minutos`,'timer-select',`data-minutes="${n}"`,active&&timer.minutes===n?'active small':'subtle small')).join('')}</div>
      ${active?`<div id="timer-panel"><div class="timer-number" id="timer-clock" role="timer" aria-label="Tempo restante">${formatSeconds(timerRemaining())}</div>
      <ol class="steps" id="timer-steps">${steps.map((step,i)=>`<li class="${i<timer.currentStep?'passed':i===timer.currentStep?'current':''}">${escapeHTML(step)}</li>`).join('')}</ol>
      <div class="action-strip">${timer.status==='running'?actionButton('Pausar','timer-pause','','ghost'):timer.status==='finished'?'':actionButton(timer.status==='paused'?'Retomar':'Iniciar','timer-start')}${timer.status==='finished'?'<span class="pill green">Você pode parar por aqui. Já foi suficiente.</span>':actionButton('Próximo passo','timer-next','','subtle')}${actionButton(timer.status==='finished'?'Fechar protocolo':'Encerrar','timer-end','','subtle')}</div></div>`:''}</div>`;
  }
  function protocolSteps(minutes){const steps=['Recolher lixo visível','Separar louça para o próximo uso','Colocar roupas no cesto','Definir a próxima alimentação'];if(minutes>=20)steps.push('Colocar objetos fora do lugar no cesto de transição');if(minutes>=40)steps.push('Fazer uma etapa pequena de roupa, superfície ou piso');return steps;}
  function renderWeek(){const base=weekStart(selectedWeekDay),days=Array.from({length:7},(_,i)=>addDays(base,i));const items=occurrences(selectedWeekDay);
    return `<div class="view"><div class="card flat"><div class="day-header"><div><h2>Semana de ${shortDate(base)} a ${shortDate(days[6])}</h2><p>Uma semana por vez. O que não foi feito não se acumula.</p></div><div class="date-picker">${actionButton('‹','week-prev','aria-label="Semana anterior"','ghost small')}${actionButton('›','week-next','aria-label="Próxima semana"','ghost small')}</div></div><div class="week-days">${days.map(d=>`<button type="button" class="day-chip ${selectedWeekDay===d?'selected':''}" data-action="week-day" data-date="${d}" aria-label="${escapeHTML(dateLabel(d))}" aria-pressed="${selectedWeekDay===d}"><small>${WEEKDAYS[dateFrom(d).getDay()].slice(0,3)}</small><strong>${dateFrom(d).getDate()}</strong></button>`).join('')}</div></div>
      <section class="card"><h2>${escapeHTML(cap(dateLabel(selectedWeekDay)))}</h2><p>${items.filter(i=>taskStatus(i)==='done').length} de ${items.length} ações registradas nesse dia.</p></section>
      ${taskGroup('Missões do dia selecionado',items,'Nenhuma tarefa prevista para esta data. Você pode descansar ou adicionar uma tarefa avulsa.')}
      <section class="card flat"><h2>Visão da semana</h2><div class="week-summary">${days.map(d=>`<div class="list-row"><span>${escapeHTML(cap(dateLabel(d,{weekday:'long',day:'numeric'})))}</span><span class="small muted">${occurrences(d).filter(i=>i.task.frequency!=='daily').map(i=>escapeHTML(i.task.title)).join(' · ')||'Sem tarefa semanal'}</span></div>`).join('')}</div></section></div>`;
  }
  function renderMonth(){const cursor=dateFrom(monthCursor),year=cursor.getFullYear(),month=cursor.getMonth();const name=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(cursor);
    return `<div class="view"><section class="card flat"><div class="row wrap"><div><h2>${cap(name)}</h2><p>Uma missão mensal principal por semana. Edite o foco e as etapas quando precisar; a mudança vale para os próximos meses.</p></div><div class="action-strip">${actionButton('‹ Anterior','month-prev','','ghost small')}${actionButton('Próximo ›','month-next','','ghost small')}</div></div></section>
      <div class="month-stack">${[1,2,3,4].map(w=>{const tasks=state.tasks.filter(t=>t.frequency==='monthly'&&Number(t.monthWeek)===w);const daysInMonth=new Date(year,month+1,0).getDate();const from=new Date(year,month,(w-1)*7+1),until=new Date(year,month,w===4?daysInMonth:w*7);const start=dateISO(from),end=dateISO(until);
        return `<section class="month-card"><div class="row wrap month-card-head"><span class="pill">Semana ${w}</span><span class="small muted">${shortDate(start)}–${shortDate(end)}</span></div>${tasks.length?tasks.map(t=>{const due=new Date(year,month,(w-1)*7+1);while(due.getDay()!==Number(t.weekday))due.setDate(due.getDate()+1);const iso=dateISO(due),item={task:t,key:completionKey(t,iso),date:iso},scheduled=state.reschedules[item.key]||iso;return `<article class="month-entry"><p class="month-category">${escapeHTML(t.category)}</p><h3>${escapeHTML(t.title)}</h3><p class="small muted">Versão mínima: ${escapeHTML(t.versions?.low?.description||'Versão mínima a definir.')}</p><p class="small">Prevista para ${escapeHTML(dateLabel(scheduled,{weekday:'long',day:'numeric'}))} · ${STATUS[taskStatus(item)]}</p><details class="task-details"><summary>Ver todas as informações</summary><p><strong>Energia normal:</strong> ${escapeHTML(t.versions?.normal?.description||'A definir.')} · ${integer(t.versions?.normal?.minutes,5)} min</p><p><strong>Energia alta:</strong> ${escapeHTML(t.versions?.high?.description||'A definir.')} · ${integer(t.versions?.high?.minutes,5)} min</p><p><strong>Primeiro passo:</strong> ${escapeHTML(t.firstStep)}</p><p><strong>Gatilho:</strong> ${escapeHTML(t.trigger)}</p><p><strong>Concluída quando:</strong> ${escapeHTML(t.criterion)}</p></details><div class="task-controls">${actionButton('Editar semana','month-edit',`data-id="${escapeHTML(t.id)}" data-week="${w}"`)}${actionButton('Ver na Semana','month-to-week',`data-date="${scheduled}"`,'ghost small')}${actionButton('Excluir','task-delete',`data-id="${escapeHTML(t.id)}"`,'danger-outline small')}</div></article>`;}).join(''):`<div class="empty"><p>Nenhuma missão nesta semana. Você pode começar por uma das sugestões.</p>${actionButton('＋ Adicionar nova missão','month-add',`data-week="${w}"`,'add small')}</div>`}</section>`;}).join('')}</div><div class="callout"><strong>Flexível por definição</strong><p>As versões mínimas contam. Missões não concluídas não passam automaticamente para o próximo mês.</p></div></div>`;
  }
  function foodChips(kind){const items=state.foods[kind]||[];return items.length?`<div class="chip-list">${items.map((name,i)=>`<span class="edit-chip">${escapeHTML(name)}<button type="button" data-action="food-remove" data-kind="${kind}" data-index="${i}" aria-label="Excluir ${escapeHTML(name)}">Excluir</button></span>`).join('')}</div>`:`<div class="empty"><p>${kind==='safe'?'Ainda não há alimentos seguros. Adicione uma opção familiar.':'Nenhum alimento evitado cadastrado.'}</p></div>`;}
  function renderFood(){const slots=mealSlots(),log=state.mealLog[activeDayISO()]||{},foods=state.foods;
    const mealCard=m=>`<article class="meal-option"><div class="row wrap"><h3>${escapeHTML(m.name)}</h3><span class="pill ${m.energy==='low'?'green':'gray'}">${ENERGY[m.energy]||'Normal'}</span></div><div class="component-list">${(m.parts||[]).map(p=>`<span class="component">${escapeHTML(p)}</span>`).join('')}</div><p class="small">${m.favorite?'★ Favorita · ':''}${m.emergency?'Alternativa rápida · ':''}${integer(m.portions,0)} ${Number(m.portions)===1?'porção pronta':'porções prontas'}</p><div class="task-controls">${actionButton(m.favorite?'★ Favorita':'☆ Favoritar','meal-fav',`data-id="${escapeHTML(m.id)}"`,'ghost small')}${actionButton('Editar','meal-edit',`data-id="${escapeHTML(m.id)}"`)}${actionButton('Excluir','meal-delete',`data-id="${escapeHTML(m.id)}"`,'danger-outline small')}${actionButton('−','portion-down',`data-id="${escapeHTML(m.id)}" aria-label="Diminuir porções de ${escapeHTML(m.name)}"`,'subtle small')}${actionButton('＋ Porção','portion-up',`data-id="${escapeHTML(m.id)}"`,'add small')}</div></article>`;
    return `<div class="view"><div class="grid two"><section class="card"><div class="section-heading"><h2>Oportunidades de alimentação</h2><span class="pill">${slots.length} horários</span></div><p>Você pode comer fora desses horários. Eles são apenas lembretes flexíveis.</p><form id="schedule-form" class="form-grid"><div class="field"><label for="wake">Acordar</label>${time24Field('wake','wake',state.settings.wake)}</div><div class="field"><label for="sleep">Dormir</label>${time24Field('sleep','sleep',state.settings.sleep)}</div><div class="field"><label for="meal-count">Quantidade de oportunidades</label><input id="meal-count" name="mealCount" type="number" min="1" max="10" value="${integer(state.settings.mealCount,5)}" required></div><div class="field"><span>Intervalo sugerido</span><p class="note">Aproximadamente 3 horas; cada horário pode ser ajustado.</p></div><div class="field full"><button class="button" type="submit">Salvar horários</button></div></form></section>
      <section class="card"><h2>Ritmo de hoje</h2><p>${Object.keys(log).length} de ${slots.length} oportunidades registradas. Não é uma meta.</p><div class="callout green"><strong>Texturas podem ficar separadas</strong><p>Monte opções com componentes independentes, conforme o que for confortável.</p></div><div class="action-strip">${actionButton('Ver opções rápidas','food-emergency','','ghost small')}${state.settings.notifications?actionButton('Desativar notificações','notification-disable','','subtle small'):actionButton('Ativar notificações','notification-enable','','subtle small')}</div><p class="note">Notificações opcionais funcionam apenas enquanto esta página está aberta, se o navegador permitir.</p></section></div>
      <section><div class="section-heading"><h2>Hoje · horários sugeridos</h2><span class="small muted">${escapeHTML(dateLabel(activeDayISO()))}</span></div><div class="meal-slots">${slots.length?slots.map(slot=>{const entry=log[slot.index],meal=state.meals.find(m=>m.id===entry?.optionId);return `<article class="meal-slot ${entry?'recorded':''}"><div><strong>${slot.time}</strong><p class="small">${entry?`Registrada: ${escapeHTML(meal?.name||entry.label||'Refeição ou lanche')}`:'Escolha o que fizer sentido.'}</p></div><div class="task-controls">${actionButton(entry?'Editar registro':'Registrar','meal-register',`data-slot="${slot.index}"`,entry?'subtle small':'small')}${actionButton('Ajustar hora','slot-edit',`data-slot="${slot.index}"`,'ghost small')}${entry?actionButton('Desmarcar','meal-unmark',`data-slot="${slot.index}"`,'ghost small'):''}</div></article>`;}).join(''):'<div class="empty"><p>Não há oportunidades dentro do período acordado. Ajuste os horários acima.</p></div>'}</div></section>
      <section class="card"><div class="section-heading"><h2>Refeições repetíveis</h2>${actionButton('＋ Adicionar opção','meal-add','','add small')}</div>${state.meals.length?`<div class="meal-option-grid">${[...state.meals].sort((a,b)=>Number(b.favorite)-Number(a.favorite)).map(mealCard).join('')}</div>`:'<div class="empty"><p>Ainda não há refeições salvas. Adicione um alimento seguro ou uma opção de refeição.</p></div>'}</section>
      <div class="grid two"><section class="card"><h2>Alimentos seguros</h2><p>Itens familiares que costumam funcionar para você.</p>${foodChips('safe')}<form class="field-row" data-form="food-add" data-kind="safe" style="margin-top:12px"><div class="field"><label class="sr-only" for="safe-new">Novo alimento seguro</label><input id="safe-new" name="name" placeholder="Ex.: pão" required maxlength="80"></div><button type="submit" class="button add small">＋ Adicionar</button></form></section>
      <section class="card"><h2>Alimentos evitados</h2><p>Sabores, cheiros ou texturas que prefere não usar.</p>${foodChips('avoid')}<form class="field-row" data-form="food-add" data-kind="avoid" style="margin-top:12px"><div class="field"><label class="sr-only" for="avoid-new">Novo alimento evitado</label><input id="avoid-new" name="name" placeholder="Ex.: textura específica" required maxlength="80"></div><button type="submit" class="button add small">＋ Adicionar</button></form></section></div>
      <div class="grid two"><section class="card"><div class="section-heading"><h2>Despensa, geladeira e freezer</h2>${actionButton('＋ Adicionar','inventory-add','','add small')}</div><div class="list-rows">${foods.inventory.length?foods.inventory.map(item=>`<div class="list-row"><div><strong>${escapeHTML(item.name)}</strong><div class="small muted">${escapeHTML(item.place)} · ${integer(item.quantity,0)} ${Number(item.quantity)===1?'unidade/porção':'unidades/porções'}</div></div><div class="task-controls">${actionButton('Editar','inventory-edit',`data-id="${escapeHTML(item.id)}"`)}${actionButton('Excluir','inventory-delete',`data-id="${escapeHTML(item.id)}"`,'danger-outline small')}</div></div>`).join(''):'<div class="empty"><p>Nada registrado. Adicione um item disponível.</p></div>'}</div></section>
      <section class="card"><h2>Lista simples de compras</h2><form data-form="shopping-add" class="field-row" style="margin:12px 0"><div class="field"><label class="sr-only" for="shopping-new">Novo item da lista</label><input id="shopping-new" name="name" required maxlength="100" placeholder="O que precisa comprar?"></div><button type="submit" class="button add small">＋ Adicionar</button></form><div class="list-rows">${foods.shopping.length?foods.shopping.map(s=>`<div class="list-row"><label class="check-label ${s.checked?'checked':''}"><input type="checkbox" data-action="shopping-check" data-id="${escapeHTML(s.id)}" ${s.checked?'checked':''}><span>${escapeHTML(s.name)}</span></label>${actionButton('Excluir','shopping-delete',`data-id="${escapeHTML(s.id)}"`,'danger-outline small')}</div>`).join(''):'<div class="empty"><p>A lista está vazia. Anote itens quando precisar.</p></div>'}</div></section></div>
      <section class="card"><h2>Alternativas rápidas</h2><p>Opções marcadas como emergência; escolha sem ter de montar um cardápio.</p><div class="meal-option-grid">${state.meals.filter(m=>m.emergency).length?state.meals.filter(m=>m.emergency).map(mealCard).join(''):'<div class="empty"><p>Marque uma refeição como alternativa rápida ao editar suas opções.</p></div>'}</div></section></div>`;
  }
  function renderMissionCatalog(){
    const grouped=Object.entries(MISSION_TYPES).map(([type,label])=>{
      const tasks=state.tasks.filter(t=>missionTypeFor(t)===type);
      return `<section class="mission-group" aria-labelledby="group-${type}"><div class="section-heading"><h2 id="group-${type}">${label==='Missão Principal'?'Missões Principais':label==='Missão Diária'?'Missões Diárias':label==='Side Quest'?'Side Quests':'Boss Fights'}</h2><span class="pill gray">${tasks.length}</span></div><div class="mission-grid">${tasks.length?tasks.map(t=>{
        const owner=t.owner==='shared'?'Compartilhado':t.owner==='person2'?state.settings.people[1]:state.settings.people[0];
        const when=t.frequency==='daily'?'Todos os dias':t.frequency==='weekly'?`${WEEKDAYS[Number(t.weekday)]||'Dia a escolher'} · semanal`:t.frequency==='monthly'?`Semana ${integer(t.monthWeek,1,1,4)} · ${WEEKDAYS[Number(t.weekday)]||'dia a escolher'}`:`${escapeHTML(t.dueDate||'Data a escolher')} · avulsa`;
        return `<article class="card mission-entry"><div class="row wrap"><div><p class="small muted">${escapeHTML(t.category)} · ${escapeHTML(PRIORITY[t.priority]||'Recomendada')}</p><h3>${escapeHTML(t.title)}</h3></div></div><p class="small">${escapeHTML(when)} · ${escapeHTML(owner)}</p><p class="small muted">Versão mínima: ${escapeHTML(t.versions?.low?.description||'Etapa a definir.')}</p><div class="task-controls">${actionButton('Editar','task-edit',`data-id="${escapeHTML(t.id)}"`)}${actionButton('Excluir','task-delete',`data-id="${escapeHTML(t.id)}"`,'danger-outline small')}</div></article>`;
      }).join(''):`<div class="empty"><p>Nenhuma ${label.toLowerCase()} cadastrada. Use “Adicionar nova missão” para começar.</p></div>`}</div></section>`;
    }).join('');
    const today=occurrences(activeDayISO()),boss=today.filter(i=>missionTypeFor(i.task)==='boss');
    return `<div class="mission-content"><section class="card flat"><div class="row wrap"><div><h2>Todas as missões</h2><p>Cadastre ou ajuste o tipo, a frequência e as versões por energia de cada tarefa.</p></div>${actionButton('＋ Adicionar nova missão','add-task','','add')}</div></section>${grouped}
      <div class="grid two"><section class="card"><h2>Missões de hoje</h2><p>${Object.entries(MISSION_TYPES).map(([type,label])=>`${label}: ${today.filter(i=>missionTypeFor(i.task)===type).length}`).join(' · ')}</p><p class="note">Em dias de energia alta, sugerimos no máximo um Boss Fight ou duas Side Quests.</p></section>
      <section class="card"><h2>Fases de Boss Fight</h2><p>Divida uma Boss Fight prevista para hoje em até três fases. Cada fase rende XP uma única vez.</p>${boss.length?boss.map(item=>`<div class="list-row boss-row"><div><strong>${escapeHTML(item.task.title)}</strong><div class="task-controls">${[1,2,3].map(n=>{const active=!!state.xpLedger[`boss:${item.key}:${n}`]&&state.xpLedger[`boss:${item.key}:${n}`].active!==false;return actionButton(`Fase ${n} · ${active?'Desmarcar':'Concluir'}`,'boss-phase',`data-key="${escapeHTML(item.key)}" data-date="${item.date}" data-phase="${n}" aria-pressed="${active}"`,active?'subtle small':'small');}).join('')}</div></div></div>`).join(''):'<div class="empty"><p>Nenhuma Boss Fight prevista para hoje. Escolha outro dia na agenda se quiser planejar uma.</p></div>'}</section></div></div>`;
  }
  function renderRewardsTab(){const {xp,milestones,next,level}=rewardProgressFor(state,activeDayISO()),day=currentDay();
    return `<div class="mission-content"><div class="grid two"><section class="card important"><span class="section-label">XP ACUMULADO DAS AÇÕES MARCADAS</span><div class="level-number">${xp.active} <span style="font-size:1.1rem;letter-spacing:0">XP</span></div><p>Hoje: <strong>${xp.today} XP</strong> · Histórico conquistado: <strong>${xp.earned} XP</strong></p><p>Nível ${level} · ${next?`${next.target-xp.active} XP ativos até o próximo marco.`:'Todos os marcos cadastrados foram alcançados.'}</p><progress max="${next?.target||Math.max(xp.active,1)}" value="${xp.active}" aria-label="${xp.active} pontos de experiência ativos"></progress><p class="note">Ao desmarcar uma ação, marcos e progresso acompanham o XP ativo. O histórico mantém os pontos já ganhos e impede pontuação repetida.</p></section>
      <section class="card"><h2>Continuidade protegida</h2><p>${protectedDays()} ${protectedDays()===1?'dia protegido em sequência':'dias protegidos em sequência'}. ${day.mark?`Hoje: ${escapeHTML(day.mark)}.`:'Hoje ainda não foi marcado.'} Completo, Mínimo, Recuperação e Pausa preservam a sequência.</p><p>Ao voltar depois de uma pausa, a missão <strong>Retorno à Base</strong> aparece em Hoje.</p><p class="note">Descanso cotidiano e lazer não dependem de XP.</p></section></div>
      <section class="card"><div class="section-heading"><h2>Conquistas e recompensas</h2><div class="action-strip">${actionButton('Editar marcos','rewards-edit','','ghost small')}${actionButton('＋ Adicionar marco','milestone-add','','add small')}</div></div><div class="reward-track">${milestones.length?milestones.map(m=>`<div class="reward-card ${xp.active>=m.target?'earned':''}"><div><strong>${integer(m.target,50)} XP · ${xp.active>=m.target?'Cumprido':'Não cumprido'}</strong><p>${escapeHTML(m.reward)}</p></div><span aria-hidden="true">${xp.active>=m.target?'✦':'○'}</span></div>`).join(''):'<div class="empty"><p>Ainda não há marcos. Adicione uma recompensa para acompanhar suas conquistas.</p></div>'}</div></section>
      <section class="card flat"><h2>XP recente</h2><div class="list-rows">${xp.recent.length?xp.recent.map(entry=>`<div class="list-row"><span>${escapeHTML(entry.label)} <span class="muted small">· ${shortDate(entry.date)}</span></span><strong class="pink">+${integer(entry.amount,0)}</strong></div>`).join(''):'<div class="empty"><p>Ações com XP marcadas aparecerão aqui. Registros desmarcados deixam esta lista.</p></div>'}</div></section></div>`;
  }
  function renderMissions(){const missions=missionTab==='missions';
    return `<div class="view"><div class="mission-tabs" role="tablist" aria-label="Missões e recompensas"><button type="button" id="mission-tab-missions" role="tab" data-action="mission-tab" data-tab="missions" aria-controls="mission-panel-missions" aria-selected="${missions}" tabindex="${missions?0:-1}">Missões</button><button type="button" id="mission-tab-rewards" role="tab" data-action="mission-tab" data-tab="rewards" aria-controls="mission-panel-rewards" aria-selected="${!missions}" tabindex="${missions?-1:0}">Recompensas</button></div><section id="mission-panel-missions" role="tabpanel" aria-labelledby="mission-tab-missions" ${missions?'':'hidden'}>${missions?renderMissionCatalog():''}</section><section id="mission-panel-rewards" role="tabpanel" aria-labelledby="mission-tab-rewards" ${missions?'hidden':''}>${missions?'':renderRewardsTab()}</section></div>`;
  }
  function renderSettings(){const s=state.settings,x=s.xp;
    const xpFields=[['energy','Avaliar energia'],['meal','Refeição por oportunidade'],['mealCap','Limite de alimentação no dia'],['hygiene','Higiene mínima'],['dishes','Louça'],['hazard','Risco ou passagem'],['objects','Cinco objetos'],['weeklyStart','Início semanal'],['block','Bloco adicional'],['blockCap','Limite de blocos por tarefa'],['bossPhase','Fase de Boss Fight'],['difficultStart','Início difícil'],['minimum','Bônus da versão mínima']];
    return `<div class="view settings-stack"><form id="settings-form" class="settings-stack"><section class="card settings-section"><h2>Pessoas e ritmo</h2><div class="form-grid"><div class="field"><label for="person1">Nome da pessoa 1</label><input id="person1" name="person1" maxlength="50" value="${escapeHTML(s.people[0])}" required></div><div class="field"><label for="person2">Nome da pessoa 2</label><input id="person2" name="person2" maxlength="50" value="${escapeHTML(s.people[1])}" required></div><div class="field"><label for="setting-wake">Acordar</label>${time24Field('setting-wake','wake',s.wake)}</div><div class="field"><label for="setting-sleep">Dormir</label>${time24Field('setting-sleep','sleep',s.sleep)}</div><div class="field"><label for="setting-count">Oportunidades de alimentação</label><input id="setting-count" name="mealCount" type="number" min="1" max="10" value="${integer(s.mealCount,5)}" required></div><div class="field"><label for="setting-block">Duração sugerida de bloco (min)</label><input id="setting-block" name="blockMinutes" type="number" min="5" max="60" value="${integer(s.blockMinutes,15)}" required></div></div></section>
      <section class="card settings-section"><h2>Distribuição das tarefas semanais</h2><p class="note">Também é possível editar o responsável e o dia diretamente em cada tarefa.</p><div class="form-grid">${state.tasks.filter(t=>t.frequency==='weekly').map(t=>`<div class="field"><label for="weekday-${escapeHTML(t.id)}">${escapeHTML(t.title)}</label><select id="weekday-${escapeHTML(t.id)}" name="weekday:${escapeHTML(t.id)}">${WEEKDAYS.map((day,i)=>`<option value="${i}" ${Number(t.weekday)===i?'selected':''}>${day}</option>`).join('')}</select></div>`).join('')}</div></section>
      <section class="card settings-section"><h2>Pontuação editável</h2><div class="form-grid">${xpFields.map(([key,label])=>`<div class="field"><label for="xp-${key}">${label}</label><input id="xp-${key}" name="xp:${key}" type="number" min="0" max="1000" value="${integer(x[key],0)}"></div>`).join('')}</div><p class="note">Mudar pontos vale para ações futuras. O XP já ganho permanece.</p>${actionButton('Editar recompensas','rewards-edit','','ghost small')}</section>
      <section class="card settings-section"><h2>Preferências sensoriais</h2><label class="check-label"><input name="reduceMotion" type="checkbox" ${s.reduceMotion?'checked':''}><span>Reduzir animações</span></label><label class="check-label"><input name="hideExtras" type="checkbox" ${s.hideExtras?'checked':''}><span>Ocultar detalhes visuais supérfluos</span></label><p class="note">Sua preferência também é combinada com a configuração de movimento reduzido do sistema.</p><div class="divider"></div><h3>Alimentação e emergência</h3><p class="note">Edite alimentos seguros, evitados e opções rápidas na área Alimentação.</p>${actionButton('Abrir Alimentação','navigate','data-view="alimentacao"','ghost small')}</section>
      <div><button type="submit" class="button">Salvar configurações</button></div></form>
      <section class="card"><h2>Dados e backup</h2><p>Os dados ficam neste navegador. Um backup JSON permite guardá-los fora dele ou mover para outro dispositivo.</p><div class="action-strip">${actionButton('Exportar JSON','export','','ghost')}${actionButton('Importar JSON','import-open','','ghost')}</div><input id="import-file" type="file" accept=".json,application/json" hidden><p class="note" style="margin-top:12px">A importação substitui os dados atuais após sua confirmação.</p></section></div>`;
  }
  function taskForm(existing,month=null){const fixedWeek=Number.isInteger(month),suggestions=fixedWeek?seedState().tasks.filter(t=>t.frequency==='monthly'):[];
    const t=existing||(fixedWeek?suggestions.find(s=>s.monthWeek===month):null)||task(uid(),'','','recommended','daily',['',5],['',15],['',25],{dueDate:activeDayISO()});
    const visible=frequencyFieldsFor(t.frequency,fixedWeek);
    return `<form id="task-form" data-id="${existing?escapeHTML(t.id):''}" data-month-week="${fixedWeek?month:''}"><div class="row"><h2>${fixedWeek?`${existing?'Editar':'Adicionar'} missão · Semana ${month}`:existing?'Editar missão':'Adicionar nova missão'}</h2>${actionButton('Fechar','close-dialog','','ghost small')}</div>${fixedWeek?`<p>Personalize a categoria e cada versão. Esta missão se repete na semana ${month} de cada mês; registros e XP já conquistados permanecem.</p><div class="field month-suggestions"><label for="month-suggestion">Sugestões iniciais</label><select id="month-suggestion" data-action="month-suggestion"><option value="">Selecione para preencher os campos</option>${suggestions.map(s=>`<option value="${escapeHTML(s.id)}">${escapeHTML(s.title)}</option>`).join('')}</select><small>Selecionar uma sugestão substitui os campos deste formulário. Você pode ajustá-los antes de salvar.</small></div>`:''}<div class="form-grid">
      <div class="field full"><label for="task-title">Nome</label><input id="task-title" name="title" maxlength="100" required value="${escapeHTML(t.title)}"></div>
      <div class="field"><label for="task-category">${fixedWeek?'Categoria da semana':'Categoria'}</label><input id="task-category" name="category" maxlength="50" required value="${escapeHTML(t.category)}" placeholder="Ex.: Cozinha"></div>
      <div class="field"><label for="task-priority">Prioridade</label><select id="task-priority" name="priority">${Object.entries(PRIORITY).map(([key,value])=>`<option value="${key}" ${t.priority===key?'selected':''}>${value}</option>`).join('')}</select></div>
      <div class="field full mission-type-field"><label for="task-mission-type">Tipo de missão</label><div class="mission-type-control"><select id="task-mission-type" name="missionType">${Object.entries(MISSION_TYPES).map(([key,label])=>`<option value="${key}" ${missionTypeFor(t)===key?'selected':''}>${label}</option>`).join('')}</select><details class="mission-type-help"><summary aria-label="Ajuda sobre os tipos de missão" title="Como escolher o tipo de missão?">?</summary><div class="mission-type-explanation"><strong>Como escolher?</strong><ul>${Object.entries(MISSION_TYPES).map(([key,label])=>`<li><strong>${label}:</strong> ${MISSION_HELP[key]}</li>`).join('')}</ul><p>O tipo organiza as missões. Frequência e prioridade são configuradas separadamente.</p></div></details></div></div>
      <div class="field"><label for="task-owner">Responsável</label><select id="task-owner" name="owner"><option value="shared" ${t.owner==='shared'?'selected':''}>Compartilhado</option><option value="person1" ${t.owner==='person1'?'selected':''}>${escapeHTML(state.settings.people[0])}</option><option value="person2" ${t.owner==='person2'?'selected':''}>${escapeHTML(state.settings.people[1])}</option></select></div>
      ${fixedWeek?'<input type="hidden" name="frequency" value="monthly">':`<div class="field"><label for="task-frequency">Frequência</label><select id="task-frequency" name="frequency" data-action="task-frequency"><option value="daily" ${t.frequency==='daily'?'selected':''}>Diária</option><option value="weekly" ${t.frequency==='weekly'?'selected':''}>Semanal</option><option value="monthly" ${t.frequency==='monthly'?'selected':''}>Mensal</option><option value="once" ${t.frequency==='once'?'selected':''}>Avulsa</option></select></div>`}
      <div class="field frequency-field" data-frequency-field="weekday" ${visible.weekday?'':'hidden'}><label for="task-weekday">Dia da semana</label><select id="task-weekday" name="weekday" ${visible.weekday?'':'disabled'}>${WEEKDAYS.map((day,i)=>`<option value="${i}" ${Number(t.weekday)===i?'selected':''}>${day}</option>`).join('')}</select></div>
      ${fixedWeek?`<input type="hidden" name="monthWeek" value="${month}">`:`<div class="field frequency-field" data-frequency-field="monthWeek" ${visible.monthWeek?'':'hidden'}><label for="task-month-week">Semana do mês</label><select id="task-month-week" name="monthWeek" ${visible.monthWeek?'':'disabled'}>${[1,2,3,4].map(i=>`<option value="${i}" ${Number(t.monthWeek)===i?'selected':''}>Semana ${i}</option>`).join('')}</select></div><div class="field frequency-field date-field" data-frequency-field="dueDate" ${visible.dueDate?'':'hidden'}><label for="task-due">Data</label>${dateField('task-due','dueDate',t.dueDate||activeDayISO(),'data da missão',visible.dueDate)}</div>`}
      ${Object.entries(ENERGY).map(([key,label])=>`<fieldset class="field-group field full"><legend>Energia ${label.toLowerCase()}</legend><div class="field-row"><div class="field"><label for="task-${key}">Versão</label><input id="task-${key}" name="${key}Text" required maxlength="250" value="${escapeHTML(t.versions?.[key]?.description)}"></div><div class="field" style="flex:0 1 110px"><label for="task-${key}-min">Minutos</label><input id="task-${key}-min" type="number" name="${key}Minutes" min="0" max="480" value="${integer(t.versions?.[key]?.minutes,5)}"></div></div></fieldset>`).join('')}
      <div class="field full"><label for="task-first">Pequeno primeiro passo</label><input id="task-first" name="firstStep" required maxlength="200" value="${escapeHTML(t.firstStep)}"></div>
      <div class="field full"><label for="task-trigger">Gatilho para começar</label><input id="task-trigger" name="trigger" required maxlength="200" value="${escapeHTML(t.trigger)}"></div>
      <div class="field full"><label for="task-criterion">Critério objetivo de conclusão</label><input id="task-criterion" name="criterion" required maxlength="200" value="${escapeHTML(t.criterion)}"></div>
      <div class="field"><label for="task-xp">XP por concluir</label><select id="task-xp" name="xpType"><option value="" ${!t.xpType?'selected':''}>Sem XP por conclusão</option>${[['energy','Avaliar energia'],['hygiene','Higiene'],['dishes','Louça'],['hazard','Risco ou passagem'],['objects','Cinco objetos']].map(([key,label])=>`<option value="${key}" ${t.xpType===key?'selected':''}>${label}</option>`).join('')}</select></div>
      <div class="field"><label class="check-label" for="task-hard"><input id="task-hard" name="hard" type="checkbox" ${t.hard?'checked':''}><span>Início particularmente difícil (+XP)</span></label></div>
      </div><p id="task-error" class="red-text" role="alert" hidden></p><div class="dialog-actions"><button type="button" class="button subtle" data-action="close-dialog">Cancelar</button><button type="submit" class="button ${existing?'':'add'}">${existing?'Salvar missão':'＋ Adicionar nova missão'}</button></div></form>`;
  }
  function assessmentForm(){const answers=currentDay().energy?.answers||{};
    const questions=[['body','Como está o corpo?',['Preciso fazer só o mínimo','Tenho alguma energia','Tenho bastante energia']],['focus','Como está a concentração?',['Muito difícil focar','Consigo focar um pouco','Consigo focar bem']],['sensory','Como está a tolerância a sons, cheiros, texturas e demandas sensoriais?',['Muito baixa','Moderada','Boa']]];
    return `<form id="energy-form"><div class="row"><h2>Avaliar energia</h2>${actionButton('Fechar','close-dialog','','ghost small')}</div><p>Cada resposta vale 0, 1 ou 2 pontos. Você pode ajustar o resultado depois.</p>${questions.map(([key,label,options])=>`<fieldset class="field-group"><legend>${label}</legend>${options.map((text,i)=>`<label class="check-label" style="margin:8px 0"><input type="radio" name="${key}" value="${i}" ${Number(answers[key])===i?'checked':''} required><span>${text}</span></label>`).join('')}</fieldset>`).join('')}<div class="dialog-actions"><button type="button" class="button subtle" data-action="close-dialog">Cancelar</button><button type="submit" class="button">Ver resultado e salvar</button></div></form>`;
  }
  function mealForm(existing){const m=existing||{name:'',parts:[],energy:'low',favorite:false,emergency:false,portions:0};return `<form id="meal-form" data-id="${existing?escapeHTML(m.id):''}"><div class="row"><h2>${existing?'Editar opção':'Adicionar refeição'}</h2>${actionButton('Fechar','close-dialog','','ghost small')}</div><div class="form-grid"><div class="field full"><label for="meal-name">Nome da refeição ou lanche</label><input id="meal-name" name="name" maxlength="100" required value="${escapeHTML(m.name)}"></div><div class="field full"><label for="meal-parts">Componentes separados, um por linha</label><textarea id="meal-parts" name="parts" required placeholder="Ex.: arroz&#10;ovo separado">${escapeHTML((m.parts||[]).join('\n'))}</textarea><small>Não é preciso misturar texturas.</small></div><div class="field"><label for="meal-energy">Melhor para energia</label><select id="meal-energy" name="energy">${Object.entries(ENERGY).map(([key,label])=>`<option value="${key}" ${m.energy===key?'selected':''}>${label}</option>`).join('')}</select></div><div class="field"><label for="meal-portions">Porções já preparadas</label><input id="meal-portions" name="portions" type="number" min="0" max="999" value="${integer(m.portions,0)}"></div><label class="check-label"><input name="favorite" type="checkbox" ${m.favorite?'checked':''}><span>Opção favorita e repetível</span></label><label class="check-label"><input name="emergency" type="checkbox" ${m.emergency?'checked':''}><span>Alternativa rápida de emergência</span></label></div><div class="dialog-actions"><button type="button" class="button subtle" data-action="close-dialog">Cancelar</button><button class="button add" type="submit">${existing?'Salvar opção':'＋ Adicionar opção'}</button></div></form>`;}
  function inventoryForm(existing){const item=existing||{name:'',place:'Despensa',quantity:1};return `<form id="inventory-form" data-id="${existing?escapeHTML(item.id):''}"><div class="row"><h2>${existing?'Editar item':'Adicionar item disponível'}</h2>${actionButton('Fechar','close-dialog','','ghost small')}</div><div class="form-grid"><div class="field full"><label for="inventory-name">Nome</label><input id="inventory-name" name="name" required maxlength="100" value="${escapeHTML(item.name)}"></div><div class="field"><label for="inventory-place">Local</label><select id="inventory-place" name="place">${['Despensa','Geladeira','Freezer'].map(p=>`<option ${item.place===p?'selected':''}>${p}</option>`).join('')}</select></div><div class="field"><label for="inventory-quantity">Unidades ou porções</label><input id="inventory-quantity" name="quantity" type="number" min="0" max="9999" value="${integer(item.quantity,1)}"></div></div><div class="dialog-actions"><button type="button" class="button subtle" data-action="close-dialog">Cancelar</button><button class="button add" type="submit">Salvar item</button></div></form>`;}
  function registerMealForm(slot){const entry=(state.mealLog[activeDayISO()]||{})[slot];const choices=state.meals.map(m=>`<option value="${escapeHTML(m.id)}" ${entry?.optionId===m.id?'selected':''}>${escapeHTML(m.name)}</option>`).join('');
    return `<form id="register-meal-form" data-slot="${slot}"><div class="row"><h2>Registrar alimentação</h2>${actionButton('Fechar','close-dialog','','ghost small')}</div><p>Horário sugerido: ${mealSlots().find(s=>s.index===slot)?.time||'flexível'}. Registre o que foi possível, mesmo fora do horário.</p><div class="field"><label for="register-option">Opção usada</label><select id="register-option" name="optionId"><option value="">Outra refeição ou lanche</option>${choices}</select></div><div class="field" style="margin-top:12px"><label for="register-label">Se escolheu outra opção, descreva brevemente (opcional)</label><input id="register-label" name="label" maxlength="100" value="${escapeHTML(entry?.label||'')}"></div><div class="dialog-actions"><button type="button" class="button subtle" data-action="close-dialog">Cancelar</button><button class="button" type="submit">Salvar registro</button></div></form>`;
  }
  function milestoneField(m){const fieldId=uid();return `<fieldset class="field-group milestone-row" data-milestone-row><legend>Marco de XP</legend><input type="hidden" name="milestoneId" value="${escapeHTML(m.id)}"><div class="form-grid"><div class="field"><label for="target-${fieldId}">XP necessário</label><input id="target-${fieldId}" name="milestoneTarget" type="number" min="1" max="999999" value="${m.target===''?'':integer(m.target,50)}" required></div><div class="field"><label for="reward-${fieldId}">Recompensa</label><input id="reward-${fieldId}" name="milestoneReward" maxlength="200" value="${escapeHTML(m.reward)}" required></div></div>${actionButton('Excluir marco','milestone-remove','','danger-outline small')}</fieldset>`;}
  function rewardsForm(addBlank=false){const rows=addBlank?[...state.settings.milestones,{id:uid(),target:'',reward:''}]:state.settings.milestones;
    return `<form id="rewards-form"><div class="row"><h2>Marcos e recompensas</h2>${actionButton('Fechar','close-dialog','','ghost small')}</div><p>Você pode editar, excluir e adicionar quantos marcos quiser. Descanso e lazer não dependem de XP.</p><div id="reward-fields" class="settings-stack">${rows.map(milestoneField).join('')}</div><div class="action-strip" style="margin-top:15px">${actionButton('＋ Adicionar marco','milestone-add','','add small')}</div><p id="reward-error" class="red-text" role="alert" hidden></p><div class="dialog-actions"><button type="button" class="button subtle" data-action="close-dialog">Cancelar</button><button class="button" type="submit">Salvar marcos</button></div></form>`;
  }
  function setEnergy(level,answers=null){setEnergyIn(state,activeDayISO(),level,answers);save();render();toast(`Energia ${ENERGY[level].toLowerCase()} registrada. As versões das tarefas foram atualizadas.`);}
  function getItem(key,date){const task=state.tasks.find(t=>key.startsWith(`${t.id}|`));return task?{task,key,date:date||activeDayISO()}:null;}
  function startTask(item){const t=item.task,key=item.key,record=state.taskLog[key]||{};if(record.status==='started'){record.status='paused';}else{record.status='started';record.startedAt ||=new Date().toISOString();if(t.hard)grant(`hard-start:${key}`,state.settings.xp.difficultStart,`Começar ${t.title}`,item.date);}
    state.taskLog[key]={...record,date:item.date};save();render();}
  function completeTask(item){completeTaskIn(state,item,energyFor(item.date));save();render();toast('Etapa registrada. Você pode parar por aqui.');}
  function reopenTask(item){state.taskLog[item.key]={...(state.taskLog[item.key]||{}),status:'pending',date:item.date};save();render();toast('Tarefa reaberta. O XP ativo foi atualizado; o histórico foi preservado.');}
  function focusNextStep(key,index,completed){
    const steps=$$('#main .next-steps .next-step');
    const row=completed?steps[Math.min(index,steps.length-1)]:steps.find(step=>step.dataset.stepKey===key);
    const target=row?.querySelector('button[data-action]')||$('#next-steps-title');
    if(target){if(target.tagName==='H2')target.tabIndex=-1;target.focus({preventScroll:true});}
  }
  function addBlock(item){if(!recordBlockIn(state,item)){toast('O limite de blocos com XP desta tarefa já foi atingido.');return;}
    save();render();toast('Bloco registrado. Pausar agora também é uma opção.');}
  function formatSeconds(seconds){const n=Math.max(0,Math.ceil(seconds));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
  function timerRemaining(){return state.timer?timerRemainingFor(state.timer,Date.now()):0;}
  function updateTimerDisplay(){const t=state.timer;if(!t||t.date!==activeDayISO())return;
    const previousStep=t.currentStep,finished=tickTimer(t,Date.now()),remaining=timerRemaining();
    if(finished){save();render();toast('Protocolo encerrado. Você pode parar por aqui.');return;}
    if(t.currentStep>previousStep){save();const list=$$('#timer-steps li');list.forEach((li,i)=>li.className=i<t.currentStep?'passed':i===t.currentStep?'current':'');}
    const clock=$('#timer-clock');if(clock){clock.textContent=formatSeconds(remaining);clock.setAttribute('aria-label',`${formatSeconds(remaining)} restantes`);}
  }
  function recordMeal(slot,optionId,label,animateCard=false){recordMealIn(state,slot,optionId,label,activeDayISO(),new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}));const completed=nextMealStateFor(state,activeDayISO()).status==='complete';save();closeDialog();
    const message=completed?'Todas as refeições de hoje foram registradas.':'Refeição ou lanche registrado.';
    const card=animateCard&&viewName()==='hoje'?$('#main .next-meal-card'):null;
    const motionAllowed=!state.settings.reduceMotion&&!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if(card&&motionAllowed){card.classList.add('meal-leaving');card.setAttribute('aria-busy','true');$$('button',card).forEach(button=>button.disabled=true);
      setTimeout(()=>{render();if(viewName()==='hoje'){const next=$('#main .next-meal-card');next?.classList.add('meal-entering');const target=next?.querySelector('[data-action="meal-quick-register"]')||next?.querySelector('h2');if(target){if(target.tagName==='H2')target.tabIndex=-1;target.focus({preventScroll:true});}}toast(message);},170);return;}
    render();toast(message);
  }
  function applyMonthlySuggestion(select){const form=select.closest('#task-form'),suggestion=seedState().tasks.find(t=>t.id===select.value&&t.frequency==='monthly');if(!form||!suggestion)return;
    for(const name of ['title','category','priority','owner','weekday','firstStep','trigger','criterion','xpType','missionType'])form.elements.namedItem(name).value=suggestion[name]??'';
    for(const level of Object.keys(ENERGY)){form.elements.namedItem(`${level}Text`).value=suggestion.versions[level].description;form.elements.namedItem(`${level}Minutes`).value=suggestion.versions[level].minutes;}
    form.elements.namedItem('hard').checked=!!suggestion.hard;
  }
  async function deleteTask(id){const index=state.tasks.findIndex(t=>t.id===id);if(index<0)return;const t=state.tasks[index];if(!await confirmAction('Excluir tarefa',`Excluir “${t.title}”? O histórico de XP permanece, e você pode desfazer logo depois.`,'Excluir'))return;
    state.tasks.splice(index,1);save();render();undoAction=()=>{state.tasks.splice(index,0,t);save();render();toast('Tarefa restaurada.');};toast('Tarefa excluída.',true);}
  async function deleteMeal(id){const index=state.meals.findIndex(m=>m.id===id);if(index<0)return;const m=state.meals[index];if(!await confirmAction('Excluir opção',`Excluir “${m.name}” das refeições salvas?`,'Excluir'))return;state.meals.splice(index,1);save();render();undoAction=()=>{state.meals.splice(index,0,m);save();render();toast('Opção restaurada.');};toast('Opção excluída.',true);}
  async function deleteInventory(id){const index=state.foods.inventory.findIndex(i=>i.id===id);if(index<0)return;const removed=state.foods.inventory.splice(index,1)[0];save();render();undoAction=()=>{state.foods.inventory.splice(index,0,removed);save();render();toast('Item restaurado.');};toast('Item excluído.',true);}
  async function handleClick(e){$$('.calendar-popover:not([hidden])',$('#form-dialog')).forEach(pop=>{if(!pop.closest('.date-widget').contains(e.target))closeCalendar(pop);});
    const b=e.target.closest('[data-action]');if(!b||b.matches('input'))return;const act=b.dataset.action,id=b.dataset.id,key=b.dataset.key,date=b.dataset.date;let item=key?getItem(key,date):null;
    const quickRow=b.closest('.next-steps .next-step'),quickIndex=quickRow?Array.from(quickRow.parentElement.children).indexOf(quickRow):-1;
    switch(act){
      case 'calendar-toggle':{const widget=b.closest('.date-widget'),pop=$('.calendar-popover',widget),wasOpen=!pop.hidden;
        if(wasOpen){closeCalendar(pop,true);break;}
        pop.dataset.cursor=`${(parseDisplayDate($('.date-input',widget).value)||todayISO()).slice(0,7)}-01`;
        pop.hidden=false;renderCalendar(pop);b.setAttribute('aria-expanded','true');$('[data-action="calendar-select"][tabindex="0"]',pop)?.focus();break;}
      case 'calendar-prev':case 'calendar-next':{const pop=b.closest('.calendar-popover'),cursor=dateFrom(pop.dataset.cursor);cursor.setDate(1);cursor.setMonth(cursor.getMonth()+(act==='calendar-prev'?-1:1));pop.dataset.cursor=dateISO(cursor);renderCalendar(pop);$(`[data-action="${act}"]`,pop)?.focus();break;}
      case 'calendar-select':case 'calendar-today':{const pop=b.closest('.calendar-popover'),input=$('.date-input',pop.closest('.date-widget')),chosen=act==='calendar-today'?todayISO():b.dataset.date;
        input.value=displayDate(chosen);closeCalendar(pop);const error=$('[role="alert"]',input.closest('form'));if(error)error.hidden=true;input.focus();break;}
      case 'calendar-close':closeCalendar(b.closest('.calendar-popover'),true);break;
      case 'navigate':navigate(b.dataset.view);break;
      case 'day-prev':case 'day-next':{
        const previous=state.activeDay,next=act==='day-prev'?retreatDayIn(state):advanceDayIn(state);
        if(!save()){state.activeDay=previous;render();break;}
        selectedWeekDay=next;monthCursor=next;render();
        $(`#main [data-action="${act}"]`)?.focus({preventScroll:true});
        toast(`Rotina de ${dateLabel(next)} pronta. Os registros dos outros dias foram preservados.`);
        break;
      }
      case 'mission-tab':{if(!['missions','rewards'].includes(b.dataset.tab))break;missionTab=b.dataset.tab;render();$(`#mission-tab-${missionTab}`)?.focus();break;}
      case 'about-open':openAbout();break;
      case 'about-close':$('#about-dialog').close();break;
      case 'about-tab':setAboutTab(b.dataset.tab);break;
      case 'day-help-open':$('#day-help-dialog').showModal();$('#day-help-close').focus();break;
      case 'day-help-close':$('#day-help-dialog').close();break;
      case 'mobile-more':{const menu=$('#mobile-menu');menu.hidden=!menu.hidden;b.setAttribute('aria-expanded',String(!menu.hidden));break;}
      case 'add-task':openDialog(taskForm());break;
      case 'task-edit':openDialog(taskForm(state.tasks.find(t=>t.id===id)));break;
      case 'task-delete':await deleteTask(id);break;
      case 'task-start':case 'task-pause':if(item){startTask(item);if(quickRow)focusNextStep(item.key,quickIndex,false);}break;
      case 'task-complete':if(item){completeTask(item);if(quickRow)focusNextStep(item.key,quickIndex,true);}break;
      case 'task-reopen':if(item)reopenTask(item);break;
      case 'task-block':if(item)addBlock(item);break;
      case 'task-five':if(item&&recordFiveMinutesIn(state,item)){save();render();toast('Cinco minutos registrados. Você pode parar aqui.');}break;
      case 'task-reschedule':if(item)openDialog(`<form id="reschedule-form" data-key="${escapeHTML(key)}"><h2>Reagendar “${escapeHTML(item.task.title)}”</h2><p>A tarefa aparecerá apenas na data escolhida para esta ocorrência. Sem transferência automática.</p><div class="field"><label for="reschedule-date">Nova data</label>${dateField('reschedule-date','date',state.reschedules[key]||addDays(date||activeDayISO(),1),'nova data')}</div><p id="reschedule-error" class="red-text" role="alert" hidden></p><div class="dialog-actions"><button type="button" class="button subtle" data-action="close-dialog">Cancelar</button><button type="submit" class="button">Salvar data</button></div></form>`);break;
      case 'close-dialog':closeDialog();break;
      case 'energy-assess':openDialog(assessmentForm());break;
      case 'energy-manual':setEnergy(b.dataset.energy);break;
      case 'survival-on':activateSurvivalIn(state,activeDayISO());save();render();break;
      case 'survival-off':{const d=currentDay();d.survival=false;state.days[activeDayISO()]=d;save();render();break;}
      case 'return-complete':{const d=currentDay();d.returnDone=true;state.days[activeDayISO()]=d;save();render();toast('Bem-vindo de volta. Um passo é suficiente.');break;}
      case 'day-mark':{const d=currentDay();d.mark=b.dataset.mark;state.days[activeDayISO()]=d;save();render();toast(`Dia marcado como ${d.mark}. A continuidade está protegida.`);break;}
      case 'week-prev':selectedWeekDay=addDays(selectedWeekDay,-7);render();break;
      case 'week-next':selectedWeekDay=addDays(selectedWeekDay,7);render();break;
      case 'week-day':selectedWeekDay=date;render();break;
      case 'month-prev':case 'month-next':{const d=dateFrom(monthCursor);d.setDate(1);d.setMonth(d.getMonth()+(act==='month-prev'?-1:1));monthCursor=dateISO(d);render();break;}
      case 'month-to-week':selectedWeekDay=date;navigate('semana');break;
      case 'month-edit':{const week=Number(b.dataset.week),monthly=state.tasks.find(t=>t.id===id&&t.frequency==='monthly'&&Number(t.monthWeek)===week);if(monthly)openDialog(taskForm(monthly,week));break;}
      case 'month-add':{const week=Number(b.dataset.week);if(week>=1&&week<=4&&!state.tasks.some(t=>t.frequency==='monthly'&&Number(t.monthWeek)===week))openDialog(taskForm(null,week));break;}
      case 'meal-add':openDialog(mealForm());break;
      case 'meal-edit':openDialog(mealForm(state.meals.find(m=>m.id===id)));break;
      case 'meal-delete':await deleteMeal(id);break;
      case 'meal-fav':{const m=state.meals.find(x=>x.id===id);if(m){m.favorite=!m.favorite;save();render();}break;}
      case 'portion-up':case 'portion-down':{const m=state.meals.find(x=>x.id===id);if(m){m.portions=Math.max(0,integer(m.portions,0)+(act==='portion-up'?1:-1));save();render();}break;}
      case 'meal-register':openDialog(registerMealForm(Number(b.dataset.slot)));break;
      case 'meal-quick-register':{const slot=Number(b.dataset.slot),next=nextMealStateFor(state,activeDayISO());if(next.status==='pending'&&next.slot.index===slot)recordMeal(slot,'','',true);else render();break;}
      case 'meal-unmark':unmarkMealIn(state,Number(b.dataset.slot),activeDayISO());save();render();toast('Registro removido. O XP ativo foi atualizado; o histórico foi preservado.');break;
      case 'slot-edit':{const slot=Number(b.dataset.slot),current=mealSlots().find(s=>s.index===slot);openDialog(`<form id="slot-form" data-slot="${slot}"><h2>${b.dataset.origin==='today'?'Remarcar alimentação':'Ajustar horário'}</h2><p>O ajuste acompanha mudanças posteriores no horário de acordar.</p><div class="field"><label for="slot-time">Novo horário</label>${time24Field('slot-time','time',current?.time||'09:30')}</div><p id="slot-error" class="red-text" role="alert" hidden></p><div class="dialog-actions"><button type="button" class="button subtle" data-action="close-dialog">Cancelar</button><button type="submit" class="button">Salvar horário</button></div></form>`);break;}
      case 'food-emergency':$('#main section:last-child')?.scrollIntoView({behavior:state.settings.reduceMotion?'auto':'smooth'});break;
      case 'food-remove':{const list=state.foods[b.dataset.kind];if(Array.isArray(list)){list.splice(Number(b.dataset.index),1);save();render();}break;}
      case 'inventory-add':openDialog(inventoryForm());break;
      case 'inventory-edit':openDialog(inventoryForm(state.foods.inventory.find(i=>i.id===id)));break;
      case 'inventory-delete':await deleteInventory(id);break;
      case 'shopping-delete':state.foods.shopping=state.foods.shopping.filter(s=>s.id!==id);save();render();break;
      case 'rewards-edit':openDialog(rewardsForm());break;
      case 'milestone-add':{const form=b.closest('#rewards-form');if(form){const fields=$('#reward-fields',form);fields.insertAdjacentHTML('beforeend',milestoneField({id:uid(),target:'',reward:''}));$$('[name="milestoneTarget"]',fields).at(-1)?.focus();}else{openDialog(rewardsForm(true));$$('[name="milestoneTarget"]',$('#rewards-form')).at(-1)?.focus();}break;}
      case 'milestone-remove':{b.closest('[data-milestone-row]')?.remove();$('#rewards-form [data-action="milestone-add"]')?.focus();break;}
      case 'boss-phase':{if(!item||missionTypeFor(item.task)!=='boss')break;const active=toggleBossPhaseIn(state,item,integer(b.dataset.phase,1,1,3));
        save();render();toast(active?'Fase registrada.':'Fase desmarcada. O XP ativo foi atualizado.');break;}
      case 'timer-select':state.timer=createTimer(Number(b.dataset.minutes),activeDayISO());save();render();break;
      case 'timer-start':{const t=state.timer;if(!t)break;startTimer(t,Date.now());save();render();break;}
      case 'timer-pause':{const t=state.timer;if(!t)break;pauseTimer(t,Date.now());save();render();break;}
      case 'timer-next':{const t=state.timer;if(!t)break;t.currentStep=Math.min(protocolSteps(t.minutes).length-1,t.currentStep+1);save();render();break;}
      case 'timer-end':state.timer=null;save();render();toast('Protocolo encerrado. Você pode parar por aqui.');break;
      case 'export':exportJSON();break;
      case 'import-open':$('#import-file')?.click();break;
      case 'notification-enable':await enableNotifications();break;
      case 'notification-disable':state.settings.notifications=false;save();render();toast('Notificações desativadas.');break;
    }
  }
  function handleChange(e){const control=e.target,act=control.dataset.action;if(act==='task-frequency'){syncFrequencyFields(control.closest('#task-form'));}
    else if(act==='month-suggestion'){applyMonthlySuggestion(control);}
    else if(act==='task-check'){
      const item=getItem(control.dataset.key,control.dataset.date);if(!item)return;if(control.checked)completeTask(item);else reopenTask(item);
    }else if(act==='survival-step'){
      const i=Number(control.dataset.step),day=currentDay(),key=activeDayISO();day.survivalSteps ||= {};day.survivalSteps[i]=control.checked;state.days[key]=day;
      if(control.checked){if(i===2){grant(`complete:hygiene|${key}`,state.settings.xp.hygiene,'Higiene mínima',key);state.taskLog[`hygiene|${key}`]={status:'done',date:key,minutes:2};}
        if(i===3){grant(`complete:dishes|${key}`,state.settings.xp.dishes,'Louça para o próximo uso',key);state.taskLog[`dishes|${key}`]={status:'done',date:key,minutes:3};}
        if(i===4){grant(`complete:trash|${key}`,state.settings.xp.hazard,'Resolver risco urgente',key);state.taskLog[`trash|${key}`]={status:'done',date:key,minutes:3};}}
      else if(i>=2){const id=({2:'hygiene',3:'dishes',4:'trash'})[i],taskKey=`${id}|${key}`;if(state.taskLog[taskKey])state.taskLog[taskKey].status='pending';}
      save();render();
    }else if(act==='shopping-check'){const item=state.foods.shopping.find(s=>s.id===control.dataset.id);if(item){item.checked=control.checked;save();render();}}
    else if(control.id==='import-file'&&control.files?.[0])importJSON(control.files[0]);
  }
  function handleSubmit(e){const form=e.target;if(!(form instanceof HTMLFormElement))return;e.preventDefault();
    $$('.time-24',form).forEach(input=>{const valid=time24FromInput(input.value);if(valid)input.value=valid;});
    if(!form.reportValidity())return;const data=new FormData(form),get=key=>String(data.get(key)||'').trim();
    if(form.id==='task-form'){
      const existing=state.tasks.find(t=>t.id===form.dataset.id),frequency=get('frequency'),week=get('monthWeek')?Number(get('monthWeek')):Number(existing?.monthWeek??1);
      const dueDate=frequency==='once'?parseDisplayDate(get('dueDate')):existing?.dueDate||activeDayISO();
      if(!dueDate){const notice=$('#task-error',form);notice.textContent='Escolha uma data válida no formato DD/MM/AAAA.';notice.hidden=false;form.elements.namedItem('dueDate')?.focus();return;}
      const details={title:get('title'),category:get('category'),priority:get('priority'),missionType:get('missionType'),owner:get('owner'),weekday:get('weekday')?Number(get('weekday')):Number(existing?.weekday??1),
        firstStep:get('firstStep'),trigger:get('trigger'),criterion:get('criterion'),xpType:get('xpType'),hard:data.has('hard'),
        versions:Object.fromEntries(Object.keys(ENERGY).map(level=>[level,{description:get(`${level}Text`),minutes:integer(get(`${level}Minutes`),5,0,480)}]))};
      if(form.dataset.monthWeek){try{saveMonthlyWeekIn(state,Number(form.dataset.monthWeek),details,form.dataset.id);}catch(error){const notice=$('#task-error',form);notice.textContent=error.message;notice.hidden=false;return;}}
      else{
        if(frequency==='monthly'&&state.tasks.some(t=>t!==existing&&t.frequency==='monthly'&&Number(t.monthWeek)===week)){
          const notice=$('#task-error',form);notice.textContent='Esta semana já tem uma missão mensal. Edite a missão existente na tela Mês.';notice.hidden=false;return;
        }
        const t=existing||task(uid(),'','','recommended','daily',['',5],['',15],['',25]);
        Object.assign(t,{...details,frequency,monthWeek:week,dueDate});
        if(!existing)state.tasks.push(t);
      }
      save();closeDialog();render();toast(existing?'Missão atualizada.':'Missão adicionada.');
    }else if(form.id==='energy-form'){
      const answers={body:Number(get('body')),focus:Number(get('focus')),sensory:Number(get('sensory'))};
      const level=classifyEnergy(answers);closeDialog();setEnergy(level,answers);
    }else if(form.id==='meal-form'){
      const existing=state.meals.find(m=>m.id===form.dataset.id);const m=existing||{id:uid()};
      Object.assign(m,{name:get('name'),parts:get('parts').split(/\r?\n/).map(p=>p.trim()).filter(Boolean),energy:get('energy'),portions:integer(get('portions'),0,0,999),favorite:data.has('favorite'),emergency:data.has('emergency')});
      if(!existing)state.meals.push(m);save();closeDialog();render();toast(existing?'Opção atualizada.':'Opção de refeição adicionada.');
    }else if(form.id==='inventory-form'){
      const existing=state.foods.inventory.find(i=>i.id===form.dataset.id);const item=existing||{id:uid()};Object.assign(item,{name:get('name'),place:get('place'),quantity:integer(get('quantity'),1,0,9999)});
      if(!existing)state.foods.inventory.push(item);save();closeDialog();render();toast('Item disponível registrado.');
    }else if(form.id==='register-meal-form')recordMeal(Number(form.dataset.slot),get('optionId'),get('label'));
    else if(form.id==='slot-form'){
      try{rescheduleMealIn(state,Number(form.dataset.slot),get('time'));save();closeDialog();render();toast('Horário remarcado.');}
      catch(error){const notice=$('#slot-error',form);notice.textContent=error.message;notice.hidden=false;}
    }else if(form.id==='reschedule-form'){
      const chosen=parseDisplayDate(get('date'));
      if(!chosen){const notice=$('#reschedule-error',form);notice.textContent='Escolha uma data válida no formato DD/MM/AAAA.';notice.hidden=false;form.elements.namedItem('date')?.focus();return;}
      const key=form.dataset.key;state.reschedules[key]=chosen;save();closeDialog();render();toast('Ocorrência reagendada para a data escolhida.');
    }else if(form.id==='rewards-form'){
      const rows=$$('[data-milestone-row]',form).map(row=>({id:$('[name="milestoneId"]',row).value,target:Number($('[name="milestoneTarget"]',row).value),reward:$('[name="milestoneReward"]',row).value.trim()}));
      try{saveMilestonesIn(state,rows);}catch(error){const notice=$('#reward-error',form);notice.textContent=error.message;notice.hidden=false;return;}
      save();closeDialog();render();toast('Marcos e recompensas atualizados.');
    }else if(form.id==='schedule-form'||form.id==='settings-form'){
      state.settings.wake=time24FromInput(get('wake'));state.settings.sleep=time24FromInput(get('sleep'));state.settings.mealCount=integer(get('mealCount'),5,1,10);
      if(form.id==='settings-form'){state.settings.people=[get('person1'),get('person2')];state.settings.blockMinutes=integer(get('blockMinutes'),15,5,60);state.settings.reduceMotion=data.has('reduceMotion');state.settings.hideExtras=data.has('hideExtras');
        for(const [key,value] of data.entries()){if(key.startsWith('weekday:')){const t=state.tasks.find(t=>t.id===key.slice(8));if(t)t.weekday=Number(value);}if(key.startsWith('xp:'))state.settings.xp[key.slice(3)]=integer(value,0,0,1000);}}
      save();render();toast('Configurações salvas. Horários de alimentação atualizados.');
    }else if(form.dataset.form==='food-add'){
      const kind=form.dataset.kind,name=get('name');if(name&&!state.foods[kind].some(s=>s.toLowerCase()===name.toLowerCase()))state.foods[kind].push(name);save();render();toast('Alimento adicionado.');
    }else if(form.dataset.form==='shopping-add'){
      state.foods.shopping.push({id:uid(),name:get('name'),checked:false});save();render();toast('Item adicionado à lista.');
    }
  }
  function exportJSON(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`RoutineOrganizerRPG-backup-${todayISO()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Backup JSON criado. Guarde o arquivo em um local seguro.');}
  async function importJSON(file){let parsed;try{if(file.size>10*1024*1024)throw Error('Arquivo muito grande.');parsed=normalize(JSON.parse(await file.text()));}catch(e){toast(`Não foi possível importar: ${e.message}`);return;}
    const yes=await confirmAction('Substituir dados atuais?',`Importar “${file.name}” substitui tarefas, refeições, XP e configurações deste navegador. Exporte antes um backup se quiser guardar os dados atuais.`,'Substituir e importar');
    if(!yes){const input=$('#import-file');if(input)input.value='';return;}const previous=state;state=parsed;if(!save()){state=previous;render();return;}selectedWeekDay=activeDayISO();monthCursor=activeDayISO();render();toast('Backup importado com sucesso.');}
  async function enableNotifications(){if(!('Notification' in window)){toast('Este navegador não oferece notificações nesta página. O restante funciona normalmente.');return;}
    try{const permission=await Notification.requestPermission();if(permission!=='granted'){toast('Notificações não ativadas. Os horários continuam visíveis na tela.');return;}state.settings.notifications=true;save();toast('Notificações ativadas enquanto esta página estiver aberta.');}
    catch(e){toast('Notificações indisponíveis aqui. Os horários continuam visíveis na tela.');}}
  function checkNotifications(){if(activeDayISO()!==todayISO()||!state.settings.notifications||!('Notification' in window)||Notification.permission!=='granted')return;
    const iso=todayISO(),now=new Date(),current=now.getHours()*60+now.getMinutes(),log=state.mealLog[iso]||{};
    for(const slot of mealSlots()){if(current!==minutesOf(slot.time)||log[slot.index]||state.notificationLog[`${iso}:${slot.index}`])continue;
      try{new Notification('RoutineOrganizerRPG · alimentação',{body:'Uma oportunidade flexível para escolher algo seguro.',tag:`meal-${iso}-${slot.index}`});state.notificationLog[`${iso}:${slot.index}`]=true;save();}catch(e){state.settings.notifications=false;save();}}
  }
  function handleInput(e){const control=e.target;
    if(control.matches('.time-24'))control.value=formatTimeTyping(control.value,e.inputType?.startsWith('delete'));
    else if(control.matches('.date-input')){
      control.value=formatDateTyping(control.value,e.inputType?.startsWith('delete'));
      const pop=$('.calendar-popover',control.closest('.date-widget')),selected=parseDisplayDate(control.value);
      if(pop&&!pop.hidden&&selected){pop.dataset.cursor=`${selected.slice(0,7)}-01`;renderCalendar(pop);}
    }else return;
    const error=$('[role="alert"]',control.closest('form'));if(error)error.hidden=true;
  }
  function handleCalendarKeydown(e){
    const pop=e.target.closest?.('.calendar-popover');
    if(e.key==='Escape'&&pop&&!pop.hidden){e.preventDefault();e.stopPropagation();closeCalendar(pop,true);return;}
    if(!pop||pop.hidden||e.target.dataset.action!=='calendar-select')return;
    const offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];
    if(!offset)return;
    e.preventDefault();const target=addDays(e.target.dataset.date,offset);pop.dataset.cursor=`${target.slice(0,7)}-01`;
    renderCalendar(pop);$(`[data-action="calendar-select"][data-date="${target}"]`,pop)?.focus();
  }
  document.addEventListener('click',handleClick);
  document.addEventListener('change',handleChange);
  document.addEventListener('input',handleInput);
  document.addEventListener('focusout',e=>{if(e.target.matches('.time-24')){const valid=time24FromInput(e.target.value);if(valid)e.target.value=valid;}});
  document.addEventListener('submit',handleSubmit);
  document.addEventListener('keydown',handleCalendarKeydown,true);
  document.addEventListener('keydown',e=>{if(!e.target.matches('[data-action="mission-tab"]')||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();missionTab=e.key==='Home'?'missions':e.key==='End'?'rewards':e.key==='ArrowLeft'?'missions':'rewards';render();$(`#mission-tab-${missionTab}`)?.focus();});
  $('#about-dialog').addEventListener('close',()=>$('#help-trigger').focus());
  $('#day-help-dialog').addEventListener('close',()=>$('#day-mark-help')?.focus());
  window.addEventListener('hashchange',render);
  setInterval(()=>{updateTimerDisplay();checkNotifications();},1000);
  render();
})();
