# AutoLog Maintenance V2 — Design

## Intent

Evoluir o AutoLog de um histórico de intervenções para uma aplicação clara e mobile-first de consulta e registo da manutenção concluída de dois carros pessoais. Não é uma app de abastecimentos, gestão de custos por quilómetro, agenda de manutenção ou arquivo de documentos.

## Goals

- Manter e editar uma ficha mínima por veículo: modelo, combustível e matrícula.
- Registar, editar, filtrar e consultar intervenções por veículo, data e tipo.
- Mostrar o último odómetro válido (nunca transformar a ausência de km em `0 km`).
- Apresentar uma interface clara, orientada a histórico e carros, com navegação inferior em mobile.
- Sincronizar manualmente uma única cópia `autolog_backup.json` no Google Drive, com ações explícitas para carregar e enviar.
- Exibir no cabeçalho o SHA curto do commit publicado, produzido pelo workflow GitHub Pages.
- Preservar os dados existentes `{ cars, records }` e normalizar cópias antigas ao carregar/importar.

## Non-goals

- Abastecimentos, consumos, custos por quilómetro ou cálculo de autonomia.
- Agenda, manutenção planeada, alertas por data/km ou notificações.
- Gestão de ficheiros, fotografias, documentos ou faturas no Drive.
- Backend, conta própria, base de dados ou sincronização automática.

## UX direction

Tema claro: fundo neutro, cartões brancos, texto grafite e cores semânticas reservadas a ações destrutivas/sucesso. A navegação inferior tem `Histórico`, `Carros` e `Cópia`; o histórico é a vista inicial. O detalhe de cada carro concentra identificação, último km válido, gasto acumulado e intervenções recentes. O formulário de intervenção permite km opcional e nunca assume que uma despesa administrativa tem leitura de odómetro.

## Data model

```text
{
  schemaVersion: 3,
  updatedAt: ISO timestamp,
  cars: [{ id, model, fuel, plate }],
  records: [{ id, carId, date, km?: number|string, cost, types, typeNames, notes }]
}
```

`normalizeDB` conserva `year` e `color` de backups antigos, mas a V2 deixa de os editar/exibir como campos principais. A importação só aceita arrays de carros e registos e elimina/normaliza campos inesperados sem apagar entradas válidas.

## Manual Drive sync

Usar Google Identity Services com `https://www.googleapis.com/auth/drive.file`. `Ligar ao Drive` procura e descarrega o ficheiro; `Sincronizar` cria ou atualiza a cópia. A app mostra a última ação e alterações locais pendentes. Nunca sincroniza sozinha.

## Versioning and publishing

O workflow GitHub Pages copia os ficheiros públicos para o artefacto e escreve `version.js` com os sete primeiros caracteres de `GITHUB_SHA`. `index.html` carrega esse ficheiro antes de `app.js`; no ambiente local a etiqueta mostra `local`.
