# FireRisk — Notas de implementação

## Estratégia recomendada

Começar sempre pequeno e funcional. O risco principal é tentar implementar demasiada funcionalidade numa única ronda e criar uma base frágil.

## Ordem recomendada

1. Fazer a app correr.
2. Proteger o mapa contra falhas externas.
3. Criar providers e mocks.
4. Criar tipos internos.
5. Criar camadas no mapa.
6. Criar meteorologia mock e depois real.
7. Criar simulação simples.
8. Criar apoio à decisão heurístico.
9. Integrar IA própria como adapter.
10. Adicionar pós-incêndio e prevenção.

## Anti-padrões a evitar

- Chamar APIs com chaves diretamente no frontend.
- Misturar regras de simulação dentro de componentes React.
- Gerar recomendações sem confiança ou explicação.
- Fazer crash quando uma API devolve HTML ou JSON inválido.
- Assumir que dados meteorológicos são sempre atuais.
- Apresentar simulação como verdade absoluta.
- Criar dependências pesadas antes de haver necessidade.

## Mocks

Mocks devem ser tratados como modo oficial de desenvolvimento. Cada dado mock deve ter `source: 'mock'` ou equivalente.

## Testes mínimos

Testar primeiro:

- normalização de providers
- parsing de respostas inválidas
- cálculo básico do FireBehaviorEngine
- geração de GeoJSON da simulação
- recomendações do DecisionSupportEngine
