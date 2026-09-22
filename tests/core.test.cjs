'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../app.js');

const date = '2026-09-21'; // Segunda-feira; torna os testes independentes da data atual.
const sumXP = state => Object.values(state.xpLedger).reduce((total,entry)=>total+entry.amount,0);
const occurrence = (state,day,id) => core.occurrencesFor(state,day).find(item=>item.task.id===id);

test('campos condicionais de frequência e calendários usam datas e horários previsíveis',()=>{
  assert.deepEqual(core.frequencyFieldsFor('daily'),{weekday:false,monthWeek:false,dueDate:false});
  assert.deepEqual(core.frequencyFieldsFor('weekly'),{weekday:true,monthWeek:false,dueDate:false});
  assert.deepEqual(core.frequencyFieldsFor('monthly'),{weekday:false,monthWeek:true,dueDate:false});
  assert.deepEqual(core.frequencyFieldsFor('monthly',true),{weekday:false,monthWeek:false,dueDate:false});
  assert.deepEqual(core.frequencyFieldsFor('once'),{weekday:false,monthWeek:false,dueDate:true});
  assert.equal(core.parseDisplayDate('21/09/2026'),'2026-09-21');
  assert.equal(core.parseDisplayDate('31/02/2026'),null);
  assert.equal(core.displayDate('2026-09-21'),'21/09/2026');
  assert.equal(core.time24FromInput('0905'),'09:05');
  assert.equal(core.time24FromInput('23:59'),'23:59');
  assert.equal(core.time24FromInput('24:00'),null);
  assert.equal(core.time24FromInput('12:60'),null);
  assert.equal(core.formatTimeTyping('0930'),'09:30');
  assert.equal(core.formatDateTyping('21092026'),'21/09/2026');
  const grid=core.calendarGridFor('2026-09-21');
  assert.equal(grid.days.length,30);
  assert.equal(grid.leading,1); // Setembro de 2026 começa numa terça-feira.
});

test('agenda diária, semanal e mensal respeita a data e o reagendamento explícito',()=>{
  const state=core.seedState();
  assert.ok(occurrence(state,date,'energy'));
  assert.ok(occurrence(state,date,'laundry'));
  assert.equal(occurrence(state,'2026-09-22','laundry'),undefined);
  assert.ok(occurrence(state,'2026-09-23','month-supplies'));
  assert.equal(core.occurrencesFor(state,'2026-09-30').filter(item=>item.task.frequency==='monthly').length,0);

  const laundry=occurrence(state,date,'laundry');
  state.reschedules[laundry.key]='2026-09-26';
  assert.equal(occurrence(state,date,'laundry'),undefined);
  assert.equal(occurrence(state,'2026-09-26','laundry').key,laundry.key);
  assert.equal(occurrence(state,'2026-09-28','laundry').key===laundry.key,false); // Outra semana, outra ocorrência.
});

test('editar uma semana mensal altera categoria, etapas e dia sem apagar XP ou conclusão',()=>{
  const state=core.seedState(),item=occurrence(state,'2026-09-23','month-supplies');
  core.completeTaskIn(state,item,'low');
  const points=sumXP(state),before=state.tasks.find(t=>t.id==='month-supplies');
  const updated=core.saveMonthlyWeekIn(state,4,{
    ...before,title:'Revisar armário de limpeza',category:'Organização de produtos',weekday:5,
    firstStep:'Abrir o armário.',trigger:'Sexta de manhã.',criterion:'Uma prateleira revisada.',
    versions:{...before.versions,low:{description:'Revisar somente dois itens.',minutes:4}}
  },before.id);
  assert.equal(updated.id,before.id);
  assert.equal(occurrence(state,'2026-09-23','month-supplies'),undefined);
  const moved=occurrence(state,'2026-09-25','month-supplies');
  assert.equal(moved.key,item.key);
  assert.equal(state.taskLog[moved.key].status,'done');
  assert.equal(sumXP(state),points);
  assert.equal(moved.task.versions.low.description,'Revisar somente dois itens.');
  const restored=core.normalize(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.tasks.find(t=>t.id===updated.id).category,'Organização de produtos');
  assert.equal(occurrence(restored,'2026-09-25','month-supplies').task.title,'Revisar armário de limpeza');
  assert.equal(sumXP(restored),points);
});

