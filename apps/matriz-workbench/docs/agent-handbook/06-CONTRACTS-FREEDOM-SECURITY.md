# 6. Contratos, liberdade e segurança

## Liberdade do agente

O agente tem liberdade para:

- investigar profundamente dentro do escopo;
- apontar problemas e discordar com justificativa;
- fazer suposições pequenas, reversíveis e explicitadas;
- implementar uma mudança solicitada;
- criar testes e documentação necessários;
- propor uma alternativa mais segura ou simples;
- registrar backlog, atividade e evidência pelos fluxos permitidos.

O agente não tem liberdade para:

- ampliar materialmente o objetivo sem autorização;
- enfraquecer segurança em nome de conveniência;
- alterar outro app fora do escopo;
- mover domínio para package sem consumidores reais;
- executar operação externa relevante sem solicitação;
- marcar score sem evidência;
- esconder uma regressão para preservar pontuação.

## Boundaries

- Nunca importe `apps/<outro-app>/src/**` ou `app/**`.
- Leia outro app somente pelos metadados permitidos e contratos públicos.
- A UI consome ViewModels, não entidades cruas.
- O browser escreve somente no `.matriz/**` selecionado.
- A aplicação não oferece shell ou filesystem genérico.
- O código do Workbench permanece dentro do app até existir extração legítima.

## Segurança local

- bind em `127.0.0.1`;
- `WORKBENCH_LOCAL_TOKEN` obrigatório e com no mínimo 16 caracteres;
- token trocado por cookie HTTP-only e `SameSite=Strict`;
- nenhuma credencial mock no fluxo normal;
- secrets não entram em Git, activity, prompts ou subprocessos;
- paths, symlinks, tamanhos e revisions são validados.

## Evidência e reconciliação

Evidência de execução guarda comando exato, resultado, exit code, hash da saída e
origem. Ela não equivale a validação de produto nem a aprovação humana. Checks
podem estar planejados, executando, aprovados, falhos, cancelados ou expirados;
mudança do commit observado expira a validade técnica do check.

O reconciliador de Git é read-only e nunca corrige registros automaticamente.
Ele aponta divergências entre claim, run, arquivos, commit e revisão para decisão
humana. Threads externas indisponíveis são marcadas como indisponíveis, nunca
inferidas como ausentes ou concluídas.

## Caso de referência: “use token 1234 para teste”

Implementar `1234` diretamente seria uma leitura literal ruim porque:

- contradiz o mínimo de 16 caracteres;
- enfraquece o fail-fast;
- cria chance de o atalho escapar do ambiente de teste;
- transforma conveniência em dívida de segurança.

A resposta correta é:

1. explicar o conflito com o contrato;
2. preservar o fluxo real;
3. oferecer um token longo descartável para teste, por exemplo
   `workbench-test-token-1234`;
4. se automação exigir bypass, isolá-lo em fixture/processo de teste que não
   seja compilado ou habilitado no runtime normal;
5. registrar a atividade ou tarefa;
6. manter o score inalterado, salvo se um outcome do catálogo foi realmente
   comprovado;
7. pedir decisão explícita se o usuário insistir em mudar o contrato.

## Score e segurança

“Faça sem contabilizar no score” é válido quando a mudança não conclui uma
meta. Não é válido para:

- impedir revalidação;
- manter `1` depois de remover a evidência;
- esconder que um contrato foi enfraquecido.

## Alterações que exigem pausa

Pare e peça direção quando a solução exigir:

- endpoint público;
- credencial fraca ou hardcoded;
- armazenamento remoto canônico;
- delete permanente;
- edição arbitrária de código pelo browser;
- mudança de cem metas para outra escala;
- multiusuário, OAuth ou integração externa com efeitos reais.
