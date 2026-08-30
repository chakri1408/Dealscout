from app.agents.base import Agent
from litellm import completion


class MessagingAgent(Agent):
    name = "Messaging Agent"
    color = Agent.WHITE
    MODEL = "claude-sonnet-4-5"

    def __init__(self):
        """
        Set up this object to craft alert messages via Claude. The crafted
        message is returned to the caller and persisted to the database
        (displayed in the frontend), rather than pushed via Pushover as in
        the original course project.
        """
        self.log("Messaging Agent is initializing")
        self.log("Messaging Agent has initialized Claude")

    def craft_message(
        self, description: str, deal_price: float, estimated_true_value: float
    ) -> str:
        user_prompt = "Please summarize this great deal in 2-3 sentences to be sent as an exciting push notification alerting the user about this deal.\n"
        user_prompt += f"Item Description: {description}\nOffered Price: {deal_price}\nEstimated true value: {estimated_true_value}"
        user_prompt += "\n\nRespond only with the 2-3 sentence message which will be used to alert & excite the user about this deal"
        response = completion(
            model=self.MODEL,
            messages=[
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content

    def notify(self, description: str, deal_price: float, estimated_true_value: float, url: str) -> str:
        """
        Craft an alert message about the specified deal and return it, so the
        caller can persist it for display in the frontend.
        """
        self.log("Messaging Agent is using Claude to craft the message")
        text = self.craft_message(description, deal_price, estimated_true_value)
        self.log("Messaging Agent has completed")
        return text