test('as quatro sugestões mensais podem ser reaplicadas, inclusive após excluir uma missão',()=>{
  const state=core.seedState(),presets=core.seedState().tasks.filter(t=>t.frequency==='monthly');
  assert.deepEqual(presets.map(t=>t.monthWeek),[1,2,3,4]);
  assert.equal(presets[0].category,'Alimentos e geladeira');
  assert.throws(()=>core.saveMonthlyWeekIn(state,2,presets[1]),/já tem/);
  state.tasks=state.tasks.filter(t=>t.id!=='month-appliance');
  const replacement=core.saveMonthlyWeekIn(state,2,{...presets[1],title:'Manutenção leve',category:'Eletrodomésticos e tomadas'});
  assert.notEqual(replacement.id,presets[1].id);
  assert.equal(replacement.monthWeek,2);
  assert.equal(occurrence(state,'2026-10-14',replacement.id).task.category,'Eletrodomésticos e tomadas');
  assert.throws(()=>core.saveMonthlyWeekIn(state,5,presets[1]),/semana válida/);
});

test('tipos de missão antigos são recuperados no backup e podem ser alterados sem mudar a agenda',()=>{
  const old=core.seedState();
  for(const task of old.tasks)delete task.missionType;
  const state=core.normalize(JSON.parse(JSON.stringify(old)));
  assert.equal(core.missionTypeFor(state.tasks.find(t=>t.id==='hygiene')),'main');
  assert.equal(core.missionTypeFor(state.tasks.find(t=>t.id==='objects')),'daily');
  assert.equal(core.missionTypeFor(state.tasks.find(t=>t.id==='laundry')),'side');
  assert.equal(core.missionTypeFor(state.tasks.find(t=>t.id==='month-supplies')),'boss');
  const item=occurrence(state,'2026-09-23','month-supplies');
  core.saveMonthlyWeekIn(state,4,{...item.task,missionType:'side'},item.task.id);
  assert.equal(core.missionTypeFor(item.task),'side');
  assert.equal(occurrence(state,'2026-09-23','month-supplies').key,item.key);
  assert.equal(core.normalize(JSON.parse(JSON.stringify(state))).tasks.find(t=>t.id==='month-supplies').missionType,'side');
});

test('XP ativo e XP recente reagem a concluir, desmarcar e registrar refeição sem duplicar o histórico',()=>{
  const state=core.seedState(),hygiene=occurrence(state,date,'hygiene');
  core.completeTaskIn(state,hygiene,'normal','2026-09-21T09:00:00.000Z');
  assert.deepEqual([core.xpSummaryFor(state,date).active,core.xpSummaryFor(state,date).today],[10,10]);
  state.taskLog[hygiene.key].status='pending';
  assert.equal(core.xpSummaryFor(state,date).active,0);
  assert.equal(core.xpSummaryFor(state,date).earned,10);
  assert.equal(core.xpSummaryFor(state,date).recent.length,0);
  core.recordMealIn(state,0,'meal1','',date,'09:30');
  assert.equal(core.xpSummaryFor(state,date).today,5);
  core.unmarkMealIn(state,0,date);
  assert.equal(core.xpSummaryFor(state,date).today,0);
  assert.equal(state.taskLog[`food|${date}`].status,'pending');
  core.completeTaskIn(state,hygiene,'normal','2026-09-21T10:00:00.000Z');
  core.recordMealIn(state,0,'meal1','',date,'10:30');
  assert.equal(core.xpSummaryFor(state,date).active,15);
  assert.equal(core.xpSummaryFor(state,date).earned,15);
  assert.equal(core.xpSummaryFor(state,date).recent.length,2);
  assert.equal(state.xpLedger[`complete:${hygiene.key}`].lastActionAt,'2026-09-21T10:00:00.000Z');
  const removed=state.tasks.splice(state.tasks.findIndex(t=>t.id==='hygiene'),1)[0];
  assert.equal(core.xpSummaryFor(state,date).active,5);
  state.tasks.push(removed);
  assert.equal(core.xpSummaryFor(state,date).active,15);
});

test('fases de Boss Fight funcionam com missão avulsa e desmarcar não rende XP novamente',()=>{
  const state=core.seedState(),template=state.tasks.find(t=>t.id==='month-supplies');
  state.tasks.push({...template,id:'boss-avulso',title:'Missão em fases',frequency:'once',dueDate:date,missionType:'boss'});
  const item=occurrence(state,date,'boss-avulso');
  assert.equal(core.toggleBossPhaseIn(state,item,1,'2026-09-21T09:00:00.000Z'),true);
  assert.equal(core.xpSummaryFor(state,date).today,15);
  assert.equal(core.toggleBossPhaseIn(state,item,1,'2026-09-21T10:00:00.000Z'),false);
  assert.equal(core.xpSummaryFor(state,date).today,0);
  assert.equal(core.xpSummaryFor(state,date).recent.length,0);
  assert.equal(core.toggleBossPhaseIn(state,item,1,'2026-09-21T11:00:00.000Z'),true);
  assert.equal(core.xpSummaryFor(state,date).today,15);
  assert.equal(core.xpSummaryFor(state,date).earned,15);
  state.settings.xp.bossPhase=0;
  assert.equal(core.toggleBossPhaseIn(state,item,2),true);
  assert.equal(core.xpSummaryFor(state,date).recent.some(entry=>entry.amount===0),false);
  assert.throws(()=>core.toggleBossPhaseIn(state,occurrence(state,date,'laundry'),1),/inválida/);
});

