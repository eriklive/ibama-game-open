# Assets 3D do jogo

Esta pasta guarda só os arquivos prontos para o jogo (GLBs otimizados). Eles são gerados a partir
de pacotes da Quaternius pelo script em `tools/assets/` (ver o README de lá). A licença de cada
arquivo está em [LICENSES.md](LICENSES.md).

## Pacotes em uso

Todos da [Quaternius](https://quaternius.com), licença CC0 1.0, na versão grátis (**Standard**).

| Pacote | Versão conferida | O que usamos | Vira |
|---|---|---|---|
| [Universal Base Characters](https://quaternius.itch.io/universal-base-characters) | Standard, baixado em 12/11/2026 | Corpos `Superhero_Female_FullBody` e `Superhero_Male_FullBody`; penteados `Hair_Buns`, `Hair_Long`, `Hair_SimpleParted`, `Hair_Buzzed`, `Hair_Beard` | `characters/<id>/<id>.glb` |
| [Universal Animation Library](https://quaternius.itch.io/universal-animation-library) (a "1") | v3.0 Standard (16/06/2026) | Clipes `Idle_Loop`, `Walk_Loop`, `Jog_Fwd_Loop`, `Crouch_Idle_Loop`, do arquivo sem root motion | `anims/humanoid-base.glb` (`idle`, `walk`, `run`, `crouch`) |

## Pacote avaliado, ainda sem uso

[Universal Animation Library 2](https://quaternius.itch.io/universal-animation-library-2)
(v2.2 Standard, 28/09/2026, CC0). Usa o mesmo esqueleto, então os clipes tocam nos nossos corpos
sem retarget. Complementa a biblioteca 1 com combate, parkour, lavoura e zumbis. **Não tem
animação de abaixar/agachar nem de rendição** na versão grátis; por isso o inimigo rendido usa
`Crouch_Idle_Loop` da biblioteca 1.

Candidatos da biblioteca 2 para o futuro: `TreeChopping_Loop` (madeireiro), `Walk_Carry_Loop`,
`Idle_TalkingPhone_Loop`, `Idle_FoldArms_Loop`, `Yes` e `Idle_No_Loop`.

## O que vem em cada pacote (versão grátis)

- **Universal Base Characters:** 2 dos 6 corpos (Super-herói masculino e feminino, só pele
  escura) e 7 penteados, além dos acima: `Hair_BuzzedFemale`, `Eyebrows_Female`,
  `Eyebrows_Regular`. Os corpos Regular e Teen, os outros 13 penteados e as cores de pele e olhos
  ficam na versão Source, paga.
- **Universal Animation Library:** 43 clipes. `A_TPose`, `Crouch_Fwd_Loop`, `Crouch_Idle_Loop`,
  `Dance_Loop`, `Death01`, `Driving_Loop`, `Fixing_Kneeling`, `Hit_Chest`, `Hit_Head`,
  `Idle_Loop`, `Idle_Talking_Loop`, `Idle_Torch_Loop`, `Interact`, `Jog_Fwd_Loop`, `Jump_Land`,
  `Jump_Loop`, `Jump_Start`, `PickUp_Table`, `Pistol_Aim_Down`, `Pistol_Aim_Neutral`,
  `Pistol_Aim_Up`, `Pistol_Idle_Loop`, `Pistol_Reload`, `Pistol_Shoot`, `Punch_Cross`,
  `Punch_Jab`, `Push_Loop`, `Roll`, `Sitting_Enter`, `Sitting_Exit`, `Sitting_Idle_Loop`,
  `Sitting_Talking_Loop`, `Spell_Simple_Enter`, `Spell_Simple_Exit`, `Spell_Simple_Idle_Loop`,
  `Spell_Simple_Shoot`, `Sprint_Loop`, `Swim_Fwd_Loop`, `Swim_Idle_Loop`, `Sword_Attack`,
  `Sword_Idle`, `Walk_Formal_Loop`, `Walk_Loop`.
- **Universal Animation Library 2:** 43 clipes. `A_TPose`, `Chest_Open`, `ClimbUp_1m`, `Consume`,
  `Farm_Harvest`, `Farm_PlantSeed`, `Farm_Watering`, `Hit_Knockback`, `Idle_FoldArms_Loop`,
  `Idle_Lantern_Loop`, `Idle_No_Loop`, `Idle_Rail_Call`, `Idle_Rail_Loop`, `Idle_Shield_Break`,
  `Idle_Shield_Loop`, `Idle_TalkingPhone_Loop`, `LayToIdle`, `Melee_Hook`, `Melee_Hook_Rec`,
  `NinjaJump_Idle_Loop`, `NinjaJump_Land`, `NinjaJump_Start`, `OverhandThrow`, `Shield_Dash`,
  `Shield_OneShot`, `Slide_Exit`, `Slide_Loop`, `Slide_Start`, `Sword_Block`, `Sword_Dash`,
  `Sword_Heavy_Combo`, `Sword_Regular_A`, `Sword_Regular_A_Rec`, `Sword_Regular_B`,
  `Sword_Regular_B_Rec`, `Sword_Regular_C`, `Sword_Regular_Combo`, `TreeChopping_Loop`,
  `Walk_Carry_Loop`, `Yes`, `Zombie_Idle_Loop`, `Zombie_Scratch`, `Zombie_Walk_Fwd_Loop`.

As versões pagas (Source) anunciam 120+ e 130+ clipes; não conferimos o conteúdo delas.

## Ao adicionar um asset

1. Inclua o pacote na tabela "Pacotes em uso" (com link, versão e licença).
2. Liste o arquivo gerado em `LICENSES.md`.
3. Se o arquivo sai de um pacote, acrescente o passo em `tools/assets/build-assets.mjs`.
