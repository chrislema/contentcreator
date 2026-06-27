// Lightweight UI helpers for shared renderer markup.
(function attachUiHelpers() {
  function attrs(values = {}) {
    return Object.entries(values)
      .filter(([, value]) => value !== false && value !== null && value !== undefined)
      .map(([key, value]) => value === true ? key : `${key}="${CC.escapeHtml(value)}"`)
      .join(' ');
  }

  function dataAttrs(values = {}) {
    const mapped = {};
    for (const [key, value] of Object.entries(values)) {
      mapped[`data-${key}`] = value;
    }
    return attrs(mapped);
  }

  function cx(...classes) {
    return classes.filter(Boolean).join(' ');
  }

  function button(label, options = {}) {
    const variant = options.variant || 'primary';
    const size = options.size === false ? '' : (options.size || 'sm');
    const className = cx(`btn-${variant}`, size ? `btn-${size}` : '', options.className);
    const htmlAttrs = attrs({
      id: options.id,
      class: className,
      type: options.type || 'button',
      disabled: options.disabled,
      ...options.attrs
    });
    const data = dataAttrs(options.data);
    return `<button ${htmlAttrs}${data ? ` ${data}` : ''}>${CC.escapeHtml(label)}</button>`;
  }

  function badge(label, options = {}) {
    const className = cx('badge', options.tone, options.size, options.className);
    return `<span ${attrs({ class: className, ...options.attrs })}>${CC.escapeHtml(label)}</span>`;
  }

  function actions(content, options = {}) {
    return `<div class="${cx('ui-actions', options.className)}">${content || ''}</div>`;
  }

  function toolbar(content, options = {}) {
    return `<div class="${cx('ui-toolbar', options.className)}">${content || ''}</div>`;
  }

  function card(content, options = {}) {
    const data = dataAttrs(options.data);
    const htmlAttrs = attrs({
      class: cx('ui-card', options.className),
      ...options.attrs
    });
    return `<div ${htmlAttrs}${data ? ` ${data}` : ''}>${content || ''}</div>`;
  }

  function cardHeader(title, options = {}) {
    return `<div class="${cx('ui-card-header', options.className)}">
      <div class="ui-card-heading">
        <div class="ui-card-title">${title}</div>
        ${options.subtitle ? `<div class="ui-card-subtitle">${options.subtitle}</div>` : ''}
        ${options.meta ? `<div class="ui-card-meta">${options.meta}</div>` : ''}
      </div>
      ${options.actions ? actions(options.actions, { className: 'ui-card-actions' }) : ''}
    </div>`;
  }

  function formPanel(content, options = {}) {
    return `<div class="${cx('ui-form-panel', options.className)}" ${attrs(options.attrs)}>${content || ''}</div>`;
  }

  function formActions(content, options = {}) {
    return actions(content, { className: cx('ui-form-actions', options.className) });
  }

  function tagRow(content, options = {}) {
    return `<div class="${cx('ui-tags', options.className)}">${content || ''}</div>`;
  }

  function inlineEmpty(message) {
    return `<div class="ui-inline-empty">${CC.escapeHtml(message)}</div>`;
  }

  function sectionTitle(label, count) {
    const countBadge = Number.isFinite(count) ? ` ${badge(String(count), { tone: 'dim' })}` : '';
    return `<h3 class="ui-section-title">${CC.escapeHtml(label)}${countBadge}</h3>`;
  }

  CC.ui = {
    attrs,
    badge,
    button,
    card,
    cardHeader,
    actions,
    toolbar,
    formPanel,
    formActions,
    tagRow,
    inlineEmpty,
    sectionTitle,
    cx
  };
})();
