/**
 * Script para converter SVGs em PNGs para PWA
 * Este script requer o pacote svg2png-cli instalado globalmente
 * 
 * Para usar:
 * 1. Instale o svg2png-cli globalmente: npm install -g svg2png-cli
 * 2. Execute este script: node convert-icons.cjs
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Tamanhos necessários para PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Verifica se o svg2png está instalado
exec('svg2png --help', (error) => {
  if (error) {
    console.log('svg2png não encontrado. Por favor, instale com: npm install -g svg2png-cli');
    return;
  }

  // Converte o SVG base para todos os tamanhos necessários
  sizes.forEach(size => {
    const input = path.join(__dirname, 'base-icon.svg');
    const output = path.join(__dirname, `icon-${size}x${size}.png`);
    
    exec(`svg2png --width=${size} --height=${size} ${input} ${output}`, (error) => {
      if (error) {
        console.error(`Erro ao converter para ${size}x${size}:`, error);
      } else {
        console.log(`✓ Gerado: icon-${size}x${size}.png`);
      }
    });
  });

  // Gera também o favicon
  const faviconInput = path.join(__dirname, 'base-icon.svg');
  const faviconOutput = path.join(__dirname, '..', 'favicon.ico');
  
  exec(`svg2png --width=192 --height=192 ${faviconInput} ${faviconOutput}`, (error) => {
    if (error) {
      console.error('Erro ao gerar favicon:', error);
    } else {
      console.log('✓ Gerado: favicon.ico');
    }
  });
});