# Inventário TI Mobile — Usina Caçu

App mobile (React Native + Expo) para inventário de equipamentos de TI, seguindo o
mockup de referência. Tema escuro, pt-BR, navegação por 4 abas + FAB central.

## Stack e por que React Native (Expo)

Optei por **React Native com Expo** (SDK 57, TypeScript) em vez de Flutter:

- O restante do projeto (`api/`, `web/`) já é 100% JavaScript/TypeScript — reaproveita
  vocabulário de tipos, convenções de nomes de campos e o mesmo raciocínio de domínio
  usado no painel web, reduzindo a distância entre as duas bases de código.
- `expo install` resolve automaticamente as versões de dependências nativas
  compatíveis com o SDK, o que facilita manter o projeto rodando sem um ambiente
  nativo (Android Studio/Xcode) configurado localmente durante o desenvolvimento.
- `npx expo start --web` permite iterar rapidamente na UI num navegador antes de
  validar em um dispositivo/emulador real.
- O app roda tanto em Expo Go quanto via build nativo (EAS Build) quando for
  necessário publicar nas lojas.

## Como rodar

```bash
cd mobile
npm install
npx expo start
```

- Pressione `a` para abrir no emulador Android, `i` para iOS (macOS) ou `w` para rodar
  no navegador.
- Ou escaneie o QR code com o app **Expo Go** no celular.

Não é necessário nenhum backend rodando — os dados ficam persistidos localmente no
dispositivo (`AsyncStorage`) e são semeados automaticamente no primeiro uso.

## Arquitetura

```
mobile/
├── App.tsx                  # fontes, providers, NavigationContainer
└── src/
    ├── theme/                # cores, tipografia (Space Grotesk / IBM Plex), espaçamento
    ├── types/models.ts        # Equipamento, Manutenção, Atividade + enums
    ├── data/
    │   ├── seed.ts             # ~15 equipamentos, 5 OS, feed de atividades
    │   ├── storage.ts          # leitura/escrita AsyncStorage (JSON)
    │   ├── repository.ts       # camada única de acesso a dados (ver abaixo)
    │   └── preferences.ts      # toggles de Configurações
    ├── context/
    │   ├── AppDataContext.tsx  # equipamentos/manutenções/atividades + CRUD
    │   ├── ToastContext.tsx    # toasts flutuantes
    │   └── SheetContext.tsx    # controla o bottom sheet global do FAB
    ├── navigation/
    │   ├── RootNavigator.tsx   # Stack: Tabs, Detalhe, BuscaAvancada
    │   ├── TabNavigator.tsx    # Bottom tabs: Início, Itens, Relatórios, Config
    │   └── CustomTabBar.tsx    # tab bar customizada com FAB flutuante central
    ├── components/             # Header, StatusBadge, WarrantyBar, EquipCard, gráficos…
    ├── screens/                 # as 6 telas do app
    └── sheets/                  # NovoEquipamentoSheet, NovaOsSheet (bottom sheets)
```

### Camada de dados pronta para um backend futuro

`src/data/repository.ts` expõe uma interface `InventoryRepository` (listar/criar/atualizar
equipamentos, manutenções e atividades). Hoje ela é implementada por `LocalRepository`
(AsyncStorage), mas todas as telas dependem apenas dessa interface via `AppDataContext` —
trocar a fonte de dados para chamadas HTTP contra a API REST do backend (`../api`) no
futuro é uma questão de escrever uma segunda implementação da interface, sem tocar nas
telas.

## Navegação

- **Bottom tabs**: Início · Itens · **FAB (+)** · Relatórios · Config. O FAB fica
  sobreposto à tab bar e abre o bottom sheet de cadastro de equipamento de qualquer tela.
- **Stack** por cima dos tabs: `Detalhe` (slide da direita) e `BuscaAvancada`.
- KPIs do Início e as barras de status em Relatórios navegam para `Itens` já filtrado
  (via parâmetro de rota consumido com `useFocusEffect`).

## Dados de exemplo

O seed é gerado dinamicamente em relação à data atual do dispositivo (ex.: "garantia
vence em 22 dias" é sempre recalculado a partir de `new Date()` no primeiro boot), então
as contagens e badges de garantia sempre fazem sentido, independentemente de quando o
app for aberto pela primeira vez.

Para reiniciar os dados de exemplo (limpar tudo e semear de novo), chame
`repository.resetDemoData()` — não há tela para isso no MVP, mas a função já existe em
`src/data/repository.ts`.
