# vLLM Integration for !Fnlloyd

## Overview

This document outlines the production-ready vLLM integration for !Fnlloyd's conversational capabilities.

## Current Architecture (Development)

```
Ollama (qwen3:14b)
    ↓
Express API (fnlloyd-api.js)
    ↓
Game/Client
```

## Production Architecture (Recommended)

```
vLLM Server (qwen3:14b optimized)
    ↓
REST API / WebSocket
    ↓
Game Client
```

## vLLM Benefits

| Feature | Ollama | vLLM |
|---------|--------|------|
| Throughput | ~10 tok/s | ~100+ tok/s |
| Latency | 100-500ms | 10-50ms |
| Multi-client | Limited | Full support |
| KV Cache | Less optimized | PagedAttention |
| Quantization | Q4_K_M | AWQ/GPTQ |

## Installation

```bash
# Install vLLM
pip install vllm

# Or use Docker
docker run --gpus all -v ~/.cache/huggingface:/root/.cache/huggingface \
    -p 8000:8000 \
    vllm/vllm-openai:latest \
    --model qwen/qwen2.5-14b-instruct
```

## Quick Start

```bash
# Start vLLM server
vllm serve qwen/qwen2.5-14b-instruct \
    --dtype half \
    --max-model-len 8192 \
    --tensor-parallel-size 1

# Test
curl http://localhost:8000/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{
        "model": "qwen/qwen2.5-14b-instruct",
        "messages": [{"role": "user", "content": "Hello!"}]
    }'
```

## Integration Points

### 1. Replace Ollama in fnlloyd-api.js

```javascript
// Change from Ollama spawn to HTTP request
async function generateLLMResponse(prompt, context) {
    const response = await fetch('http://localhost:8000/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'qwen/qwen2.5-14b-instruct',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 256
        })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
}
```

### 2. WebSocket for Real-time Gameplay

```javascript
// For ultra-low latency gameplay audio
const ws = new WebSocket('ws://localhost:8000/chat');

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    playAudio(data.audioUrl);
};
```

## Hardware Requirements

| Model Size | GPU | VRAM |
|------------|-----|------|
| 7B | RTX 3060 | 12GB |
| 14B | RTX 4090 | 24GB |
| 72B | A100 | 80GB |

Current system: 476GB storage, can handle 14B+ models.

## Recommended Models for !Fnlloyd

1. **qwen2.5:14b** - Best for conversation (already downloaded)
2. **llama3.1:8b** - Alternative, good personality
3. **mixtral:8x7b** - Larger, more capable

## Timeline

- **Phase 1**: Ollama (current) - Development ✓
- **Phase 2**: vLLM local - Optimization
- **Phase 3**: Cloud deployment (optional) - Scale

---

*Last Updated: 2026-02-24*
