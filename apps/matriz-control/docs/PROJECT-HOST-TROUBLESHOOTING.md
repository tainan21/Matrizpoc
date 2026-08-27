# Project Host — solução de problemas

- **Revisão necessária:** o manifesto ou lockfile mudou. Inspecione novamente e aprove a nova revisão.
- **Gerenciadores conflitantes:** mantenha apenas o lockfile correspondente ao gerenciador real e reinspecione.
- **Porta ocupada:** o Control não encerra listeners estrangeiros. Libere a porta ou ajuste o script no projeto e reinspecione.
- **Processo encerrou cedo:** execute a ação fora do Control para diagnosticar dependências, corrija o projeto e tente novamente. Logs exibidos pelo Control são limitados e redigidos.
- **Prontidão expirou:** confirme que a ação escuta na porta detectada e responde no caminho de health configurado.
- **Abriu no navegador externo:** a resposta recusou embedding, falhou no carregamento ou a superfície foi declarada externa. O fallback é intencional.
- **Projeto bloqueado:** raízes sensíveis, escape por junction/symlink, limites excedidos ou receita ambígua falham de modo fechado.
- **Após reiniciar o Control:** processos desaparecidos são reconciliados como parados; processos externos não são adotados automaticamente.

Não coloque segredos em scripts, argumentos ou logs. Variáveis permitidas aparecem na UI somente pelo nome, nunca pelo valor.
