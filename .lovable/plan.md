

# Plano: Solo Bill Clarifier v2.0 - Modelo Final

## Visao Geral

O objetivo e transformar o Solo Bill Clarifier em um produto robusto, rapido e completo que responda as 7 perguntas fundamentais do cliente sobre sua conta de energia solar, com adicional de um **chat de IA especializado** e **FAQ inteligente** para maximizar a compreensao do usuario.

---

## O que Ja Existe (Funcionando)

| Funcionalidade | Status |
|----------------|--------|
| Autenticacao (login/signup) | OK |
| Multi-propriedades | OK |
| Divisao por ano/mes | OK |
| Upload de arquivo (imagem) | OK |
| OCR via GPT-4o | OK (mas lento) |
| Armazenamento de dados brutos (`bill_raw_data`) | OK |
| Analise especialista | OK (mas redundante) |
| 5 Cards Clarifier | OK |
| Calculo de expansao necessaria | OK |

---

## Arquitetura Proposta

```text
+------------------+       +---------------------+       +----------------------+
|   FRONTEND       |       |   EDGE FUNCTION     |       |   BANCO DE DADOS     |
|   (React)        | ----> |   analyze-bill      | ----> |   Supabase           |
+------------------+       +---------------------+       +----------------------+
                                    |
                                    v
                           +------------------+
                           |   GPT-4o (OCR)   |
                           +------------------+

+------------------+       +---------------------+
|   FRONTEND       |       |   EDGE FUNCTION     |
|   Chat Component | ----> |   bill-chat         |  <-- Nova Edge Function
+------------------+       +---------------------+
                                    |
                                    v
                           +-------------------+
                           |   Gemini/GPT      |
                           |   (Streaming)     |
                           +-------------------+
```

---

## Plano de Implementacao

### FASE 1: Otimizacao do Pipeline OCR (Prioridade Alta)

**Problema atual:** O processo esta lento e trava com frequencia.

**Solucoes:**

1. **Simplificar o pipeline para 1 chamada LLM**
   - Remover a "Analise Especialista" separada
   - Fazer o OCR ja retornar os dados estruturados + explicacoes basicas
   - Reduzir tempo de processamento de ~40s para ~15s

2. **Modo de analise rapida como padrao**
   - Extrair apenas campos essenciais para os 5 cards
   - Mover explicacoes detalhadas para o chat sob demanda

3. **Melhor tratamento de erros**
   - Timeout global de 90 segundos (reduzido de 120)
   - Retry automatico com backoff exponencial
   - Mensagens de erro mais claras para o usuario

**Campos minimos necessarios para os 5 Cards:**
```text
- total_amount
- availability_cost
- public_lighting_cost
- monitored_generation_kwh (input do usuario)
- injected_energy_kwh
- compensated_energy_kwh
- current_credits_kwh
- billed_consumption_kwh
```

---

### FASE 2: Nova Edge Function de Chat (`bill-chat`)

**Objetivo:** Permitir que o usuario faca perguntas sobre sua conta especifica.

**Funcionamento:**

1. Recebe: `analysisId` + `messages[]` (historico do chat)
2. Carrega dados completos da analise (`bill_analyses` + `bill_raw_data`)
3. Cria contexto especializado com todos os dados da conta
4. Usa Lovable AI (Gemini) para responder com streaming
5. Responde perguntas como:
   - "Por que paguei esse valor de ICMS?"
   - "O que e bandeira tarifaria?"
   - "Como posso reduzir minha conta?"

**System Prompt do Chat:**
```text
Voce e um consultor de energia solar especializado em contas de luz brasileiras.
O cliente enviou uma conta de energia e voce tem acesso a todos os dados extraidos.

DADOS DA CONTA:
{JSON dos dados extraidos}

REGRAS:
- Seja didatico e use linguagem simples
- Sempre relacione suas respostas aos dados reais da conta do cliente
- Se nao souber algo, diga que nao encontrou na conta
- Sugira acoes praticas quando apropriado
```

---

### FASE 3: Componente de Chat na UI

**Localizacao:** Dentro de `AnalysisResult.tsx`, como um drawer/modal ou secao expansivel.

**Componentes:**
- `BillChatDrawer.tsx` - Container do chat (drawer lateral)
- `ChatMessage.tsx` - Bolha de mensagem (user/assistant)
- `ChatInput.tsx` - Input com botao de enviar

**Sugestoes de perguntas pre-definidas (FAQ):**
```text
- "Por que minha conta nao zerou?"
- "O que e custo de disponibilidade?"
- "Como funcionam os creditos de energia?"
- "O que significa a bandeira tarifaria?"
- "Meu sistema esta funcionando bem?"
- "Como posso economizar mais?"
```

