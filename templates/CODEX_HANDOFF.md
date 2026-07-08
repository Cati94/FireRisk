# Prompt curto para colar no Codex

Estou a entregar-te um pacote de especificação para o projeto FireRisk. Lê primeiro todos os ficheiros deste pacote, em especial:

- README.md
- docs/ARCHITECTURE.md
- docs/SAFETY_AND_DECISION_POLICY.md
- docs/ACCEPTANCE_CRITERIA.md
- contracts/*.ts
- prompts/00_MASTER_PROMPT.md
- prompts/01_PHASE_0_1_FOUNDATION.md

Objetivo imediato:
Executar apenas a Fase 0 e Fase 1.

Regras:
- Não implementar tudo de uma vez.
- Não colocar chaves reais no código.
- Manter a app funcional mesmo quando providers externos falham.
- Criar ou atualizar README.md e .env.example no projeto real.
- Usar mocks quando não houver credenciais.
- Separar providers, normalização, modelos, simulação, apoio à decisão e visualização.

Antes de alterar muito código, resume a arquitetura atual do projeto, identifica riscos e propõe o plano incremental. Depois implementa a base mínima funcional.
