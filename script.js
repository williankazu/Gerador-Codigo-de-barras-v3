
    // Utilidades -------------------------
    const $ = (sel, el=document) => el.querySelector(sel);
    const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

    const mmToPx = (mm) => mm * 3.7795275591; // ~96dpi

    const currencyBR = (valStr) => {
      if (!valStr) return '';
      // Normaliza: "12,90" -> 12.90 | "1290" -> 1290.00 (interpreta como 1290 reais)
      let s = String(valStr).trim();
      if (/^\d+$/.test(s)) { // só dígitos -> números inteiros em reais
        const n = Number(s);
        return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      }
      const n = Number(s.replace(/\./g,'').replace(',', '.'));
      if (Number.isNaN(n)) return '';
      return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // ===== Geradores de códigos =====
    // Gera EAN-13 válido com prefixo brasileiro (789 ou 790)
    const genEAN13 = () => {
      // Prefixo GS1 Brasil: 789 ou 790
      const prefix = Math.random() < 0.5 ? '789' : '790';
      
      // Gera os 9 dígitos restantes aleatoriamente
      let base = prefix;
      for (let i = 0; i < 9; i++) {
        base += Math.floor(Math.random() * 10);
      }
      
      // Calcula o dígito verificador (algoritmo EAN-13 padrão)
      const digits = base.split('').map(Number);
      let sum = 0;
      
      // Índices pares (0,2,4,6,8,10) multiplicam por 1
      // Índices ímpares (1,3,5,7,9,11) multiplicam por 3
      for (let i = 0; i < 12; i++) {
        sum += digits[i] * (i % 2 === 0 ? 1 : 3);
      }
      
      const checkDigit = (10 - (sum % 10)) % 10;
      return base + String(checkDigit);
    };
    
    // Valida dígito verificador de um EAN-13
    const validateEAN13 = (code) => {
      if (!/^\d{13}$/.test(code)) return false;
      
      const digits = code.split('').map(Number);
      let sum = 0;
      
      // Calcula soma dos primeiros 12 dígitos
      for (let i = 0; i < 12; i++) {
        sum += digits[i] * (i % 2 === 0 ? 1 : 3);
      }
      
      const calculatedCheck = (10 - (sum % 10)) % 10;
      const providedCheck = digits[12];
      
      return calculatedCheck === providedCheck;
    };

    const genCODE128 = (len = 10) => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // evita 0/O/1/I
      let s = '';
      for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
      return s;
    };

    const generateAndFill = () => {
      const format = $('#p-format').value;
      const val = format === 'EAN13' ? genEAN13() : genCODE128(10);
      $('#p-code').value = val;
    };

    // Estado -----------------------------
    let items = []; // {name, priceStr, code, format, qty}

    // Persistência local
    const saveState = () => {
      localStorage.setItem('barcode_items', JSON.stringify(items));
      const layout = {
        cols: Number($('#opt-cols').value),
        gap: Number($('#opt-gap').value),
        w: Number($('#opt-w').value),
        h: Number($('#opt-h').value),
        pad: Number($('#opt-pad').value),
        barH: Number($('#opt-bar-h').value),
        barW: Number($('#opt-bar-w').value),
        font: Number($('#opt-font').value),
        showBorders: $('#opt-borders').checked,
        showName: $('#opt-show-name').checked,
        showPrice: $('#opt-show-price').checked,
        showCode: $('#opt-show-code').checked,
      };
      localStorage.setItem('barcode_layout', JSON.stringify(layout));
    };

    const loadState = () => {
      const it = localStorage.getItem('barcode_items');
      if (it) items = JSON.parse(it);
      const ly = localStorage.getItem('barcode_layout');
      if (ly) {
        const layout = JSON.parse(ly);
        $('#opt-cols').value = layout.cols ?? 3;
        $('#opt-gap').value  = layout.gap  ?? 4;
        $('#opt-w').value    = layout.w    ?? 65;
        $('#opt-h').value    = layout.h    ?? 35;
        $('#opt-pad').value  = layout.pad  ?? 3;
        $('#opt-bar-h').value= layout.barH ?? 18;
        $('#opt-bar-w').value= layout.barW ?? 1.6;
        $('#opt-font').value = layout.font ?? 12;
        $('#opt-borders').checked   = layout.showBorders ?? true;
        $('#opt-show-name').checked = layout.showName ?? true;
        $('#opt-show-price').checked= layout.showPrice ?? true;
        $('#opt-show-code').checked = layout.showCode ?? true;
      }
    };

    // Render tabela de itens
    const renderItemsTable = () => {
      const tbody = $('#items-table tbody');
      tbody.innerHTML = '';
      items.forEach((it, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${it.name}</td>
          <td><code>${it.code}</code></td>
          <td>${it.format}</td>
          <td>${it.qty}</td>
          <td class="has-text-right">
            <button class="button is-small is-danger is-light" data-rm="${idx}">Remover</button>
          </td>`;
        tbody.appendChild(tr);
      });
      // remover listeners
      $$('button[data-rm]').forEach(btn => {
        btn.addEventListener('click', e => {
          const i = Number(e.currentTarget.getAttribute('data-rm'));
          items.splice(i,1);
          saveState();
          renderItemsTable();
          buildPreview(); // Atualiza preview após remoção
        });
      });
    };

    // Aplica variáveis CSS da grade
    const applyGridVars = () => {
      const area = $('#print-area');
      area.style.setProperty('--cols', $('#opt-cols').value);
      area.style.setProperty('--label-w', $('#opt-w').value + 'mm');
      area.style.setProperty('--label-h', $('#opt-h').value + 'mm');
      area.style.setProperty('--gap', $('#opt-gap').value + 'mm');
      area.style.setProperty('--pad', $('#opt-pad').value + 'mm');

      // Borda on/off
      const showBorders = $('#opt-borders').checked;
      $$('.label-card', area).forEach(el => {
        el.style.border = showBorders ? '1px dashed rgba(255,133,85,.35)' : 'none';
      });
    };

    // Validação e normalização de EAN13
    const isValidEANInput = (str) => /^\d{12,13}$/.test(str);
    
    const normalizeEAN13 = (code) => {
      code = code.replace(/\D/g, '');
      
      if (code.length === 13) {
        // Valida o dígito verificador fornecido
        if (!validateEAN13(code)) {
          throw new Error('Dígito verificador inválido');
        }
        return code;
      } else if (code.length === 12) {
        // Calcula e adiciona o dígito verificador
        const digits = code.split('').map(Number);
        let sum = 0;
        for (let i = 0; i < 12; i++) {
          sum += digits[i] * (i % 2 === 0 ? 1 : 3);
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        return code + String(checkDigit);
      } else {
        throw new Error('EAN-13 deve ter 12 ou 13 dígitos');
      }
    };

    // Gera o preview completo
    const buildPreview = () => {
      applyGridVars();
      const area = $('#print-area');
      area.innerHTML = '';

      const showName  = $('#opt-show-name').checked;
      const showPrice = $('#opt-show-price').checked;
      const showCode  = $('#opt-show-code').checked;

      const barHeightPx = Math.round(mmToPx(Number($('#opt-bar-h').value)));
      const barWidthPx  = Number($('#opt-bar-w').value);
      const fontSizePx  = Number($('#opt-font').value);

      // Duplicar itens por quantidade e criar rótulos
      const labels = [];
      items.forEach(it => {
        for (let i=0;i<Number(it.qty||1);i++) labels.push(it);
      });

      labels.forEach((it) => {
        const card = document.createElement('div');
        card.className = 'label-card';

        // Top line: nome + preço
        const topline = document.createElement('div');
        topline.className = 'topline';
        if (showName) {
          const name = document.createElement('div');
          name.className = 'name';
          name.textContent = it.name;
          topline.appendChild(name);
        } else {
          const spacer = document.createElement('div');
          topline.appendChild(spacer);
        }
        if (showPrice && it.priceStr) {
          const price = document.createElement('div');
          price.className = 'price';
          price.textContent = currencyBR(it.priceStr); // sempre com R$
          topline.appendChild(price);
        }
        card.appendChild(topline);

        // Área do barcode
        const wrap = document.createElement('div');
        wrap.className = 'barcode-wrap';
        const canvas = document.createElement('canvas');
        wrap.appendChild(canvas);
        card.appendChild(wrap);

        // Rodapé opcional (código)
        if (showCode) {
          const codeTxt = document.createElement('div');
          codeTxt.className = 'muted';
          codeTxt.textContent = it.code;
          card.appendChild(codeTxt);
        }

        area.appendChild(card);

        // Render do JsBarcode
        try {
          let codeToRender = it.code;
          
          // Para EAN-13, valida e normaliza
          if (it.format === 'EAN13') {
            if (!isValidEANInput(it.code)) {
              throw new Error('EAN‑13 requer 12 ou 13 dígitos');
            }
            codeToRender = normalizeEAN13(it.code);
          }
          
          JsBarcode(canvas, codeToRender, {
            format: it.format,
            displayValue: false,
            height: barHeightPx,
            width: barWidthPx,
            fontSize: fontSizePx,
            margin: 0,
            lineColor: '#111',
          });
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          
        } catch (err) {
          const warn = document.createElement('div');
          warn.className = 'has-text-danger is-size-7';
          warn.textContent = 'Erro: ' + err.message;
          card.appendChild(warn);
        }
      });
    };

    // ==== Suporte de impressão confiável (canvas -> imagem) ====
    let _printSwap = [];
    const swapCanvasesForImages = () => {
      _printSwap = [];
      const canvases = $$('#print-area canvas');
      console.log('Convertendo', canvases.length, 'canvas para imagens...');
      
      canvases.forEach(c => {
        try {
          const img = new Image();
          const dataURL = c.toDataURL('image/png');
          img.src = dataURL;
          img.style.width = '100%';
          img.style.height = 'auto';
          img.style.display = 'block';
          img.className = 'barcode-img';
          
          c.dataset.hiddenForPrint = '1';
          c.style.display = 'none';
          c.parentNode.insertBefore(img, c.nextSibling);
          _printSwap.push({ canvas: c, img });
        } catch(err) {
          console.error('Erro ao converter canvas:', err);
        }
      });
      console.log('Conversão concluída:', _printSwap.length, 'imagens criadas');
    };
    
    const restoreCanvases = () => {
      console.log('Restaurando canvases...');
      _printSwap.forEach(({canvas, img}) => {
        if (img && img.parentNode) img.parentNode.removeChild(img);
        if (canvas) {
          canvas.style.display = '';
          delete canvas.dataset.hiddenForPrint;
        }
      });
      _printSwap = [];
    };
    
    // Eventos de impressão
    window.addEventListener('beforeprint', () => {
      console.log('beforeprint disparado');
      swapCanvasesForImages();
    });
    
    window.addEventListener('afterprint', () => {
      console.log('afterprint disparado');
      restoreCanvases();
    });

    // Eventos ----------------------------
    document.addEventListener('DOMContentLoaded', () => {
      loadState();
      renderItemsTable();
      applyGridVars();
      if (items.length) {
        buildPreview();
      } else {
        $('#print-area').innerHTML = '<div class="has-text-grey has-text-centered p-6">Nenhum item para exibir. Adicione produtos para gerar o preview.</div>';
      }
    });

    $('#product-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#p-name').value.trim();
      const priceStr = $('#p-price').value.trim();
      const qty = Math.max(1, Number($('#p-qty').value || 1));
      if ($('#p-auto') && $('#p-auto').checked && !$('#p-code').value) { generateAndFill(); }
      let code = $('#p-code').value.trim();
      const format = $('#p-format').value;

      // Sanitização básica
      code = format === 'EAN13' ? code.replace(/\D/g,'') : code.replace(/\s+/g,'');

      if (!name || !code) {
        alert('Preencha nome e código.');
        return;
      }
      
      // Validação e normalização de EAN-13
      if (format === 'EAN13') {
        if (!isValidEANInput(code)) {
          alert('Para EAN‑13 use 12 ou 13 dígitos numéricos.');
          return;
        }
        try {
          code = normalizeEAN13(code);
        } catch (err) {
          alert('Erro no código EAN-13: ' + err.message);
          return;
        }
      }

      items.push({ name, priceStr, code, format, qty });
      saveState();
      renderItemsTable();
      buildPreview(); // Atualiza preview automaticamente
      (e.target).reset();
      $('#p-qty').value = 1;
      $('#p-format').value = 'CODE128';
      if ($('#p-auto')) {
        $('#p-auto').checked = false;
        $('#p-code').disabled = false;
      }
    });

    $('#btn-demo').addEventListener('click', () => {
      // 3 exemplos rápidos com códigos EAN-13 válidos (dígito verificador correto)
      items.push(
        { name: 'Fita Crepe 18mm', priceStr: '7,90',  code: '7891234567895', format: 'EAN13', qty: 6 },
        { name: 'Parafuso 5x30',   priceStr: '0,50',  code: 'PAR05X30',       format: 'CODE128', qty: 8 },
        { name: 'Massa Corrida 1kg', priceStr: '22,90', code: '7899876543215', format: 'EAN13', qty: 4 },
      );
      saveState();
      renderItemsTable();
      buildPreview(); // Atualiza preview automaticamente
    });

    $('#btn-clear').addEventListener('click', () => {
      if (!confirm('Remover todos os itens?')) return;
      items = [];
      saveState();
      renderItemsTable();
      $('#print-area').innerHTML = '<div class="has-text-grey has-text-centered p-6">Nenhum item para exibir. Adicione produtos para gerar o preview.</div>';
    });

    $('#btn-export').addEventListener('click', () => {
      const data = { items };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'itens-codigos-barras.json';
      a.click(); URL.revokeObjectURL(url);
    });

    $('#file-import').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (Array.isArray(data.items)) {
            items = data.items;
            saveState();
            renderItemsTable();
            buildPreview(); // Atualiza preview após importar
          } else {
            alert('Arquivo inválido.');
          }
        } catch(err) {
          alert('Erro ao importar: ' + err.message);
        }
      };
      reader.readAsText(file);
    });

    // Atualiza layout/preview
    $('#btn-preview').addEventListener('click', () => {
      saveState();
      buildPreview();
      // Scroll suave até a área de preview
      setTimeout(() => {
        $('#print-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    });

    // Atualiza variáveis de grade ao alterar qualquer input de layout
    ;['#opt-cols','#opt-gap','#opt-w','#opt-h','#opt-pad','#opt-borders','#opt-show-name','#opt-show-price','#opt-show-code','#opt-bar-h','#opt-bar-w','#opt-font']
    .forEach(id => {
      $(id).addEventListener('change', () => {
        saveState();
        if (items.length > 0) buildPreview(); // Só reconstrói se houver itens
      });
    });

    // Auto-geração: UI listeners
    if ($('#p-auto')) {
      $('#p-auto').addEventListener('change', (e) => {
        const checked = e.target.checked;
        $('#p-code').disabled = checked;
        if (checked) generateAndFill();
      });
    }
    if ($('#btn-generate')) {
      $('#btn-generate').addEventListener('click', () => generateAndFill());
    }
    $('#p-format').addEventListener('change', () => {
      const format = $('#p-format').value;
      const codeInput = $('#p-code');
      
      // Atualiza placeholder baseado no formato
      if (format === 'EAN13') {
        codeInput.placeholder = 'Ex.: 789123456789 (12 dígitos)';
      } else {
        codeInput.placeholder = 'Ex.: ABC123 ou PROD001';
      }
      
      // Se auto-geração estiver ativa, gera novo código
      if ($('#p-auto') && $('#p-auto').checked) generateAndFill();
    });

    // Imprimir
    $('#btn-print').addEventListener('click', () => {
      if (!items.length) {
        if (!confirm('Nenhum item na lista. Imprimir mesmo assim?')) return;
      }
      
      console.log('Preparando impressão...');
      buildPreview();
      
      // Aguarda renderização completa antes de imprimir
      setTimeout(() => {
        console.log('Iniciando impressão');
        window.print();
      }, 800);
    });
  