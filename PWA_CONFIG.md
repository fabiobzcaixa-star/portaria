# Configuração do PWA - Próximos Passos

Este projeto foi configurado com os arquivos básicos para um PWA (Progressive Web App), mas são necessários alguns passos adicionais para completar a implementação:

## 1. Instalar o plugin Vite PWA

Execute o comando abaixo para instalar o plugin PWA para o Vite:

```bash
npm install -D vite-plugin-pwa
```

## 2. Descomente a configuração do PWA

Após instalar o plugin, descomente a configuração no arquivo `vite.config.ts` e importe o plugin corretamente.

## 3. Adicione ícones reais

Substitua os espaços reservados na pasta `/public/icons/` por ícones reais nas seguintes dimensões:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

Você pode usar ferramentas online como [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator) para criar esses ícones a partir de uma única imagem.

## 4. Teste o PWA

Após fazer essas alterações:
1. Execute `npm run build`
2. Teste o aplicativo usando um servidor de produção
3. Verifique se a opção "Instalar aplicativo" aparece no navegador

## 5. Personalize o tema e as cores

Ajuste o `theme_color` e `background_color` no arquivo `manifest.json` e nas meta tags para refletir a identidade visual do seu aplicativo.

## Recursos adicionais

- [Documentação do Vite PWA](https://vite-pwa-org.netlify.app/)
- [PWA Builder](https://www.pwabuilder.com/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Para testar e otimizar seu PWA