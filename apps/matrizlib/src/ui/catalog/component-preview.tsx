import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  FormField,
  Heading,
  InfoHint,
  Inline,
  Input,
  Label,
  Stack,
  Surface,
  Text,
} from "@matriz/design-ui"

import type { ComponentCatalogDetailViewModel } from "../../catalog/presenters"

const candidateSpecimens = {
  layout: {
    anatomy: ["Contêiner raiz", "Regiões de conteúdo", "Regra responsiva"],
    states: ["Padrão", "Compacto", "Conteúdo longo"],
  },
  content: {
    anatomy: ["Elemento semântico", "Conteúdo", "Variação visual"],
    states: ["Padrão", "Conteúdo longo", "Ênfase"],
  },
  input: {
    anatomy: ["Rótulo", "Controle", "Ajuda e validação"],
    states: ["Padrão", "Foco", "Desabilitado", "Inválido"],
  },
  feedback: {
    anatomy: ["Indicador", "Mensagem", "Ação opcional"],
    states: ["Informativo", "Sucesso", "Alerta", "Erro"],
  },
  context: {
    anatomy: ["Gatilho", "Contexto atual", "Superfície complementar"],
    states: ["Fechado", "Aberto", "Foco por teclado"],
  },
  navigation: {
    anatomy: ["Destino atual", "Itens", "Indicador de seleção"],
    states: ["Padrão", "Atual", "Foco", "Desabilitado"],
  },
  overlay: {
    anatomy: ["Gatilho", "Superfície", "Limite de foco"],
    states: ["Fechado", "Aberto", "Saída por Escape"],
  },
  "data-display": {
    anatomy: ["Cabeçalho", "Linhas de view model", "Ações opcionais"],
    states: ["Com dados", "Vazio", "Carregando", "Erro"],
  },
  accessibility: {
    anatomy: ["Semântica nativa", "Nome acessível", "Comportamento de foco"],
    states: ["Padrão", "Foco visível", "Tecnologia assistiva"],
  },
  identity: {
    anatomy: ["Identificador visual", "Nome", "Contexto opcional"],
    states: ["Padrão", "Ausente", "Compacto"],
  },
} as const

function LivePreview({ name }: { readonly name: string }) {
  switch (name) {
    case "Stack":
      return (
        <Stack gap={2}>
          <Text>Primeiro item</Text>
          <Text>Segundo item</Text>
        </Stack>
      )
    case "Inline":
      return (
        <Inline gap={3}>
          <Badge tone="brand">Alpha</Badge>
          <Badge>Beta</Badge>
        </Inline>
      )
    case "Container":
      return (
        <Container size="md">
          <Text>Conteúdo limitado pelo contêiner público.</Text>
        </Container>
      )
    case "Surface":
      return (
        <Surface variant="raised">
          <Text>Superfície semântica elevada.</Text>
        </Surface>
      )
    case "Heading":
      return <Heading level={3}>Hierarquia explícita</Heading>
    case "Text":
      return <Text tone="muted">Texto de apoio com tom semântico.</Text>
    case "Button":
      return <Button>Ação principal</Button>
    case "Label":
      return (
        <Stack gap={2}>
          <Label htmlFor="label-preview-field">Nome do campo</Label>
          <Input id="label-preview-field" />
        </Stack>
      )
    case "Input":
      return <Input aria-label="Campo de exemplo" placeholder="Digite um valor" />
    case "FormField":
      return (
        <FormField id="form-field-preview" label="E-mail" helper="Use seu endereço de trabalho.">
          <Input type="email" />
        </FormField>
      )
    case "Badge":
      return <Badge tone="success">Publicado</Badge>
    case "Alert":
      return (
        <Alert title="Contrato verificado" tone="success">
          O componente está disponível pelo export público.
        </Alert>
      )
    case "EmptyState":
      return (
        <EmptyState
          title="Nada por aqui"
          description="A região está vazia e oferece contexto antes da próxima ação."
        />
      )
    case "InfoHint":
      return <InfoHint label="Entender o contrato">Contexto curto, acionável e acessível.</InfoHint>
    default:
      return (
        <Alert title="Preview indisponível" tone="warning">
          O metadata público existe, mas este specimen ainda precisa de uma composição auditada.
        </Alert>
      )
  }
}

export function ComponentPreview({
  component,
}: {
  readonly component: ComponentCatalogDetailViewModel
}) {
  if (component.stage === "available") {
    return (
      <section
        aria-label={`Preview ao vivo de ${component.name}`}
        className="component-preview component-preview--live"
      >
        <span className="component-preview__label">Export público · render real</span>
        <div className="component-preview__stage">
          <LivePreview name={component.name} />
        </div>
      </section>
    )
  }

  const specimen = candidateSpecimens[component.category]

  return (
    <section
      aria-label={`Anatomia planejada de ${component.name}`}
      className="component-preview component-preview--candidate"
    >
      <span className="component-preview__label">Specimen editorial · sem API publicada</span>
      <div className="candidate-specimen" aria-hidden="true">
        <span className="candidate-specimen__trigger">01</span>
        <span className="candidate-specimen__body">{component.name}</span>
        <span className="candidate-specimen__meta">{component.categoryLabel}</span>
      </div>
      <div className="candidate-specimen__notes">
        <div>
          <Heading level={3}>Anatomia pretendida</Heading>
          <ul>
            {specimen.anatomy.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <Heading level={3}>Estados previstos</Heading>
          <ul>
            {specimen.states.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
