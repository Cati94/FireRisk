# FireRisk — Fontes de dados previstas

## ICNF

Uso previsto:

- ocorrências ativas
- localização de incêndios
- estado de ocorrência, se disponível

Requisitos:

- normalizar resposta
- tratar HTML inesperado
- tratar indisponibilidade
- cache/fallback

## NASA FIRMS

Uso previsto:

- hotspots
- anomalias térmicas
- validação auxiliar de progressão

Requisitos:

- usar FIRMS_MAP_KEY via env
- normalizar hotspots
- distinguir fonte/satélite/confiança quando disponível

## MapTiler

Uso previsto:

- tiles
- estilos base

Requisitos:

- chave via env
- mapa deve abrir com fallback se possível

## Flightradar24

Uso previsto:

- meios aéreos de combate
- posição, heading, altitude, velocidade, callsign

Requisitos:

- integrar apenas quando houver API disponível/credenciais
- usar mocks inicialmente
- nunca expor chave no frontend

## Weather Underground / PWS

Uso previsto:

- observações meteorológicas locais por estação
- temperatura, humidade, vento, rajada, pressão, precipitação

Requisitos:

- station ids via env
- dados antigos devem ser marcados como stale
- falhas não bloqueiam simulação

## Vaisala Xweather

Uso previsto:

- condições atuais
- forecasts
- lightning
- alertas
- camadas meteorológicas

Requisitos:

- client id/secret via env
- chamadas sensíveis server-side
- normalização para tipos internos

## Fontes futuras

- modelos de combustível
- declive/exposição
- ocupação do solo
- rede viária
- pontos de água
- perímetros ardidos
- câmaras fixas
- UAV/drone
- histórico de incidentes
