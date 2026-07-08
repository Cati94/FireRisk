# FireRisk — Critérios de aceitação

## Fase 0 — Auditoria e estabilização

- Projeto instala sem erros.
- Projeto corre localmente em Windows.
- README explica setup, install, dev e build.
- `.env.example` existe e está completo.
- Nenhuma chave real está no código.
- O mapa abre mesmo sem dados externos.
- Falhas externas são tratadas sem crash.

## Fase 1 — Providers e camadas

- Existem providers com interface comum.
- ICNF e FIRMS estão integrados ou preparados.
- Weather e aircraft mock funcionam.
- O estado dos providers é visível.
- Camadas podem ser ativadas/desativadas.
- A app suporta modo mock.

## Fase 2 — Meteorologia

- Weather Underground/PWS provider preparado.
- Vaisala Xweather provider preparado.
- Observações e forecasts normalizados.
- Painel meteorológico mostra fonte, timestamp e estado.
- Dados antigos são assinalados.
- Falta de credenciais não bloqueia a app.

## Fase 3 — Simulação

- FireBehaviorEngine existe.
- PropagationSimulator existe.
- Simulação pode correr com dados mock.
- Resultado é visualizado no mapa como GeoJSON.
- Existe zona de incerteza.
- Resultado inclui confiança, pressupostos e dados em falta.

## Fase 4 — Apoio à decisão

- DecisionSupportEngine gera recomendações.
- Cada recomendação tem prioridade, confiança, explicação, pressupostos e dados em falta.
- Linguagem é assistiva, não prescritiva.
- UI distingue recomendações de ordens operacionais.
- Falta de dados reduz confiança.

## Fase 5 — IA FireRisk

- AIModelAdapter existe.
- MockAIModelAdapter funciona sem serviços externos.
- LocalAIModelAdapter e RemoteAIModelAdapter estão preparados.
- Falha do modelo IA não quebra a app.
- Output da IA é identificado como análise assistiva.

## Fase 6 — Pós-incêndio e prevenção

- Módulo pós-incêndio existe.
- Módulo prevenção existe.
- É possível criar análises mock.
- Perímetros e prioridades podem ser mostrados no mapa.
- Relatórios/exportações estão preparados ou parcialmente implementados.

## Fase 7 — Hardening

- Testes mínimos passam.
- Build passa.
- Providers falham de forma controlada.
- Modo degradado funciona.
- Documentação está atualizada.
- Limitações conhecidas estão explícitas.
