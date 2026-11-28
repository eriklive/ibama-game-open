# Multiplayer cooperativo

O jogo vai ganhar um modo **cooperativo para até 3 jogadores**: cada jogador controla um ou
mais agentes (Ana, Bruno, Clara) contra os inimigos da IA. Não haverá modo versus.

## Decisões

- **Conexão:** um servidor Node com WebSocket. Rodando no notebook de alguém, ele é o modo
  de **rede local** (os outros abrem `http://<ip-do-notebook>:<porta>`); publicado num
  serviço, é o modo **online**. O código é o mesmo.
  - **Bluetooth** está descartado: navegadores não conversam entre si por Bluetooth.
  - Na rede local, o servidor também serve o build (`dist/`): a página do GitHub Pages é
    HTTPS e o navegador bloqueia `ws://192.168…` vindo dela.
- **Quem manda é o servidor.** Ele guarda o estado da sala, confere cada ação (é a vez
  desse jogador? o movimento é válido?), **sorteia os dados** e transmite a ação já com o
  resultado. Os clientes aplicam a mesma ação no mesmo motor e só animam.
- **Primeiro calcula, depois anima.** Nenhuma regra pode depender de animação ou relógio.

## Motor (`src/app/game/engine/`)

`GameState` é o estado compartilhado (serializável em JSON) e `GameAction`, as ações que o
mudam. `validateAction` diz se a ação vale; `applyAction` aplica, sem efeito colateral. No
componente (`game-screen.ts`) tudo passa por `dispatch`, a única entrada do estado.

Um módulo por sistema, reaproveitando as regras puras que já existiam (`enemies.ts`, `hex.ts`…):

| Módulo | O que tem |
|---|---|
| `state.ts` | `GameState`, estado inicial, `World` (o mapa) e auxiliares |
| `turn.ts` | ciclo do turno: rolagem, andar, gastar movimento, passar a vez |
| `enemy-turn.ts` | inimigos: patrulha, avistar, fuga, fim da rodada |
| `group.ts` | grupo: agrupar (com o Comando), desagrupar, andar em fila, troca de vagas |
| `doors.ts` | portas: abrir, destrancar (Gazua), arrombar (com dano) e a reação do cômodo |
| `approach.ts` | abordagem: faixas do agente, prévia e o teste de fuga de cada suspeito |
| `evidence.ts` | investigação: percepção, achados (arma, GPS, rádio), a chave do avião |
| `talk.ts` | interrogatório: a conversa aberta, cada pergunta, a caderneta, pistas e comparsas |
| `fire.ts` | queima (quem vê o fogo entra em alerta) e o fim da operação |
| `index.ts` | junta tudo: `GameAction`, `validateAction`, `applyAction` |

Como já funciona:

- **Rolagem:** os dados de movimento são sorteados **antes** da animação (o `app-d4` recebe o
  valor em `value` e só cai nele). A ação leva só os dados: o motor soma vigor, grupo e
  Liderança, porque a escalação (atributos de cada agente e o Capitão) faz parte do estado.
- **Grupo:** o motor guarda quem está agrupado, a fila e quantas vezes o Comando foi usado no
  turno. Agrupar, andar com os companheiros seguindo o rastro do líder e a troca de vagas no
  começo e no fim da vez viram ações resolvidas (`planRally`, `planMove`, `planReline`), com
  o custo do Comando decidido pelo motor.
- **Portas:** o estado de cada porta e o bônus de intimidação do arrombamento estão no motor.
  A ação leva o d20 já sorteado (`planDoor`) e o resultado sai de `doorOutcome`, igual para
  todos; a tela aplica a ação na hora em que o resultado aparece (o empurrão, o "destrancou",
  o impacto do chute). No arrombamento, `planBreakIn` acha o cômodo do outro lado e rola o
  d20 de cada inimigo; a cena só mostra, um por um.
