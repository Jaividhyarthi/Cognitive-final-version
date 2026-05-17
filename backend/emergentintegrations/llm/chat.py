import anthropic

class UserMessage:
    def __init__(self, content):
        self.content = content

class LlmChat:
    def __init__(self, api_key, session_id=None, system_prompt=None):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.system_prompt = system_prompt or ""
        self.history = []

    def chat(self, message: UserMessage):
        self.history.append({"role": "user", "content": message.content})
        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            system=self.system_prompt,
            messages=self.history
        )
        reply = response.content[0].text
        self.history.append({"role": "assistant", "content": reply})
        return reply