test('marcos podem ser adicionados, editados e excluídos e sobrevivem ao backup',()=>{
  const state=core.seedState(),base=state.settings.milestones;
  core.saveMilestonesIn(state,[...base,{id:'m800',target:800,reward:'Escolher um novo hobby'}]);
  assert.equal(state.settings.milestones.length,5);
  core.saveMilestonesIn(state,state.settings.milestones.filter(m=>m.id!=='m50').map(m=>m.id==='m800'?{...m,reward:'Uma tarde de hobby'}:m));
  assert.equal(state.settings.milestones.length,4);
  assert.equal(core.normalize(JSON.parse(JSON.stringify(state))).settings.milestones.at(-1).reward,'Uma tarde de hobby');
  assert.throws(()=>core.saveMilestonesIn(state,[{id:'x',target:0,reward:'Inválido'}]),/Revise/);
  assert.throws(()=>core.saveMilestonesIn(state,[{id:'x',target:100,reward:'A'},{id:'x',target:120,reward:'B'}]),/Revise/);
  assert.equal(state.settings.milestones.length,4);
});

test('energia classifica os seis resultados e mudar o nível mantém a conclusão',()=>{
  const answers=[[0,0,0,'low'],[0,1,1,'low'],[1,1,1,'normal'],[2,1,1,'normal'],[2,2,1,'high'],[2,2,2,'high']];
  for(const [body,focus,sensory,expected] of answers)assert.equal(core.classifyEnergy({body,focus,sensory}),expected);
  assert.throws(()=>core.classifyEnergy({body:3,focus:0,sensory:0}));

  const state=core.seedState(),hygiene=occurrence(state,date,'hygiene');
  core.setEnergyIn(state,date,'low');
  core.completeTaskIn(state,hygiene,'low');
  assert.equal(state.taskLog[hygiene.key].minutes,2);
  assert.equal(sumXP(state),25); // 5 da avaliação, 10 da higiene, 10 da versão mínima.
  core.setEnergyIn(state,date,'high');
  assert.equal(state.taskLog[hygiene.key].status,'done');
  assert.equal(state.taskLog[hygiene.key].minutes,2);
  assert.equal(sumXP(state),25);
});

test('concluir, reabrir e concluir novamente não multiplicam XP',()=>{
  const state=core.seedState(),item=occurrence(state,date,'dishes');
  core.completeTaskIn(state,item,'normal');
  const first=sumXP(state);
  state.taskLog[item.key].status='pending';
  core.completeTaskIn(state,item,'normal');
  assert.equal(state.taskLog[item.key].status,'done');
  assert.equal(sumXP(state),first);
  assert.equal(Object.keys(state.xpLedger).filter(key=>key===`complete:${item.key}`).length,1);
});

test('cinco minutos semanais e blocos respeitam o limite por ocorrência',()=>{
  const state=core.seedState(),item=occurrence(state,date,'laundry');
  assert.equal(core.recordFiveMinutesIn(state,item),true);
  assert.equal(core.recordFiveMinutesIn(state,item),true);
  assert.equal(state.taskLog[item.key].startedMinutes,5);
  assert.equal(sumXP(state),10);
  assert.equal(core.recordBlockIn(state,item),true);
  assert.equal(core.recordBlockIn(state,item),true);
  assert.equal(core.recordBlockIn(state,item),false);
  assert.equal(state.taskLog[item.key].blocks,2);
  assert.equal(sumXP(state),20);
});

test('oportunidades de alimentação deslocam com a hora de acordar',()=>{
  const state=core.seedState(),settings=state.settings;
  assert.deepEqual(core.mealSlotsFor(settings).map(slot=>slot.time),['09:30','12:30','15:30','18:30','21:30']);
  settings.wake='08:00';
  assert.deepEqual(core.mealSlotsFor(settings).map(slot=>slot.time),['08:30','11:30','14:30','17:30','20:30']);
  settings.mealOffsets[1]=240;
  assert.equal(core.mealSlotsFor(settings)[1].time,'12:00');
  settings.sleep='12:00';
  assert.deepEqual(core.mealSlotsFor(settings).map(slot=>slot.time),['08:30','12:00']);
});

