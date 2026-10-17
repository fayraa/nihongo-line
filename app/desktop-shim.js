/*
 * Gives the page the same `window.claude.use()` it gets inside Claude, backed by the
 * desktop shell: "sample" calls Claude through your API key, "downloads" saves files
 * with a normal Save dialog. "db" and "user" are absent, so progress stays on this computer.
 */
(() => {
  'use strict';
  const D = window.nlDesktop;
  if (!D) return;
  let seq = 0;

  const toMessages = input => (typeof input === 'string'
    ? [{ role: 'user', content: input }]
    : Array.from(input || []).map(t => ({ role: t.role, content: String(t.content) })));

  function parseJSON(text) {
    try { return JSON.parse(text); } catch (e) {}
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) { try { return JSON.parse(fence[1]); } catch (e) {} }
    const a = text.search(/[\[{]/);
    const b = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
    if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch (e) {} }
    throw { code: 'invalid_json', message: 'The reply was not valid JSON', text };
  }

  async function call(input, opts, asJson) {
    opts = opts || {};
    const id = 'r' + (++seq) + '_' + Date.now();
    let prev = '';
    let aborted = false;
    const onAbort = () => { aborted = true; D.abort(id); };
    if (opts.signal) {
      if (opts.signal.aborted) throw { code: 'cancelled', message: 'Cancelled' };
      opts.signal.addEventListener('abort', onAbort, { once: true });
    }
    const system = asJson ? 'Your reply will be parsed by a program. Reply with only the requested JSON value, with no prose before or after it and no Markdown fences.' : undefined;
    try {
      const r = await D.request({ id, messages: toMessages(input), system, tier: opts.modelTier || 'default', maxTokens: asJson ? 8000 : 4000 }, text => {
        if (aborted || !opts.onText || text === prev) return;
        const delta = text.slice(prev.length); prev = text;
        try { opts.onText({ text, delta }); } catch (e) { console.error(e); }
      });
      if (aborted) throw { code: 'cancelled', message: 'Cancelled', text: prev || undefined };
      if (r.error) throw Object.assign({}, r.error, prev ? { text: prev } : {});
      if (!r.text || !r.text.trim()) throw { code: 'empty_completion', message: 'Claude returned an empty reply' };
      if (opts.onText && r.text !== prev) { try { opts.onText({ text: r.text, delta: r.text.slice(prev.length) }); } catch (e) {} }
      if (asJson) {
        if (r.truncated) throw { code: 'invalid_json', message: 'The reply was cut short', text: r.text };
        return parseJSON(r.text);
      }
      return { text: r.text, truncated: !!r.truncated, modelTierApplied: opts.modelTier || 'default' };
    } finally {
      if (opts.signal) opts.signal.removeEventListener('abort', onAbort);
    }
  }

  const sample = (input, opts) => call(input, opts, false);
  sample.json = (input, opts) => call(input, opts, true);
  sample.limits = async () => ({ maxPromptBytes: 262144 });

  const downloads = {
    async save(req) {
      const data = typeof req.data === 'string' ? req.data : await new Blob([req.data]).text();
      const r = await D.saveFile(req.filename, data);
      if (!r || !r.ok) throw { code: r && r.canceled ? 'declined' : 'unavailable', message: r && r.canceled ? 'Cancelled' : 'Could not save' };
      return { status: 'saved' };
    }
  };

  window.claude = { use: async name => (name === 'sample' ? sample : name === 'downloads' ? downloads : null) };
})();