- **Abordagem:** as faixas (rendição, rolagem, fuga) saem do motor (`approachZonesFor`), com
  intimidação, grupo, Liderança e o bônus do arrombamento; a prévia do tablet é
  `approachPreview`, e `planApproach` rola o teste de fuga de cada um e decide quem se rende e
  quem corre. A voz de prisão (perseguição) que vem depois ainda é do componente.
- **Investigação:** o que a equipe percebeu, quem já rolou percepção onde, o que foi achado,
  a chave do avião e quem a viu e deixou no quadro estão no motor. O d20 da percepção vem
  sorteado na ação (`planNotice`) e a ficha cai nele; pegar um achado ou a chave e deixar a
  chave no quadro são ações (`take`, `leaveKey`). As etapas da cabine do avião (chegar, abrir,
  dentro, sair) são fluxo de tela de quem entrou e ficam no componente.
- **Interrogatório:** a conversa aberta é uma sessão no estado (`talk`). Cada pergunta leva o
  d20 escondido e o sorteio da fala (`planAsk`); a resposta sai de `askResult`, igual para
  todos, e o motor guarda a memória do suspeito, as falas já usadas, a nota da caderneta, a
  pista e o esconderijo entregue. Ao encerrar (`planEndTalk`), o abalado passa e o comparsa
  entregue aparece no hexágono livre mais perto.
- **Queima e fim:** o que já queima e se a operação acabou estão no motor; `planBurn` decide
  quem vigia perto e vê as chamas. A confirmação e o relatório são tela.
- **Mapa:** o `World` que o motor recebe tem só o que é fixo no mapa (área, paredes, carga,
  estruturas). O que muda na partida (as portas fechadas) sai do estado, com `sightBlockers`
  e `solidOf`.
- **Turno inimigo:** cada inimigo que age vira **uma** ação já resolvida (`planPatrolAct`,
  `planFleeAct`): o caminho inteiro, em que passo avistou alguém e se fugiu do mapa. O
  componente aplica a ação e só depois anima; o cone de visão na tela segue o passo animado
  (`enemyView`), não o estado.
- **Sorteio:** quem vagueia sorteia o destino com o `rng` da partida, e o destino viaja na ação.

**Transitório:** a ação `patchEnemy` muda um inimigo direto. Ela existe só para o que ainda
mexe nos inimigos por fora do motor (a perseguição e os casos de teste) e sai quando a
perseguição migrar. Também fica no
componente, por enquanto, o laço do turno inimigo (porque a perseguição se intercala nele).

## Ordem do trabalho

O refactor do `game-screen.ts` **é** a migração para o motor: as regras e o estado de cada
sistema vão para `engine/`, e o componente fica só com câmera, animação, som e menus. O
servidor vem depois, quando o jogo inteiro rodar no motor.

1. ~~Dados decididos antes da animação.~~
2. ~~Motor do ciclo do turno.~~
3. ~~Turno inimigo e visão.~~
4. ~~Grupo (agrupar, fila, Comando).~~
5. ~~Portas (e o `World` só com o que é fixo no mapa).~~
6. ~~Abordagem e rendição.~~
7. ~~Percepção, móveis e avião/chaves.~~
8. ~~Interrogatório.~~
9. ~~Queima e fim da operação.~~
10. Perseguição (o reflexo da corrida fica no cliente de quem corre); o laço do turno inimigo
    vai inteiro para o motor e `patchEnemy` sai.
11. **Servidor** (`server/`): Node + `ws`, salas com código curto, dono de cada agente (o dono
    da sala fica com os que sobrarem), reconexão, e o build servido junto. Rodando local é o
    modo de rede local; publicado, o online (`wss://`).

## Ideias para o cooperativo

- A ficha do agente vira a sala de espera: cada jogador pega o seu agente.
- Na vez de um agente que não é seu, você assiste (a câmera acompanha).
- Testes de percepção e pistas podem aparecer **só para quem viu**: a equipe precisa conversar.
- Interrogatório e perseguição: só o jogador envolvido joga; a reação rápida da corrida roda no
  cliente dele, que manda o resultado.
- Quem cair da partida: os agentes dele passam para o dono da sala até ele voltar.
