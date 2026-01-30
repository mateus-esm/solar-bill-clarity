
# Plano: Migração do OCR para Lovable AI Gateway com Fallback

## Resumo

Migrar a função `performOCRExtraction` no Edge Function `analyze-bill` para usar o **Lovable AI Gateway (Gemini)** como provedor principal, mantendo o **OpenAI GPT-4o** como fallback automático caso o Gemini falhe.

---

## Arquitetura da Solução

```text
+------------------+
|   analyze-bill   |
+------------------+
         |
         v
+------------------+     Sucesso     +------------------+
|  Gemini (Lovable)|  ------------>  |  Retorna dados   |
|    API Gateway   |                 |     extraídos    |
+------------------+                 +------------------+
         |
         | Falha (erro, timeout, etc)
         v
+------------------+     Sucesso     +------------------+
|   OpenAI GPT-4o  |  ------------>  |  Retorna dados   |
|    (Fallback)    |                 |     extraídos    |
+------------------+                 +------------------+
         |
         | Falha
         v
+------------------+
|   Erro retornado |
|    ao usuário    |
+------------------+
```

---

## Alterações Técnicas

### 1. Modificar função `performOCRExtraction`

**Atual (linha 370-647):**
- Usa apenas OpenAI GPT-4o
- `OPENAI_API_KEY` como única dependência

**Novo:**
- Tenta primeiro com Gemini via Lovable AI Gateway
- Se falhar, faz fallback para OpenAI
- Loga qual provider foi usado

### 2. Criar funções separadas para cada provider

```typescript
// Chamada para Lovable AI (Gemini)
async function callOCRWithGemini(
  imageDataUrl: string, 
  lovableApiKey: string, 
  ocrPrompt: string
): Promise<RawBillData>

// Chamada para OpenAI (Fallback)
async function callOCRWithOpenAI(
  imageDataUrl: string, 
  openaiApiKey: string, 
  ocrPrompt: string
): Promise<RawBillData>
```

### 3. Lógica de fallback

```typescript
let rawData: RawBillData = {};
let providerUsed = "gemini";

try {
  rawData = await callOCRWithGemini(imageDataUrl, LOVABLE_API_KEY, ocrPrompt);
} catch (geminiError) {
  console.warn("⚠️ Gemini OCR failed, falling back to OpenAI:", geminiError);
  providerUsed = "openai";
  
  try {
    rawData = await callOCRWithOpenAI(imageDataUrl, OPENAI_API_KEY, ocrPrompt);
  } catch (openaiError) {
    console.error("❌ Both OCR providers failed");
    throw new Error("Não foi possível processar a imagem. Tente novamente.");
  }
}

console.log(`✅ OCR completed using ${providerUsed}`);
```

### 4. Tratamento de erros específicos

| Erro | Provider | Ação |
|------|----------|------|
| 429 (Rate Limit) | Gemini | Fallback para OpenAI |
| 402 (Créditos) | Gemini | Fallback para OpenAI |
| 500 (Server Error) | Gemini | Fallback para OpenAI |
| Timeout | Gemini | Fallback para OpenAI |
| insufficient_quota | OpenAI | Mensagem clara ao usuário |
| Todos falham | Ambos | Erro genérico |

### 5. Atualizar registro de provider usado

Quando salvar no `bill_raw_data`, registrar qual modelo foi usado:

```typescript
extraction_model: providerUsed === "gemini" 
  ? "gemini-3-flash-preview" 
  : "gpt-4o"
```

---

## Configuração de Variáveis

Ambas as API keys já estão configuradas:
- `LOVABLE_API_KEY` - Já existe e funciona (usado no bill-chat)
- `OPENAI_API_KEY` - Já existe (quota esgotada, mas será fallback)

---

## Benefícios

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Disponibilidade | Depende só de OpenAI | Dois providers |
| Custo | Pago separadamente | Lovable incluído |
| Resiliência | Falha se OpenAI cair | Fallback automático |
| Debugging | 1 fonte de erro | Logs claros de qual provider |

---

## Arquivo a Modificar

- `supabase/functions/analyze-bill/index.ts`
  - Linhas 370-647: Refatorar `performOCRExtraction`
  - Linhas 958, 975: Atualizar referências ao modelo usado
  - Adicionar funções auxiliares `callOCRWithGemini` e `callOCRWithOpenAI`

---

## Formato de Chamada ao Lovable AI Gateway

```typescript
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${lovableApiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: ocrPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: "Extraia TODOS os dados desta conta de energia:" },
          { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
        ],
      },
    ],
    max_tokens: 8000,
    temperature: 0,
  }),
});
```

---

## Testes Recomendados

1. **Upload de conta válida** - Deve usar Gemini e retornar dados
2. **Simular erro no Gemini** - Verificar fallback para OpenAI nos logs
3. **Verificar logs** - Confirmar qual provider foi usado em cada análise