---

### FASE 4: FAQ Inteligente Integrado

**Objetivo:** Mostrar explicacoes contextualizadas baseadas nos dados da conta.

**Implementacao:**

1. **Cards de FAQ na pagina de resultado**
   - Aparecem baseados nos dados extraidos
   - Ex: Se `tariff_flag = "vermelha"`, mostrar card sobre bandeira tarifaria
   - Ex: Se `credits_balance > 0`, mostrar card sobre creditos

2. **Secao "Entenda sua conta"**
   - Lista de perguntas frequentes clicaveis
   - Ao clicar, abre o chat ja com a pergunta respondida

**Regras de exibicao:**
```text
SE total_amount > minimumPossible:
  MOSTRAR "Por que nao paguei so o minimo?"
  
SE tariff_flag contiver "vermelha":
  MOSTRAR "O que e bandeira vermelha?"
  
SE current_credits_kwh > 500:
  MOSTRAR "O que fazer com creditos acumulados?"
  
SE generation_efficiency < 80:
  MOSTRAR "Por que minha geracao esta baixa?"
```

---

### FASE 5: Melhorias na Visualizacao

**Novos elementos visuais:**

1. **Score visual da conta**
   - Gauge de 0-100 baseado no `bill_score`
   - Cores: Verde (>80), Amarelo (50-80), Vermelho (<50)
   - Posicao: Topo da pagina de resultado

2. **Grafico de composicao de custos**
   - Pie chart mostrando: Taxas fixas vs Consumo nao compensado vs Impostos
   - Biblioteca: Recharts (ja instalada)

3. **Timeline de creditos**
   - Mostrar evolucao dos creditos ao longo dos meses
   - Indicar data de expiracao dos creditos mais antigos

---

## Estrutura de Arquivos

### Novos arquivos a criar:

```text
supabase/functions/bill-chat/index.ts       # Nova Edge Function de chat

src/components/chat/
  BillChatDrawer.tsx                        # Drawer com chat
  ChatMessage.tsx                           # Componente de mensagem
  ChatInput.tsx                             # Input do chat
  FAQSuggestions.tsx                        # Chips de sugestoes

src/components/clarifier/
  BillScoreGauge.tsx                        # Gauge visual do score
  CostPieChart.tsx                          # Grafico de pizza
  ContextualFAQ.tsx                         # Cards de FAQ contextual
```

### Arquivos a modificar:

```text
supabase/functions/analyze-bill/index.ts    # Simplificar para 1 chamada
src/pages/AnalysisResult.tsx                # Adicionar chat + FAQ + gauge
supabase/config.toml                        # Adicionar nova funcao bill-chat
```

---

## Detalhes Tecnicos

### Edge Function `bill-chat`

```typescript
// Estrutura do payload
interface ChatRequest {
  analysisId: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

// Fluxo:
// 1. Carregar bill_analyses + bill_raw_data
// 2. Montar system prompt com contexto
// 3. Chamar Lovable AI com streaming
// 4. Retornar SSE para o frontend
```

### Streaming no Frontend

```typescript
// Usar padrao SSE ja documentado
const stream = await fetch(CHAT_URL, {
  method: "POST",
  body: JSON.stringify({ analysisId, messages }),
});

// Parse linha a linha
// Atualizar estado a cada token
```

---

## Beneficios Esperados

| Metrica | Atual | Esperado |
|---------|-------|----------|
| Tempo de processamento | 30-60s | 10-20s |
| Taxa de erro | ~15% | <5% |
| Perguntas sem resposta | Muitas | Zero (via chat) |
| Clareza para usuario | Media | Alta |
| Engajamento | 1 visualizacao | Chat interativo |

---

## Ordem de Implementacao Sugerida

1. **Primeiro:** Otimizar Edge Function `analyze-bill` (Fase 1)
2. **Segundo:** Criar Edge Function `bill-chat` (Fase 2)
3. **Terceiro:** Adicionar componente de chat na UI (Fase 3)
4. **Quarto:** Implementar FAQ contextual (Fase 4)
5. **Quinto:** Melhorias visuais (Score gauge, charts) (Fase 5)

---

## Consideracoes de Seguranca

- Chat usa `analysisId` que e validado via RLS
- Usuario so acessa dados de analises que tem permissao (`has_property_access`)
- Lovable AI API Key protegida no backend
- Nenhum dado sensivel exposto ao cliente

