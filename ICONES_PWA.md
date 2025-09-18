# Instruções para Converter SVGs em PNGs e Gerar favicon

Os arquivos SVG fornecidos são placeholders. Para um PWA completo, você precisa convertê-los em arquivos PNG.

## Opção 1: Usar o Script de Conversão Automática

Este projeto inclui um script para converter automaticamente os SVGs em PNGs:

1. Instale o svg2png-cli globalmente:
   ```
   npm install -g svg2png-cli
   ```

2. Execute o script de conversão:
   ```
   node public/icons/convert-icons.cjs
   ```

3. O script irá gerar todos os ícones necessários e o favicon.ico

## Opção 2: Usar Ferramenta Online

1. Acesse [SVG to PNG Converter](https://svgtopng.com/)
2. Faça upload dos arquivos SVG da pasta `public/icons/`
3. Baixe as versões PNG e salve-as na mesma pasta

## Opção 3: Usar Ferramentas de Design

Se você tiver acesso a Photoshop, Illustrator, Figma ou similar:
1. Abra os arquivos SVG
2. Exporte como PNG nos tamanhos adequados
3. Salve na pasta `public/icons/`

## Tamanhos Recomendados para PWA

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## Criando o favicon.ico

1. Use o ícone de 192x192 para gerar um favicon.ico
2. Acesse [favicon.io](https://favicon.io/favicon-converter/)
3. Faça upload do ícone
4. Baixe o favicon.ico e coloque-o na pasta `public/`

Após criar todos os ícones necessários, reinicie o servidor de desenvolvimento com:

```
npm run dev
```

E verifique se seu PWA está funcionando corretamente.