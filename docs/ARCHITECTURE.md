# FireRisk — Arquitetura proposta

## Visão

O FireRisk deve ser construído como uma plataforma modular de análise e apoio à decisão. A aplicação não deve depender de uma única API externa, nem deve bloquear se uma fonte falhar.

## Camadas lógicas

```txt
UI / Map
  ↓
Application State
  ↓
Services / Use Cases
  ↓
Providers / Normalizers / Models
  ↓
External APIs / Mocks / Cache
```

## Separação de responsabilidades

### UI

Responsável por mostrar:

- mapa
- camadas
- painéis
- recomendações
- estado do sistema
- simulações

Não deve conter lógica científica ou regras operacionais críticas.

### Providers

Responsáveis por obter dados externos ou mockados.

Exemplos:

- ICNFProvider
- FIRMSProvider
- WeatherUndergroundProvider
- XWeatherProvider
- FlightRadarProvider
- MockProvider

### Normalizers

Transformam dados brutos de fontes externas em tipos internos do FireRisk.

### Models

Contêm lógica de:

- comportamento do fogo
- propagação
- risco
- apoio à decisão
- integração IA

### Simulation

Executa simulações por horizonte temporal e gera GeoJSON.

### Decision Support

Gera recomendações explicáveis com confiança, pressupostos e dados em falta.

### AI

Adapta modelo próprio FireRisk, local ou remoto, sem acoplar a aplicação ao fornecedor.

## Fluxo de dados ideal

1. Provider obtém dados brutos.
2. Normalizer converte para tipo interno.
3. Dados são guardados em estado/cache.
4. Módulos de simulação e decisão consomem os dados normalizados.
5. UI mostra mapa, painéis, recomendações e estado.

## Estado degradado

A aplicação deve suportar três estados:

- `healthy`: fontes principais disponíveis.
- `degraded`: uma ou mais fontes falharam, mas há mocks/cache/dados parciais.
- `offline`: sem dados externos, apenas app e mocks disponíveis.

## Segurança

- Chaves nunca no frontend.
- Usar API routes ou server-side proxy para chamadas com segredos.
- `.env.example` sem valores reais.
- Nunca commitar `.env` com credenciais.

## Extensibilidade

Para adicionar novo provider:

1. Criar pasta em `/lib/providers/<provider>`.
2. Implementar `FireRiskProvider<T>`.
3. Criar normalizador.
4. Adicionar status/health.
5. Adicionar testes.
6. Integrar no estado da aplicação.

Para adicionar novo modelo:

1. Criar módulo em `/lib/models/<model>`.
2. Definir entrada/saída.
3. Criar implementação mock ou simplificada.
4. Adicionar testes.
5. Integrar com UI apenas através de serviço/use case.
