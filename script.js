
    const $ = (sel, el=document) => el.querySelector(sel);
    const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));
    const mmToPx = (mm) => mm * 3.7795275591;

    const currencyBR = (valStr) => {
      if (!valStr) return '';
      let s = String(valStr).trim();
      if (/^\d+$/.test(s)) {
        return Number(s).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      }
      const n = Number(s.replace(/\./g,'').replace(',', '.'));
      return Number.isNaN(n) ? '' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const genEAN13 = () => {
      const prefix = Math.random() < 0.5 ? '789' : '790';
      let base = prefix;
      for (let i = 0; i < 9; i++) base += Math.floor(Math.random() * 10);
      const digits = base.split('').map(Number);
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += digits[i] * (i % 2 === 0 ? 1 : 3);
      }
      return base + String((10 - (sum % 10)) % 10);
    };

    const validateEAN13 = (code) => {
      if (!/^\d{13}$/.test(code)) return false;
      const digits = code.split('').map(Number);
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += digits[i] * (i % 2 === 0 ? 1 : 3);
      }
      return ((10 - (sum % 10)) % 10) === digits[12];
    };

    const genCODE128 = (len = 10) => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let s = '';
      for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
      return s;
    };

    const generateAndFill = () => {
      const format = $('#p-format').value;
      $('#p-code').value = format === 'EAN13' ? genEAN13() : genCODE128(10);
    };

    const isValidEANInput = (str) => /^\d{12,13}$/.test(str);

    const normalizeEAN13 = (code) => {
      code = code.replace(/\D/g, '');
      if (code.length === 13) {
        if (!validateEAN13(code)) throw new Error('Dígito verificador inválido');
        return code;
      } else if (code.length === 12) {
        const digits = code.split('').map(Number);
        let sum = 0;
        for (let i = 0; i < 12; i++) {
          sum += digits[i] * (i % 2 === 0 ? 1 : 3);
        }
        return code + String((10 - (sum % 10)) % 10);
      } else {
        throw new Error('EAN-13 deve ter 12 ou 13 dígitos');
      }
    };

    let items = [];
    let editingIndex = -1;

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

    const getSavedLists = () => {
      const saved = localStorage.getItem('barcode_saved_lists');
      return saved ? JSON.parse(saved) : {};
    };

    const saveNamedList = (name) => {
      const lists = getSavedLists();
      lists[name] = {
        items: items,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('barcode_saved_lists', JSON.stringify(lists));
    };

    const loadNamedList = (name) => {
      const lists = getSavedLists();
      if (lists[name]) {
        items = lists[name].items;
        saveState();
        renderItemsTable();
        buildPreview();
      }
    };

    const deleteNamedList = (name) => {
      const lists = getSavedLists();
      delete lists[name];
      localStorage.setItem('barcode_saved_lists', JSON.stringify(lists));
    };

    const loadState = () => {
      const it = localStorage.getItem('barcode_items');
      if (it) items = JSON.parse(it);
      const ly = localStorage.getItem('barcode_layout');
      if (ly) {
        const layout = JSON.parse(ly);
        $('#opt-cols').value = layout.cols ?? 3;
        $('#opt-gap').value = layout.gap ?? 4;
        $('#opt-w').value = layout.w ?? 65;
        $('#opt-h').value = layout.h ?? 35;
        $('#opt-pad').value = layout.pad ?? 3;
        $('#opt-bar-h').value = layout.barH ?? 18;
        $('#opt-bar-w').value = layout.barW ?? 1.6;
        $('#opt-font').value = layout.font ?? 12;
        $('#opt-borders').checked = layout.showBorders ?? true;
        $('#opt-show-name').checked = layout.showName ?? true;
        $('#opt-show-price').checked = layout.showPrice ?? true;
        $('#opt-show-code').checked = layout.showCode ?? true;
      }
    };

    const renderItemsTable = () => {
      const tbody = $('#items-table tbody');
      tbody.innerHTML = '';
      items.forEach((it, idx) => {
        const tr = document.createElement('tr');
        if (idx === editingIndex) tr.classList.add('is-selected');
        tr.innerHTML = `
          <td>${it.name}</td>
          <td><code>${it.code}</code></td>
          <td>${it.format}</td>
          <td>${it.qty}</td>
          <td class="has-text-right">
            <div class="buttons are-small is-justify-content-end">
              <button class="button is-info is-light" data-edit="${idx}">
                <span class="icon"><i class="fas fa-edit"></i></span>
                <span>Editar</span>
              </button>
              <button class="button is-danger is-light" data-rm="${idx}">
                <span class="icon"><i class="fas fa-trash"></i></span>
              </button>
            </div>
          </td>`;
        tbody.appendChild(tr);
      });

      $$('button[data-edit]').forEach(btn => {
        btn.addEventListener('click', e => {
          editItem(Number(e.currentTarget.getAttribute('data-edit')));
        });
      });

      $$('button[data-rm]').forEach(btn => {
        btn.addEventListener('click', e => {
          const i = Number(e.currentTarget.getAttribute('data-rm'));
          items.splice(i,1);
          if (editingIndex === i) {
            cancelEdit();
          } else if (editingIndex > i) {
            editingIndex--;
          }
          saveState();
          renderItemsTable();
          buildPreview();
        });
      });
    };

    const editItem = (index) => {
      editingIndex = index;
      const item = items[index];

      $('#p-name').value = item.name;
      $('#p-price').value = item.priceStr;
      $('#p-code').value = item.code;
      $('#p-format').value = item.format;
      $('#p-qty').value = item.qty;

      $('#edit-notice').style.display = 'block';

      const submitBtn = $('#product-form button[type="submit"]');
      submitBtn.innerHTML = '<span class="icon"><i class="fas fa-check"></i></span><span>Atualizar</span>';
      submitBtn.classList.remove('is-primary');
      submitBtn.classList.add('is-warning');

      if (!$('#btn-cancel-edit')) {
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'btn-cancel-edit';
        cancelBtn.type = 'button';
        cancelBtn.className = 'button is-light';
        cancelBtn.innerHTML = '<span class="icon"><i class="fas fa-times"></i></span><span>Cancelar</span>';
        cancelBtn.addEventListener('click', cancelEdit);
        submitBtn.parentElement.appendChild(cancelBtn);
      }

      renderItemsTable();
      $('#p-name').focus();
      $('#p-name').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const cancelEdit = () => {
      editingIndex = -1;
      $('#product-form').reset();
      $('#p-qty').value = 1;
      $('#p-format').value = 'CODE128';

      $('#edit-notice').style.display = 'none';

      const submitBtn = $('#product-form button[type="submit"]');
      submitBtn.innerHTML = '<span class="icon"><i class="fas fa-plus"></i></span><span>Adicionar</span>';
      submitBtn.classList.remove('is-warning');
      submitBtn.classList.add('is-primary');

      const cancelBtn = $('#btn-cancel-edit');
      if (cancelBtn) cancelBtn.remove();

      renderItemsTable();
    };

    const applyGridVars = () => {
      const area = $('#print-area');
      area.style.setProperty('--cols', $('#opt-cols').value);
      area.style.setProperty('--label-w', $('#opt-w').value + 'mm');
      area.style.setProperty('--label-h', $('#opt-h').value + 'mm');
      area.style.setProperty('--gap', $('#opt-gap').value + 'mm');
      area.style.setProperty('--pad', $('#opt-pad').value + 'mm');

      const showBorders = $('#opt-borders').checked;
      $$('.label-card', area).forEach(el => {
        el.style.border = showBorders ? '1px dashed rgba(255,133,85,.35)' : 'none';
      });
    };

    const buildPreview = () => {
      applyGridVars();
      const area = $('#print-area');
      area.innerHTML = '';

      const showName = $('#opt-show-name').checked;
      const showPrice = $('#opt-show-price').checked;
      const showCode = $('#opt-show-code').checked;

      const barHeightPx = Math.round(mmToPx(Number($('#opt-bar-h').value)));
      const barWidthPx = Number($('#opt-bar-w').value);
      const fontSizePx = Number($('#opt-font').value);

      const labels = [];
      items.forEach(it => {
        for (let i=0;i<Number(it.qty||1);i++) labels.push(it);
      });

      labels.forEach((it) => {
        const card = document.createElement('div');
        card.className = 'label-card';

        const topline = document.createElement('div');
        topline.className = 'topline';
        if (showName) {
          const name = document.createElement('div');
          name.className = 'name';
          name.textContent = it.name;
          topline.appendChild(name);
        } else {
          topline.appendChild(document.createElement('div'));
        }
        if (showPrice && it.priceStr) {
          const price = document.createElement('div');
          price.className = 'price';
          price.textContent = currencyBR(it.priceStr);
          topline.appendChild(price);
        }
        card.appendChild(topline);

        const wrap = document.createElement('div');
        wrap.className = 'barcode-wrap';
        const canvas = document.createElement('canvas');
        wrap.appendChild(canvas);
        card.appendChild(wrap);

        if (showCode) {
          const codeTxt = document.createElement('div');
          codeTxt.className = 'muted';
          codeTxt.textContent = it.code;
          card.appendChild(codeTxt);
        }

        area.appendChild(card);

        try {
          let codeToRender = it.code;

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

    let _printSwap = [];
    const swapCanvasesForImages = () => {
      _printSwap = [];
      const canvases = $$('#print-area canvas');
      console.log('Convertendo', canvases.length, 'canvas para imagens...');

      canvases.forEach(c => {
        try {
          const img = new Image();
          img.src = c.toDataURL('image/png');
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

    window.addEventListener('beforeprint', () => {
      console.log('beforeprint disparado');
      swapCanvasesForImages();
    });

    window.addEventListener('afterprint', () => {
      console.log('afterprint disparado');
      restoreCanvases();
    });

    document.addEventListener('DOMContentLoaded', () => {
      loadState();
      renderItemsTable();
      applyGridVars();
      if (items.length) {
        buildPreview();
      } else {
        $('#print-area').innerHTML = '<div class="has-text-grey has-text-centered p-6">Nenhum item para exibir. Adicione produtos para gerar o preview.</div>';
      }

      window.cancelEdit = cancelEdit;
    });

    $('#product-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#p-name').value.trim();
      const priceStr = $('#p-price').value.trim();
      const qty = Math.max(1, Number($('#p-qty').value || 1));
      if ($('#p-auto') && $('#p-auto').checked && !$('#p-code').value) { generateAndFill(); }
      let code = $('#p-code').value.trim();
      const format = $('#p-format').value;

      code = format === 'EAN13' ? code.replace(/\D/g,'') : code.replace(/\s+/g,'');

      if (!name || !code) {
        alert('Preencha nome e código.');
        return;
      }

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

      const itemData = { name, priceStr, code, format, qty };

      if (editingIndex >= 0) {
        items[editingIndex] = itemData;
        cancelEdit();
      } else {
        items.push(itemData);
        (e.target).reset();
        $('#p-qty').value = 1;
        $('#p-format').value = 'CODE128';
        if ($('#p-auto')) {
          $('#p-auto').checked = false;
          $('#p-code').disabled = false;
        }
      }

      saveState();
      renderItemsTable();
      buildPreview();
    });

    $('#btn-demo').addEventListener('click', () => {
      items.push(
        { name: 'Fita Crepe 18mm', priceStr: '7,90', code: '7891234567895', format: 'EAN13', qty: 6 },
        { name: 'Parafuso 5x30', priceStr: '0,50', code: 'PAR05X30', format: 'CODE128', qty: 8 },
        { name: 'Massa Corrida 1kg', priceStr: '22,90', code: '7899876543215', format: 'EAN13', qty: 4 },
      );
      saveState();
      renderItemsTable();
      buildPreview();
    });

    $('#btn-clear').addEventListener('click', () => {
      if (!confirm('Remover todos os itens?')) return;
      items = [];
      cancelEdit();
      saveState();
      renderItemsTable();
      $('#print-area').innerHTML = '<div class="has-text-grey has-text-centered p-6">Nenhum item para exibir. Adicione produtos para gerar o preview.</div>';
    });

    $('#btn-save-list').addEventListener('click', () => {
      if (items.length === 0) {
        alert('Adicione pelo menos um item antes de salvar a lista.');
        return;
      }

      const name = prompt('Nome para esta lista:', 'Minha Lista ' + new Date().toLocaleDateString('pt-BR'));
      if (name && name.trim()) {
        saveNamedList(name.trim());
        alert('Lista "' + name.trim() + '" salva com sucesso!');
      }
    });

    $('#btn-load-list').addEventListener('click', () => {
      const lists = getSavedLists();
      const names = Object.keys(lists);

      if (names.length === 0) {
        alert('Nenhuma lista salva encontrada.');
        return;
      }

      let html = '<div style="max-height: 400px; overflow-y: auto;">';
      html += '<table class="table is-fullwidth is-hoverable is-striped"><thead><tr><th>Nome da Lista</th><th>Salva em</th><th>Produtos</th><th>Etiquetas</th><th></th></tr></thead><tbody>';

      names.forEach(name => {
        const list = lists[name];
        const date = new Date(list.savedAt).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        const totalLabels = list.items.reduce((sum, item) => sum + (item.qty || 1), 0);
        html += `<tr>
          <td><strong>${name}</strong></td>
          <td class="is-size-7">${date}</td>
          <td class="has-text-centered">${list.items.length}</td>
          <td class="has-text-centered">${totalLabels}</td>
          <td class="has-text-right">
            <div class="buttons are-small is-justify-content-end">
              <button class="button is-success is-light" onclick="loadList('${name.replace(/'/g, "\\'")}')">
                <span class="icon"><i class="fas fa-check"></i></span>
                <span>Carregar</span>
              </button>
              <button class="button is-danger is-light" onclick="deleteList('${name.replace(/'/g, "\\'")}')">
                <span class="icon"><i class="fas fa-trash"></i></span>
              </button>
            </div>
          </td>
        </tr>`;
      });

      html += '</tbody></table></div>';

      const modal = document.createElement('div');
      modal.className = 'modal is-active';
      modal.innerHTML = `
        <div class="modal-background" onclick="this.parentElement.remove()"></div>
        <div class="modal-card">
          <header class="modal-card-head" style="background-color: var(--accent-4);">
            <p class="modal-card-title">
              <span class="icon"><i class="fas fa-folder-open"></i></span>
              <span>Listas Salvas</span>
            </p>
            <button class="delete" onclick="this.closest('.modal').remove()"></button>
          </header>
          <section class="modal-card-body">
            ${html}
          </section>
          <footer class="modal-card-foot">
            <button class="button" onclick="this.closest('.modal').remove()">Fechar</button>
          </footer>
        </div>
      `;
      document.body.appendChild(modal);

      window.loadList = (name) => {
        if (items.length > 0) {
          if (!confirm('A lista atual será substituída. Deseja continuar?')) return;
        }
        loadNamedList(name);
        modal.remove();
        delete window.loadList;
        delete window.deleteList;
      };

      window.deleteList = (name) => {
        if (!confirm('Excluir a lista "' + name + '"?')) return;
        deleteNamedList(name);
        modal.remove();
        delete window.loadList;
        delete window.deleteList;
        setTimeout(() => $('#btn-load-list').click(), 100);
      };
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
            buildPreview();
          } else {
            alert('Arquivo inválido.');
          }
        } catch(err) {
          alert('Erro ao importar: ' + err.message);
        }
      };
      reader.readAsText(file);
    });

    $('#btn-preview').addEventListener('click', () => {
      saveState();
      buildPreview();
      setTimeout(() => {
        $('#print-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    });

    ;['#opt-cols','#opt-gap','#opt-w','#opt-h','#opt-pad','#opt-borders','#opt-show-name','#opt-show-price','#opt-show-code','#opt-bar-h','#opt-bar-w','#opt-font']
    .forEach(id => {
      $(id).addEventListener('change', () => {
        saveState();
        if (items.length > 0) buildPreview();
      });
    });

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

      if (format === 'EAN13') {
        codeInput.placeholder = 'Ex.: 789123456789 (12 dígitos)';
      } else {
        codeInput.placeholder = 'Ex.: ABC123 ou PROD001';
      }

      if ($('#p-auto') && $('#p-auto').checked) generateAndFill();
    });

    $('#btn-print').addEventListener('click', () => {
      if (!items.length) {
        if (!confirm('Nenhum item na lista. Imprimir mesmo assim?')) return;
      }

      console.log('Preparando impressão...');
      buildPreview();

      setTimeout(() => {
        console.log('Iniciando impressão');
        window.print();
      }, 800);
    });
  