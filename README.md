# CortaFlow

MVP web para cortar vídeos e áudios diretamente no navegador, sem créditos, planos ou paywall.

## O que já funciona

- upload local por clique ou drag-and-drop;
- leitura de duração e metadados básicos;
- player de vídeo e áudio;
- seleção precisa de início e fim;
- preview do trecho;
- exportação local usando `MediaRecorder` + `captureStream` quando suportado pelo navegador;
- histórico dos cortes exportados durante a sessão;
- tema claro/escuro;
- layout responsivo para desktop, tablet e mobile;
- estados honestos para recursos que ainda dependem de backend/IA.

## Recursos preparados, mas ainda não conectados

- importação autorizada por URL/YouTube;
- transcrição sincronizada;
- busca semântica e “Encontrar momentos”;
- embeddings e IA;
- persistência no Supabase;
- renderização avançada/4K no servidor.

Nenhum desses recursos retorna dados falsos: a interface informa quando a integração ainda não está configurada.

## Desenvolvimento

```bash
npm install
npm run dev
```

Validação:

```bash
npm run build
npm run lint
```

## Arquitetura atual

- React + TypeScript + Vite;
- processamento inicial local no navegador;
- engine de corte em `src/lib/media.ts`;
- UI dividida entre Home (`StartPanel`) e Studio (`Studio`);
- CSS com tokens próprios, responsividade e `prefers-reduced-motion`.

## Próxima fase recomendada

Conectar um backend seguro para upload persistente, transcrição, busca semântica e renderização assíncrona. Chaves de IA e credenciais privilegiadas nunca devem ser expostas no cliente.
