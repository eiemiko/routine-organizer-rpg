# Histórico técnico de versões — RoutineOrganizerRPG

Versão atual: **1.8.0**. A versão do produto é independente da versão `1` do formato de dados salvo no navegador.

Use `MAJOR.MINOR.PATCH`: aumente `MINOR` ao adicionar, remover ou mover uma funcionalidade e registre a mudança também em **Ajuda → Patch notes** no site. Use `PATCH` para correções e pequenos ajustes, detalhados somente neste arquivo. Aumente `MAJOR` quando uma mudança exigir migração incompatível dos dados ou alterar substancialmente o uso do produto.

## Verificação mínima antes de cada entrega

Na pasta do projeto, execute `node --check app.js` e `node --test tests/core.test.cjs`. **Não monte nem entregue um novo ZIP se algum teste falhar.** Para novas funcionalidades, faça verificações pontuais adicionais sem modificar `tests/core.test.cjs`, conforme solicitado. Os testes usam apenas o Node.js e exercitam as mesmas regras utilizadas pela interface; não exigem servidor ou internet.

Além dos testes, confira se o ZIP contém `index.html`, `styles.css`, `app.js`, `CHANGELOG.md`, `tests/core.test.cjs` e todos os recursos locais usados pelo site, e se esses arquivos correspondem aos arquivos validados.

## 1.8.0 — 2026-09-22

### Funcionalidades

- A seção **Marcar o dia**, em Hoje, ganhou um botão `?` com uma janela que explica o significado de Completo, Mínimo, Recuperação e Pausa. A janela pode ser fechada pelo botão ou pela tecla Esc, e o foco volta ao botão de ajuda.
- **Voltar um dia** foi colocado ao lado de **Passar o dia**. Voltar e avançar trocam somente a data ativa; os registros de cada dia e o histórico de XP permanecem vinculados às datas originais e não são concedidos de novo.
- **Adicionar nova missão** saiu da barra lateral e do cabeçalho de **Missões e recompensas**, mas permanece na aba **Missões**. Nas demais telas, o botão aparece no topo também em celulares.

### Ajustes menores

- As quatro opções de marcação do dia informam `aria-pressed` explicitamente, e o cabeçalho se reorganiza sem rolagem horizontal em telas pequenas.
- A suíte existente continua obrigatória na entrega; o arquivo `tests/core.test.cjs` permanece inalterado.

## 1.7.0 — 2026-09-21

### Funcionalidades

- Incluído o botão **Passar o dia** em Hoje para avançar manualmente a data da rotina em um dia. A data selecionada é salva no navegador e no backup JSON, e somente o botão pode avançá-la. Missões, energia, alimentação, modo sobrevivência, protocolos, marcação de dia e XP do dia passam a acompanhar essa data.
- O ícone da aba passou a usar o calendário em pixel art enviado para o projeto, incluído como imagem local no ZIP.

### Correções e compatibilidade

- Marcos de recompensas, nível, quantidade até o próximo marco e barra de progresso passam a refletir o **XP ativo**. Ao desmarcar uma ação, seu marco volta a ficar “Não cumprido”; o histórico de XP permanece salvo e não permite receber os mesmos pontos duas vezes.
- A data da rotina é inicializada na data local do navegador quando a instalação ou backup ainda não possui esse campo; nas aberturas seguintes, permanece a mesma até usar **Passar o dia**. Registros anteriores continuam associados às próprias datas.
- Notificações opcionais de alimentação só aparecem quando a data escolhida da rotina coincide com a data real, para evitar avisos de dias diferentes. O arquivo `tests/core.test.cjs` permanece inalterado.

## 1.6.0 — 2026-09-21

### Funcionalidade

- “Até três próximos passos” na tela Hoje oferece ações de iniciar, pausar, retomar e marcar como feita. Ao concluir, a missão sai do resumo e a próxima disponível entra, preservando o limite de três.
- Os rótulos de estado das missões exibem pendente em laranja, iniciada em rosa, pausada em azul e concluída em verde, sempre acompanhados de texto.

### Ajustes menores e compatibilidade

- O resumo utiliza as mesmas regras de status, progresso e XP dos cartões de missão, sem criar registros duplicados; o foco do teclado acompanha a atualização da lista.
- O arquivo de testes permanece inalterado conforme solicitado; a suíte existente continua sendo executada antes de empacotar.

## 1.5.2 — 2026-09-21

### Correções

- Os campos condicionais de frequência agora ficam realmente ocultos na tela: o CSS da classe `.field` deixava os elementos visíveis mesmo quando o formulário aplicava `hidden`. A regra específica para `.frequency-field[hidden]` corrige a aparência ao abrir e ao trocar entre diária, semanal, mensal e avulsa.
- O arquivo de testes foi mantido inalterado conforme solicitado; a suíte existente continua sendo executada antes da entrega.

## 1.5.1 — 2026-09-21

### Correções

- Corrigida a exibição condicional do formulário de missão: frequência diária oculta os três campos; semanal exibe somente **Dia da semana**; mensal exibe somente **Semana do mês**; avulsa exibe somente **Data**.
- A configuração interna do dia usado pelas missões mensais existentes é preservada sem reaparecer como campo no formulário.

