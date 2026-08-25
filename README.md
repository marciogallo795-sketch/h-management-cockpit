# H! Management Cockpit — V1

Sistema web local para gestão interna da H! Consultoria.

## Módulos
- Cockpit Executivo
- Pipeline Comercial
- Backlog
- Delivery
- Recorrentes
- Expansão
- Caixa
- Modo Reunião / Action Log

## Características da V1
- Todos os valores e metas ficam abertos para preenchimento.
- Os dados ficam salvos no navegador via LocalStorage.
- Backup e restauração por JSON.
- Oportunidade em S4 pode ser convertida em Backlog.
- Dashboard e indicadores são calculados automaticamente a partir dos registros.

## Publicação no GitHub Pages
1. Crie um repositório no GitHub, por exemplo `h-management-cockpit`.
2. Envie `index.html`, `styles.css`, `app.js` e `data.js` para a raiz.
3. Acesse **Settings > Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Escolha a branch `main` e a pasta `/ (root)`.
6. Clique em **Save**.

## Importante
GitHub Pages hospeda somente os arquivos do sistema. Os dados preenchidos ficam no navegador do computador utilizado. Use **Exportar backup** periodicamente.
