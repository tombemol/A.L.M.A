# DESIGN.md — Industrial Control Room

## Direção

A identidade visual da A.L.M.A. é **Industrial Control Room**: uma interface escura, técnica, compacta e deliberada, inspirada em ferramentas de operação industrial e sistemas de controle, não em dashboards SaaS genéricos.

O design segue os princípios promovidos pelo **Impeccable** para reduzir padrões visuais típicos de “AI slop”: hierarquia real, poucos containers, sem decoração gratuita, tipografia intencional e sem repetição mecânica de cartões/pílulas.

## Tipografia

### Interface

**IBM Plex Sans** é a fonte principal para navegação, títulos, rótulos e texto operacional.

Fallback:

```css
font-family: "IBM Plex Sans", system-ui, sans-serif;
```

### Dados técnicos

**IBM Plex Mono** é usada para:

- SKU;
- códigos de posição;
- lotes e seriais;
- ordens de serviço;
- IDs de auditoria;
- valores técnicos que precisam de alinhamento visual.

Fallback:

```css
font-family: "IBM Plex Mono", ui-monospace, monospace;
```

## Paleta

```css
--bg: #0b0f12;
--surface: #11161a;
--surface-raised: #171d22;
--surface-hover: #1b2228;
--border: #293137;
--border-strong: #3a454d;
--text: #e7ecef;
--muted: #96a2aa;
--faint: #66747d;

--signal-amber: #e0a43a;
--signal-red: #d45d52;
--signal-green: #55a879;
--signal-blue: #6f9fbd;
```

### Uso semântico

- **Âmbar:** atenção, ação primária operacional, pendência e ponto de reposição.
- **Vermelho:** ruptura, vencido, erro ou ação destrutiva.
- **Verde:** conclusão/sucesso confirmado.
- **Azul:** informação neutra.
- **Cinza:** estado normal, histórico, metadado e estrutura.

Cores semânticas não são usadas para decoração.

## Raios

A aplicação evita o visual excessivamente arredondado.

```css
--radius-sm: 2px;
--radius-md: 4px;
--radius-lg: 6px;
```

Pílulas (`border-radius: 999px`) só são aceitáveis quando a forma comunica uma categoria compacta que realmente precisa se comportar como tag. Estados comuns devem preferir texto, barra lateral ou marcador discreto.

## Profundidade

A hierarquia usa principalmente:

1. contraste de superfície;
2. borda de 1 px;
3. tipografia;
4. espaçamento;
5. divisores.

Sombras devem ser raras. **Sem gradientes decorativos, sem glow e sem glassmorphism.**

## Espaçamento

Escala base:

```text
4  8  12  16  20  24  32 px
```

A tela deve ser densa o suficiente para operação. Não aplicar 24–32 px mecanicamente em todo container. Espaçamento maior é reservado para separação entre seções, não entre cada linha de dado.

## Navegação

### Desktop / tablet largo

- rail lateral fixo;
- item ativo marcado por superfície e borda/linha âmbar;
- ícones não vivem dentro de quadradinhos decorativos;
- nome da área atual aparece no topo do workspace;
- Alertas devem ser alcançáveis com um toque/clique a partir da navegação principal.

### Tablet estreito / celular

- navegação inferior com cinco fluxos prioritários;
- áreas secundárias podem aparecer em uma faixa compacta adicional;
- alvos interativos mínimos de 44 px;
- conteúdo permanece utilizável sem hover.

## Dashboard

Não usar um “hero card” gigante apenas para repetir o nome do produto ou slogan.

A visão geral deve ter:

- cabeçalho operacional curto;
- faixa de KPIs com divisores, não quatro cartões independentes idênticos;
- alertas relevantes;
- atividade recente;
- atalhos somente quando reduzem passos reais.

## Listas e tabelas

Produtos, estoque, alertas e auditoria são dados comparáveis. Preferir linhas densas com colunas claras.

Regras:

- primeira coluna identifica o registro;
- código técnico em IBM Plex Mono;
- valores numéricos alinhados;
- metadados com contraste reduzido, mas legível;
- linhas críticas podem usar uma barra lateral semântica;
- evitar cartão dentro de cartão.

## Alertas

Severidade deve ser reconhecida sem depender somente da cor.

Exemplos de prefixo textual:

```text
CRÍTICO   Ruptura
ATENÇÃO   Ponto de reposição
INFO      Fragmentação
```

A cor reforça o rótulo, não o substitui.

## Auditoria

Auditoria é cronológica e orientada a evidência. Deve destacar:

- data/hora;
- ator;
- ação;
- entidade;
- identificador;
- resumo da mudança.

IDs de auditoria usam IBM Plex Mono e não recebem badges decorativos.

## Botões

- ação primária: fundo âmbar, texto escuro;
- ação secundária: superfície elevada + borda;
- ação textual: sem caixa quando a hierarquia permitir;
- destrutiva: vermelho somente quando a consequência for destrutiva.

Evitar gradiente, sombra de neon e animação de escala.

## Movimento

Transições entre **120 e 180 ms**, usando opacity/background/border quando necessário.

Sem bounce, zoom ou elementos “flutuando”. Respeitar `prefers-reduced-motion`.

## Anti-padrões proibidos

- gradientes decorativos;
- glow/neon sem função;
- glassmorphism;
- hero de marketing em tela operacional;
- card dentro de card sem necessidade estrutural;
- grids de cartões idênticos para dados tabulares;
- pílula para todo estado e metadado;
- bordas arredondadas de 16–28 px como padrão;
- cor sem significado;
- ícone preso em quadrado arredondado apenas por estética;
- texto cinza de contraste insuficiente;
- animação chamativa em operação rotineira.

## Quality gate

Mudanças relevantes de frontend devem ser comparadas contra este arquivo. O detector do Impeccable pode ser executado sobre a interface para identificar drift e anti-padrões:

```bash
npx impeccable detect preview/
```

O detector complementa testes e revisão humana. Ele não substitui legibilidade operacional, acessibilidade ou coerência com `PRODUCT.md`.