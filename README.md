# AutoLog JAPD

Página HTML autónoma para registar e consultar as intervenções dos veículos pessoais.

## Funcionalidades

- Gestão de vários carros (modelo, ano e cor).
- Registo de idas à oficina com data, quilometragem, custo, vários tipos de intervenção e notas.
- Tipos predefinidos: inspeção, óleo, pneus, travões, filtros, correia, bateria, revisão, A/C, luzes, seguro, lavagem e outros.
- Consulta do histórico por carro e filtro de registos.
- Resumo global e por veículo: total gasto, número de registos e intervenção mais frequente.
- Persistência automática no navegador.
- Backup local por ficheiro JSON (exportar/importar).
- Backup manual no Google Drive, através de OAuth 2.0 e Drive API.
- Interface mobile-first, instalável pelo browser como atalho/app web.

## Executar

Não requer instalação nem processo de build. Abra o [index.html](index.html) num browser moderno.

Para desenvolvimento local, pode servir a pasta com qualquer servidor HTTP estático. Exemplo:

```powershell
npx serve .
```

## Dados

Os dados são guardados no `localStorage` do browser, na chave `autolog_v2`, com esta estrutura:

```json
{
  "cars": [],
  "records": []
}
```

Isto significa que limpar os dados do browser, mudar de browser ou de dispositivo remove o acesso aos dados locais. Exporte regularmente um JSON ou guarde uma cópia no Google Drive.

## Google Drive

O backup cria ou atualiza `autolog_backup.json` no Drive da conta autenticada. A configuração OAuth está directamente no `index.html`; o domínio onde a página é publicada tem de estar autorizado no Google Cloud Console para o login funcionar.

## Pontos importantes

- É uma aplicação cliente única: não existe backend, base de dados remota ou autenticação própria.
- A importação e a restauração do Drive substituem os dados actuais após confirmação.
- Apagar um carro também apaga todos os seus registos.
- A aplicação usa Google Fonts e, quando o backup está activo, comunica com as APIs Google.

## Estrutura

```text
index.html       Estrutura HTML da aplicação
styles.css       Estilos da interface
app.js           Lógica da aplicação, persistência e Google Drive
index.htmlOLD*   Versões anteriores
```
