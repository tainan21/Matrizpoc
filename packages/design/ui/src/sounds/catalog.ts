import type { SoundDefinition, SoundId } from "./types"

export const SOUND_IDS = [
  "system.start",
  "system.end",
  "notification",
  "message",
  "order",
  "success",
  "error",
  "warning",
  "interaction",
  "navigation",
  "open",
  "close",
] as const satisfies readonly SoundId[]

export const soundCatalog = Object.freeze([
  { id: "system.start", name: "Inicialização", description: "Confirma que uma experiência Matriz foi iniciada.", category: "system", status: "available", assetKey: "system-start.wav", defaultVolume: 0.7, defaultEnabled: true, accessibility: "Reproduzir somente quando o produto solicitar inicialização e a política do ambiente permitir." },
  { id: "system.end", name: "Encerramento", description: "Sinaliza encerramento ou logout sem bloquear o fluxo.", category: "system", status: "available", assetKey: "system-end.wav", defaultVolume: 0.65, defaultEnabled: true, accessibility: "Nunca aguardar o término do áudio para concluir logout ou fechamento." },
  { id: "notification", name: "Notificação", description: "Informa uma atualização administrativa ou geral.", category: "communication", status: "available", assetKey: "notification.wav", defaultVolume: 0.7, defaultEnabled: true, accessibility: "A notificação precisa manter alternativa visual e textual equivalente." },
  { id: "message", name: "Mensagem", description: "Identifica a chegada de uma nova mensagem.", category: "communication", status: "available", assetKey: "message.wav", defaultVolume: 0.62, defaultEnabled: true, accessibility: "Não repetir continuamente nem substituir a indicação visual de mensagem." },
  { id: "order", name: "Pedido", description: "Destaca a chegada de um novo pedido ou evento comercial.", category: "commerce", status: "available", assetKey: "order.wav", defaultVolume: 0.78, defaultEnabled: true, accessibility: "Combinar com estado visual persistente para operações que exigem atenção." },
  { id: "success", name: "Sucesso", description: "Confirma a conclusão positiva de uma ação.", category: "status", status: "available", assetKey: "success.wav", defaultVolume: 0.68, defaultEnabled: true, accessibility: "O resultado positivo também deve ser anunciado ou exibido em texto." },
  { id: "error", name: "Erro", description: "Sinaliza que uma ação não pôde ser concluída.", category: "status", status: "available", assetKey: "error.wav", defaultVolume: 0.72, defaultEnabled: true, accessibility: "Fornecer mensagem de erro acionável; áudio nunca é a única indicação." },
  { id: "warning", name: "Alerta", description: "Chama atenção para uma condição que requer avaliação.", category: "status", status: "available", assetKey: "warning.wav", defaultVolume: 0.66, defaultEnabled: true, accessibility: "Usar com parcimônia e acompanhar de explicação visível." },
  { id: "interaction", name: "Interação", description: "Oferece retorno discreto a uma ação deliberada.", category: "interaction", status: "available", assetKey: "interaction.wav", defaultVolume: 0.42, defaultEnabled: true, accessibility: "Manter opt-in e evitar em ações repetitivas ou digitação." },
  { id: "navigation", name: "Navegação", description: "Confirma uma mudança de contexto ou rota concluída.", category: "interaction", status: "available", assetKey: "navigation.wav", defaultVolume: 0.48, defaultEnabled: true, accessibility: "Tocar após a navegação confirmada e nunca como pré-requisito da rota." },
  { id: "open", name: "Abrir", description: "Sinaliza a abertura de uma superfície temporária.", category: "interaction", status: "available", assetKey: "open.wav", defaultVolume: 0.46, defaultEnabled: true, accessibility: "O foco e o estado expandido continuam sendo as indicações primárias." },
  { id: "close", name: "Fechar", description: "Sinaliza o fechamento de uma superfície temporária.", category: "interaction", status: "available", assetKey: "close.wav", defaultVolume: 0.44, defaultEnabled: true, accessibility: "O retorno de foco continua obrigatório mesmo quando o som estiver desativado." },
] satisfies readonly SoundDefinition[])
