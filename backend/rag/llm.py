import logging

from langchain_core.embeddings import Embeddings
from langchain_core.language_models.chat_models import BaseChatModel

from rag.settings import AWS_REGION, BEDROCK_CHAT_MODEL, BEDROCK_EMBED_MODEL

logger = logging.getLogger(__name__)


class LLMConfigurationError(Exception):
    """No usable LLM or embedding backend configured."""


def get_embeddings() -> Embeddings:
    try:
        from langchain_aws import BedrockEmbeddings

        return BedrockEmbeddings(
            model_id=BEDROCK_EMBED_MODEL,
            region_name=AWS_REGION,
        )
    except Exception as exc:
        logger.warning("Bedrock embeddings unavailable: %s", exc)
        raise LLMConfigurationError(
            "Bedrock embeddings unavailable. Set AWS credentials (codeplatoon / us-east-1)."
        ) from exc


def get_chat_model() -> BaseChatModel:
    try:
        from langchain_aws import ChatBedrock

        return ChatBedrock(
            model_id=BEDROCK_CHAT_MODEL,
            region_name=AWS_REGION,
        )
    except Exception as exc:
        logger.warning("Bedrock chat unavailable: %s", exc)
        raise LLMConfigurationError(
            "Bedrock chat unavailable. Set AWS credentials (codeplatoon / us-east-1)."
        ) from exc