## 1.5.0 — 2026-09-21

### Ajustes menores e compatibilidade

- O formulário passou a usar o título **Adicionar nova missão** ao cadastrar uma missão.
- Os campos **Dia da semana**, **Semana do mês** e **Data** agora aparecem somente quando a frequência escolhida precisa deles; os controles ocultos ficam desativados e não interferem no salvamento.
- Datas de missões avulsas e reagendamentos usam entrada `DD/MM/AAAA` com calendário próprio no tema do aplicativo, mantendo o valor salvo em ISO `AAAA-MM-DD` para compatibilidade com backups.
- Horários de alimentação, sono e reagendamento usam entrada em 24 horas (`HH:MM`) com máscara e validação consistente.
- Adicionado um teste de regressão para a matriz de campos por frequência, conversão de datas, calendário e validação de horários.

### Correções

- Removidos os textos entre parênteses dos rótulos de frequência no formulário.
- Calendários e campos de horário deixam de depender do estilo nativo variável do navegador e passam a respeitar o visual escuro do RoutineOrganizerRPG.

## 1.4.0 — 2026-09-21

### Ajustes menores e compatibilidade

- A classificação da missão agora é um campo independente da prioridade e da frequência. Tarefas antigas recebem o tipo equivalente automaticamente ao abrir ou importar seus dados, sem alterar o formato de backup `1` nem a chave do armazenamento local.
- As abas usam rótulos, foco visível e navegação por setas, Home e End. O seletor de tipo contém uma explicação acessível pelo botão `?`.
- O histórico de XP continua guardando cada concessão uma única vez. O XP ativo é calculado pelas tarefas, refeições e fases que permanecem marcadas; o XP recente mostra somente essas ações, enquanto os marcos já conquistados usam o histórico permanente.
- Desmarcar a última refeição reabre sua tarefa diária quando ela havia sido concluída apenas pelo registro de alimentação. Fases de Boss Fight podem ser desmarcadas e retomadas sem gerar XP extra.
- A edição dos marcos valida cada recompensa e quantidade de XP antes de salvar; as quatro sugestões iniciais continuam editáveis e é possível incluir ou excluir outras.
- Adicionados quatro testes de regressão para migração da classificação, XP ativo e recente, fases de Boss Fight e marcos extras. Total da suíte: 17 testes.

### Correções

- XP recente deixa de exibir refeições ou tarefas desmarcadas; o contador de Hoje e o total ativo em Recompensas acompanham o estado atual.
- Excluir uma tarefa retira suas entradas do XP ativo e desfazer a exclusão restaura a contagem sem duplicar a pontuação histórica.

## 1.3.0 — 2026-09-21

### Ajustes menores

- O nome exibido na aba, na identidade visual, na ajuda, nas notificações, no backup e no arquivo ZIP agora é RoutineOrganizerRPG.
- A chave local `minha-casa-v1` permanece a mesma para preservar os dados de quem já usava o aplicativo; backups antigos continuam aceitos.
- Ao registrar a próxima alimentação em Hoje, os dados são salvos antes de uma transição de 170 ms na saída e 240 ms na entrada do cartão; as preferências de reduzir movimento do sistema e do aplicativo desativam a animação.
- As quatro categorias iniciais da rotina mensal agora descrevem as áreas reais de cada sugestão. Categorias já salvas continuam intactas até serem editadas.
- Adicionados dois testes de regressão para editar uma semana mensal, manter conclusão/XP e recuperar uma sugestão após a exclusão.

### Correções

- O formulário de edição mensal mantém a semana fixa, evitando que uma alteração de conteúdo mova a missão para outra semana e perca a referência da conclusão anterior.
- A criação de uma segunda missão mensal principal na mesma semana é recusada com uma mensagem no formulário.

## 1.2.0 — 2026-09-21

### Ajustes menores

- Incluídos dois testes de regressão para o avanço das oportunidades de alimentação, a conclusão persistida e o reagendamento.
- A imagem fornecida para a mensagem de conclusão é carregada de um PNG local incluído no pacote, sem depender da internet.

### Correções

- O reagendamento agora recusa horários fora do período acordado, evitando que a oportunidade desapareça da lista por engano.

## 1.1.1 — 2026-09-21

### Processo de entrega e ajustes menores

- Incluídos nove testes de regressão para agenda, energia, XP, alimentação, continuidade, temporizador e restauração do backup.
- As regras testadas foram isoladas dentro de `app.js` para que a interface e os testes usem a mesma implementação.
- Verificações de sintaxe e testes passam a ser obrigatórios antes de empacotar uma versão.

### Correções

- Nenhuma nesta versão.

## 1.1.0 — 2026-09-21

### Ajustes menores

- Posicionado o botão de ajuda acima da navegação inferior no celular, com espaço para avisos temporários.
- Identificado o botão para leitores de tela e mantido o retorno do foco a ele ao fechar o modal.

### Correções

- Nenhuma nesta versão.

## 1.0.0 — 2026-09-21

Versão inicial. Não havia correções ou ajustes menores registrados separadamente.