test('Hoje avança para a próxima alimentação pendente e conclui somente após todas',()=>{
  const state=core.seedState();
  assert.deepEqual(core.nextMealStateFor(state,date),{status:'pending',slot:core.mealSlotsFor(state.settings)[0],done:0,total:5});
  assert.match(core.renderNextMealCardFor(state,date),/09:30[\s\S]*Registrar feito[\s\S]*Remarcar/);
  for(let slot=0;slot<5;slot++){
    assert.equal(core.nextMealStateFor(state,date).slot.index,slot);
    core.recordMealIn(state,slot,'','',date,'09:30');
  }
  assert.deepEqual(core.nextMealStateFor(state,date),{status:'complete',slot:null,done:5,total:5});
  const finish=core.renderNextMealCardFor(state,date);
  assert.match(finish,/Parabéns, todas as refeições hoje foram cumpridas mantenha o foco amanhã/);
  assert.match(finish,/assets\/HelloKittyJoinha\.png/);
  assert.doesNotMatch(finish,/meal-quick-register/);
  const restored=core.normalize(JSON.parse(JSON.stringify(state)));
  assert.equal(core.nextMealStateFor(restored,date).status,'complete');
  delete restored.mealLog[date][2];
  assert.equal(core.nextMealStateFor(restored,date).slot.index,2);
  assert.equal(core.nextMealStateFor(restored,'2026-09-22').slot.time,'09:30');
  restored.settings.sleep='09:15';
  assert.deepEqual(core.nextMealStateFor(restored,date),{status:'empty',slot:null,done:0,total:0});
});

test('remarcar altera a ordem sem apagar registros e recusa horário fora da vigília',()=>{
  const state=core.seedState();
  core.rescheduleMealIn(state,0,'20:00');
  assert.equal(core.nextMealStateFor(state,date).slot.time,'12:30');
  assert.equal(core.nextMealStateFor(state,date).slot.index,1);
  core.recordMealIn(state,1,'meal1','',date,'12:30');
  const oldOffset=state.settings.mealOffsets[0];
  assert.throws(()=>core.rescheduleMealIn(state,0,'23:30'),/período/);
  assert.equal(state.settings.mealOffsets[0],oldOffset);
  assert.equal(state.mealLog[date][1].optionId,'meal1');
  state.settings.wake='18:00';state.settings.sleep='02:00';
  core.rescheduleMealIn(state,0,'01:00');
  assert.equal(core.mealSlotsFor(state.settings).find(slot=>slot.index===0).time,'01:00');
});

test('registrar refeições respeita o teto diário e não libera XP ao desmarcar',()=>{
  const state=core.seedState();
  for(let slot=0;slot<6;slot++)core.recordMealIn(state,slot,'meal1','',date,'12:00');
  assert.equal(sumXP(state),25);
  assert.equal(state.taskLog[`food|${date}`].status,'done');
  delete state.mealLog[date][0];
  core.recordMealIn(state,0,'meal2','',date,'13:00');
  assert.equal(sumXP(state),25);
  core.recordMealIn(state,0,'meal2','',date,'13:00');
  assert.equal(sumXP(state),25);
  core.recordMealIn(state,0,'meal1','', '2026-09-22','09:30');
  assert.equal(sumXP(state),30);
});

test('modo sobrevivência e marcação de pausa protegem a continuidade',()=>{
  const state=core.seedState();
  state.days['2026-09-19']={mark:'Pausa'};
  assert.equal(core.isReturningFor(state,date),true);
  core.activateSurvivalIn(state,date);
  assert.equal(state.days[date].mark,'Mínimo');
  assert.equal(state.days[date].survival,true);
  assert.equal(core.protectedDaysFor(state,date),1);
  state.days['2026-09-20']={mark:'Recuperação'};
  assert.equal(core.isReturningFor(state,date),false);
  assert.equal(core.protectedDaysFor(state,date),3);
});

test('temporizador inicia, pausa, retoma e termina sem perder o tempo',()=>{
  const timer=core.createTimer(10,date);
  core.startTimer(timer,1000);
  assert.equal(core.timerRemainingFor(timer,31000),570);
  core.pauseTimer(timer,31000);
  assert.equal(timer.status,'paused');
  assert.equal(core.timerRemainingFor(timer,100000),570);
  core.startTimer(timer,100000);
  assert.equal(core.tickTimer(timer,260000),false);
  assert.equal(timer.currentStep,1);
  assert.equal(core.tickTimer(timer,670000),true);
  assert.equal(timer.status,'finished');
  assert.equal(core.timerRemainingFor(timer,800000),0);
});

test('backup JSON restaura tarefas, refeições, XP e configurações; formato inválido é rejeitado',()=>{
  const state=core.seedState(),item=occurrence(state,date,'hygiene');
  core.completeTaskIn(state,item,'normal');
  core.recordMealIn(state,0,'meal1','',date,'09:30');
  state.settings.people=['Ana','Bia'];
  const restored=core.normalize(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.taskLog[item.key].status,'done');
  assert.equal(restored.mealLog[date][0].optionId,'meal1');
  assert.equal(restored.settings.people[0],'Ana');
  assert.equal(sumXP(restored),15);
  assert.throws(()=>core.normalize({tasks:[],settings:{},meals:[]}));
});
