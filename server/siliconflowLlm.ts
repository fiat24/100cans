import axios from 'axios';

const _c = (k: string, d?: string) => {
  const v = process.env[k];
  if (!v && !d) return d || '';
  return v || d || '';
};

const _e = _c('SILICONFLOW_API_ENDPOINT', 'https://api.siliconflow.cn');
// Use provided keys if env vars are not set
const _k = [
  process.env.SILICONFLOW_API_KEY_1 || 'sk-ijxhhwxszeqdgizdrfyfkkbykarmrogjjtumcoebheoscebs',
  process.env.SILICONFLOW_API_KEY_2 || 'sk-jesvzeontggxiwscmweountqykfegudwdwasyzbubtntaujp'
].filter(Boolean);
const _m = _c('SILICONFLOW_MODEL', 'deepseek-ai/DeepSeek-R1');

class _L {
  private _i = 0;
  private _h = new Map<string, number>();

  private _g() {
    if (_k.length === 0) throw new Error('No API keys available');
    const k = _k[this._i % _k.length];
    this._i++;
    return k;
  }

  private _r(e: any): boolean {
    if (e?.response?.status === 429) {
      const key = e?.config?.headers?.Authorization || 'default';
      const count = (this._h.get(key) || 0) + 1;
      this._h.set(key, count);
      return count < 3;
    }
    return false;
  }

  async _a(msgs: any[], opts?: any) {
    let _x = 0;
    while (_x < 3) {
      try {
        const _k = this._g();
        const _p = {
          model: _m,
          messages: msgs,
          temperature: opts?.temperature || 0.7,
          max_tokens: opts?.max_tokens || 2000,
          top_p: opts?.top_p || 0.9,
          response_format: opts?.response_format,
        };

        const _r = await axios.post(`${_e}/v1/chat/completions`, _p, {
          headers: {
            'Authorization': `Bearer ${_k}`,
            'Content-Type': 'application/json',
          },
          timeout: 90000, // Increased timeout for DeepSeek-R1
        });

        if (_r.status === 200 && _r.data?.choices?.[0]?.message?.content) {
          return _r.data.choices[0].message.content;
        }
        throw new Error('Invalid response format');
      } catch (e: any) {
        console.error(`[SiliconFlow] Attempt ${_x + 1} failed:`, e.message);
        if (this._r(e)) {
          _x++;
          await new Promise(resolve => setTimeout(resolve, 2000 * (_x + 1)));
          continue;
        }
        throw e;
      }
    }
    throw new Error('Max retries exceeded');
  }
}

const _llm = new _L();

export async function invokeSiliconFlowLLM(messages: Array<{ role: string; content: string }>, options?: any): Promise<string> {
  try {
    const result = await _llm._a(messages, options);
    return result;
  } catch (error: any) {
    console.error('SiliconFlow LLM Error:', error.message);
    throw new Error(`LLM invocation failed: ${error.message}`);
  }
}

export function getSiliconFlowConfig() {
  return {
    endpoint: _e,
    model: _m,
    keysCount: _k.length,
  };
}
