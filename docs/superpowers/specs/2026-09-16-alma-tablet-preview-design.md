# A.L.M.A. — Tablet Preview Design

## Objetivo

Criar um site estático demonstrativo, totalmente tablet-friendly, que represente visualmente os fluxos centrais do A.L.M.A. enquanto o backend da Fase 1B continua sendo construído.

O preview deve ser publicável no GitHub Pages sem backend, banco ou autenticação real.

## Escopo

Telas demonstradas:

- Dashboard
- Produtos
- Localizações
- Scanner

Dados são mockados e ficam no navegador. Nenhuma chamada de API é necessária nesta entrega.

## Princípios de tablet

- alvo mínimo de toque de 44x44 px;
- layout otimizado para 768x1024 e 1024x768;
- navegação lateral em landscape/largura maior;
- navegação inferior em portrait/largura menor;
- tipografia legível a distância de braço;
- sem hover como requisito funcional;
- cartões e filtros com espaçamento generoso;
- ações principais sempre visíveis;
- suporte a teclado e foco visível;
- contraste adequado e preferência por tema escuro industrial.

## Linguagem visual

Visual industrial limpo, escuro e técnico, sem excesso de ornamentos.

Marca textual: `A.L.M.A.` com subtítulo `Armazenamento, Localização, Movimentação e Autenticação`.

Componentes visuais:

- cards de KPI;
- chips de status;
- lista/tabela híbrida responsiva;
- breadcrumb de localização física;
- cards de produto;
- scanner simulado em moldura de câmera;
- bottom navigation no portrait;
- side rail no landscape.

## Dashboard

KPIs mockados:

- Produtos ativos
- Posições ocupadas
- Almoxarifados
- Itens para reposição

Também exibe:

- materiais recentes;
- distribuição por categoria;
- alertas operacionais de demonstração.

## Produtos

Lista pesquisável com:

- SKU;
- nome;
- categoria;
- unidade base;
- localização principal;
- status;
- identificador secundário.

Ao tocar em um produto, um painel detalhado mostra:

- dados principais;
- identificadores;
- conversões de unidade;
- posições associadas;
- localização preferencial.

## Localizações

Mostra:

- almoxarifado selecionado;
- árvore visual Corredor → Estante → Prateleira → Posição;
- posição dedicada ou compartilhada;
- produtos associados;
- ocupação demonstrativa.

## Scanner

Scanner demonstrativo com duas ações:

- `Simular leitura` alterna entre códigos mockados;
- `Digitar código` permite resolver SKU/EAN mockado.

Após a leitura, exibe o produto localizado e sua posição principal.

## Responsividade

Breakpoints conceituais:

- até 820 px: portrait/tablet compacto, bottom nav;
- acima de 820 px: side rail e conteúdo em duas colunas quando apropriado.

O layout deve funcionar sem scroll horizontal em 768 px.

## Publicação

Arquivos estáticos em `preview/`.

GitHub Pages será publicado por workflow dedicado com artifact do diretório `preview`.

## Fora do escopo

- autenticação real;
- API real;
- persistência remota;
- leitura real de câmera;
- service worker/offline;
- CRUD real;
- reconhecimento facial;
- quantidade real de estoque.

## Critérios de aceite

1. Dashboard, Produtos, Localizações e Scanner navegam sem recarregar página.
2. Layout não exige scroll horizontal em 768x1024.
3. Navegação troca de side rail para bottom nav em largura compacta.
4. Botões e itens interativos têm área de toque mínima de 44 px.
5. Busca de produtos funciona com dados mockados.
6. Scanner simulado resolve ao menos três códigos diferentes.
7. Painel de produto mostra identificadores, conversões e posições.
8. O preview é estático e pode ser hospedado em GitHub Pages.
9. Teste estático valida estrutura mínima e referências dos assets.
