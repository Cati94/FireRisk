# FireRisk — Política de apoio à decisão responsável

## Princípio central

O FireRisk é uma ferramenta de apoio analítico. Não substitui comando operacional humano, autoridade competente, validação no terreno ou protocolos oficiais.

## Regras para recomendações

Toda recomendação deve incluir:

- prioridade
- confiança
- pressupostos
- dados em falta
- explicação
- validação sugerida
- timestamp

## Linguagem permitida

Usar formulações como:

- “Sugerir avaliação de...”
- “Prioridade provável...”
- “Risco elevado de...”
- “Confirmar no terreno...”
- “Dados insuficientes para...”
- “Poderá justificar reconhecimento...”
- “Considerar monitorização adicional...”

## Linguagem a evitar

Evitar recomendações que soem a ordem direta:

- “Enviar meios para...”
- “Evacuar...”
- “Atacar por...”
- “Garantido...”
- “Sem risco...”

## Incerteza

Simulações e recomendações devem mostrar incerteza de forma explícita.

Exemplos:

- `confidence: 0.42`
- `missingData: ['fuel model', 'slope', 'ground confirmation']`
- `assumptions: ['wind remains stable for next 60 minutes']`

## Dados degradados

Quando dados críticos estiverem ausentes ou antigos, o sistema deve:

- reduzir confiança
- mostrar aviso
- usar mocks/cache apenas se estiver claramente identificado
- recomendar validação no terreno

## IA

A IA FireRisk deve ser tratada como fonte de análise assistiva. Deve explicar incerteza e pressupostos. Falhas da IA não devem bloquear a operação da aplicação.
