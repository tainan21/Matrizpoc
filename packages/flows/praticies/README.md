# @matriz/flows-praticies

Shared application flow for installable local utilities. It is consumed by Matriz Hub
and Matriz Workbench while each app owns its UI, navigation and destination mapping.

The package follows dependency inversion: `PraticiesService` depends on a repository
port, and `createStoredPraticiesRepository` adapts `KeyValueStore`. Browser state is a
versioned UI preference and is deliberately namespaced by each consumer.
