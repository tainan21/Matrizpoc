# Praticies no Workbench

`/praticies` é um launcher leve para automações, snippets, atalhos e gadgets
locais. Ele lista instalados, catálogo e recentes sem transformar o Workbench em
um executor genérico de código.

## Limites

- A UI consome ViewModels locais de `src/ui/presenters`.
- Regras de instalação e recentes vêm de `@matriz/flows-praticies`.
- Estado visual fica no browser, não em `.matriz/**`.
- O Workbench não importa internals do Hub; destinos do Hub são links locais.
- A loja completa e o editor de layout ficam no Hub em
  `http://127.0.0.1:3000/praticies/apps`.

Os namespaces são deliberadamente independentes porque Hub e Workbench rodam em
origens diferentes. Sincronização entre dispositivos ou usuários não faz parte
desta versão.
