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

## Motor (`src/app/game/engine.ts`)

`TurnState` é o estado compartilhado (serializável em JSON) e `TurnAction`, as ações que o
mudam. `validateAction` diz se a ação vale; `applyAction` aplica, sem efeito colateral. No
componente (`game-screen.ts`) tudo passa por `dispatch`, a única entrada do estado.

Hoje o motor cobre o **ciclo do turno**: vez, turno global, posições dos agentes, dados e
movimento restante. Os dados de movimento já são sorteados **antes** da animação (o `app-d4`
recebe o valor em `value` e só cai nele).

## Ordem do trabalho

1. ~~Dados decididos antes da animação.~~
2. ~~Motor do ciclo do turno (`engine.ts`).~~
3. **Turno inimigo no motor:** calcular a rodada inteira dos inimigos (patrulha, fuga,
   quem avistou quem e em que passo) e só depois animar. Hoje `enemyTurn` muda o estado
   passo a passo durante a animação.
4. **Servidor local** (`server/`): Node + `ws`, salas com código curto, dono de cada agente
   (o dono da sala fica com os que sobrarem), reconexão, e o build servido junto.
5. **Online:** o mesmo servidor publicado; o cliente conecta por `wss://`.

Depois disso, cada sistema migra para o motor num passo próprio: Agrupar (grupo, fila,
Comando), portas, abordagem, testes de percepção, interrogatório, queima e perseguição.
Enquanto um sistema não migra, ele fica fora do modo multiplayer.

## Ideias para o cooperativo

- A ficha do agente vira a sala de espera: cada jogador pega o seu agente.
- Na vez de um agente que não é seu, você assiste (a câmera acompanha).
- Testes de percepção e pistas podem aparecer **só para quem viu**: a equipe precisa conversar.
- Interrogatório e perseguição: só o jogador envolvido joga; a reação rápida da corrida roda no
  cliente dele, que manda o resultado.
- Quem cair da partida: os agentes dele passam para o dono da sala até ele voltar.
