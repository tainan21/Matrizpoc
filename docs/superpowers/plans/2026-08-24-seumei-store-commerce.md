# Seumei Store Commerce — plano de implementação

1. Persistir o catálogo demo atrás de `KeyValueStore` sem mudar o contrato tenant-bound existente.
2. Criar Store domain, fixtures de dois tenants e resolver público por slug com testes de isolamento.
3. Criar leitor de catálogo publicado vinculado somente ao contexto resolvido pela Store.
4. Criar Orders domain/repository e testes que impeçam leitura cruzada por tenant.
5. Criar serviço de comércio que cote itens com `calculateOrderItemPrice`, monte carrinho e crie pedido usando o tenant resolvido.
6. Compor runtime público e runtime autenticado sobre os mesmos namespaces de persistência demo.
7. Liberar rotas `/loja/*` fora do `AuthGate` e do shell operacional.
8. Implementar home da Store, detalhe de produto, carrinho e confirmação do pedido com view models.
9. Integrar assets individuais de catálogo gerados para a fixture Galáxia Burger.
10. Executar testes, tipos, lint, build, fluxo no navegador, responsividade, comparação visual e atualização do relatório.

