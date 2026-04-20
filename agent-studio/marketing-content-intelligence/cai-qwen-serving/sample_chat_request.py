from __future__ import annotations

import json
import os
import urllib.request


def main() -> None:
    base_url = os.getenv("OPENAI_BASE_URL", "http://127.0.0.1:8000")
    model = os.getenv("OPENAI_MODEL", "qwen3.6-35b-a3b-fp8")
    api_key = os.getenv("OPENAI_API_KEY", "")

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Buat salam singkat dalam bahasa Indonesia."},
        ],
        "temperature": 0.2,
    }

    request = urllib.request.Request(
        url=f"{base_url.rstrip('/')}/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {api_key}"} if api_key else {}),
        },
        method="POST",
    )

    with urllib.request.urlopen(request) as response:
        body = response.read().decode("utf-8")
        print(body)


if __name__ == "__main__":
    main()
