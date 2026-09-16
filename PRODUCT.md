# PRODUCT.md — A.L.M.A.

## Produto

A.L.M.A. significa **Armazenamento, Localização, Movimentação e Autenticação**. É um sistema de almoxarifado industrial para controlar catálogo, endereçamento físico, saldo, movimentações, retiradas, aprovações, alertas e auditoria.

Não é um SaaS administrativo genérico. A interface existe para reduzir dúvida operacional no chão de fábrica: **qual material é este, onde está, quanto existe, quem retirou, para onde foi e o que exige atenção agora**.

## Usuários principais

### Almoxarife

É o usuário operacional central. Trabalha com recebimento, localização, transferência, atendimento de retiradas, inventário e consulta rápida. Precisa confirmar informação em poucos segundos e operar o sistema sem depender de menus profundos.

### Solicitante

Solicita materiais para um destino estruturado, normalmente setor, equipamento e/ou ordem de serviço. Precisa localizar o item correto, informar quantidade e entender o estado da solicitação.

### Aprovador

Decide solicitações controladas. Precisa ver material, quantidade, solicitante, destino e contexto suficiente para aprovar ou rejeitar sem navegar por várias telas.

### Administrador

Mantém usuários, papéis, catálogo, localizações, políticas e consulta auditoria. A interface administrativa pode ser mais densa, mas deve continuar coerente com o ambiente operacional.

## Ambiente de uso

A aplicação é pensada para **ambiente industrial**, com uso predominante em navegador e tablet de aproximadamente 8 a 11 polegadas.

Condições esperadas:

- operador em pé e em movimento;
- iluminação forte ou irregular;
- ruído e interrupções frequentes;
- uso ocasional com luvas;
- necessidade de leitura rápida a alguma distância do rosto;
- pressão de tempo para encontrar ou entregar material;
- conexão online na Fase 1;
- teclado físico nem sempre disponível.

## Tarefas críticas

1. Localizar um produto por nome, SKU, QR ou código de barras.
2. Confirmar posição física principal e posições alternativas.
3. Consultar saldo, lote, serial, validade e custo médio quando aplicável.
4. Registrar entrada, transferência e ajuste sem permitir estoque negativo.
5. Solicitar e atender retirada com destino rastreável.
6. Aprovar ou rejeitar material controlado.
7. Identificar rapidamente ruptura, estoque baixo, reposição, validade e fragmentação.
8. Reconstruir quem fez uma ação sensível, quando e sobre qual entidade.

## Prioridades de experiência

### 1. Clareza antes de decoração

Informação operacional deve ser reconhecida antes da estética. Cor, ícone, tipografia e espaço existem para criar hierarquia, não para preencher a tela.

### 2. Densidade útil

O almoxarife precisa comparar vários materiais e eventos. Listas e tabelas compactas são preferíveis a grades de cartões grandes quando o dado é comparável.

### 3. Código é dado de primeira classe

SKU, posição, lote, serial, OS e identificadores devem usar tratamento monoespaçado e permanecer fáceis de copiar, conferir e escanear visualmente.

### 4. Cor tem significado

Âmbar indica atenção/ação operacional. Vermelho representa condição crítica ou destrutiva. Verde confirma sucesso. Azul é informativo. Nenhuma dessas cores deve existir apenas para enfeite.

### 5. Touch sem infantilizar

Alvos interativos importantes têm pelo menos 44 px, mas a interface não deve virar uma coleção de botões gigantes. O espaço interno é controlado e a densidade permanece industrial.

### 6. PT-BR direto

Rótulos e mensagens usam português brasileiro claro, evitando jargão de produto digital quando existe um termo operacional mais natural.

## Critérios de sucesso visual

Uma pessoa olhando a tela por poucos segundos deve conseguir responder:

- qual área do sistema está aberta;
- qual informação exige atenção;
- quais números são indicadores e quais são códigos;
- o que pode ser tocado/clicado;
- quais eventos são críticos e quais são apenas históricos;
- onde encontrar estoque, retiradas, alertas e auditoria.

A interface deve parecer uma ferramenta industrial deliberadamente projetada, não um template de dashboard genérico com conteúdo de almoxarifado encaixado depois.