

# Plano: Enriquecer Agente Analisador com Lei 14.300 e Estrutura Enel CE

## Resumo

Integrar o conhecimento oficial da **Lei 14.300/2022** (Marco Legal da GD) e da **estrutura de faturamento da Enel CE** nos dois prompts do pipeline (OCR e Analista Especialista), tornando a analise mais precisa e as explicacoes fundamentadas em legislacao.

---

## Conhecimento a Integrar

### Da Lei 14.300/2022
- **SCEE** (Sistema de Compensacao de Energia Eletrica): creditos valem 60 meses
- **Fio B / "Taxacao do Sol"**: a partir de 07/01/2023, novos projetos pagam TUSD sobre energia injetada (transicao de 7-9 anos)
- **GD I** (antes de 07/01/2023): isento da taxacao, regra antiga por ate 2045
- **GD II/III** (apos 07/01/2023): pagam percentual crescente do Fio B
- **Custo de Disponibilidade**: minimo obrigatorio (30/50/100 kWh) - nao some com solar
- **TUSDg**: cobrada quando potencia da usina > demanda contratada (Grupo A)
- **Transferencia de creditos**: permitida entre UCs do mesmo titular
- **Bandeiras tarifarias**: nao se aplicam a energia compensada

### Da Estrutura Enel CE
- **Energia Ativa Injetada** = geracao solar enviada a rede
- **Energia Ativa Compensada** = abatimento do consumo
- **TE vs TUSD**: separacao obrigatoria na fatura
- **SCEE no rodape**: Injetada HFP, Saldo utilizado, Saldo atualizado, Creditos a Expirar
- **Impostos**: PIS/COFINS (federal), ICMS (estadual ~25% CE), CIP (municipal)
- **Legislacao**: REN ANEEL 1000/2021, REN ANEEL 1059/2023

---

## Alteracoes Tecnicas

### Arquivo unico: `supabase/functions/analyze-bill/index.ts`

### 1. Enriquecer OCR_PROMPT (~linha 452)

Adicionar apos as instrucoes especiais para Enel (linha ~596) um bloco de referencia:

```text
REFERENCIA LEGISLATIVA E ESTRUTURAL (use para identificar campos com precisao):

ESTRUTURA OFICIAL ENEL CE / DISTRIBUIDORAS:
- Energia Ativa Fornecida = consumo da rede (separado em TE e TUSD)
- Energia Ativa Injetada = geracao solar (pode aparecer como "Energia Atv Inj TE mUC" / "Energia Atv Inj TUSD mUC")
- Energia Ativa Compensada = abatimento solar do consumo
- Tabela SCEE no rodape: "Energia Injetada HFP no mes", "Saldo utilizado no mes", "Saldo atualizado", "Creditos a Expirar no proximo mes"
- Colunas da tabela: Descricao | Unid. | Quant. | Preco unit. | Valor | Base Calc. | Aliq.ICMS% | ICMS | Tarifa sem ICMS

LEI 14.300/2022 - MARCOS IMPORTANTES:
- Creditos de energia expiram em 60 meses
- Custo de Disponibilidade: Monofasico=30kWh, Bifasico=50kWh, Trifasico=100kWh
- GD I (protocolo antes 07/01/2023): compensacao integral, sem Fio B
- GD II/III (protocolo apos 07/01/2023): paga percentual crescente da TUSD sobre energia injetada
- Transferencia de creditos entre UCs do mesmo titular e permitida
- Bandeiras tarifarias NAO incidem sobre energia compensada
```

### 2. Enriquecer analystPrompt (~linha 930)

Adicionar uma secao de contexto regulatorio ao prompt do analista:

```text
CONTEXTO REGULATORIO (Lei 14.300/2022 - Marco Legal da GD):
- SCEE: creditos de energia solar valem por 60 meses. Apos esse prazo, expiram.
- CUSTO DE DISPONIBILIDADE: taxa minima obrigatoria pela conexao a rede. Monofasico=30kWh, Bifasico=50kWh, Trifasico=100kWh multiplicado pela tarifa. NAO desaparece com solar.
- FIO B ("Taxacao do Sol"): projetos protocolados apos 07/01/2023 (GD II/III) pagam percentual crescente da TUSD sobre energia injetada. Projetos anteriores (GD I) mantem compensacao integral ate ~2045.
- TE vs TUSD: TE = custo da energia em si. TUSD = custo do "fio" (transporte/distribuicao). Na fatura aparecem separados.
- TRANSFERENCIA DE CREDITOS: excedente de energia pode ser transferido para outras UCs do mesmo titular via SCEE.
- BANDEIRAS TARIFARIAS: verde (sem custo extra), amarela (R$1,885/100kWh), vermelha 1 (R$4,463/100kWh), vermelha 2 (R$7,877/100kWh). NAO incidem sobre energia compensada.
- IMPOSTOS: ICMS (estadual, CE ~25%), PIS/COFINS (federal), CIP/COSIP (municipal, iluminacao publica).

ESTRUTURA DA FATURA ENEL CE:
- "Energia Injetada HFP no mes" = total injetado fora horario ponta
- "Saldo utilizado no mes" = creditos usados para compensar consumo
- "Saldo atualizado" = creditos acumulados apos compensacao
- "Creditos a Expirar no proximo mes" = creditos com prazo de 60 meses vencendo

USE ESTE CONHECIMENTO para:
1. Explicar POR QUE cada linha da conta existe (fundamentando na legislacao)
2. Alertar sobre creditos prestes a expirar (regra dos 60 meses)
3. Identificar se o cliente e GD I ou GD II/III e explicar as implicacoes
4. Diferenciar TE e TUSD didaticamente
5. Explicar o mecanismo SCEE de compensacao e transferencia entre UCs
```

### 3. Adicionar campo GD classification ao analystPrompt

Adicionar ao JSON de saida do analista:
```json
"gd_classification": {
  "type": "GD I | GD II | GD III | Nao identificado",
  "explanation": "Explicacao de como identificou e o que isso significa para o cliente"
}
```

### 4. Deploy

Redeployar a Edge Function `analyze-bill` apos as alteracoes.

---

## Resumo de Impacto

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Precisao OCR | Termos genericos | Terminologia oficial Enel + campos SCEE exatos |
| Explicacoes | Sem base legal | Fundamentadas na Lei 14.300 |
| Creditos 60 meses | Nao alertado | Alerta automatico de expiracao |
| TE vs TUSD | Mencionado | Explicado didaticamente com base legal |
| GD I/II/III | Nao identificado | Classificacao e implicacoes |
| Fio B | Nao mencionado | Explicacao da "taxacao do sol" |

